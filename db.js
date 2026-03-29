const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'trackingData.json');

function getDefaultData() {
  return {
    trackedCourses: [],
    seatHistory: []
  };
}

async function loadDB() {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      const seed = getDefaultData();
      await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2));
      return seed;
    }
    throw error;
  }
}

async function saveDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

function makeCourseId(crn) {
  return `${crn}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function addTrackedCourse(payload) {
  const db = await loadDB();
  const course = {
    id: makeCourseId(payload.crn),
    crn: payload.crn,
    userName: payload.userName,
    userEmail: payload.userEmail,
    cookies: payload.cookies,
    active: true,
    notificationSent: false,
    startedAt: new Date().toISOString(),
    lastChecked: null,
    lastSeatsAvailable: null,
    lastError: null
  };
  db.trackedCourses.push(course);
  await saveDB(db);
  return course;
}

async function getActiveTrackedCourses() {
  const db = await loadDB();
  return db.trackedCourses.filter((course) => course.active);
}

async function updateTrackedCourse(id, updates) {
  const db = await loadDB();
  const idx = db.trackedCourses.findIndex((course) => course.id === id);
  if (idx < 0) {
    return null;
  }
  db.trackedCourses[idx] = { ...db.trackedCourses[idx], ...updates };
  await saveDB(db);
  return db.trackedCourses[idx];
}

async function deactivateTrackedCourse(id) {
  return updateTrackedCourse(id, { active: false, stoppedAt: new Date().toISOString() });
}

async function addSeatHistory(crn, seatsAvailable) {
  const db = await loadDB();
  const record = {
    id: `${crn}-${Date.now()}`,
    crn,
    seatsAvailable,
    checkedAt: new Date().toISOString()
  };
  db.seatHistory.push(record);
  await saveDB(db);
  return record;
}

async function getLastSeatHistory(crn) {
  const db = await loadDB();
  const items = db.seatHistory.filter((h) => h.crn === crn);
  return items.length ? items[items.length - 1] : null;
}

module.exports = {
  addTrackedCourse,
  getActiveTrackedCourses,
  updateTrackedCourse,
  deactivateTrackedCourse,
  addSeatHistory,
  getLastSeatHistory
};