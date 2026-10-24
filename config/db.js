const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'speed_doctor',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection on startup and log on success
(async () => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    console.log('MySQL connected');
  } catch (err) {
    console.warn('MySQL connection warning:', err.message);
  }
})();

module.exports = pool;
