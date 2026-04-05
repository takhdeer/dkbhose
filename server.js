const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const {getMRUCookies, clearCookies} = require('./cookieExtractor');
const authMiddleware = require('./middleware/authMiddleware');

const emailService = require('./emailService');
const courseGetter = require('./courseGetter');
const db = require('./db');
const pollingEngine = require('./pollingEngine');
const testCourseFlowRoute = require('./routes/testCourseFlow');
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
app.use('/api/test-course-flow', testCourseFlowRoute);
app.post('/api/configure-email', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const configured = await emailService.configure(email, password);


      /**
       * Debug endpoint - Fetch raw JSON from MRU API to inspect structure
       * POST /api/debug-course-json
       * Request body: { username, password }
       */
      app.post('/api/debug-course-json', async (req, res) => {
        try {
          const { username, password, term = '202701' } = req.body;

          if (!username || !password) {
            return res.status(400).json({
              success: false,
              message: 'Username and password are required'
            });
          }

          console.log('🧪 [DEBUG] Fetching raw JSON response...');
    
          // Get cookies
          const cookies = await getMRUCookies(username, password);
          console.log('✅ [DEBUG] Cookies obtained');

          // Manually call the URL to see raw response
          const fetch = await import('node-fetch').then(m => m.default);
          const url = new URL('https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/searchResults/searchResults');
          url.searchParams.append('txt_term', term);
          url.searchParams.append('startDatepicker', '');
          url.searchParams.append('endDatepicker', '');
          url.searchParams.append('pageOffset', '0');
          url.searchParams.append('pageMaxSize', '5');
          url.searchParams.append('sortColumn', 'subjectDescription');
          url.searchParams.append('sortDirection', 'asc');

          console.log('📥 [DEBUG] Calling URL:', url.toString());
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Cookie': `JSESSIONID=${cookies.JSESSIONID}; MRUB9SSBPRODREGHA=${cookies.MRUB9SSBPRODREGHA}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            return res.status(response.status).json({
              success: false,
              status: response.status,
              statusText: response.statusText
            });
          }

          const jsonData = await response.json();
          console.log('✅ [DEBUG] Raw JSON fetched successfully');

          res.json({
            success: true,
            message: 'Raw JSON response from MRU API',
            structure: {
              dataType: typeof jsonData.data,
              dataLength: Array.isArray(jsonData.data) ? jsonData.data.length : 'not-array',
              firstItemKeys: jsonData.data && jsonData.data.length > 0 ? Object.keys(jsonData.data[0]) : []
            },
            data: jsonData
          });
        } catch (error) {
          console.error('❌ [DEBUG] Error:', error.message);
          res.status(500).json({
            success: false,
            message: 'Debug failed',
            error: error.message
          });
        }
      });


      /**
       * Debug endpoint - Fetch raw JSON from MRU API to inspect structure
       * POST /api/debug-course-json
       * Request body: { username, password }
       */
      app.post('/api/debug-course-json', async (req, res) => {
        try {
          const { username, password, term = '202701' } = req.body;

          if (!username || !password) {
            return res.status(400).json({
              success: false,
              message: 'Username and password are required'
            });
          }

          console.log('🧪 [DEBUG] Fetching raw JSON response...');
    
          // Get cookies
          const cookies = await getMRUCookies(username, password);
          console.log('✅ [DEBUG] Cookies obtained');

          // Manually call the URL to see raw response
          const fetch = await import('node-fetch').then(m => m.default);
          const url = new URL('https://ban9ssb-prod.mtroyal.ca/StudentRegistrationSsb/ssb/searchResults/searchResults');
          url.searchParams.append('txt_term', term);
          url.searchParams.append('startDatepicker', '');
          url.searchParams.append('endDatepicker', '');
          url.searchParams.append('pageOffset', '0');
          url.searchParams.append('pageMaxSize', '10');
          url.searchParams.append('sortColumn', 'subjectDescription');
          url.searchParams.append('sortDirection', 'asc');

          console.log('📥 [DEBUG] Calling URL:', url.toString());
          const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
              'Cookie': `JSESSIONID=${cookies.JSESSIONID}; MRUB9SSBPRODREGHA=${cookies.MRUB9SSBPRODREGHA}`,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json'
            }
          });

          if (!response.ok) {
            return res.status(response.status).json({
              success: false,
              status: response.status,
              statusText: response.statusText
            });
          }

          const jsonData = await response.json();
          console.log('✅ [DEBUG] Raw JSON fetched successfully');

          res.json({
            success: true,
            message: 'Raw JSON response from MRU API',
            structure: {
              dataType: typeof jsonData.data,
              dataLength: Array.isArray(jsonData.data) ? jsonData.data.length : 'not-array',
              firstItemKeys: jsonData.data && jsonData.data.length > 0 ? Object.keys(jsonData.data[0]) : []
            },
            data: jsonData
          });
        } catch (error) {
          console.error('❌ [DEBUG] Error:', error.message);
          res.status(500).json({
            success: false,
            message: 'Debug failed',
            error: error.message
          });
        }
      });
    if (configured) {
      res.json({
        success: true,
        message: 'Email configured successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to configure email. Please check your credentials.'
      });
    }
  } catch (error) {
    console.error('Error configuring email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to configure email'
    });
  }
});

/**
 * Submit form and start monitoring - integrates with your existing codemm
 */
app.post('/api/submit', authMiddleware, async (req, res) => {
  try {                                          // ← try opens here
    let { JSESSIONIDCookie, MRUB9SSBPRODREGHACookie } = req.body;
    const { name: StudentName, crn, email, emailPassword, mruUsername, mruPassword } = req.body;

    // Auto-fetch cookies if not provided
    if ((!JSESSIONIDCookie || !MRUB9SSBPRODREGHACookie) && mruUsername && mruPassword) {
      const cookies = await getMRUCookies(mruUsername, mruPassword);
      JSESSIONIDCookie = cookies.jsessionid;
      MRUB9SSBPRODREGHACookie = cookies.mruCookie;
    }

    if (!StudentName || !crn || !email || !JSESSIONIDCookie || !MRUB9SSBPRODREGHACookie) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    //                                           ← no }); here, stay inside the function

    if (!emailService.isConfigured() && emailPassword) {
      await emailService.configure(email, emailPassword);
    }

    // Create session data
    const sessionData = {
      StudentName,
      crn,
      userName: name,
      userEmail: email,
      cookies: {
        JSESSIONID: JSESSIONIDCookie,
        MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie
      }
    };

    // Fetch initial course data
    try {
      await courseGetter.fetchCourseData(crn, JSESSIONIDCookie, MRUB9SSBPRODREGHACookie);
    } catch (error) {
      console.error('Error fetching initial course data:', error);
    }

    // Start monitoring
    courseMonitor.startMonitoring({
      crn, email, StudentName,
      cookies: {
        JSESSIONID: JSESSIONIDCookie,
        MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie
      },
      sessionId,
      onNotificationSent: () => {
        const session = activeSessions.get(sessionId);
        if (session) session.notificationSent = true;
      }
    });

      // Start server
    if (isEmailConfigured) {
      await emailService.sendConfirmation(email, StudentName  , crn, sessionId);
    }

    res.json({ success: true, message: 'Course monitoring started successfully', sessionId });

  } catch (error) {                              
    console.error('Error in submit:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});                                              
/**
 * Get current course information from classInfo.json
 */
app.get('/api/course-info', async (req, res) => {
  try {
    const classInfoPath = path.join(__dirname, 'classInfo.json');

    try {
      const data = await fs.readFile(classInfoPath, 'utf-8');
      const courses = JSON.parse(data);
      res.json(courses);
    } catch (error) {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading course info:', error);
    res.json([]);
  }
});

app.get('/api/monitors', async (req, res) => {
  try {
    const activeCourses = await db.getActiveTrackedCourses();
    const monitors = activeCourses.map(c => ({
      id: c.id,
      name: c.userName,
      crn: c.crn,
      email: c.userEmail,
      startTime: c.startedAt,
      active: c.active,
      notificationSent: c.notificationSent,
      lastChecked: c.lastChecked,
      lastSeatsAvailable: c.lastSeatsAvailable,
      lastError: c.lastError
    }));
    res.json({ success: true, monitors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/available-courses', async (req, res) => {
  try {
    const { term, subject } = req.query;
    const searchResultsPath = path.join(__dirname, 'searchResults.json');

    try {
      const data = await fs.readFile(searchResultsPath, 'utf-8');
      const searchResults = JSON.parse(data);
      const courseAvailabilityService = require('./courseAvailabilityService');
      const availableCourses = courseAvailabilityService.findAvailableCourses(
        searchResults,
        term,
        subject
      );
      
      res.json({
        success: true,
        courses: availableCourses
      });
    } catch (error) {
      res.json({
        success: true,
        courses: []
      });
    }
  } catch (error) {
    console.error('Error getting available courses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available courses'
    });
  }
});

app.get('/api/health', (req, res) => {
  const pollingStatus = pollingEngine.getStatus();
  res.json({
    success: true,
    status: 'running',
    emailConfigured: emailService.isConfigured(),
    polling: pollingStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status', (req, res) => {
  const pollingStatus = pollingEngine.getStatus();
  res.json({
    success: true,
    emailConfigured: emailService.isConfigured(),
    polling: pollingStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

app.post('/api/auto-login', async (req,res) => {
  try {
    const {username , password} = req.body;
    if (!username || password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const cookies = await getMRUcookies(username, password);
    res.json({ sucess: true, ...cookies});
  } catch (error) {
    console.error("Auto-login failed", error);
    res.status(500).json({success: false, message: error.message});
  }
}); 

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Email configured: ${emailService.isConfigured()}`);
  console.log(`🔍 Ready to monitor courses!`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /api/configure-email  - Configure email settings');
  console.log('  POST   /api/submit           - Start monitoring a course');
  console.log('  POST   /api/test-course-flow - Test: cookies → fetch → Firebase');
  console.log('  GET    /api/course-info      - Get course information');
  console.log('  GET    /api/monitors         - Get active monitors');
  console.log('  POST   /api/stop-monitor/:id - Stop a monitor');
  console.log('  GET    /api/health           - Health check');
  console.log('  GET    /api/available-courses - Get available courses');
  console.log('  GET    /api/status           - Polling + server status');
});

function shutdown() {
  console.log('Shutdown signal received: closing HTTP server');
  pollingEngine.stop();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;
