const { pool } = require('../config/database');

class Trip {
  constructor(data) {
    this.id = data.id;
    this.khach_hang_id = data.khach_hang_id;
    this.tai_xe_id = data.tai_xe_id;
    this.diem_don = data.diem_don;
    this.diem_den = data.diem_den;
    this.toa_do_diem_don = data.toa_do_diem_don;
    this.toa_do_diem_den = data.toa_do_diem_den;
    this.thoi_gian_dat = data.thoi_gian_dat;
    this.thoi_gian_don = data.thoi_gian_don;
    this.thoi_gian_bat_dau = data.thoi_gian_bat_dau;
    this.thoi_gian_ket_thuc = data.thoi_gian_ket_thuc;
    this.khoang_cach = data.khoang_cach;
    this.thoi_gian_du_kien = data.thoi_gian_du_kien;
    this.gia_cuoc = data.gia_cuoc;
    this.phi_dich_vu = data.phi_dich_vu;
    this.tong_tien = data.tong_tien;
    this.khuyen_mai_id = data.khuyen_mai_id;
    this.so_tien_giam_gia = data.so_tien_giam_gia;
    this.trang_thai = data.trang_thai;
    this.ly_do_huy = data.ly_do_huy;
    this.ghi_chu = data.ghi_chu;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Tạo chuyến đi mới
  static async create(tripData) {
    try {
      const [result] = await pool.execute(`
        INSERT INTO chuyen_di (
          khach_hang_id, diem_don, diem_den, toa_do_diem_don, toa_do_diem_den,
          khoang_cach, thoi_gian_du_kien, gia_cuoc, phi_dich_vu, tong_tien,
          khuyen_mai_id, so_tien_giam_gia, ghi_chu
        ) VALUES (?, ?, ?, POINT(?, ?), POINT(?, ?), ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        tripData.khach_hang_id,
        tripData.diem_don,
        tripData.diem_den,
        tripData.lat_don || 0, tripData.lng_don || 0,
        tripData.lat_den || 0, tripData.lng_den || 0,
        tripData.khoang_cach,
        tripData.thoi_gian_du_kien,
        tripData.gia_cuoc,
        tripData.phi_dich_vu || 0,
        tripData.tong_tien,
        tripData.khuyen_mai_id || null,
        tripData.so_tien_giam_gia || 0,
        tripData.ghi_chu || null
      ]);
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả chuyến đi (cho admin) với phân trang và bộ lọc đơn giản
  static async getAll(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const params = [];

      if (filters.trang_thai) {
        whereClauses.push('cd.trang_thai = ?');
        params.push(filters.trang_thai);
      }

      if (filters.khach_hang_id) {
        whereClauses.push('cd.khach_hang_id = ?');
        params.push(filters.khach_hang_id);
      }

      if (filters.tai_xe_id) {
        whereClauses.push('cd.tai_xe_id = ?');
        params.push(filters.tai_xe_id);
      }

      let query = `
        SELECT cd.*,
               kh.ten as ten_khach_hang, kh.so_dien_thoai as sdt_khach_hang,
               nd_tx.ten as ten_tai_xe, nd_tx.so_dien_thoai as sdt_tai_xe,
               tx.bien_so_xe, tx.loai_xe, tx.mau_xe, tx.hang_xe
        FROM chuyen_di cd
        LEFT JOIN nguoi_dung kh ON cd.khach_hang_id = kh.id
        LEFT JOIN tai_xe tx ON cd.tai_xe_id = tx.id
        LEFT JOIN nguoi_dung nd_tx ON tx.nguoi_dung_id = nd_tx.id
      `;

      if (whereClauses.length) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

  // Sử dụng thoi_gian_dat để tương thích với DB cũ có thể chưa có created_at
  query += ' ORDER BY cd.thoi_gian_dat DESC LIMIT ? OFFSET ?';

      const listParams = params.concat([limit, offset]);
      const [rows] = await pool.execute(query, listParams);

      // Count total
      let countQuery = 'SELECT COUNT(*) as total FROM chuyen_di cd';
      if (whereClauses.length) countQuery += ' WHERE ' + whereClauses.join(' AND ');
      const [countRows] = await pool.execute(countQuery, params);
      const total = countRows[0]?.total || 0;

      return {
        trips: rows,
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

  // Tìm chuyến đi theo ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT cd.*, 
               kh.ten as ten_khach_hang, kh.so_dien_thoai as sdt_khach_hang,
               nd_tx.ten as ten_tai_xe, nd_tx.so_dien_thoai as sdt_tai_xe,
               tx.bien_so_xe, tx.loai_xe, tx.mau_xe, tx.hang_xe,
               km.ma_khuyen_mai, km.ten_khuyen_mai
        FROM chuyen_di cd
        LEFT JOIN nguoi_dung kh ON cd.khach_hang_id = kh.id
        LEFT JOIN tai_xe tx ON cd.tai_xe_id = tx.id
        LEFT JOIN nguoi_dung nd_tx ON tx.nguoi_dung_id = nd_tx.id
        LEFT JOIN khuyen_mai km ON cd.khuyen_mai_id = km.id
        WHERE cd.id = ?
      `, [id]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách chuyến đi theo người dùng
  static async getByUserId(userId, userType = 'khach_hang', page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT cd.*, 
               kh.ten as ten_khach_hang, kh.so_dien_thoai as sdt_khach_hang,
               nd_tx.ten as ten_tai_xe, nd_tx.so_dien_thoai as sdt_tai_xe,
               tx.bien_so_xe, tx.loai_xe, tx.mau_xe, tx.hang_xe,
               (
                 SELECT COUNT(*) FROM danh_gia dg
                 WHERE dg.chuyen_di_id = cd.id
                   AND dg.nguoi_danh_gia_id = ?
                   AND dg.loai_danh_gia = 'danh_gia_tai_xe'
               ) AS da_danh_gia
        FROM chuyen_di cd
        LEFT JOIN nguoi_dung kh ON cd.khach_hang_id = kh.id
        LEFT JOIN tai_xe tx ON cd.tai_xe_id = tx.id
        LEFT JOIN nguoi_dung nd_tx ON tx.nguoi_dung_id = nd_tx.id
      `;
      
      if (userType === 'khach_hang') {
        query += ' WHERE cd.khach_hang_id = ?';
      } else {
        query += ' WHERE tx.nguoi_dung_id = ?';
      }
      
      query += ' ORDER BY cd.created_at DESC LIMIT ? OFFSET ?';
      
  const [rows] = await pool.execute(query, [userId, userId, limit, offset]);
      
      // Đếm tổng số
      let countQuery = 'SELECT COUNT(*) as total FROM chuyen_di cd';
      if (userType === 'tai_xe') {
        countQuery += ' LEFT JOIN tai_xe tx ON cd.tai_xe_id = tx.id WHERE tx.nguoi_dung_id = ?';
      } else {
        countQuery += ' WHERE cd.khach_hang_id = ?';
      }
      
  const [countResult] = await pool.execute(countQuery, [userId]);
      const total = countResult[0].total;

      return {
        trips: rows,
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

  // Cập nhật trạng thái chuyến đi
  static async updateStatus(id, trang_thai, additionalData = {}) {
    try {
      let query = 'UPDATE chuyen_di SET trang_thai = ?';
      const values = [trang_thai];
      
      // Thêm thời gian tương ứng với trạng thái
      if (trang_thai === 'da_nhan') {
        query += ', thoi_gian_don = CURRENT_TIMESTAMP';
        if (additionalData.tai_xe_id) {
          query += ', tai_xe_id = ?';
          values.push(additionalData.tai_xe_id);
        }
      } else if (trang_thai === 'dang_di') {
        query += ', thoi_gian_bat_dau = CURRENT_TIMESTAMP';
      } else if (trang_thai === 'hoan_thanh') {
        query += ', thoi_gian_ket_thuc = CURRENT_TIMESTAMP';
      } else if (trang_thai === 'huy_bo' && additionalData.ly_do_huy) {
        query += ', ly_do_huy = ?';
        values.push(additionalData.ly_do_huy);
      }
      
      query += ' WHERE id = ?';
      values.push(id);
      
      const [result] = await pool.execute(query, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Lấy chuyến đi đang chờ tài xế
  static async getAvailableTrips(lat = null, lng = null, radius = 10) {
    try {
      let query = `
        SELECT cd.*, kh.ten as ten_khach_hang, kh.so_dien_thoai as sdt_khach_hang
        FROM chuyen_di cd
        LEFT JOIN nguoi_dung kh ON cd.khach_hang_id = kh.id
        WHERE cd.trang_thai = 'cho_tai_xe'
      `;
      
      const params = [];
      
      // Nếu có tọa độ, tìm trong bán kính
      if (lat && lng) {
        query += ` AND (
          6371 * acos(
            cos(radians(?)) * cos(radians(ST_Y(cd.toa_do_diem_don))) * 
            cos(radians(ST_X(cd.toa_do_diem_don)) - radians(?)) + 
            sin(radians(?)) * sin(radians(ST_Y(cd.toa_do_diem_don)))
          )
        ) <= ?`;
        params.push(lat, lng, lat, radius);
      }
      
      query += ' ORDER BY cd.created_at ASC';
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Thống kê chuyến đi
  static async getStatistics(startDate = null, endDate = null) {
    try {
      let query = 'SELECT trang_thai, COUNT(*) as so_luong FROM chuyen_di';
      const params = [];
      
      if (startDate && endDate) {
        query += ' WHERE created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }
      
      query += ' GROUP BY trang_thai';
      
      const [rows] = await pool.execute(query, params);
      
      // Thống kê doanh thu
      let revenueQuery = 'SELECT SUM(tong_tien) as tong_doanh_thu FROM chuyen_di WHERE trang_thai = "hoan_thanh"';
      if (startDate && endDate) {
        revenueQuery += ' AND created_at BETWEEN ? AND ?';
      }
      
      const [revenueResult] = await pool.execute(revenueQuery, params);
      
      return {
        trang_thai: rows,
        tong_doanh_thu: revenueResult[0].tong_doanh_thu || 0
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Trip;