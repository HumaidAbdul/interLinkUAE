
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // 1) Find user
    const [rows] = await db.query(
      `SELECT id, name, email, password, role, status, rejection_reason
         FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });
    const user = rows[0];

    // 2) Check password
    const ok = await bcrypt.compare(password, user.password || '');
    if (!ok) return res.status(401).json({ message: 'Wrong Password' });

    // 3) Status gate (admins bypass)
    const s = String(user.status || '').toLowerCase();
    if (user.role !== 'admin' && s !== 'approved') {
      if (s === 'pending') {
        return res.status(403).json({ code: 'ACCOUNT_PENDING', message: 'Your account is pending approval.' });
      }
      if (s === 'rejected') {
        return res.status(403).json({ code: 'ACCOUNT_REJECTED', message: 'Your account was rejected.', rejection_reason: user.rejection_reason || null });
      }
      return res.status(403).json({ code: 'ACCOUNT_BLOCKED', message: 'Your account is not approved yet.' });
    }

    // 4) Role-specific ids (optional as you had)
    let student_id = null, employer_id = null;
    if (user.role === 'student') {
      const [sRows] = await db.query('SELECT id FROM students WHERE user_id = ? LIMIT 1', [user.id]);
      student_id = sRows[0]?.id ?? null;
    } else if (user.role === 'employer') {
      const [eRows] = await db.query('SELECT id FROM employers WHERE user_id = ? LIMIT 1', [user.id]);
      employer_id = eRows[0]?.id ?? null;
    }

    // 5) Sign JWT here (NO utils file needed)
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        rejection_reason: user.rejection_reason || null,
        student_id,
        employer_id
      }
    });
  } catch (err) {
    console.error('Auth login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (_req, res) => {
  try {
    // If you later switch to httpOnly cookie tokens:
    // res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: false });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('Auth logout error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { login, logout};