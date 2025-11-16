require('dotenv').config();
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dc_car_booking',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
  connectTimeout: 10000,
};

const masked = {
  host: config.host,
  user: config.user,
  password: config.password ? '******' : '(empty)',
  database: config.database,
  port: config.port,
};

(async () => {
  console.log('--- DB connection test ---');
  console.log('Using config:', masked);
  try {
    const conn = await mysql.createConnection(config);
    console.log('✅ Kết nối database thành công!');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi khi kết nối database:');
    // Print common fields first for quick reading
    console.error('code:', err.code || err.errno || 'N/A');
    console.error('message:', err.message);
    console.error('full error:');
    console.error(err);
    process.exit(1);
  }
})();
