const { pool } = require('../config/database');

async function createTable() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS driver_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        driver_id INT NOT NULL,
        trip_id INT NOT NULL,
        type VARCHAR(50) DEFAULT 'new_trip',
        message TEXT,
        status ENUM('pending','seen','accepted','rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_driver_id (driver_id),
        INDEX idx_trip_id (trip_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ driver_notifications table created (or already exists)');
  } catch (err) {
    console.error('Error creating driver_notifications table:', err);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

createTable();
