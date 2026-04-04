const { admin } = require('../firebase');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log('Auth header:', authHeader?.substring(0, 50)); // log first 50 chars
  
  const token = authHeader?.split('Bearer ')[1];
  console.log('Token first 20 chars:', token?.substring(0, 20));
  
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('Token verification error:', err.message);
    res.status(401).json({ error: 'Invalid token', detail: err.message });
  }
}

module.exports = authMiddleware;