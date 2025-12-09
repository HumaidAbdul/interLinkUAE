// backend/database/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

console.log("DB CONFIG =>", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  db: process.env.DB_NAME,
});

// نستخدم connection pool مع SSL و port من env
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,   // مهم جدًا لـ Railway
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,        // Railway يحتاج SSL
  },
  connectionLimit: 10,
});

module.exports = db;
