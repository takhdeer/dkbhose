const authMiddleware = require('./authMiddleware');

app.get('/api/user/courses', authMiddleware, async (req, res) => {
  const userDoc = await db.collection('users').doc(req.user.uid).get();
  res.json(userDoc.data().trackedCourses);
});

app.post('/api/courses', authMiddleware, async (req, res) => {
  const { crn, courseName } = req.body;
  await db.collection('users').doc(req.user.uid).update({
    trackedCourses: admin.firestore.FieldValue.arrayUnion({
      crn, courseName, notifyOnOpen: true, lastNotifiedAt: null
    })
  });
  // also add to global trackedCourses collection
  await db.collection('trackedCourses').doc(crn).set({
    courseName, availableSeats: null, lastCheckedAt: null,
    subscribers: admin.firestore.FieldValue.arrayUnion(req.user.uid)
  }, { merge: true });
  res.json({ success: true });
});