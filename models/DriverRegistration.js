const { pool } = require('../config/database');

class DriverRegistration {
  // Tạo đơn đăng ký tài xế mới
  static async create(registrationData) {
    try {
      const {
        ten, email, so_dien_thoai, dia_chi,
        so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
        bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi,
        giay_phep_kinh_doanh, anh_bang_lai, anh_cmnd, anh_xe, ghi_chu
      } = registrationData;

      const [result] = await pool.execute(`
        INSERT INTO driver_registrations (
          ten, email, so_dien_thoai, dia_chi,
          so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
          bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi,
          giay_phep_kinh_doanh, anh_bang_lai, anh_cmnd, anh_xe, ghi_chu
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        ten, email, so_dien_thoai, dia_chi,
        so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
        bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi,
        giay_phep_kinh_doanh, anh_bang_lai, anh_cmnd, anh_xe, ghi_chu
      ]);

      return { id: result.insertId, ...registrationData };
    } catch (error) {
      throw error;
    }
  }

  // Lấy tất cả đơn đăng ký
  static async getAll(trang_thai = null) {
    try {
      let query = `
        SELECT dr.*, 
               nd.ten as nguoi_duyet_ten
        FROM driver_registrations dr
        LEFT JOIN nguoi_dung nd ON dr.nguoi_duyet_id = nd.id
      `;
      
      const params = [];
      if (trang_thai) {
        query += ' WHERE dr.trang_thai = ?';
        params.push(trang_thai);
      }
      
      query += ' ORDER BY dr.created_at DESC';

      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw error;
    }
  }

    // Lấy đăng ký theo email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM driver_registrations WHERE email = ?',
        [email]
      );
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Lấy đăng ký theo ID
  static async getById(id) {
    try {
      const [rows] = await pool.execute(`
        SELECT dr.*, 
               nd.ten as nguoi_duyet_ten
        FROM driver_registrations dr
        LEFT JOIN nguoi_dung nd ON dr.nguoi_duyet_id = nd.id
        WHERE dr.id = ?
      `, [id]);

      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Duyệt đơn đăng ký (tạo tài khoản tài xế)
  static async approve(id, approver_id, password = '123456') {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Lấy thông tin đơn đăng ký
      const [regRows] = await connection.execute(
        'SELECT * FROM driver_registrations WHERE id = ? AND trang_thai = "cho_duyet"',
        [id]
      );

      if (regRows.length === 0) {
        throw new Error('Không tìm thấy đơn đăng ký hoặc đã được xử lý');
      }

      const registration = regRows[0];

      // Check if there is an existing active user with same email or phone
      const [existingUsers] = await connection.execute(
        'SELECT * FROM nguoi_dung WHERE (email = ? OR so_dien_thoai = ?) AND trang_thai = "hoat_dong" LIMIT 1',
        [registration.email, registration.so_dien_thoai]
      );

      let userId;
      let createdNewUser = false;
      let createdPassword = null;

      if (existingUsers.length > 0) {
        // Use the existing user account and convert role to 'tai_xe' if needed
        const user = existingUsers[0];
        userId = user.id;

        if (user.loai_tai_khoan !== 'tai_xe') {
          await connection.execute(
            'UPDATE nguoi_dung SET loai_tai_khoan = ? WHERE id = ?',
            ['tai_xe', userId]
          );
        }

        // Ensure there is a tai_xe record for this user
        const [driverRows] = await connection.execute(
          'SELECT id FROM tai_xe WHERE nguoi_dung_id = ? LIMIT 1',
          [userId]
        );

        if (driverRows.length === 0) {
          await connection.execute(`
            INSERT INTO tai_xe (
              nguoi_dung_id, so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
              bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            userId, registration.so_bang_lai, registration.loai_bang_lai, registration.kinh_nghiem_lien_tuc,
            registration.bien_so_xe, registration.loai_xe, registration.mau_xe, registration.hang_xe, registration.so_cho_ngoi
          ]);
        }
      } else {
        // No existing user -> create new user and driver
        // Hash password
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 12);

        const [userResult] = await connection.execute(`
          INSERT INTO nguoi_dung (ten, email, so_dien_thoai, mat_khau, dia_chi, loai_tai_khoan)
          VALUES (?, ?, ?, ?, ?, 'tai_xe')
        `, [registration.ten, registration.email, registration.so_dien_thoai, hashedPassword, registration.dia_chi]);

        userId = userResult.insertId;
        createdNewUser = true;
        createdPassword = password;

        // Create tai_xe record
        await connection.execute(`
          INSERT INTO tai_xe (
            nguoi_dung_id, so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
            bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, registration.so_bang_lai, registration.loai_bang_lai, registration.kinh_nghiem_lien_tuc,
          registration.bien_so_xe, registration.loai_xe, registration.mau_xe, registration.hang_xe, registration.so_cho_ngoi
        ]);
      }

      // Cập nhật trạng thái đơn đăng ký
      await connection.execute(`
        UPDATE driver_registrations 
        SET trang_thai = 'da_duyet', nguoi_duyet_id = ?, ngay_duyet = NOW()
        WHERE id = ?
      `, [approver_id, id]);

      await connection.commit();

      return {
        userId,
        email: registration.email,
        password,
        message: 'Đã duyệt thành công đơn đăng ký tài xế'
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Từ chối đơn đăng ký
  static async reject(id, approver_id, ly_do_tu_choi) {
    try {
      const [result] = await pool.execute(`
        UPDATE driver_registrations 
        SET trang_thai = 'tu_choi', 
            nguoi_duyet_id = ?, 
            ly_do_tu_choi = ?,
            ngay_duyet = NOW()
        WHERE id = ? AND trang_thai = 'cho_duyet'
      `, [approver_id, ly_do_tu_choi, id]);

      if (result.affectedRows === 0) {
        throw new Error('Không tìm thấy đơn đăng ký hoặc đã được xử lý');
      }

      return { message: 'Đã từ chối đơn đăng ký' };
    } catch (error) {
      throw error;
    }
  }

  // Thống kê đơn đăng ký
  static async getStats() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          trang_thai,
          COUNT(*) as so_luong
        FROM driver_registrations 
        GROUP BY trang_thai
      `);

      const stats = {
        cho_duyet: 0,
        da_duyet: 0,
        tu_choi: 0,
        tong: 0
      };

      rows.forEach(row => {
        stats[row.trang_thai] = row.so_luong;
        stats.tong += row.so_luong;
      });

      return stats;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DriverRegistration;