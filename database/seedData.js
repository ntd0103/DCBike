const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedData = async () => {
  try {
    console.log('Sử dụng cấu hình database từ config/database.js (pool) để chèn dữ liệu mẫu...');

    // Hash password mẫu
    const hashedPassword = await bcrypt.hash('123456', 12);

    // Chỉ chèn tài khoản admin mặc định (giữ nguyên theo yêu cầu)
    console.log('Đảm bảo tồn tại tài khoản admin (chỉ chèn admin)...');
    await pool.execute(`
      INSERT IGNORE INTO nguoi_dung (id, ten, email, so_dien_thoai, mat_khau, loai_tai_khoan)
      VALUES (1, 'Admin DC', 'admin@dc.com', '0901234567', ?, 'admin')
    `, [hashedPassword]);

    console.log('Hoàn tất: chỉ chèn tài khoản admin. Các dữ liệu mẫu khác đã được loại bỏ khỏi script seeding.');
  } catch (error) {
    console.error('Lỗi khi thêm dữ liệu mẫu:', error.message);
  }
};

// Chạy script
seedData();