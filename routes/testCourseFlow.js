const express = require('express');
const { getMRUCookies } = require('../cookieExtractor');
const courseGetter = require('../courseGetter');

const router = express.Router();

/**
 * Test endpoint - Get cookies, fetch course data, and save to Firebase.
 * POST /
 * Mounted at /api/test-course-flow
 */
router.post('/', async (req, res) => {
  try {
    const { username, password, crn } = req.body;

    if (!username || !password || !crn) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and CRN are required'
      });
    }

    console.log('TEST: Starting course flow test...');

    const cookies = await getMRUCookies(username, password);
    const courseData = await courseGetter.fetchCourseData(
      crn,
      cookies.JSESSIONID,
      cookies.MRUB9SSBPRODREGHA
    );

    return res.json({
      success: true,
      message: 'Course flow test completed successfully',
      steps: {
        cookiesExtracted: true,
        dataFetched: true,
        dataSavedToFirebase: true
      },
      courseData: {
        crn: courseData.crn,
        title: courseData.courseTitle,
        seatsAvailable: courseData.seatsAvailable,
        capacity: courseData.capacity,
        status: courseData.status,
        timestamp: courseData.timestamp
      }
    });
  } catch (error) {
    console.error('TEST endpoint error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

module.exports = router;
