const jwt = require('jsonwebtoken');
const db = require('../db');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Log in to continue.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'Session is no longer valid.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Log in again.' });
  }
}

module.exports = { requireAuth };
