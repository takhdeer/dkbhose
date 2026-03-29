const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const emailService = require('./emailService');
const courseGetter = require('./courseGetter');
const db = require('./db');
const pollingEngine = require('./pollingEngine');
const app = express();
const PORT = process.env.PORT || 3001;
app.use(cors());
app.use(express.json());
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

    if (!name || !crn || !email || !JSESSIONIDCookie || !MRUB9SSBPRODREGHACookie) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (!emailService.isConfigured() && emailPassword) {
      await emailService.configure(email, emailPassword);
    }

    const trackedCourse = await db.addTrackedCourse({
      crn,
      userName: name,
      userEmail: email,
      cookies: {
        JSESSIONID: JSESSIONIDCookie,
        MRUB9SSBPRODREGHA: MRUB9SSBPRODREGHACookie
      }
    });

    try {
      await courseGetter.fetchCourseData(
        crn,
        JSESSIONIDCookie,
        MRUB9SSBPRODREGHACookie
      );
    } catch (error) {
      console.error('Error fetching initial course data:', error);
    }

    if (emailService.isConfigured()) {
      await emailService.sendConfirmation(email, name, crn, trackedCourse.id);
    }

    res.json({
      success: true,
      message: 'Course monitoring started successfully',
      sessionId: trackedCourse.id
    });
  } catch (error) {
    console.error('Error in submit:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});

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

app.post('/api/stop-monitor/:id', async (req, res) => {
  try {
    const updated = await db.deactivateTrackedCourse(req.params.id);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Monitor not found'
      });
    }

    res.json({
      success: true,
      message: 'Monitor stopped',
      monitor: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const server = app.listen(PORT, () => {
  pollingEngine.start();
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📧 Email configured: ${emailService.isConfigured()}`);
  console.log(`🔍 Ready to monitor courses!`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /api/configure-email  - Configure email settings');
  console.log('  POST   /api/submit           - Start monitoring a course');
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
