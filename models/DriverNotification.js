const { pool } = require('../config/database');

class DriverNotification {
  // Create a notification row for a driver
  static async create({ driver_id, trip_id, type = 'new_trip', message = '' }) {
    try {
      const [result] = await pool.execute(`
        INSERT INTO driver_notifications (driver_id, trip_id, type, message)
        VALUES (?, ?, ?, ?)
      `, [driver_id, trip_id, type, message]);

      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Get notifications for a driver (pending or all)
  static async getByDriverId(driverId, onlyPending = false) {
    try {
      const q = onlyPending ?
        'SELECT * FROM driver_notifications WHERE driver_id = ? AND status = "pending" ORDER BY created_at DESC' :
        'SELECT * FROM driver_notifications WHERE driver_id = ? ORDER BY created_at DESC';
      const [rows] = await pool.execute(q, [driverId]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async markAsSeen(notificationId, driverId) {
    try {
      const [result] = await pool.execute(
        'UPDATE driver_notifications SET status = ? WHERE id = ? AND driver_id = ?',
        ['seen', notificationId, driverId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  static async updateStatus(notificationId, driverId, status) {
    try {
      const [result] = await pool.execute(
        'UPDATE driver_notifications SET status = ? WHERE id = ? AND driver_id = ?',
        [status, notificationId, driverId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DriverNotification;
