const { pool } = require('../config/database');

// This script deletes seeded/sample data while preserving the admin account (id = 1).
// It runs queries in the proper order to avoid foreign key constraint errors.
// Use with care. Recommended: backup your DB before running.

(async function clearSeedData(){
  const connection = await pool.getConnection();
  try {
    console.log('Bắt đầu xóa dữ liệu mẫu (giữ admin id=1) ...');
    await connection.beginTransaction();

    // 1) Remove payments and dependent rows
    console.log('- Xóa bảng thanh_toan');
    await connection.query("DELETE FROM thanh_toan WHERE 1=1");

    // 2) Remove reviews
    console.log('- Xóa bảng danh_gia');
    await connection.query("DELETE FROM danh_gia WHERE 1=1");

    // 3) Remove trips
    console.log('- Xóa bảng chuyen_di');
    await connection.query("DELETE FROM chuyen_di WHERE 1=1");

    // 4) Remove driver info
    console.log('- Xóa bảng tai_xe');
    await connection.query("DELETE FROM tai_xe WHERE 1=1");

    // 5) Remove promotions
    console.log('- Xóa bảng khuyen_mai');
    await connection.query("DELETE FROM khuyen_mai WHERE 1=1");

    // 6) Remove non-admin users (keep id = 1)
    console.log('- Xóa người dùng ngoại trừ admin (id=1)');
    await connection.query("DELETE FROM nguoi_dung WHERE id IS NOT NULL AND id <> 1");

    await connection.commit();
    console.log('Hoàn tất xóa dữ liệu mẫu (admin được giữ lại).');
  } catch (error) {
    console.error('Lỗi khi xóa dữ liệu mẫu:', error.message);
    try { await connection.rollback(); } catch (e) { console.error('Rollback failed', e); }
  } finally {
    connection.release();
    // Close pool is optional; we leave pool open for further usage.
  }
})();
