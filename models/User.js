const { pool } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.ten = data.ten;
    this.email = data.email;
    this.so_dien_thoai = data.so_dien_thoai;
    this.mat_khau = data.mat_khau;
    this.dia_chi = data.dia_chi;
    this.loai_tai_khoan = data.loai_tai_khoan;
    this.trang_thai = data.trang_thai;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Tạo người dùng mới
  static async create(userData) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO nguoi_dung (ten, email, so_dien_thoai, mat_khau, dia_chi, loai_tai_khoan) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userData.ten, 
          userData.email, 
          userData.so_dien_thoai, 
          userData.mat_khau, 
          userData.dia_chi || null, // Convert undefined to null
          userData.loai_tai_khoan || 'khach_hang'
        ]
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Tìm người dùng theo email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM nguoi_dung WHERE email = ? AND trang_thai = "hoat_dong"',
        [email]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm người dùng theo ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM nguoi_dung WHERE id = ? AND trang_thai = "hoat_dong"',
        [id]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm người dùng theo ID (không lọc theo trang_thai) — dùng để xác thực token và kiểm tra trạng thái
  static async findByIdRaw(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM nguoi_dung WHERE id = ? LIMIT 1',
        [id]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Tìm người dùng theo số điện thoại
  static async findByPhone(so_dien_thoai) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM nguoi_dung WHERE so_dien_thoai = ? AND trang_thai = "hoat_dong"',
        [so_dien_thoai]
      );
      return rows.length > 0 ? new User(rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  // Cập nhật thông tin người dùng
  static async update(id, updateData) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });
      
      values.push(id);
      
      const [result] = await pool.execute(
        `UPDATE nguoi_dung SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Xóa người dùng (soft delete)
  static async delete(id) {
    try {
      const [result] = await pool.execute(
        'UPDATE nguoi_dung SET trang_thai = "da_xoa" WHERE id = ?',
        [id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Lấy danh sách người dùng với phân trang
  static async getAll(page = 1, limit = 10, loai_tai_khoan = null) {
    try {
      const offset = (page - 1) * limit;
      let query = 'SELECT * FROM nguoi_dung WHERE trang_thai = "hoat_dong"';
      const params = [];

      if (loai_tai_khoan) {
        query += ' AND loai_tai_khoan = ?';
        params.push(loai_tai_khoan);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await pool.execute(query, params);
      const users = rows.map(row => new User(row));

      // Đếm tổng số
      let countQuery = 'SELECT COUNT(*) as total FROM nguoi_dung WHERE trang_thai = "hoat_dong"';
      const countParams = [];
      
      if (loai_tai_khoan) {
        countQuery += ' AND loai_tai_khoan = ?';
        countParams.push(loai_tai_khoan);
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      return {
        users,
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
}

module.exports = User;