const { fetchCourseData } = require('./courseGetter');
const emailService = require('./emailService');
const db = require('./db');

const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS || 120000);

let timer = null;
let cycleInProgress = false;
let startedAt = null;
let cycleCount = 0;

async function runPollingCycle() {
  if (cycleInProgress) {
    return;
  }

  cycleInProgress = true;
  cycleCount += 1;
  console.log(`[${new Date().toISOString()}] Polling cycle #${cycleCount} started`);

  try {
    const trackedCourses = await db.getActiveTrackedCourses();
    console.log(`Active monitors: ${trackedCourses.length}`);

    for (const course of trackedCourses) {
      try {
        const currentData = await fetchCourseData(
          course.crn,
          course.cookies?.JSESSIONID,
          course.cookies?.MRUB9SSBPRODREGHA
        );

        const lastHistory = await db.getLastSeatHistory(course.crn);
        const lastSeats = lastHistory ? lastHistory.seatsAvailable : null;

        await db.addSeatHistory(course.crn, currentData.seatsAvailable);

        if (lastSeats !== currentData.seatsAvailable) {
          console.log(
            `Seat change for CRN ${course.crn}: ${lastSeats === null ? 'n/a' : lastSeats} -> ${currentData.seatsAvailable}`
          );
        }

        if (currentData.seatsAvailable > 0 && !course.notificationSent && emailService.isConfigured()) {
          const sent = await emailService.sendAvailabilityNotification(course.userEmail, currentData);
          if (sent) {
            await db.updateTrackedCourse(course.id, {
              notificationSent: true,
              notifiedAt: new Date().toISOString()
            });
            console.log(`Notification sent for CRN ${course.crn}`);
          }
        }

        await db.updateTrackedCourse(course.id, {
          lastChecked: new Date().toISOString(),
          lastSeatsAvailable: currentData.seatsAvailable,
          lastError: null
        });
      } catch (error) {
        await db.updateTrackedCourse(course.id, {
          lastChecked: new Date().toISOString(),
          lastError: error.message
        });
        console.error(`Error checking CRN ${course.crn}: ${error.message}`);
      }
    }
  } finally {
    cycleInProgress = false;
    console.log(`[${new Date().toISOString()}] Polling cycle #${cycleCount} completed`);
  }
}

function start() {
  if (timer) {
    return false;
  }

  startedAt = new Date().toISOString();
  timer = setInterval(() => {
    runPollingCycle().catch((error) => {
      console.error('Polling cycle failed:', error.message);
    });
  }, pollIntervalMs);

  runPollingCycle().catch((error) => {
    console.error('Initial polling cycle failed:', error.message);
  });

  console.log(`Polling engine started, interval: ${pollIntervalMs}ms`);
  return true;
}

function stop() {
  if (!timer) {
    return false;
  }

  clearInterval(timer);
  timer = null;
  console.log('Polling engine stopped');
  return true;
}

function getStatus() {
  return {
    running: Boolean(timer),
    intervalMs: pollIntervalMs,
    startedAt,
    cycleInProgress,
    cycleCount
  };
}

module.exports = {
  start,
  stop,
  runPollingCycle,
  getStatus
};