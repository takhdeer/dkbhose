const { getMRUCookies, refreshMRUCookies, clearCookies } = require('./cookieExtractor');
const { fetchAndStoreAllTrackedCourses } = require('./courseGetter');
const emailService = require('./emailService');
const { db } = require('./firebase');

// ─────────────────────────────────────────────────────────────────────────────
// Timings
// ─────────────────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS    = Number(process.env.POLL_INTERVAL_MS    || 2  * 60 * 1000); //  2 minutes
const COOKIE_REFRESH_MS   = Number(process.env.COOKIE_REFRESH_MS   || 30 * 60 * 1000); // 30 minutes

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────
let pollTimer          = null;
let cookieTimer        = null;
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
async function handleNotifications(results) {
    if (!emailService.isConfigured()) return;

    const openCourses = results.filter(r => r.status === 'ok' && r.seatsAvailable > 0);
    if (!openCourses.length) return;

    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, data: doc.data() }));

    // For each open CRN+term, find users tracking that exact pair.
    for (const { crn, term } of openCourses) {
        try {
            const statusKey = `${term || 'unknown'}_${crn}`;
            for (const user of users) {
                const userData = user.data;
                const trackedPairs = extractTrackedCoursePairs(userData);
                const isTracking = trackedPairs.some(tc => String(tc.crn) === String(crn) && String(tc.term) === String(term));
                if (!isTracking) continue;

                // Check if we already sent a notification for this user+crn
                const statusRef = db.collection('users').doc(user.id)
                                    .collection('course_status').doc(statusKey);
                const statusSnap = await statusRef.get();
                const { notificationSent } = statusSnap.exists ? statusSnap.data() : {};

                if (notificationSent) continue;

                // Fetch the full course snapshot we just saved
                const courseSnap = await db.collection('course_data').doc(String(crn)).get();
                const courseData = courseSnap.exists ? courseSnap.data() : { crn };

                const sent = await emailService.sendAvailabilityNotification(userData.email, courseData);
                if (sent) {
                    await statusRef.set({ notificationSent: true, notifiedAt: new Date().toISOString() }, { merge: true });
                    console.log(`📧 Notification sent to ${userData.email} for CRN ${crn}`);
                }
            }
        } catch (err) {
            console.error(`❌ Notification error for CRN ${crn}: ${err.message}`);
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
    console.log(`🚀 Polling engine starting — poll every ${POLL_INTERVAL_MS / 1000}s, cookie refresh every ${COOKIE_REFRESH_MS / 1000}s`);

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

    console.log('✅ Polling engine started');
    return true;
}

function stop() {
    if (!pollTimer && !cookieTimer) return false;

    clearInterval(pollTimer);
    clearInterval(cookieTimer);
    pollTimer   = null;
    cookieTimer = null;

    console.log('🛑 Polling engine stopped');
    return true;
}

function getStatus() {
    return {
        running:          Boolean(pollTimer),
        pollIntervalMs:   POLL_INTERVAL_MS,
        cookieRefreshMs:  COOKIE_REFRESH_MS,
        startedAt,
        cycleInProgress,
        cycleCount,
        lastCookieRefresh,
        hasCookies:       Boolean(currentCookies),
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

function extractTrackedCoursePairs(userData = {}) {
    const out = [];
    const trackedCourses = Array.isArray(userData.trackedCourses) ? userData.trackedCourses : [];

    for (const item of trackedCourses) {
        const crnValues = splitCrnValues(item?.crn);
        const term = item?.term;
        if (!term) continue;
        for (const crn of crnValues) {
            out.push({ crn: String(crn), term: String(term) });
        }
    }

    if (userData.crn && userData.term) {
        for (const crn of splitCrnValues(userData.crn)) {
            out.push({ crn: String(crn), term: String(userData.term) });
        }
    }

    const seen = new Set();
    return out.filter(({ crn, term }) => {
        const key = `${crn}:${term}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function splitCrnValues(value) {
    if (value == null) return [];

    const rawItems = Array.isArray(value) ? value : [value];
    return rawItems
        .flatMap(item => String(item).split(/[,\s]+/))
        .map(v => v.trim())
        .filter(v => /^\d+$/.test(v));
}

module.exports = { start, stop, runPollingCycle, runCookieRefresh, getStatus };
