const mysql = require('mysql2/promise');
require('dotenv').config(); // we’ll use it with modern async/await style
// 

console.log("Password: " + process.env.DB_PASS);
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});


module.exports = db;

// 