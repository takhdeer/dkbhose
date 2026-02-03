/**
 * Course Availability Service
 * Handles parsing and checking course availability from API JSON data
 */

/** Commented out as testing is not needed */
/**
 * Checks if a specific course has available seats
 * @param {Object} course - The course object from JSON data
 * @returns {boolean} - True if seats are available

export const hasAvailableSeats = (course) => {
  if (!course) return false;
  
  return course.seatsAvailable > 0 && course.openSection === true;
};

/**
 * Finds available courses for a specific term and subject
 * @param {Object} jsonData - The complete JSON response object
 * @param {string} term - The term code to filter by (e.g., "202601")
 * @param {string} subject - Optional subject code to filter by (e.g., "COMP")
 * @returns {Array} - Array of available courses with relevant info
 */
export const findAvailableCourses = (jsonData, term, subject = null) => {
  if (!jsonData?.success || !Array.isArray(jsonData.data)) {
    console.error('Invalid JSON data structure');
    return [];
  }

  const courses = jsonData.data;
  
  const availableCourses = courses.filter(course => {
    const matchesTerm = course.term === term;
    const matchesSubject = subject ? course.subject === subject : true;
    const hasSeats = hasAvailableSeats(course);
    
    return matchesTerm && matchesSubject && hasSeats;
  });

  return availableCourses.map(course => ({
    id: course.id,
    crn: course.courseReferenceNumber,
    courseCode: course.subjectCourse,
    courseNumber: course.courseNumber,
    subject: course.subject,
    title: course.courseTitle,
    term: course.termDesc,
    section: course.sequenceNumber,
    instructor: course.faculty[0]?.displayName || 'TBA',
    seatsAvailable: course.seatsAvailable,
    maxEnrollment: course.maximumEnrollment,
    currentEnrollment: course.enrollment,
    scheduleType: course.scheduleTypeDescription,
    credits: course.creditHours,
    meetingInfo: extractMeetingInfo(course.meetingsFaculty),
    campus: course.campusDescription,
    instructionalMethod: course.instructionalMethodDescription
  }));
};

/**
 * Extracts meeting time information from meetingsFaculty array
 * @param {Array} meetingsFaculty 
 * @returns {Object}
 */
const extractMeetingInfo = (meetingsFaculty) => {
  if (!meetingsFaculty || meetingsFaculty.length === 0) {
    return null;
  }

  const meeting = meetingsFaculty[0]?.meetingTime;
  if (!meeting) return null;

  const days = [];
  if (meeting.monday) days.push('Mon');
  if (meeting.tuesday) days.push('Tue');
  if (meeting.wednesday) days.push('Wed');
  if (meeting.thursday) days.push('Thu');
  if (meeting.friday) days.push('Fri');
  if (meeting.saturday) days.push('Sat');
  if (meeting.sunday) days.push('Sun');

  return {
    days: days.join(', '),
    startTime: formatTime(meeting.beginTime),
    endTime: formatTime(meeting.endTime),
    building: meeting.buildingDescription,
    room: meeting.room,
    startDate: meeting.startDate,
    endDate: meeting.endDate
  };
};

/**
 * Formats military time to standard 12-hour format
 * @param {string} time - Military time string (e.g., "1000")
 * @returns {string} - Formatted time (e.g., "10:00 AM")
 */
const formatTime = (time) => {
  if (!time || time.length !== 4) return '';
  
  const hours = parseInt(time.substring(0, 2));
  const minutes = time.substring(2, 4);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  
  return `${displayHours}:${minutes} ${period}`;
};

/**
 * Searches for a specific course by CRN or course code
 * @param {Object} jsonData - The complete JSON response object
 * @param {string} searchTerm - CRN or course code (e.g., "13254" or "COMP1701")
 * @returns {Object|null} - Course object if found, null otherwise
 */
export const findCourseByIdentifier = (jsonData, searchTerm) => {
  if (!jsonData?.success || !Array.isArray(jsonData.data)) {
    return null;
  }

  const course = jsonData.data.find(c => 
    c.courseReferenceNumber === searchTerm || 
    c.subjectCourse === searchTerm
  );

  if (!course) {
    console.log(`Course not found: ${searchTerm}`);
    return null;
  }

  if (hasAvailableSeats(course)) {
    console.log(`   AVAILABLE: ${course.subjectCourse} - ${course.courseTitle}`);
    console.log(`   Seats: ${course.seatsAvailable}/${course.maximumEnrollment}`);
    console.log(`   CRN: ${course.courseReferenceNumber}`);
    console.log(`   Instructor: ${course.faculty[0]?.displayName || 'TBA'}`);
  } else {
    console.log(`   FULL: ${course.subjectCourse} - ${course.courseTitle}`);
    console.log(`   Seats: ${course.seatsAvailable}/${course.maximumEnrollment}`);
    if (course.waitAvailable > 0) {
      console.log(`   Waitlist: ${course.waitAvailable} spots available`);
    }
  }

  return course;
};

/**
 * Gets all unique subjects from the data
 * @param {Object} jsonData
 * @returns {Array}
 */
export const getUniqueSubjects = (jsonData) => {
  if (!jsonData?.success || !Array.isArray(jsonData.data)) {
    return [];
  }

  const subjects = [...new Set(jsonData.data.map(course => course.subject))];
  return subjects.sort();
};

/**
 * Gets all unique terms from the data
 * @param {Object} jsonData
 * @returns {Array}
 */
export const getUniqueTerms = (jsonData) => {
  if (!jsonData?.success || !Array.isArray(jsonData.data)) {
    return [];
  }

  const termsMap = new Map();
  jsonData.data.forEach(course => {
    if (!termsMap.has(course.term)) {
      termsMap.set(course.term, {
        code: course.term,
        description: course.termDesc
      });
    }
  });

  return Array.from(termsMap.values());
};

export default {
  hasAvailableSeats,
  findAvailableCourses,
  findCourseByIdentifier,
  getUniqueSubjects,
  getUniqueTerms
};