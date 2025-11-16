const { pool } = require('../config/database');
require('dotenv').config();

const createTables = async () => {
  try {
    console.log('Sử dụng cấu hình database từ config/database.js (pool)');

  // Tạo bảng người dùng (users)
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS nguoi_dung (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ten VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        so_dien_thoai VARCHAR(15) UNIQUE NOT NULL,
        mat_khau VARCHAR(255) NOT NULL,
        dia_chi TEXT,
        loai_tai_khoan ENUM('khach_hang', 'tai_xe', 'admin') DEFAULT 'khach_hang',
        trang_thai ENUM('hoat_dong', 'tam_khoa', 'da_xoa') DEFAULT 'hoat_dong',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

  // Tạo bảng tài xế (drivers) - mở rộng thông tin cho tài xế
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS tai_xe (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nguoi_dung_id INT NOT NULL,
        so_bang_lai VARCHAR(50) NOT NULL,
        loai_bang_lai VARCHAR(20) NOT NULL,
        kinh_nghiem_lien_tuc INT DEFAULT 0,
        bien_so_xe VARCHAR(20) NOT NULL,
        loai_xe VARCHAR(50) NOT NULL,
        mau_xe VARCHAR(50),
        hang_xe VARCHAR(50),
        so_cho_ngoi INT DEFAULT 4,
        trang_thai_tai_xe ENUM('san_sang', 'dang_di', 'nghi_lam', 'tam_khoa') DEFAULT 'san_sang',
        vi_tri_hien_tai POINT,
        diem_danh_gia DECIMAL(3,2) DEFAULT 5.00,
        so_luot_danh_gia INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung(id) ON DELETE CASCADE
      )
    `);

  // Tạo bảng khuyến mãi
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS khuyen_mai (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ma_khuyen_mai VARCHAR(50) UNIQUE NOT NULL,
        ten_khuyen_mai VARCHAR(255) NOT NULL,
        mo_ta TEXT,
        loai_khuyen_mai ENUM('phan_tram', 'so_tien') NOT NULL,
        gia_tri DECIMAL(10,2) NOT NULL,
        gia_tri_toi_da DECIMAL(10,2),
        gia_tri_toi_thieu DECIMAL(10,2),
        ngay_bat_dau DATE NOT NULL,
        ngay_ket_thuc DATE NOT NULL,
        so_luong_su_dung INT DEFAULT 0,
        gioi_han_su_dung INT,
        trang_thai ENUM('hoat_dong', 'tam_dung', 'het_han') DEFAULT 'hoat_dong',
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES nguoi_dung(id)
      )
    `);

  // Tạo bảng đăng ký tài xế (chờ duyệt)
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS driver_registrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        ten VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        so_dien_thoai VARCHAR(15) NOT NULL,
        dia_chi TEXT,
        so_bang_lai VARCHAR(50) NOT NULL,
        loai_bang_lai VARCHAR(20) NOT NULL,
        kinh_nghiem_lien_tuc INT DEFAULT 0,
        bien_so_xe VARCHAR(20) NOT NULL,
        loai_xe VARCHAR(50) NOT NULL,
        mau_xe VARCHAR(50),
        hang_xe VARCHAR(50),
        so_cho_ngoi INT DEFAULT 4,
        giay_phep_kinh_doanh VARCHAR(255),
        anh_bang_lai TEXT,
        anh_cmnd TEXT,
        anh_xe TEXT,
        ghi_chu TEXT,
        trang_thai ENUM('cho_duyet', 'da_duyet', 'tu_choi') DEFAULT 'cho_duyet',
        ly_do_tu_choi TEXT,
        nguoi_duyet_id INT,
        ngay_duyet TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (nguoi_duyet_id) REFERENCES nguoi_dung(id)
      )
    `);



  // Tạo bảng chuyến đi
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS chuyen_di (
        id INT PRIMARY KEY AUTO_INCREMENT,
        khach_hang_id INT NOT NULL,
        tai_xe_id INT,
        diem_don VARCHAR(255) NOT NULL,
        diem_den VARCHAR(255) NOT NULL,
        toa_do_diem_don POINT,
        toa_do_diem_den POINT,
        thoi_gian_dat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        thoi_gian_don TIMESTAMP NULL,
        thoi_gian_bat_dau TIMESTAMP NULL,
        thoi_gian_ket_thuc TIMESTAMP NULL,
        khoang_cach DECIMAL(8,2), -- km
        thoi_gian_du_kien INT, -- phút
        gia_cuoc DECIMAL(10,2),
        phi_dich_vu DECIMAL(10,2) DEFAULT 0,
        tong_tien DECIMAL(10,2),
        khuyen_mai_id INT,
        so_tien_giam_gia DECIMAL(10,2) DEFAULT 0,
        trang_thai ENUM('cho_tai_xe', 'da_nhan', 'dang_di', 'hoan_thanh', 'huy_bo') DEFAULT 'cho_tai_xe',
        ly_do_huy TEXT,
        ghi_chu TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (khach_hang_id) REFERENCES nguoi_dung(id),
        FOREIGN KEY (tai_xe_id) REFERENCES tai_xe(id),
        FOREIGN KEY (khuyen_mai_id) REFERENCES khuyen_mai(id)
      )
    `);



  // Tạo bảng thanh toán
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS thanh_toan (
        id INT PRIMARY KEY AUTO_INCREMENT,
        chuyen_di_id INT NOT NULL,
        so_tien DECIMAL(10,2) NOT NULL,
        phuong_thuc_thanh_toan ENUM('tien_mat', 'the_tin_dung', 'vi_dien_tu', 'chuyen_khoan') NOT NULL,
        ma_giao_dich VARCHAR(100),
        trang_thai ENUM('cho_thanh_toan', 'da_thanh_toan', 'that_bai', 'hoan_tien') DEFAULT 'cho_thanh_toan',
        thoi_gian_thanh_toan TIMESTAMP NULL,
        ghi_chu TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chuyen_di_id) REFERENCES chuyen_di(id)
      )
    `);

  // Tạo bảng đánh giá
  await pool.execute(`
      CREATE TABLE IF NOT EXISTS danh_gia (
        id INT PRIMARY KEY AUTO_INCREMENT,
        chuyen_di_id INT NOT NULL,
        nguoi_danh_gia_id INT NOT NULL,
        diem_so INT NOT NULL CHECK (diem_so >= 1 AND diem_so <= 5),
        binh_luan TEXT,
        loai_danh_gia ENUM('danh_gia_tai_xe', 'danh_gia_khach_hang') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chuyen_di_id) REFERENCES chuyen_di(id),
        FOREIGN KEY (nguoi_danh_gia_id) REFERENCES nguoi_dung(id),
        UNIQUE KEY unique_review (chuyen_di_id, nguoi_danh_gia_id, loai_danh_gia)
      )
    `);



  console.log('Tất cả bảng đã được tạo thành công!');
  console.log('Hoàn thành thiết lập database!');
  } catch (error) {
    console.error('Lỗi khi tạo bảng:', error.message);
    console.error('Chi tiết lỗi:', error);
  }
};

// Chạy script
createTables();