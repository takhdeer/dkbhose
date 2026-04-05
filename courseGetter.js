const axios = require('axios');
const { db } = require('./firebase');

/**
 * Fetch course data from MRU registration system using the JSON search endpoint.
 */
async function fetchCourseData(crn, jsessionid, mruCookie, term = '202701', options = {}) {
  const baseUrl = 'https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/searchResults/searchResults';
  const { saveToFirebase = true } = options;

  console.log(`📥 Fetching data for CRN: ${crn}`);

  try {
    if (!crn || !jsessionid || !mruCookie) {
      throw new Error('crn, jsessionid, and mruCookie are required');
    }

    const response = await axios.get(baseUrl, {
      params: {
        txt_keywordlike: String(crn),
        txt_term: String(term),
        startDatepicker: '',
        endDatepicker: '',
        uniqueSessionId: Date.now().toString(),
        pageOffset: 0,
        pageMaxSize: 500,
        sortColumn: 'subjectDescription',
        sortDirection: 'asc'
      },
      headers: {
        Cookie: `JSESSIONID=${jsessionid}; MRUB9SSBPRODREGHA=${mruCookie}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });

    const jsonData = response.data;
    const courseData = parseJSON(jsonData, crn);

    if (!courseData) {
      throw new Error(`CRN ${crn} not found in search results`);
    }

    if (saveToFirebase) {
      await saveCourseInfo(courseData);
    }

    console.log(`✅ Successfully fetched data for CRN ${crn}`);
    console.log(`   Seats: ${courseData.seatsAvailable}/${courseData.capacity}`);

    return courseData;
  } catch (error) {
    console.error(`❌ Error fetching course data for CRN ${crn}:`, error.message);
    throw error;
  }
}

function formatTime(timeValue) {
  if (!timeValue || typeof timeValue !== 'string' || timeValue.length !== 4) {
    return '';
  }

  const hours = Number(timeValue.slice(0, 2));
  const minutes = timeValue.slice(2);
  if (Number.isNaN(hours)) {
    return '';
  }

  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = ((hours + 11) % 12) + 1;
  return `${normalizedHours}:${minutes} ${suffix}`;
}

function buildMeetingDays(meetingTime = {}) {
  const dayMap = [
    ['monday', 'Mon'],
    ['tuesday', 'Tue'],
    ['wednesday', 'Wed'],
    ['thursday', 'Thu'],
    ['friday', 'Fri'],
    ['saturday', 'Sat'],
    ['sunday', 'Sun']
  ];

  return dayMap
    .filter(([key]) => meetingTime[key])
    .map(([, label]) => label)
    .join(', ');
}

/**
 * Parse JSON response to extract course information.
 */
function parseJSON(jsonData, targetCrn) {
  try {
    const courses = Array.isArray(jsonData.data) ? jsonData.data : [];
    const target = String(targetCrn);

    const course = courses.find((item) => {
      const courseRef = item.courseReferenceNumber != null ? String(item.courseReferenceNumber) : '';
      const courseDisplay = item.courseDisplay != null ? String(item.courseDisplay) : '';
      return courseRef === target || courseDisplay === target;
    });

    if (!course) {
      return null;
    }

    const meetings = Array.isArray(course.meetingsFaculty) ? course.meetingsFaculty : [];
    const firstMeeting = meetings[0]?.meetingTime || {};
    const faculty = Array.isArray(course.faculty) ? course.faculty : [];
    const primaryFaculty = faculty.find((entry) => entry.primaryIndicator) || faculty[0] || {};

    const seatsAvailable = Number(course.seatsAvailable ?? 0);
    const capacity = Number(course.maximumEnrollment ?? 0);
    const enrollment = Number(course.enrollment ?? Math.max(capacity - seatsAvailable, 0));

    return {
      crn: String(course.courseReferenceNumber ?? targetCrn),
      courseTitle: course.courseTitle || `${course.subject || ''} ${course.courseNumber || ''}`.trim(),
      subject: course.subject || '',
      subjectDescription: course.subjectDescription || '',
      courseNumber: String(course.courseNumber || ''),
      courseDisplay: String(course.courseDisplay || ''),
      seatsAvailable,
      capacity,
      enrollment,
      waitCapacity: Number(course.waitCapacity ?? 0),
      waitCount: Number(course.waitCount ?? 0),
      waitAvailable: Number(course.waitAvailable ?? 0),
      instructor: primaryFaculty.displayName || 'TBA',
      schedule: {
        days: buildMeetingDays(firstMeeting),
        startTime: formatTime(firstMeeting.beginTime),
        endTime: formatTime(firstMeeting.endTime),
        building: firstMeeting.buildingDescription || firstMeeting.building || '',
        room: firstMeeting.room || ''
      },
      term: course.term || jsonData.term || '',
      campusDescription: course.campusDescription || '',
      scheduleTypeDescription: course.scheduleTypeDescription || '',
      instructionalMethodDescription: course.instructionalMethodDescription || '',
      status: seatsAvailable > 0 ? 'OPEN' : 'FULL',
      timestamp: new Date().toISOString(),
      lastChecked: new Date().toLocaleString(),
      rawData: course
    };
  } catch (error) {
    console.error('❌ Error parsing JSON:', error.message);
    return null;
  }
}

/**
 * Save course information to Firebase
 */
async function saveCourseInfo(courseData) {
  try {
    const docRef = db.collection('course_data').doc(courseData.crn);
    await docRef.set({
      courseData: courseData
    });
    console.log(`💾 Saved course ${courseData.crn} to Firebase`);
  } catch (error) {
    console.error('❌ Error saving course info:', error.message);
  }
}

/**
 * Fetch multiple courses
 */
async function fetchMultipleCourses(crns, jsessionid, mruCookie, term = '202701') {
  console.log(`📥 Fetching data for ${crns.length} courses...`);
  
  const results = [];
  
  for (const crn of crns) {
    try {
      const courseData = await fetchCourseData(crn, jsessionid, mruCookie, term);
      results.push(courseData);
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to fetch CRN ${crn}`);
      results.push({
        crn,
        error: error.message,
        status: 'ERROR'
      });
    }
  }
  
  console.log(`✅ Completed fetching ${results.length} courses`);
  return results;
}

module.exports = {
  fetchCourseData,
  fetchMultipleCourses,
  saveCourseInfo
};

