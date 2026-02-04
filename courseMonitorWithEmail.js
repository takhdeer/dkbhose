const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const emailService = require('./emailService');

// Store active monitors
const activeMonitors = new Map();

/**
 * Fetch course data from MRU
 */
async function fetchCourseData(crn, jsessionid, mruCookie) {
  const url = 'https://ssb-prod.ec.mru.ca/PROD_Registration/bwckschd.p_get_crse_unsec';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': `JSESSIONID=${jsessionid}; MRUB9SSBPRODREGHA=${mruCookie}`
      },
      body: new URLSearchParams({
        term_in: '202601',
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

    const html = await response.text();
    
    // Parse HTML to extract course information
    const seatsMatch = html.match(/Seats Available:\s*<\/[^>]+>\s*(\d+)/i) || 
                       html.match(/Seats:\s*<\/[^>]+>\s*(\d+)/i);
    const capacityMatch = html.match(/Maximum Enrollment:\s*<\/[^>]+>\s*(\d+)/i) ||
                          html.match(/Capacity:\s*<\/[^>]+>\s*(\d+)/i);
    const enrollmentMatch = html.match(/Current Enrollment:\s*<\/[^>]+>\s*(\d+)/i) ||
                            html.match(/Enrollment:\s*<\/[^>]+>\s*(\d+)/i);
    const courseTitleMatch = html.match(/<th[^>]*class="ddlabel"[^>]*>([^<]+)</i);
    const waitlistMatch = html.match(/Waitlist Seats:\s*<\/[^>]+>\s*(\d+)/i);

    return {
      crn,
      courseTitle: courseTitleMatch ? courseTitleMatch[1].trim() : 'Unknown Course',
      seatsAvailable: seatsMatch ? parseInt(seatsMatch[1]) : 0,
      capacity: capacityMatch ? parseInt(capacityMatch[1]) : 0,
      enrollment: enrollmentMatch ? parseInt(enrollmentMatch[1]) : 0,
      waitlistSeats: waitlistMatch ? parseInt(waitlistMatch[1]) : 0,
      timestamp: new Date().toISOString(),
      lastChecked: new Date().toLocaleString()
    };
  } catch (error) {
    console.error(`Error fetching course data for CRN ${crn}:`, error.message);
    throw error;
  }
}

/**
 * Save course data to classInfo.json
 */
async function saveCourseData(courseData) {
  try {
    const classInfoPath = path.join(__dirname, 'classInfo.json');
    let classInfo = [];
    
    // Read existing data
    try {
      const existingData = await fs.readFile(classInfoPath, 'utf-8');
      classInfo = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist, will create new
    }
    
    // Update or add course data
    const existingIndex = classInfo.findIndex(c => c.crn === courseData.crn);
    if (existingIndex >= 0) {
      classInfo[existingIndex] = courseData;
    } else {
      classInfo.push(courseData);
    }
    
    // Write back to file
    await fs.writeFile(classInfoPath, JSON.stringify(classInfo, null, 2));
    console.log(`💾 Course data saved for CRN ${courseData.crn}`);
  } catch (error) {
    console.error(' Error saving course data:', error.message);
  }
}

/**
 * Monitor a course and send email when seats become available
 */
async function monitorCourse(monitorData) {
  const { sessionId, crn, email, name, cookies, onNotificationSent } = monitorData;
  const monitor = activeMonitors.get(sessionId);
  
  if (!monitor || !monitor.active) {
    console.log(`⏹️  Monitor stopped for session ${sessionId}`);
    return;
  }

  try {
    console.log(`🔍 Checking CRN ${crn}...`);
    
    // Fetch current course data
    const courseData = await fetchCourseData(
      crn,
      cookies.JSESSIONID,
      cookies.MRUB9SSBPRODREGHA
    );
    
    // Save to classInfo.json
    await saveCourseData(courseData);
    
    // Check if seats are available and notification hasn't been sent
    if (courseData.seatsAvailable > 0 && !monitor.notificationSent) {
      console.log(`🎉 Seats available for CRN ${crn}! Sending notification...`);
      
      // Send email notification
      const emailSent = await emailService.sendAvailabilityNotification(email, courseData);
      
      if (emailSent) {
        monitor.notificationSent = true;
        console.log(`Notification sent to ${email}`);
        
        // Call callback if provided
        if (onNotificationSent) {
          onNotificationSent();
        }
      }
    } else if (courseData.seatsAvailable === 0) {
      console.log(`📊 CRN ${crn}: ${courseData.enrollment}/${courseData.capacity} enrolled, 0 seats available`);
    }
    
    // Schedule next check (2 minutes)
    if (monitor.active) {
      monitor.timeoutId = setTimeout(() => monitorCourse(monitorData), 2 * 60 * 1000);
    }
    
  } catch (error) {
    console.error(` Error monitoring CRN ${crn}:`, error.message);
    
    // Retry after 5 minutes on error
    if (monitor && monitor.active) {
      monitor.timeoutId = setTimeout(() => monitorCourse(monitorData), 5 * 60 * 1000);
    }
  }
}

/**
 * Start monitoring a course
 */
function startMonitoring(monitorData) {
  const { sessionId } = monitorData;
  
  if (activeMonitors.has(sessionId)) {
    console.log(`⚠️  Monitor already exists for session ${sessionId}`);
    return false;
  }
  
  // Create monitor entry
  activeMonitors.set(sessionId, {
    active: true,
    notificationSent: false,
    startTime: new Date().toISOString(),
    data: monitorData,
    timeoutId: null
  });
  
  console.log(` Started monitoring CRN ${monitorData.crn} (Session: ${sessionId})`);
  
  // Start monitoring immediately
  monitorCourse(monitorData);
  
  return true;
}

/**
 * Stop monitoring a specific session
 */
function stopMonitoring(sessionId) {
  const monitor = activeMonitors.get(sessionId);
  
  if (!monitor) {
    console.log(`⚠️  No monitor found for session ${sessionId}`);
    return false;
  }
  
  // Mark as inactive
  monitor.active = false;
  
  // Clear timeout if exists
  if (monitor.timeoutId) {
    clearTimeout(monitor.timeoutId);
  }
  
  // Remove from active monitors
  activeMonitors.delete(sessionId);
  
  console.log(`⏹ Stopped monitoring session ${sessionId}`);
  return true;
}

/**
 * Get all active monitors
 */
function getActiveMonitors() {
  return Array.from(activeMonitors.entries()).map(([id, monitor]) => ({
    sessionId: id,
    crn: monitor.data.crn,
    email: monitor.data.email,
    name: monitor.data.name,
    active: monitor.active,
    notificationSent: monitor.notificationSent,
    startTime: monitor.startTime
  }));
}

/**
 * Stop all monitors (for cleanup)
 */
function stopAllMonitors() {
  console.log(`  Stopping all monitors (${activeMonitors.size} active)`);
  
  activeMonitors.forEach((monitor, sessionId) => {
    monitor.active = false;
    if (monitor.timeoutId) {
      clearTimeout(monitor.timeoutId);
    }
  });
  
  activeMonitors.clear();
  console.log(' All monitors stopped');
}

// Graceful shutdown
process.on('SIGTERM', stopAllMonitors);
process.on('SIGINT', stopAllMonitors);

module.exports = {
  startMonitoring,
  stopMonitoring,
  getActiveMonitors,
  stopAllMonitors,
  fetchCourseData,
  saveCourseData
};
