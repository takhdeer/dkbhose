const fs = require('fs').promises;
const path = require('path');

async function getFetch() {
  if (typeof fetch !== 'undefined') {
    return fetch;
  }
  const nodeFetch = await import('node-fetch');
  return nodeFetch.default;
}

/**
 * Read every tracked course from the `users` collection, fetch live seat data
 * for each unique CRN/term pair, and write results back to Firestore.
 *
 * Firebase schema assumed:
 *   users/{userId} {
 *     email: string,
 *     name:  string,
 *     crn:   number,   // single CRN this user is tracking
 *     term:  number    // term code e.g. 202701
 *   }
 *
 * Written to:
 *   course_data/{crn}  { ...courseData, lastChecked, term }
 *   users/{userId}/notifications/{crn}  { seatsAvailable, status, lastChecked }
 */
async function fetchCourseData(crn, jsessionid, mruCookie) {
  const url = 'https://ssb-prod.ec.mru.ca/PROD_Registration/bwckschd.p_get_crse_unsec';
  
  console.log(` Fetching data for CRN: ${crn}`);
  
  try {
    const fetchImpl = await getFetch();
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${jsessionid}; MRUB9SSBPRODREGHA=${mruCookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: new URLSearchParams({
        term_in: '202601', // Winter 2026
        sel_subj: 'dummy',
        sel_day: 'dummy',
        sel_schd: 'dummy',
        sel_insm: 'dummy',
        sel_camp: 'dummy',
        sel_levl: 'dummy',
        sel_sess: 'dummy',
        sel_instr: 'dummy',
        sel_ptrm: 'dummy',
        sel_attr: 'dummy',
        sel_crn: crn,
        sel_title: '',
        sel_from_cred: '',
        sel_to_cred: '',
        begin_hh: '0',
        begin_mi: '0',
        begin_ap: 'a',
        end_hh: '0',
        end_mi: '0',
        end_ap: 'a'
      })
    });

        // Small delay to avoid hammering the API
        await sleep(300);
    }

    console.log(`✅ Poll complete: ${results.filter(r => r.status === 'ok').length} ok, ${results.filter(r => r.status === 'error').length} errors`);
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

async function updateUserCourseStatus(userIds, crn, courseData) {
    const batch = db.batch();
    const statusKey = `${courseData.term || 'unknown'}_${crn}`;
    const payload = {
        crn,
        term:           courseData.term || '',
        seatsAvailable: courseData.seatsAvailable,
        status:         courseData.status,
        courseTitle:    courseData.courseTitle,
        lastChecked:    new Date().toISOString(),
    };
    for (const userId of userIds) {
        const ref = db.collection('users').doc(userId)
                      .collection('course_status').doc(statusKey);
        batch.set(ref, payload, { merge: true });
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

function extractTrackedCoursePairs(userData = {}) {
    const out = [];

    // Current schema: users/{uid}.trackedCourses = [{ crn, term, ... }, ...]
    const trackedCourses = Array.isArray(userData.trackedCourses) ? userData.trackedCourses : [];
    for (const item of trackedCourses) {
        const crnValues = splitCrnValues(item?.crn);
        const term = item?.term;
        if (!term) continue;
        for (const crn of crnValues) {
            out.push({ crn: String(crn), term: String(term) });
        }
    }

    // Backward compatibility for older user docs with top-level crn/term
    if (userData.crn && userData.term) {
        for (const crn of splitCrnValues(userData.crn)) {
            out.push({ crn: String(crn), term: String(userData.term) });
        }
    }

    // Deduplicate pairs
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

module.exports = { fetchAndStoreAllTrackedCourses, fetchCourseData, saveCourseData };
