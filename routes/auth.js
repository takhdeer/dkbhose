const { admin, db } = require('../firebase');

async function createUser(email, password) {
  const userRecord = await admin.auth().createUser({ email, password });
  await db.collection('users').doc(userRecord.uid).set({
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    trackedCourses: []
  });
  return userRecord;
}