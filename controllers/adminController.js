// backend/controllers/adminController.js
const db = require('../database/db'); // mysql2/promise pool

// ---- helpers ----
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n) || n < 1) throw new Error('INVALID_ID');
  return n;
};
const badReq = (res, message = 'Bad request') => res.status(400).json({ message });
const notFoundOrProcessed = (res) =>
  res.status(400).json({ message: 'Not found or already processed' });

// ---- CONTROLLER ----

// Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…: Ø§Ù„Ø£Ø¹Ø¯Ø§Ø¯ Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
exports.getSummary = async (req, res) => {
  try {
    const [[{ students }]]     = await db.query("SELECT COUNT(*) students FROM users WHERE role='student'");
    const [[{ employers }]]    = await db.query("SELECT COUNT(*) employers FROM users WHERE role='employer'");
    const [[{ internships }]]  = await db.query("SELECT COUNT(*) internships FROM internships");
    const [[{ applications }]] = await db.query("SELECT COUNT(*) applications FROM applications");

    res.json({ students, employers, internships, applications });
  } catch (e) {
    console.error('getSummary', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ø¥Ø­Ø¶Ø§Ø± ÙƒÙ„ Ø§Ù„Ø§Ù†ØªØ±Ù†Ø´Ø¨Ø³ (Ù†Ø³ØªØ®Ø¯Ù…Ù‡Ø§ ÙÙŠ Ø§Ù„Ù€ Admin + Directory)
exports.getPendingInternships = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 200), 500);
    const [rows] = await db.query(
      `
      SELECT i.id,
             i.title,
             i.location,
             i.status,
             e.id   AS employer_id,
             u.name AS company_name
      FROM internships i
      JOIN employers e ON e.id = i.employer_id
      JOIN users     u ON u.id = e.user_id
      ORDER BY i.id DESC
      LIMIT ?
      `,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error('getPendingInternships', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ø¥Ø­Ø¶Ø§Ø± ÙƒÙ„ Ø§Ù„Ù€ applications Ù…Ø¹ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø·Ø§Ù„Ø¨ ÙˆØ§Ù„Ø´Ø±ÙƒØ©
exports.getPendingApplications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 200), 500);
    const [rows] = await db.query(
      `
      SELECT a.id,
             a.status,
             a.applied_at,
             i.title,
             i.location,
             cu.name AS company_name,
             su.name AS student_name
      FROM applications a
      JOIN internships i ON i.id = a.internship_id
      JOIN employers   e ON e.id = i.employer_id
      JOIN users      cu ON cu.id = e.user_id       -- company user
      JOIN students    s ON s.id = a.student_id
      JOIN users      su ON su.id = s.user_id       -- student user
      ORDER BY a.id DESC
      LIMIT ?
      `,
      [limit]
    );
    res.json(rows);
  } catch (e) {
    console.error('getPendingApplications', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ====== APPROVE / REJECT INTERNSHIP ======
exports.approveInternship = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const [r] = await db.query(
      "UPDATE internships SET status='approved', rejection_reason=NULL WHERE id=? AND status='pending'",
      [id]
    );
    if (!r.affectedRows) return notFoundOrProcessed(res);
    res.json({ ok: true });
  } catch (e) {
    if (e.message === 'INVALID_ID') return badReq(res, 'Invalid internship id');
    console.error('approveInternship', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.rejectInternship = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const reason = (req.body?.reason ?? null);
    const [r] = await db.query(
      "UPDATE internships SET status='rejected', rejection_reason=? WHERE id=? AND status='pending'",
      [reason, id]
    );
    if (!r.affectedRows) return notFoundOrProcessed(res);
    res.json({ ok: true });
  } catch (e) {
    if (e.message === 'INVALID_ID') return badReq(res, 'Invalid internship id');
    console.error('rejectInternship', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ====== APPROVE / REJECT APPLICATION ======
exports.approveApplication = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const [r] = await db.query(
      "UPDATE applications SET status='approved', rejection_reason=NULL WHERE id=? AND status='pending'",
      [id]
    );
    if (!r.affectedRows) return notFoundOrProcessed(res);
    res.json({ ok: true });
  } catch (e) {
    if (e.message === 'INVALID_ID') return badReq(res, 'Invalid application id');
    console.error('approveApplication', e);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.rejectApplication = async (req, res) => {
  try {
    const id = toInt(req.params.id);
    const reason = (req.body?.reason ?? null);
    const [r] = await db.query(
      "UPDATE applications SET status='rejected', rejection_reason=? WHERE id=? AND status='pending'",
      [reason, id]
    );
    if (!r.affectedRows) return notFoundOrProcessed(res);
    res.json({ ok: true });
  } catch (e) {
    if (e.message === 'INVALID_ID') return badReq(res, 'Invalid application id');
    console.error('rejectApplication', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ====== DIRECTORY APIs ======

// ðŸ”¹ Get ALL users (students + employers)
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        status,
        NULL AS created_at,
        NULL AS updated_at
      FROM users
      WHERE role IN ('student','employer')
      ORDER BY id DESC
      `
    );
    res.json(rows);
  } catch (e) {
    console.error('getAllUsers', e);
    res.status(500).json({ message: 'Server error' });
  }
};

// ðŸ”¹ Get ONE user by id
exports.getUserById = async (req, res) => {
  try {
    const id = toInt(req.params.id);

    const [rows] = await db.query(
      `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        status,
        NULL AS created_at,
        NULL AS updated_at
      FROM users
      WHERE id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(rows[0]);
  } catch (e) {
    if (e.message === 'INVALID_ID') {
      return badReq(res, 'Invalid user id');
    }
    console.error('getUserById', e);
    res.status(500).json({ message: 'Server error' });
  }
};


// Ø¯Ø§Ø®Ù„ adminController.js

exports.getApplicationById = async (req, res) => {
  try {
    const id = toInt(req.params.id);

    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        a.status,
        a.applied_at,
        a.rejection_reason,
        i.title,
        i.location,
        cu.name  AS company_name,
        su.name  AS student_name,
        su.email AS student_email
      FROM applications a
      JOIN internships i ON i.id = a.internship_id
      JOIN employers   e ON e.id = i.employer_id
      JOIN users      cu ON cu.id = e.user_id
      JOIN students    s ON s.id = a.student_id
      JOIN users      su ON su.id = s.user_id
      WHERE a.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Application not found" });
    }

    res.json(rows[0]);
  } catch (e) {
    if (e.message === "INVALID_ID") {
      return badReq(res, "Invalid application id");
    }
    console.error("getApplicationById", e);
    res.status(500).json({ message: "Server error" });
  }
};

// =========================================
// GET /api/admin/internships/:id
// - جلب تفاصيل انترنشب واحدة للأدمن
// =========================================
exports.getAdminInternshipById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid internship id" });

    const [rows] = await db.query(
      `
      SELECT 
        i.id,
        i.title,
        i.location,
        i.status,
        i.rejection_reason,
        u.name AS company_name
      FROM internships i
      JOIN employers e ON e.id = i.employer_id
      JOIN users     u ON u.id = e.user_id
      WHERE i.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Internship not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Error in getAdminInternshipById:", err);
    res.status(500).json({ message: "Server error" });
  }
};

