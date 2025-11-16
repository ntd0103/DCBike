const { pool } = require('../config/database');

class Driver {
  constructor(data) {
    this.id = data.id;
    this.nguoi_dung_id = data.nguoi_dung_id;
    this.so_bang_lai = data.so_bang_lai;
    this.loai_bang_lai = data.loai_bang_lai;
    this.kinh_nghiem_lien_tuc = data.kinh_nghiem_lien_tuc;
    this.bien_so_xe = data.bien_so_xe;
    this.loai_xe = data.loai_xe;
    this.mau_xe = data.mau_xe;
    this.hang_xe = data.hang_xe;
    this.so_cho_ngoi = data.so_cho_ngoi;
    this.trang_thai_tai_xe = data.trang_thai_tai_xe;
    this.vi_tri_hien_tai = data.vi_tri_hien_tai;
    this.diem_danh_gia = data.diem_danh_gia;
    this.so_luot_danh_gia = data.so_luot_danh_gia;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Đăng ký tài xế mới
  static async register(driverData) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Tạo tài khoản người dùng trước
      const [userResult] = await connection.execute(`
        INSERT INTO nguoi_dung (ten, email, so_dien_thoai, mat_khau, dia_chi, loai_tai_khoan)
        VALUES (?, ?, ?, ?, ?, 'tai_xe')
      `, [
        driverData.ten,
        driverData.email,
        driverData.so_dien_thoai,
        driverData.mat_khau,
        driverData.dia_chi
      ]);
      
      const userId = userResult.insertId;
      
      // Tạo thông tin tài xế
      const [driverResult] = await connection.execute(`
        INSERT INTO tai_xe (
          nguoi_dung_id, so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
          bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        driverData.so_bang_lai,
        driverData.loai_bang_lai,
        driverData.kinh_nghiem_lien_tuc || 0,
        driverData.bien_so_xe,
        driverData.loai_xe,
        driverData.mau_xe || null,
        driverData.hang_xe || null,
        driverData.so_cho_ngoi || 4
      ]);
      
      await connection.commit();
      return { userId, driverId: driverResult.insertId };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Tìm tài xế theo user ID
  static async findByUserId(userId) {
    try {
      const [rows] = await pool.execute(`
        SELECT tx.*, nd.ten, nd.email, nd.so_dien_thoai, nd.dia_chi, nd.trang_thai
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE tx.nguoi_dung_id = ? AND nd.trang_thai = 'hoat_dong'
      `, [userId]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm tài xế theo ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          tx.*, 
          nd.ten, nd.email, nd.so_dien_thoai, nd.dia_chi, nd.trang_thai,
          (
            SELECT COUNT(*) 
            FROM chuyen_di cd 
            WHERE cd.tai_xe_id = tx.id
          ) AS so_chuyen_di
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE tx.id = ? AND nd.trang_thai = 'hoat_dong'
      `, [id]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm tài xế theo ID (không kiểm tra trạng thái người dùng) - dùng làm fallback
  static async findByIdIncludeInactive(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          tx.*, 
          nd.ten, nd.email, nd.so_dien_thoai, nd.dia_chi, nd.trang_thai,
          (
            SELECT COUNT(*) 
            FROM chuyen_di cd 
            WHERE cd.tai_xe_id = tx.id
          ) AS so_chuyen_di
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE tx.id = ?
      `, [id]);

      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật vị trí tài xế
  static async updateLocation(driverId, lat, lng) {
    try {
      const [result] = await pool.execute(`
        UPDATE tai_xe SET vi_tri_hien_tai = POINT(?, ?) WHERE id = ?
      `, [lng, lat, driverId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Tạo hồ sơ tài xế cho user đã tồn tại
  static async createForUser(userId, driverData) {
    try {
      const [result] = await pool.execute(`
        INSERT INTO tai_xe (
          nguoi_dung_id, so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
          bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        driverData.so_bang_lai,
        driverData.loai_bang_lai,
        driverData.kinh_nghiem_lien_tuc || 0,
        driverData.bien_so_xe,
        driverData.loai_xe,
        driverData.mau_xe || null,
        driverData.hang_xe || null,
        driverData.so_cho_ngoi || 4
      ]);

      return { driverId: result.insertId };
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật trạng thái tài xế
  static async updateStatus(driverId, trang_thai) {
    try {
      const [result] = await pool.execute(
        'UPDATE tai_xe SET trang_thai_tai_xe = ? WHERE id = ?',
        [trang_thai, driverId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Tìm tài xế gần nhất
  static async findNearestDrivers(lat, lng, radius = 5, limit = 10) {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          tx.*,
          nd.ten, nd.so_dien_thoai,
          (6371 * acos(
            cos(radians(?)) * cos(radians(ST_Y(tx.vi_tri_hien_tai))) * 
            cos(radians(ST_X(tx.vi_tri_hien_tai)) - radians(?)) + 
            sin(radians(?)) * sin(radians(ST_Y(tx.vi_tri_hien_tai)))
          )) AS khoang_cach
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE tx.trang_thai_tai_xe = 'san_sang' 
          AND nd.trang_thai = 'hoat_dong'
          AND tx.vi_tri_hien_tai IS NOT NULL
        HAVING khoang_cach <= ?
        ORDER BY khoang_cach ASC
        LIMIT ?
      `, [lat, lng, lat, radius, limit]);
      
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật điểm đánh giá
  static async updateRating(driverId, newRating) {
    try {
      const [currentData] = await pool.execute(
        'SELECT diem_danh_gia, so_luot_danh_gia FROM tai_xe WHERE id = ?',
        [driverId]
      );
      
      if (currentData.length === 0) return false;
      
      const current = currentData[0];
      const totalScore = (current.diem_danh_gia * current.so_luot_danh_gia) + newRating;
      const newCount = current.so_luot_danh_gia + 1;
      const newAverage = totalScore / newCount;
      
      const [result] = await pool.execute(`
        UPDATE tai_xe 
        SET diem_danh_gia = ?, so_luot_danh_gia = ? 
        WHERE id = ?
      `, [newAverage, newCount, driverId]);
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách tài xế với phân trang
  static async getAll(page = 1, limit = 10, trang_thai = null) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT tx.*, nd.ten, nd.email, nd.so_dien_thoai, nd.dia_chi, nd.trang_thai as trang_thai_nguoi_dung
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE nd.trang_thai = 'hoat_dong'
      `;
      const params = [];

      if (trang_thai) {
        query += ' AND tx.trang_thai_tai_xe = ?';
        params.push(trang_thai);
      }

      query += ' ORDER BY tx.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await pool.execute(query, params);

      // Đếm tổng số
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE nd.trang_thai = 'hoat_dong'
      `;
      const countParams = [];
      
      if (trang_thai) {
        countQuery += ' AND tx.trang_thai_tai_xe = ?';
        countParams.push(trang_thai);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      return {
        drivers: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê tài xế
  static async getStatistics() {
    try {
      // Thống kê theo trạng thái
      const [statusStats] = await pool.execute(`
        SELECT trang_thai_tai_xe, COUNT(*) as so_luong 
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE nd.trang_thai = 'hoat_dong'
        GROUP BY trang_thai_tai_xe
      `);

      // Top tài xế có điểm cao nhất
      const [topDrivers] = await pool.execute(`
        SELECT tx.id, nd.ten, tx.diem_danh_gia, tx.so_luot_danh_gia, tx.bien_so_xe
        FROM tai_xe tx
        LEFT JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE nd.trang_thai = 'hoat_dong' AND tx.so_luot_danh_gia > 0
        ORDER BY tx.diem_danh_gia DESC, tx.so_luot_danh_gia DESC
        LIMIT 10
      `);

      return {
        trang_thai: statusStats,
        top_drivers: topDrivers
      };
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách tài xế có sẵn
  static async findAvailableDrivers() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          tx.id,
          nd.ten,
          tx.bien_so_xe,
          tx.loai_xe,
          tx.hang_xe,
          tx.mau_xe,
          tx.so_cho_ngoi,
          tx.trang_thai_tai_xe,
          tx.diem_danh_gia,
          tx.so_luot_danh_gia,
          tx.kinh_nghiem_lien_tuc,
          (
            SELECT COUNT(*) 
            FROM chuyen_di cd 
            WHERE cd.tai_xe_id = tx.id
          ) AS so_chuyen_di
        FROM tai_xe tx
        INNER JOIN nguoi_dung nd ON tx.nguoi_dung_id = nd.id
        WHERE nd.trang_thai = 'hoat_dong' 
          AND nd.loai_tai_khoan = 'tai_xe'
        ORDER BY tx.diem_danh_gia DESC, tx.so_luot_danh_gia DESC
        LIMIT 20
      `);
      
      return rows.map(row => ({
        id: row.id,
        ten: row.ten,
        bien_so_xe: row.bien_so_xe,
        loai_xe: row.loai_xe,
        hang_xe: row.hang_xe,
        mau_xe: row.mau_xe,
        so_cho_ngoi: row.so_cho_ngoi,
        trang_thai_tai_xe: row.trang_thai_tai_xe,
        diem_danh_gia: row.diem_danh_gia || 0,
        so_luot_danh_gia: row.so_luot_danh_gia || 0,
        kinh_nghiem_lien_tuc: row.kinh_nghiem_lien_tuc || 0,
        so_chuyen_di: row.so_chuyen_di || 0
      }));
    } catch (error) {
      console.error('Find available drivers error:', error);
      throw error;
    }
  }
}

module.exports = Driver;