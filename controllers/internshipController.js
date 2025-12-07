const jwt = require('jsonwebtoken');
const db = require('../database/db');


const createInternship = async (req, res) => {
  const userId = req.user.id; // from token

  try {
    // ✅ Step 1: Get employer.id from user_id
    const [employerRows] = await db.query(
      'SELECT id FROM employers WHERE user_id = ?',
      [userId]
    );

    if (employerRows.length === 0) {
      return res.status(404).json({ message: 'Employer not found in database' });
    }

    const employerId = employerRows[0].id;

    // ✅ Step 2: Collect data from body
    const {
      title,
      description,
      location,
      duration,
      requirements,
      industry,
      work_mode,
      payment_type,
      job_type,
      start_date,
      salary,
      positions_available
    } = req.body;

    if (
      !title || !description || !location || !duration || !industry ||
      !work_mode || !payment_type || !job_type || !start_date
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // ✅ Step 3: Insert into internships
    const [result] = await db.query(
      `INSERT INTO internships 
      (title, description, location, duration, requirements, industry, work_mode, payment_type, job_type, start_date, salary, positions_available, employer_id,  status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        title,
        description,
        location,
        duration,
        requirements || '',
        industry,
        work_mode,
        payment_type,
        job_type,
        start_date,
        salary || 'None',
        positions_available || 1,
        employerId, // ✅ correct foreign key
        
      ]
    );

    res.status(201).json({
      message: 'Internship created successfully',
      internshipId: result.insertId
    });

  } catch (err) {
    console.error('Internship Create Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};




const getAllInternships = async (req, res) => {
  try {
    const [internships] = await db.query(`
       SELECT 
        internships.id,
        internships.title,
        internships.description,
        internships.location,
        internships.duration,
        internships.industry,
        internships.salary,
        internships.work_mode,
        internships.payment_type,
        internships.job_type,
        internships.start_date,
        internships.positions_available,
        users.name AS employer_name
      FROM internships
      JOIN employers ON internships.employer_id = employers.id
      JOIN users ON employers.user_id = users.id
      WHERE internships.status = 'approved'
      ORDER BY internships.start_date ASC
    `);

    res.status(200).json({ internships });

  } catch (err) {
    console.error('Fetch All Internships Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};




const getInternshipById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }

  try {
    const [rows] = await db.query(
      `SELECT 
         id, title, description, location, duration, requirements, industry,
         salary, work_mode, payment_type, status, job_type, start_date, positions_available
       FROM internships
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Not found' });
    }

    // Frontend expects fields directly (not { internship: ... })
    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Internship Details Error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

const updateInternship = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // derive employer_id and enforce ownership (keep your current code here)
    const [[emp]] = await db.query('SELECT id FROM employers WHERE user_id = ?', [userId]);
    if (!emp) return res.status(403).json({ message: 'Employer not found' });
    const [[own]] = await db.query('SELECT id FROM internships WHERE id = ? AND employer_id = ?', [id, emp.id]);
    if (!own) return res.status(403).json({ message: 'You do not own this internship' });

    const {
      title, description, location, duration, requirements,
      industry, work_mode, payment_type, job_type,
      start_date, salary, positions_available, status
    } = req.body;

    // IMPORTANT: include `requirements` in the SET clause
    const sql = `
      UPDATE internships
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          location = COALESCE(?, location),
          duration = COALESCE(?, duration),
          requirements = COALESCE(?, requirements),
          industry = COALESCE(?, industry),
          work_mode = COALESCE(?, work_mode),
          payment_type = COALESCE(?, payment_type),
          job_type = COALESCE(?, job_type),
          start_date = COALESCE(?, start_date),
          salary = COALESCE(?, salary),
          positions_available = COALESCE(?, positions_available),
          status = COALESCE(?, status)
      WHERE id = ?
    `;

    const params = [
      title ?? null,
      description ?? null,
      location ?? null,
      duration ?? null,
      (requirements ?? null),           // ← ensure this is here
      industry ?? null,
      work_mode ?? null,
      payment_type ?? null,
      job_type ?? null,
      start_date ?? null,
      (salary ?? null),
      (positions_available != null ? Number(positions_available) : null),
      status ?? null,
      id
    ];

    await db.query(sql, params);

    const [rows] = await db.query('SELECT * FROM internships WHERE id = ?', [id]);
    return res.json({ internship: rows[0] });
  } catch (e) {
    console.error('Update internship error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
};
const getById = async (req, res) => {
  const { id } = req.params;

  const [rows] = await db.query(`
    SELECT
      i.*,
      e.user_id AS employer_user_id,     -- needed for “Message Employer”
      u.name    AS employer_name
    FROM internships i
    LEFT JOIN employers e ON e.id = i.employer_id
    LEFT JOIN users     u ON u.id = e.user_id
    WHERE i.id = ?
    LIMIT 1
  `, [id]);

  if (!rows.length) return res.status(404).json({ message: 'Internship not found' });
  res.json({ internship: rows[0] });
};


module.exports = {
  createInternship,
  getInternshipById,
  getAllInternships,
  updateInternship,
  getById
}