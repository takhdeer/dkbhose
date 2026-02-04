/**
 * Course Availability Service
 * Utility functions for checking course availability from JSON data
 */

/**
 * Check if a course has available seats
 */
function hasAvailableSeats(course) {
  return course.seatsAvailable > 0 && course.openSection === true;
}

/**
 * Find all available courses for a given term and optional subject
 */
function findAvailableCourses(jsonData, term, subject = null) {
  if (!jsonData || !jsonData.data) {
    return [];
  }

  let courses = jsonData.data;

  // Filter by term
  if (term) {
    courses = courses.filter(course => course.term === term);
  }

  // Filter by subject if provided
  if (subject) {
    courses = courses.filter(course => course.subject === subject);
  }

  // Filter for available seats
  courses = courses.filter(hasAvailableSeats);

  // Format the results
  return courses.map(formatCourse);
}

/**
 * Find a specific course by CRN or course code
 */
function findCourseByIdentifier(jsonData, searchTerm) {
  if (!jsonData || !jsonData.data) {
    return null;
  }

  const course = jsonData.data.find(c => 
    c.courseReferenceNumber === searchTerm || 
    c.subjectCourse === searchTerm
  );

  if (!course) {
    return null;
  }

  const formatted = formatCourse(course);
  
  // Log availability info
  console.log('\n=== Course Found ===');
  console.log(`Course: ${formatted.courseCode} - ${formatted.title}`);
  console.log(`CRN: ${formatted.crn}`);
  console.log(`Seats Available: ${formatted.seatsAvailable}/${formatted.maxEnrollment}`);
  console.log(`Status: ${formatted.seatsAvailable > 0 ? 'AVAILABLE' : 'FULL'}`);
  console.log('===================\n');

  return formatted;
}

/**
 * Format course object into simplified structure
 */
function formatCourse(course) {
  const meeting = course.meetingsFaculty?.[0] || {};
  const meetingTime = meeting.meetingTime || {};
  const faculty = course.faculty?.[0] || {};

  return {
    id: course.id,
    crn: course.courseReferenceNumber,
    courseCode: course.subjectCourse,
    courseNumber: course.subjectCourse?.split(' ')[1] || course.courseNumber,
    subject: course.subject,
    title: course.courseTitle,
    term: course.termDesc,
    section: course.sequenceNumber,
    instructor: faculty.displayName || 'TBA',
    seatsAvailable: course.seatsAvailable,
    maxEnrollment: course.maximumEnrollment,
    currentEnrollment: course.enrollment,
    scheduleType: course.scheduleTypeDescription,
    credits: course.creditHourLow || course.creditHours,
    meetingInfo: {
      days: formatDays(meetingTime),
      startTime: meetingTime.beginTime || '',
      endTime: meetingTime.endTime || '',
      building: meetingTime.building || '',
      room: meetingTime.room || '',
      startDate: meetingTime.startDate || '',
      endDate: meetingTime.endDate || ''
    },
    campus: meetingTime.campus || course.campusDescription,
    instructionalMethod: course.instructionalMethod,
    waitlistSeats: course.waitAvailable,
    waitlistCapacity: course.waitCapacity
  };
}

/**
 * Format days from meeting time
 */
function formatDays(meetingTime) {
  if (!meetingTime) return '';
  
  const days = [];
  if (meetingTime.monday) days.push('Mon');
  if (meetingTime.tuesday) days.push('Tue');
  if (meetingTime.wednesday) days.push('Wed');
  if (meetingTime.thursday) days.push('Thu');
  if (meetingTime.friday) days.push('Fri');
  if (meetingTime.saturday) days.push('Sat');
  if (meetingTime.sunday) days.push('Sun');
  
  return days.join(', ');
}

/**
 * Get unique subjects from JSON data
 */
function getUniqueSubjects(jsonData) {
  if (!jsonData || !jsonData.data) {
    return [];
  }

  const subjects = [...new Set(jsonData.data.map(course => course.subject))];
  return subjects.sort();
}

/**
 * Get unique terms from JSON data
 */
function getUniqueTerms(jsonData) {
  if (!jsonData || !jsonData.data) {
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
}

/**
 * Get course statistics
 */
function getCourseStats(jsonData) {
  if (!jsonData || !jsonData.data) {
    return { total: 0, available: 0, full: 0 };
  }

  const total = jsonData.data.length;
  const available = jsonData.data.filter(hasAvailableSeats).length;
  const full = total - available;

  return { total, available, full };
}

module.exports = {
  hasAvailableSeats,
  findAvailableCourses,
  findCourseByIdentifier,
  formatCourse,
  getUniqueSubjects,
  getUniqueTerms,
  getCourseStats
};
