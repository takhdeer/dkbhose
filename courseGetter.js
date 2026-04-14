const axios = require('axios');
const { FieldValue } = require('firebase-admin/firestore');
const { db } = require('./firebase');

const BASE_URL = 'https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/searchResults/searchResults';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read every row in `tracked_courses`, dedupe by CRN+term for API calls, fetch
 * seat data, write `course_data/{crn}`, and merge status onto each
 * `tracked_courses` document.
 *
 * tracked_courses fields used: crn, term (one document per course subscription).
 */
async function fetchAndStoreAllTrackedCourses(cookies) {
    const { JSESSIONID, MRUB9SSBPRODREGHA } = cookies;

    const trackedSnap = await db.collection('tracked_courses').get();
    if (trackedSnap.empty) {
        console.log('No documents in tracked_courses — nothing to poll');
        return [];
    }

    const crnMap = new Map();

    for (const doc of trackedSnap.docs) {
        const d = doc.data();
        const crn = d.crn != null ? String(d.crn).trim() : '';
        const term = d.term != null ? String(d.term).trim() : '';
        if (!crn || !term) continue;
        const key = `${crn}:${term}`;
        if (!crnMap.has(key)) {
            crnMap.set(key, { crn, term, trackedDocIds: [] });
        }
        crnMap.get(key).trackedDocIds.push(doc.id);
    }

    if (crnMap.size === 0) {
        console.log('No valid crn+term rows in tracked_courses');
        return [];
    }

    console.log(`Polling ${crnMap.size} unique CRN/term pair(s) from ${trackedSnap.size} tracked row(s)...`);

    const results = [];
    for (const { crn, term, trackedDocIds } of crnMap.values()) {
        try {
            const courseData = await fetchCourseData(crn, JSESSIONID, MRUB9SSBPRODREGHA, term);

            await saveCourseData(courseData);
            await mergeTrackedCourseStatus(trackedDocIds, crn, courseData, null);

            results.push({
                crn,
                term,
                status: 'ok',
                seatsAvailable: courseData.seatsAvailable,
                courseStatus: courseData.status,
            });
            console.log(`  OK CRN ${crn} | seats: ${courseData.seatsAvailable}/${courseData.capacity} | ${courseData.status}`);
        } catch (err) {
            console.error(`  ERR CRN ${crn}: ${err.message}`);
            results.push({ crn, term, status: 'error', error: err.message });

            await db.collection('course_data').doc(crn).set(
                { lastChecked: new Date().toISOString(), lastError: err.message },
                { merge: true }
            ).catch(() => {});
            await mergeTrackedCourseStatus(trackedDocIds, crn, null, err.message);
        }

        await sleep(300);
    }

    console.log(`Poll complete: ${results.filter(r => r.status === 'ok').length} ok, ${results.filter(r => r.status === 'error').length} errors`);
    return results;
}

/**
 * Fetch a single CRN from the MRU search API.
 * Returns a structured courseData object.
 */
async function fetchCourseData(crn, JSESSIONID, MRUB9SSBPRODREGHA, term = '202701') {
    if (!crn || !JSESSIONID || !MRUB9SSBPRODREGHA) {
        throw new Error('crn, JSESSIONID, and MRUB9SSBPRODREGHA are all required');
    }

    const headers = {
        Cookie:       `JSESSIONID=${JSESSIONID}; MRUB9SSBPRODREGHA=${MRUB9SSBPRODREGHA}`,
        Accept:       'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Referer:      'https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/searchResults/searchResults',
    };

    const pageMaxSize = 100;
    const baseParams = {
        txt_term:        String(term),
        startDatepicker: '',
        endDatepicker:   '',
        pageMaxSize,
        sortColumn:      'subjectDescription',
        sortDirection:   'asc',
    };

    const searchParamsList = [
        { txt_keywordall: String(crn) },
        { txt_keywordlike: String(crn) },
    ];

    for (const searchParams of searchParamsList) {
        let offset = 0;
        let totalCount = null;

        while (true) {
            const response = await axios.get(BASE_URL, {
                params: {
                    ...baseParams,
                    ...searchParams,
                    uniqueSessionId: `node${Date.now()}`,
                    pageOffset: offset,
                },
                headers,
                timeout: 30000,
            });

            const courseData = parseAPIResponse(response.data, crn);
            if (courseData) return courseData;

            const items = Array.isArray(response.data?.data) ? response.data.data : [];
            if (!items.length) break;

            if (Number.isFinite(Number(response.data?.totalCount))) {
                totalCount = Number(response.data.totalCount);
            }

            offset += items.length;
            if (totalCount !== null && offset >= totalCount) break;
            if (offset >= 5000) break;
        }
    }

    throw new Error(`CRN ${crn} not found in API response`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firebase helpers
// ─────────────────────────────────────────────────────────────────────────────

async function saveCourseData(courseData) {
    await db.collection('course_data').doc(courseData.crn).set({
        ...courseData,
        lastChecked: new Date().toISOString(),
    });
}

async function mergeTrackedCourseStatus(trackedDocIds, crn, courseData, lastError) {
    if (!trackedDocIds.length) return;

    const batch = db.batch();
    const now = new Date().toISOString();

    for (const docId of trackedDocIds) {
        const ref = db.collection('tracked_courses').doc(docId);
        if (lastError) {
            batch.set(ref, {
                crn: String(crn),
                lastChecked: now,
                lastError,
                status: 'ERROR',
            }, { merge: true });
        } else {
            batch.set(ref, {
                crn: String(crn),
                term: courseData.term || '',
                seatsAvailable: courseData.seatsAvailable,
                status: courseData.status,
                courseTitle: courseData.courseTitle,
                lastChecked: now,
                lastError: FieldValue.delete(),
            }, { merge: true });
        }
    }
    await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseAPIResponse(jsonData, targetCrn) {
    const courses = Array.isArray(jsonData?.data) ? jsonData.data : [];
    const target  = String(targetCrn);

    const course = courses.find(item =>
        String(item.courseReferenceNumber ?? '') === target ||
        String(item.courseDisplay         ?? '') === target
    );

    if (!course) return null;

    const meetings       = Array.isArray(course.meetingsFaculty) ? course.meetingsFaculty : [];
    const firstMeeting   = meetings[0]?.meetingTime ?? {};
    const faculty        = Array.isArray(course.faculty) ? course.faculty : [];
    const primaryFaculty = faculty.find(f => f.primaryIndicator) ?? faculty[0] ?? {};

    const seatsAvailable = Number(course.seatsAvailable ?? 0);
    const capacity       = Number(course.maximumEnrollment ?? 0);
    const enrollment     = Number(course.enrollment ?? Math.max(capacity - seatsAvailable, 0));

    return {
        crn:           String(course.courseReferenceNumber ?? targetCrn),
        courseTitle:   course.courseTitle || `${course.subject ?? ''} ${course.courseNumber ?? ''}`.trim(),
        subject:       course.subject              ?? '',
        subjectDescription: course.subjectDescription ?? '',
        courseNumber:  String(course.courseNumber  ?? ''),
        courseDisplay: String(course.courseDisplay ?? ''),
        seatsAvailable,
        capacity,
        enrollment,
        waitCapacity:  Number(course.waitCapacity  ?? 0),
        waitCount:     Number(course.waitCount     ?? 0),
        waitAvailable: Number(course.waitAvailable ?? 0),
        instructor:    primaryFaculty.displayName  ?? 'TBA',
        schedule: {
            days:      buildMeetingDays(firstMeeting),
            startTime: formatTime(firstMeeting.beginTime),
            endTime:   formatTime(firstMeeting.endTime),
            building:  firstMeeting.buildingDescription ?? firstMeeting.building ?? '',
            room:      firstMeeting.room ?? '',
        },
        term:          course.term                 ?? '',
        campusDescription:          course.campusDescription          ?? '',
        scheduleTypeDescription:    course.scheduleTypeDescription    ?? '',
        instructionalMethodDescription: course.instructionalMethodDescription ?? '',
        status:        seatsAvailable > 0 ? 'OPEN' : 'FULL',
        timestamp:     new Date().toISOString(),
    };
}

function formatTime(val) {
    if (!val || typeof val !== 'string' || val.length !== 4) return '';
    const hours   = Number(val.slice(0, 2));
    if (Number.isNaN(hours)) return '';
    const minutes = val.slice(2);
    const suffix  = hours >= 12 ? 'PM' : 'AM';
    const h12     = ((hours + 11) % 12) + 1;
    return `${h12}:${minutes} ${suffix}`;
}

function buildMeetingDays(mt = {}) {
    return [
        ['monday',    'Mon'],
        ['tuesday',   'Tue'],
        ['wednesday', 'Wed'],
        ['thursday',  'Thu'],
        ['friday',    'Fri'],
        ['saturday',  'Sat'],
        ['sunday',    'Sun'],
    ]
        .filter(([key]) => mt[key])
        .map(([, label]) => label)
        .join(', ');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { fetchAndStoreAllTrackedCourses, fetchCourseData, saveCourseData };
