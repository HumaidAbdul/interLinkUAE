// server.js  (all-in-one backend demo)
// npm i express multer bcrypt mysql2
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db'); // your mysql2/promise pool

const app = express();
app.use(express.json());


const registerStudent = async (req, res) => {
  const { full_name, name, email, password, university, major } = req.body || {};
  const displayName = (full_name || name || '').trim();
  if (!displayName || !email || !password || !university || !major) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  try {
    const [dup] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (dup.length) return res.status(400).json({ message: 'Email already registered' });

    const cv  = req.files?.cv?.[0]?.filename || null;
    const img = req.files?.profile_image?.[0]?.filename || null;

    const hashed = await bcrypt.hash(password, 10);

    const [u] = await db.query(
      `INSERT INTO users (name,email,password,role,status) VALUES (?,?,?,?,?)`,
      [displayName, email, hashed, 'student', 'approved']
    );
    await db.query(
      `INSERT INTO students (user_id,university,major,cv_link,profile_image)
       VALUES (?,?,?,?,?)`,
      [u.insertId, university, major, cv, img]
    );

    res.status(201).json({ message: 'Account created. You can log in now.' });
  } catch (err) {
    console.error('registerStudent error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { current_password, new_password, confirm_password } = req.body || {};

    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }
    if (new_password.length < 8 || !/[A-Za-z]/.test(new_password) || !/\d/.test(new_password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include letters and numbers'
      });
    }
    if (new_password === current_password) {
      return res.status(400).json({ message: 'New password must be different' });
    }

    // confirm user exists and is a student
    const [[u]] = await db.query(
      'SELECT id, role, password FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role !== 'student') {
      return res.status(403).json({ message: 'Forbidden for this role' });
    }

    const ok = await bcrypt.compare(current_password, u.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(new_password, 10);
    await db.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashed, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('student.changePassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const applyToInternship = async (req, res) => {
  const userId = req.user.id;
  const { internship_id } = req.body || {};
  if (!internship_id) return res.status(400).json({ message: 'Internship ID is required' });
  try {
    const [studentRows] = await db.query('SELECT id FROM students WHERE user_id=?', [userId]);
    if (!studentRows.length) return res.status(404).json({ message: 'Student not found' });
    const student_id = studentRows[0].id;

    const [existing] = await db.query(
      'SELECT id FROM applications WHERE student_id=? AND internship_id=?',
      [student_id, internship_id]
    );
    if (existing.length) return res.status(400).json({ message: 'Already applied to this internship' });

    await db.query('INSERT INTO applications (student_id, internship_id) VALUES (?,?)', [
      student_id,
      internship_id,
    ]);
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error('Apply Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStudentApplications = async (req, res) => {
  const userId = req.user.id;
  try {
    const [studentRows] = await db.query('SELECT id FROM students WHERE user_id=?', [userId]);
    if (!studentRows.length) return res.status(404).json({ message: 'Student not found' });
    const student_id = studentRows[0].id;

    const [applications] = await db.query(
      `SELECT 
         a.id AS application_id, a.status, a.applied_at, a.rejection_reason,
         i.id AS internship_id, i.title, i.description, i.location, i.start_date,
         u.name AS employer_name
       FROM applications a
       JOIN internships i ON a.internship_id = i.id
       JOIN employers e ON i.employer_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE a.student_id = ?
       ORDER BY a.applied_at DESC`,
      [student_id]
    );
    res.json({ applications });
  } catch (err) {
    console.error('Get Applications Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getDashboard = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.query(
      `SELECT u.id AS user_id, u.name, u.email, u.role,
              s.id AS student_id, s.university, s.major, s.profile_image, s.cv_link
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    const profile = rows[0];

    // If you prefer returning absolute URLs (optional)
    if (profile.cv_link) profile.cv_link = `http://localhost:5001/uploads/${profile.cv_link}`;
    if (profile.profile_image) profile.profile_image = `http://localhost:5001/uploads/${profile.profile_image}`;

    res.json({ profile });
  } catch (err) {
    console.error('Dashboard Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStudentProfile = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(400).json({ message: 'Cannot determine user id' });

  const { name, email, university, major } = req.body || {};
  // accept common aliases too (cv_link/resume, avatar/photo)
  const cvFile =
    (req.files?.cv?.[0] || req.files?.cv_link?.[0] || req.files?.resume?.[0])?.filename || null;
  const imgFile =
    (req.files?.profile_image?.[0] || req.files?.avatar?.[0] || req.files?.photo?.[0])?.filename ||
    null;

  const cv_link = cvFile || null;
  const profile_image = imgFile || null;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (email) {
      const [[dup]] = await conn.query('SELECT id FROM users WHERE email=? AND id<>?', [
        email,
        userId,
      ]);
      if (dup) {
        await conn.rollback();
        return res.status(409).json({ message: 'Email already in use' });
      }
    }

    const uSets = [],
      uVals = [];
    if (name) uSets.push('name=?'), uVals.push(name);
    if (email) uSets.push('email=?'), uVals.push(email);
    if (uSets.length) {
      uVals.push(userId);
      await conn.query(`UPDATE users SET ${uSets.join(', ')} WHERE id=?`, uVals);
    }

    const sSets = [],
      sVals = [];
    if (typeof university !== 'undefined') sSets.push('university=?'), sVals.push(university || null);
    if (typeof major !== 'undefined') sSets.push('major=?'), sVals.push(major || null);
    if (cv_link) sSets.push('cv_link=?'), sVals.push(cv_link);
    if (profile_image) sSets.push('profile_image=?'), sVals.push(profile_image);
    if (sSets.length) {
      sVals.push(userId);
      await conn.query(`UPDATE students SET ${sSets.join(', ')} WHERE user_id=?`, sVals);
    }

    await conn.commit();
    res.json({ message: 'Profile updated' });
  } catch (err) {
    await conn.rollback();
    console.error('updateStudentProfile error:', err, { body: req.body, files: req.files });
    res.status(500).json({ message: 'Server error' });
  } finally {
    conn.release();
  }
};



module.exports = {
  registerStudent,
  applyToInternship,
  getStudentApplications,
  getDashboard,
  updateStudentProfile,
  changePassword
};
