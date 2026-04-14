/**
 * Poll loop (started from server on npm start):
 *  1. MRU session cookies via cookieExtractor.
 *  2. courseGetter reads Firestore `tracked_courses`, uses each doc's crn + term to
 *     fetch seat data, writes `course_data/{crn}`, merges status onto that row.
 *  3. If course status is OPEN, email every row in tracked_courses for that CRN+term
 *     (each using its own `email` + `app_password`), then set notificationSent.
 *  4. Every NOTIFICATION_RESET_MS (default 30m), notificationSent is cleared on all
 *     tracked_courses so another email can go out if the course is still OPEN.
 */
const { getMRUCookies, refreshMRUCookies, clearCookies } = require('./cookieExtractor');
const { fetchAndStoreAllTrackedCourses } = require('./courseGetter');
const emailService = require('./emailService');
const { db } = require('./firebase');

// ─────────────────────────────────────────────────────────────────────────────
// Timings
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS    = Number(process.env.POLL_INTERVAL_MS    || 2  * 60 * 1000); //  2 minutes
const COOKIE_REFRESH_MS   = Number(process.env.COOKIE_REFRESH_MS   || 30 * 60 * 1000); // 30 minutes
const NOTIFICATION_RESET_MS = Number(process.env.NOTIFICATION_RESET_MS || 30 * 60 * 1000); // reset notificationSent

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let pollTimer               = null;
let cookieTimer             = null;
let notificationResetTimer  = null;
let cycleInProgress    = false;
let cookieRefreshBusy  = false;
let startedAt          = null;
let cycleCount         = 0;
let lastCookieRefresh  = null;
let currentCookies     = null;

// ─────────────────────────────────────────────────────────────────────────────
// Cookie refresh job  (runs every 30 minutes)
// ─────────────────────────────────────────────────────────────────────────────
async function runCookieRefresh() {
    if (cookieRefreshBusy) {
        console.log('⏭️  Cookie refresh already in progress — skipping');
        return;
    }
    cookieRefreshBusy = true;
    try {
        console.log(`[${ts()}] 🔄 Refreshing MRU cookies...`);
        currentCookies    = await refreshMRUCookies();
        lastCookieRefresh = new Date().toISOString();
        console.log(`[${ts()}] ✅ Cookies refreshed`);
    } catch (err) {
        console.error(`[${ts()}] ❌ Cookie refresh failed: ${err.message}`);
        // Keep using whatever cookies we had — next poll cycle will try again
    } finally {
        cookieRefreshBusy = false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset notificationSent on all tracked_courses (default every 30 minutes)
// ─────────────────────────────────────────────────────────────────────────────
async function resetNotificationSentFlags() {
    try {
        const snap = await db.collection('tracked_courses').get();
        if (snap.empty) {
            console.log(`[${ts()}] notification reset: no tracked_courses docs`);
            return;
        }

        let batch = db.batch();
        let ops = 0;
        let total = 0;

        for (const doc of snap.docs) {
            batch.set(doc.ref, { notificationSent: false }, { merge: true });
            ops++;
            if (ops >= 500) {
                await batch.commit();
                total += ops;
                ops = 0;
                batch = db.batch();
            }
        }
        if (ops > 0) {
            await batch.commit();
            total += ops;
        }

        console.log(`[${ts()}] notificationSent → false on ${total} tracked_courses doc(s)`);
    } catch (err) {
        console.error(`[${ts()}] notification reset failed: ${err.message}`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Poll cycle  (runs every 2 minutes)
// ─────────────────────────────────────────────────────────────────────────────
async function runPollingCycle() {
    if (cycleInProgress) {
        console.log('⏭️  Poll already in progress — skipping');
        return;
    }

    cycleInProgress = true;
    cycleCount += 1;
    console.log(`[${ts()}] 🔁 Poll cycle #${cycleCount} started`);

    try {
        // Ensure we have cookies before polling
        if (!currentCookies) {
            console.log('🍪 No cookies in memory — fetching now...');
            currentCookies = await getMRUCookies();
        }

        const results = await fetchAndStoreAllTrackedCourses(currentCookies);

        // Check for newly-opened seats and send email notifications
        await handleNotifications(results);

    } catch (err) {
        console.error(`[${ts()}] ❌ Poll cycle #${cycleCount} error: ${err.message}`);

        // If the error looks like a session expiry, force a cookie refresh
        if (isSessionError(err)) {
            console.log('🔑 Session error detected — forcing cookie refresh');
            clearCookies();
            currentCookies = null;
            try {
                currentCookies = await getMRUCookies();
            } catch (refreshErr) {
                console.error('❌ Emergency cookie refresh also failed:', refreshErr.message);
            }
        }
    } finally {
        cycleInProgress = false;
        console.log(`[${ts()}] ✅ Poll cycle #${cycleCount} complete`);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────
function getAppPassword(docData) {
    return docData.app_password ?? docData.appPassword ?? '';
}

/**
 * Firestore equality matches type exactly. crn/term may be stored as string or number.
 */
function crnTermQueryVariants(crn, term) {
    const crnStr = String(crn).trim();
    const termStr = String(term).trim();
    const crnNum = /^\d+$/.test(crnStr) ? Number(crnStr) : null;
    const termNum = /^\d+$/.test(termStr) ? Number(termStr) : null;
    const pairs = new Map();
    const add = (c, t) => {
        const key = `${typeof c}:${c}|${typeof t}:${t}`;
        pairs.set(key, [c, t]);
    };
    add(crnStr, termStr);
    if (crnNum !== null) add(crnNum, termStr);
    if (termNum !== null) add(crnStr, termNum);
    if (crnNum !== null && termNum !== null) add(crnNum, termNum);
    return [...pairs.values()];
}

async function fetchTrackedCourseDocsForPair(crn, term) {
    const seen = new Set();
    const docs = [];
    for (const [c, t] of crnTermQueryVariants(crn, term)) {
        try {
            const snap = await db.collection('tracked_courses')
                .where('crn', '==', c)
                .where('term', '==', t)
                .get();
            for (const doc of snap.docs) {
                if (seen.has(doc.id)) continue;
                seen.add(doc.id);
                docs.push(doc);
            }
        } catch (e) {
            console.error(`tracked_courses query crn=${c} term=${t}: ${e.message}`);
        }
    }
    return docs;
}

async function handleNotifications(results) {
    const openCourses = results.filter(
        (r) => r.status === 'ok' && String(r.courseStatus || '').toUpperCase() === 'OPEN'
    );

    if (!openCourses.length) {
        const ok = results.filter((r) => r.status === 'ok');
        if (ok.length) {
            console.log(
                `[notify] No OPEN courses to mail this cycle. Polled: ${ok
                    .map((r) => `${r.crn}→${r.courseStatus || '?'}`)
                    .join(', ')}`
            );
        }
        return;
    }

    for (const { crn, term } of openCourses) {
        try {
            const docRefs = await fetchTrackedCourseDocsForPair(crn, term);
            if (!docRefs.length) {
                console.warn(
                    `[notify] CRN ${crn} term ${term}: no tracked_courses rows match (check crn/term types in Firestore vs string "10021" / "202701")`
                );
                continue;
            }

            console.log(`[notify] CRN ${crn} term ${term} OPEN — ${docRefs.length} subscriber doc(s), checking each…`);

            for (const doc of docRefs) {
                const d = doc.data();
                if (d.notificationSent === true) {
                    console.log(`[notify] skip ${doc.id}: notificationSent already true`);
                    continue;
                }

                const addr = (d.email || '').trim();
                const appPass = getAppPassword(d);
                if (!addr || !appPass) {
                    console.warn(`[notify] skip ${doc.id}: missing email or app_password`);
                    continue;
                }

                const courseSnap = await db.collection('course_data').doc(String(crn)).get();
                const courseData = courseSnap.exists ? courseSnap.data() : { crn };

                console.log(`[notify] sending mail to ${addr} for CRN ${crn}…`);
                const sent = await emailService.sendAvailabilityNotificationWithCredentials(
                    addr,
                    appPass,
                    addr,
                    courseData
                );
                if (sent) {
                    await doc.ref.set({
                        notificationSent: true,
                        notifiedAt: new Date().toISOString(),
                    }, { merge: true });
                    console.log(`[notify] sent OK → ${addr} (CRN ${crn})`);
                } else {
                    console.warn(`[notify] send failed or SMTP verify failed for ${addr} (CRN ${crn}) — check app password`);
                }
            }
        } catch (err) {
            console.error(`Notification error for CRN ${crn}: ${err.message}`);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
async function start() {
    if (pollTimer) {
        console.log('⚠️  Polling engine already running');
        return false;
    }

    startedAt = new Date().toISOString();
    console.log(
        `🚀 Polling engine starting — poll every ${POLL_INTERVAL_MS / 1000}s, cookie refresh every ${COOKIE_REFRESH_MS / 1000}s, notificationSent reset every ${NOTIFICATION_RESET_MS / 1000}s`
    );

    // Get cookies immediately on startup
    try {
        currentCookies = await getMRUCookies();
    } catch (err) {
        console.error('❌ Could not get initial cookies — engine will retry on first poll:', err.message);
    }

    // Run an immediate first poll
    runPollingCycle().catch(err => console.error('Initial poll failed:', err.message));

    // Schedule recurring poll
    pollTimer = setInterval(() => {
        runPollingCycle().catch(err => console.error('Poll interval error:', err.message));
    }, POLL_INTERVAL_MS);

    // Schedule cookie refresh (offset by 1 minute so it doesn't collide with the first poll)
    cookieTimer = setInterval(() => {
        runCookieRefresh().catch(err => console.error('Cookie refresh interval error:', err.message));
    }, COOKIE_REFRESH_MS);

    notificationResetTimer = setInterval(() => {
        resetNotificationSentFlags().catch(err => console.error('Notification reset error:', err.message));
    }, NOTIFICATION_RESET_MS);

    console.log('✅ Polling engine started');
    return true;
}

function stop() {
    if (!pollTimer && !cookieTimer && !notificationResetTimer) return false;

    clearInterval(pollTimer);
    clearInterval(cookieTimer);
    clearInterval(notificationResetTimer);
    pollTimer              = null;
    cookieTimer            = null;
    notificationResetTimer = null;

    console.log('🛑 Polling engine stopped');
    return true;
}

function getStatus() {
    return {
        running:               Boolean(pollTimer),
        pollIntervalMs:        POLL_INTERVAL_MS,
        cookieRefreshMs:       COOKIE_REFRESH_MS,
        notificationResetMs: NOTIFICATION_RESET_MS,
        startedAt,
        cycleInProgress,
        cycleCount,
        lastCookieRefresh,
        hasCookies:            Boolean(currentCookies),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function ts() {
    return new Date().toISOString();
}

function isSessionError(err) {
    const msg = (err.message ?? '').toLowerCase();
    return (
        msg.includes('401') ||
        msg.includes('403') ||
        msg.includes('session') ||
        msg.includes('cookie') ||
        msg.includes('unauthorized') ||
        (err.response?.status === 401) ||
        (err.response?.status === 403)
    );
}

module.exports = { start, stop, runPollingCycle, runCookieRefresh, resetNotificationSentFlags, getStatus };