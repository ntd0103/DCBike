const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dc_car_booking',
  charset: 'utf8mb4',
  timezone: '+07:00'
};

// Tạo connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Kết nối database thành công!');
    connection.release();
  } catch (error) {
    console.error('❌ Lỗi kết nối database:', error.message);
  }
};

module.exports = { pool, testConnection };