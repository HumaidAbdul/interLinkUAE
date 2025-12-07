// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db  = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const PUBLIC = [
  /^\/api\/auth\/login\/?$/i,
  /^\/api\/student\/register\/?$/i,
  /^\/api\/employer\/register\/?$/i,
];

module.exports = async (req, res, next) => {
  const pathOnly = (req.originalUrl || '').split('?')[0];

  // Allow CORS preflight and public routes
  if (req.method === 'OPTIONS' || PUBLIC.some(rx => rx.test(pathOnly))) return next();

  try {
    const h = req.headers.authorization || req.headers.Authorization || '';
    let token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token && req.cookies) token = req.cookies.token;        // optional, if you ever switch to cookies

    if (!token) return res.status(401).json({ message: 'No token provided' });

    // verify using the SAME secret used in login
    const decoded = jwt.verify(token, JWT_SECRET);

    // confirm user still exists / fetch role
    const [rows] = await db.query(
      'SELECT id, role, status, rejection_reason FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    if (!rows.length) return res.status(401).json({ message: 'User not found' });

    req.user = rows[0];       // { id, role, status, ... }
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid/expired token' });
  }
};
