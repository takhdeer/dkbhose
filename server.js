const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import your existing services
const emailService = require('./emailService');
const courseMonitor = require('./courseMonitorWithEmail');
const courseGetter = require('./courseGetter');
const app = express();
const PORT = process.env.PORT || 5000;


app.use(cors());
app.use(express.json());

// Store for active monitoring sessions
const activeSessions = new Map();

// Email configuration state
let isEmailConfigured = false;

// API Routes

/**
 * Configure email settings via web UI
 */
app.post('/api/configure-email', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Initialize email service with provided credentials
    const configured = await emailService.configure(email, password);
    
    if (configured) {
      isEmailConfigured = true;
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
 * Submit form and start monitoring - integrates with your existing code
 */
app.post('/api/submit', async (req, res) => {
  try {
    const { 
      name, 
      crn, 
      email, 
      JSESSIONIDCookie, 
      MRUB9SSBPRODREGHACookie,
      emailPassword 
    } = req.body;

    // Validate required fields
    if (!name || !crn || !email || !JSESSIONIDCookie || !MRUB9SSBPRODREGHACookie) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // If email not configured and password provided, configure it
    if (!isEmailConfigured && emailPassword) {
      await emailService.configure(email, emailPassword);
      isEmailConfigured = true;
    }

    // Create session data
    const sessionData = {
      name,
      crn,
      email,
      cookies: {
        JSESSIONID: JSESSIONIDCookie,
        MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie
      },
      startTime: new Date().toISOString(),
      active: true,
      notificationSent: false
    };

    const sessionId = `${crn}-${Date.now()}`;
    activeSessions.set(sessionId, sessionData);

    // Start course getter to fetch initial data
    try {
      await courseGetter.fetchCourseData(
        crn,
        JSESSIONIDCookie,
        MRUB9SSBPRODREGHACookie
      );
    } catch (error) {
      console.error('Error fetching initial course data:', error);
    }

    // Start monitoring with your existing courseMonitor
    courseMonitor.startMonitoring({
      crn,
      email,
      name,
      cookies: {
        JSESSIONID: JSESSIONIDCookie,
        MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie
      },
      sessionId,
      onNotificationSent: () => {
        const session = activeSessions.get(sessionId);
        if (session) {
          session.notificationSent = true;
        }
      }
    });

    // Send confirmation email if email is configured
    if (isEmailConfigured) {
      await emailService.sendConfirmation(email, name, crn, sessionId);
    }

    res.json({
      success: true,
      message: 'Course monitoring started successfully',
      sessionId
    });

  } catch (error) {
    console.error('Error in submit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
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
      // File doesn't exist yet or is empty
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading course info:', error);
    res.json([]);
  }
});

/**
 * Get all active monitoring sessions
 */
app.get('/api/monitors', (req, res) => {
  try {
    const monitors = Array.from(activeSessions.entries()).map(([id, session]) => ({
      id,
      name: session.name,
      crn: session.crn,
      email: session.email,
      startTime: session.startTime,
      active: session.active,
      notificationSent: session.notificationSent
    }));

    res.json({
      success: true,
      monitors
    });
  } catch (error) {
    console.error('Error getting monitors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monitors'
    });
  }
});

/**
 * Stop a specific monitoring session
 */
app.post('/api/stop-monitor/:id', (req, res) => {
  try {
    const { id } = req.params;
    const session = activeSessions.get(id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    // Mark as inactive and stop monitoring
    session.active = false;
    courseMonitor.stopMonitoring(id);

    res.json({
      success: true,
      message: 'Monitor stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping monitor:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop monitor'
    });
  }
});

/**
 * Get available courses from searchResults.json
 */
app.get('/api/available-courses', async (req, res) => {
  try {
    const { term, subject } = req.query;
    const searchResultsPath = path.join(__dirname, 'searchResults.json');
    
    try {
      const data = await fs.readFile(searchResultsPath, 'utf-8');
      const searchResults = JSON.parse(data);
      
      // Use your existing courseAvailabilityService if available
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

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'running',
    emailConfigured: isEmailConfigured,
    activeMonitors: activeSessions.size,
    uptime: process.uptime()
  });
});

/**
 * Get server status and statistics
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    emailConfigured: isEmailConfigured,
    activeSessions: activeSessions.size,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Email configured: ${isEmailConfigured}`);
  console.log(`🔍 Ready to monitor courses!`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /api/configure-email  - Configure email settings');
  console.log('  POST   /api/submit           - Start monitoring a course');
  console.log('  GET    /api/course-info      - Get course information');
  console.log('  GET    /api/monitors         - Get active monitors');
  console.log('  POST   /api/stop-monitor/:id - Stop a monitor');
  console.log('  GET    /api/health           - Health check');
  console.log('  GET    /api/available-courses - Get available courses');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
