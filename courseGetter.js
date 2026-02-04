const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

/**
 * Fetch course data from MRU registration system
 */
async function fetchCourseData(crn, jsessionid, mruCookie) {
  const url = 'https://ssb-prod.ec.mru.ca/PROD_Registration/bwckschd.p_get_crse_unsec';
  
  console.log(` Fetching data for CRN: ${crn}`);
  
  try {
    const response = await fetch(url, {
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

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    
    // Parse course information from HTML
    const courseData = parseHTML(html, crn);
    
    // Save to classInfo.json
    await saveCourseInfo(courseData);
    
    console.log(` Successfully fetched data for CRN ${crn}`);
    console.log(`   Seats: ${courseData.seatsAvailable}/${courseData.capacity}`);
    
    return courseData;
    
  } catch (error) {
    console.error(`Error fetching course data for CRN ${crn}:`, error.message);
    throw error;
  }
}

/**
 * Parse HTML response to extract course information
 */
function parseHTML(html, crn) {
  try {
    // Extract course title
    const titleMatch = html.match(/<th[^>]*class="ddlabel"[^>]*>([^<]+)<\/th>/i);
    const courseTitle = titleMatch ? titleMatch[1].trim() : 'Unknown Course';
    
    // Extract subject and course number
    const subjectMatch = courseTitle.match(/^([A-Z]{4})\s+(\d{4})/);
    const subject = subjectMatch ? subjectMatch[1] : '';
    const courseNumber = subjectMatch ? subjectMatch[2] : '';
    
    // Extract seats information
    const seatsMatch = html.match(/Seats Available:\s*<\/[^>]+>\s*(\d+)/i) || 
                       html.match(/Seats:\s*<\/[^>]+>\s*(\d+)/i);
    const seatsAvailable = seatsMatch ? parseInt(seatsMatch[1]) : 0;
    
    // Extract capacity
    const capacityMatch = html.match(/Maximum Enrollment:\s*<\/[^>]+>\s*(\d+)/i) ||
                          html.match(/Capacity:\s*<\/[^>]+>\s*(\d+)/i);
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : 0;
    
    // Extract enrollment
    const enrollmentMatch = html.match(/Current Enrollment:\s*<\/[^>]+>\s*(\d+)/i) ||
                            html.match(/Enrollment:\s*<\/[^>]+>\s*(\d+)/i);
    const enrollment = enrollmentMatch ? parseInt(enrollmentMatch[1]) : 0;
    
    // Extract waitlist info
    const waitlistSeatsMatch = html.match(/Waitlist Seats:\s*<\/[^>]+>\s*(\d+)/i);
    const waitlistSeats = waitlistSeatsMatch ? parseInt(waitlistSeatsMatch[1]) : 0;
    
    const waitlistCapacityMatch = html.match(/Waitlist Capacity:\s*<\/[^>]+>\s*(\d+)/i);
    const waitlistCapacity = waitlistCapacityMatch ? parseInt(waitlistCapacityMatch[1]) : 0;
    
    // Extract instructor
    const instructorMatch = html.match(/Instructor:\s*<\/[^>]+>\s*([^<]+)/i);
    const instructor = instructorMatch ? instructorMatch[1].trim() : 'TBA';
    
    // Extract meeting times
    const timeMatch = html.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
    const startTime = timeMatch ? timeMatch[1] : '';
    const endTime = timeMatch ? timeMatch[2] : '';
    
    // Extract days
    const daysMatch = html.match(/>(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[\s,]*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)?/gi);
    const days = daysMatch ? daysMatch.map(d => d.replace('>', '').trim()).join(', ') : '';
    
    // Extract location
    const locationMatch = html.match(/Building:\s*<\/[^>]+>\s*([^<]+)/i);
    const building = locationMatch ? locationMatch[1].trim() : '';
    
    const roomMatch = html.match(/Room:\s*<\/[^>]+>\s*([^<]+)/i);
    const room = roomMatch ? roomMatch[1].trim() : '';
    
    return {
      crn,
      courseTitle,
      subject,
      courseNumber,
      seatsAvailable,
      capacity,
      enrollment,
      waitlistSeats,
      waitlistCapacity,
      instructor,
      schedule: {
        days,
        startTime,
        endTime,
        building,
        room
      },
      status: seatsAvailable > 0 ? 'OPEN' : 'FULL',
      timestamp: new Date().toISOString(),
      lastChecked: new Date().toLocaleString()
    };
  } catch (error) {
    console.error(' Error parsing HTML:', error.message);
    return {
      crn,
      courseTitle: 'Error parsing course data',
      seatsAvailable: 0,
      capacity: 0,
      enrollment: 0,
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

/**
 * Save course information to classInfo.json
 */
async function saveCourseInfo(courseData) {
  try {
    const filePath = path.join(__dirname, 'classInfo.json');
    let courses = [];
    
    // Read existing data
    try {
      const existingData = await fs.readFile(filePath, 'utf-8');
      courses = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, will create new
    }
    
    // Update or add course
    const existingIndex = courses.findIndex(c => c.crn === courseData.crn);
    if (existingIndex >= 0) {
      courses[existingIndex] = courseData;
    } else {
      courses.push(courseData);
    }
    
    // Write to file
    await fs.writeFile(filePath, JSON.stringify(courses, null, 2));
    console.log(`💾 Saved course data to classInfo.json`);
    
  } catch (error) {
    console.error('Error saving course info:', error.message);
  }
}

/**
 * Fetch multiple courses
 */
async function fetchMultipleCourses(crns, jsessionid, mruCookie) {
  console.log(`📥 Fetching data for ${crns.length} courses...`);
  
  const results = [];
  
  for (const crn of crns) {
    try {
      const courseData = await fetchCourseData(crn, jsessionid, mruCookie);
      results.push(courseData);
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(` Failed to fetch CRN ${crn}`);
      results.push({
        crn,
        error: error.message,
        status: 'ERROR'
      });
    }
  }
  
  console.log(`Completed fetching ${results.length} courses`);
  return results;
}

module.exports = {
  fetchCourseData,
  fetchMultipleCourses,
  saveCourseInfo
};
