// backend/controllers/employerController.js (Phase 1: registerEmployer only)
const db = require('../database/db');
const bcrypt = require('bcryptjs');

// POST /api/employer/register
const registerEmployer = async (req, res) => {
  const { company_name, full_name, name, email, password, location, description } = req.body || {};
  const displayName = (company_name || full_name || name || '').trim();

  if (!displayName || !email || !password || !location || !description) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // unique email?
    const [dup] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (dup.length) return res.status(400).json({ message: 'Email already exists' });

    const logo = req.file?.filename || null;

    const hash = await bcrypt.hash(password, 10);
    
    const conn = await db.getConnection();

    try {

      const [u] = await conn.query(
        'INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)',
        [displayName, email, hash, 'employer', 'approved']
      );

      await conn.query(
        'INSERT INTO employers (user_id, location, company_logo, description) VALUES (?, ?, ?, ?)',
        [u.insertId, location, logo, description]
      );

      await conn.commit();
      return res.status(201).json({ message: 'Employer registered successfully', user_id: u.insertId });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('registerEmployer error:', err);
    return res.status(500).json({ message: 'Registration failed' });
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

    // confirm user exists and is an employer
    const [[u]] = await db.query(
      'SELECT id, role, password FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!u) return res.status(404).json({ message: 'User not found' });
    if (u.role !== 'employer') {
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
    console.error('employer.changePassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const getEmployerDashboard = async (req, res) => {
  try {
    const employerId = req.user.id;

    const [userData] = await db.query(
      'SELECT * FROM users JOIN employers ON users.id = employers.user_id WHERE users.id = ?',
      [employerId]
    );

    if (userData.length === 0) {
      return res.status(404).json({ message: 'Employer not found' });
    }

    res.json({
      message: 'Employer dashboard data retrieved',
      data: userData[0]
    });
  } catch (err) {
    console.error('Dashboard Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// controllers/employerController.js
const getEmployerInternships = async (req, res) => {
  const userId = req.user.id;

  try {
    // get this employer_id from userId
    const [employerRows] = await db.query(
      'SELECT id FROM employers WHERE user_id = ?',
      [userId]
    );
    if (!employerRows.length) {
      return res.status(404).json({ message: 'Employer not found' });
    }
    const employer_id = employerRows[0].id;

    // ✅ add the missing comma, and consider returning applicants count
    const [internships] = await db.query(
      `
      SELECT 
        i.id, i.title, i.description, i.location, i.start_date, i.duration,
        i.requirements, i.industry, i.work_mode, i.payment_type, i.job_type,
        i.salary, i.positions_available, i.status,
        COUNT(a.id) AS applicants
      FROM internships i
      LEFT JOIN applications a ON a.internship_id = i.id
      WHERE i.employer_id = ?
      GROUP BY i.id
      ORDER BY i.id DESC
      `,
      [employer_id]
    );

    // pick one shape and keep it consistent:
    res.status(200).json({ internships });   // <-- recommend this
    // (If you keep `res.json(internships)`, adjust the frontend accordingly.)
  } catch (err) {
    console.error('Get Employer Internships Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};


// controllers/employerController.js (or wherever your function lives)
const getInternshipApplications = async (req, res) => {
  const userId = req.user.id;
  const internshipId = req.params.id;

  try {
    const [employerRows] = await db.query(
      'SELECT id FROM employers WHERE user_id = ?',
      [userId]
    );
    if (!employerRows.length)
      return res.status(403).json({ message: 'Employer not found' });
    const employerId = employerRows[0].id;

    const [internshipRows] = await db.query(
      'SELECT id FROM internships WHERE id = ? AND employer_id = ?',
      [internshipId, employerId]
    );
    if (!internshipRows.length)
      return res.status(403).json({ message: 'You do not own this internship' });

    const [applications] = await db.query(
      `
      SELECT
        a.id           AS application_id,
        u.name         AS student_name,
        u.email,
        s.university,
        s.major,
        s.cv_link,                   -- ✅ include CV filename
        a.status,
        a.rejection_reason,
        a.applied_at
      FROM applications a
      JOIN students  s ON a.student_id = s.id
      JOIN users     u ON s.user_id   = u.id
      WHERE a.internship_id = ?
      ORDER BY a.applied_at DESC
      `,
      [internshipId]
    );

    // Optional: strip any accidental "cv/" prefix so frontend stays simple
    const normalized = applications.map(r => ({
      ...r,
      cv_link: r.cv_link ? String(r.cv_link).replace(/^cv\//, '') : null,
    }));

    return res.status(200).json(normalized);
  } catch (err) {
    console.error('Get Internship Applications Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


const approveApplication = async (req, res) => {
  const userId = req.user.id;
  const applicationId = req.params.id;

  try {
    const [employerRows] = await db.query('SELECT id FROM employers WHERE user_id = ?', [userId]);
    if (!employerRows.length) return res.status(403).json({ message: 'Employer not found' });
    const employerId = employerRows[0].id;

    const [check] = await db.query(`
      SELECT a.id
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      WHERE a.id = ? AND i.employer_id = ?
    `, [applicationId, employerId]);
    if (!check.length) return res.status(403).json({ message: 'Unauthorized or invalid application' });

    // ✅ also clear any previous rejection_reason
    await db.query(
      'UPDATE applications SET status = ?, rejection_reason = NULL WHERE id = ?',
      ['approved', applicationId]
    );

    return res.status(200).json({ message: 'Application approved successfully' });
  } catch (err) {
    console.error('Approve Application Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const rejectApplication = async (req, res) => {
  const userId = req.user.id;
  const applicationId = req.params.id;
  const reason = (req.body?.reason || '').trim();   // ✅ read reason from JSON body
  if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

  try {
    const [employerRows] = await db.query('SELECT id FROM employers WHERE user_id = ?', [userId]);
    if (!employerRows.length) return res.status(403).json({ message: 'Employer not found' });
    const employerId = employerRows[0].id;

    const [check] = await db.query(`
      SELECT a.id
      FROM applications a
      JOIN internships i ON a.internship_id = i.id
      WHERE a.id = ? AND i.employer_id = ?
    `, [applicationId, employerId]);
    if (!check.length) return res.status(403).json({ message: 'Unauthorized or invalid application' });

    // ✅ persist reason
    await db.query(
      'UPDATE applications SET status = ?, rejection_reason = ? WHERE id = ?',
      ['rejected', reason, applicationId]
    );

    return res.status(200).json({ message: 'Application rejected successfully' });
  } catch (err) {
    console.error('Reject Application Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getInternshipApplicants = async (req, res) => {
  const { internship_id } = req.params;

  try {
    const [applicants] = await db.query(`
      SELECT 
        a.id AS application_id,
        a.status,
        a.applied_at,
        s.id AS student_id,
        u.name AS student_name,
        s.university,
        s.major
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE a.internship_id = ?
    `, [internship_id]);

    res.status(200).json({ applicants });

  } catch (err) {
    console.error('Get Applicants Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateEmployerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, location, description } = req.body;
    const logo = req.file?.filename || null;

    // find employer by user_id
    const [empRows] = await db.query('SELECT id FROM employers WHERE user_id = ?', [userId]);
    if (!empRows.length) return res.status(404).json({ message: 'Employer not found' });
    const employerId = empRows[0].id;

    // update users (name/email)
    if (name || email) {
      await db.query(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
        [name || null, email || null, userId]
      );
    }

    // update employers (location/description/logo)
    const params = [location || null, description || null];
    let sql = 'UPDATE employers SET location = COALESCE(?, location), description = COALESCE(?, description)';
    if (logo) { sql += ', company_logo = ?'; params.push(logo); }
    sql += ' WHERE id = ?'; params.push(employerId);
    await db.query(sql, params);

    // return combined profile
    const [rows] = await db.query(
      `SELECT u.name, u.email, e.location, e.description, e.company_logo
       FROM users u JOIN employers e ON u.id = e.user_id
       WHERE e.id = ?`,
      [employerId]
    );

    res.json({ profile: rows[0] });
  } catch (err) {
    console.error('Update employer error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { 
  registerEmployer,
  getEmployerDashboard,
  getEmployerInternships,
  getInternshipApplications,
  getInternshipApplicants,
  approveApplication,
  rejectApplication,
  updateEmployerProfile,
  changePassword
 };
