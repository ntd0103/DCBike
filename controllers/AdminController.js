const DriverRegistration = require('../models/DriverRegistration');
const Promotion = require('../models/Promotion');
const Trip = require('../models/Trip');
const { pool } = require('../config/database');

class AdminController {
  // Dashboard admin
  static async getDashboard(req, res) {
    try {
      // Thống kê đơn đăng ký tài xế
      const driverStats = await DriverRegistration.getStats();

      // Thống kê khuyến mãi
      const [promoStats] = await pool.execute(`
        SELECT 
          trang_thai,
          COUNT(*) as so_luong
        FROM khuyen_mai 
        GROUP BY trang_thai
      `);

      const promoSummary = {
        hoat_dong: 0,
        tam_dung: 0,
        het_han: 0,
        tong: 0
      };

      promoStats.forEach(row => {
        promoSummary[row.trang_thai] = row.so_luong;
        promoSummary.tong += row.so_luong;
      });

      // Tính doanh thu tháng hiện tại (từ ngày 1 đến hiện tại)
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);

      const toMySQLDateTime = (d) => {
        // YYYY-MM-DD HH:MM:SS
        const iso = d.toISOString();
        return iso.slice(0, 19).replace('T', ' ');
      };

      const tripStats = await Trip.getStatistics(toMySQLDateTime(start), toMySQLDateTime(end));
      const monthlyRevenue = tripStats.tong_doanh_thu || 0;

      // Return shape expected by front-end (top-level fields) while keeping
      // detailed data under `data` for backward compatibility.
      res.json({
        success: true,
        pendingRegistrations: driverStats.cho_duyet || 0,
        approvedDrivers: driverStats.da_duyet || 0,
        totalVouchers: promoSummary.tong || 0,
        monthlyRevenue,
        data: {
          driverRegistrations: driverStats,
          promotions: promoSummary,
          tripStats
        }
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê dashboard'
      });
    }
  }

  // === QUẢN LÝ CHUYẾN ĐI (ADMIN) ===
  static async getAllTrips(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const { trang_thai, khach_hang_id, tai_xe_id } = req.query;

      const filters = {};
      if (trang_thai) filters.trang_thai = trang_thai;
      if (khach_hang_id) filters.khach_hang_id = khach_hang_id;
      if (tai_xe_id) filters.tai_xe_id = tai_xe_id;

      const result = await Trip.getAll(page, limit, filters);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Get all trips error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách chuyến đi', error: error.message });
    }
  }

  static async getTripById(req, res) {
    try {
      const { id } = req.params;
      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến đi' });
      }
      res.json({ success: true, data: trip });
    } catch (error) {
      console.error('Get trip by id error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi lấy chi tiết chuyến đi' });
    }
  }

  // Lock or unlock a user account
  static async lockUser(req, res) {
    try {
      const { id } = req.params;
  const { lock } = req.body; // true => tam_khoa, false => hoat_dong

      console.log(`AdminController.lockUser called for id=${id}, lock=${lock}`);

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        if (lock) {
          // When locking: atomically set role back to 'khach_hang' and trang_thai to 'tam_khoa' (DB enum)
          const [updateRes] = await connection.execute(
            'UPDATE nguoi_dung SET loai_tai_khoan = ?, trang_thai = ? WHERE id = ?',
            ['khach_hang', 'tam_khoa', id]
          );

          console.log('AdminController.lockUser lock updateRes:', updateRes);

          if (updateRes.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
          }
        } else {
          // Unlock: only restore trang_thai to hoat_dong, keep role as-is
          const [updateRes] = await connection.execute(
            'UPDATE nguoi_dung SET trang_thai = ? WHERE id = ?',
            ['hoat_dong', id]
          );

          console.log('AdminController.lockUser unlock updateRes:', updateRes);

          if (updateRes.affectedRows === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
          }
        }

        await connection.commit();
        connection.release();

        res.json({ success: true, message: `Đã ${lock ? 'khóa' : 'mở khóa'} tài khoản` });
      } catch (innerErr) {
        await connection.rollback();
        connection.release();
        throw innerErr;
      }
    } catch (error) {
      console.error('Lock user error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi thay đổi trạng thái tài khoản' });
    }
  }

  // Change user's role (and create driver profile if necessary)
  static async changeUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const allowed = ['tai_xe', 'khach_hang', 'admin'];
      if (!allowed.includes(role)) {
        return res.status(400).json({ success: false, message: 'Role không hợp lệ' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Update role on user
        const [updateRes] = await connection.execute(
          'UPDATE nguoi_dung SET loai_tai_khoan = ? WHERE id = ?',
          [role, id]
        );

        if (updateRes.affectedRows === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // If role changed to tai_xe ensure a tai_xe record exists
        if (role === 'tai_xe') {
          // check if driver record exists
          const [rows] = await connection.execute(
            'SELECT id FROM tai_xe WHERE nguoi_dung_id = ? LIMIT 1',
            [id]
          );

          if (rows.length === 0) {
            // create an empty driver profile so admin can edit it later
            await connection.execute(
              `INSERT INTO tai_xe (nguoi_dung_id, so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc, trang_thai_tai_xe, created_at)
               VALUES (?, '', '', 0, 'cho_xac_nhan', NOW())`,
              [id]
            );
          }
        }

        await connection.commit();
        connection.release();

        res.json({ success: true, message: 'Cập nhật role thành công' });
      } catch (innerErr) {
        await connection.rollback();
        connection.release();
        throw innerErr;
      }
    } catch (error) {
      console.error('Change user role error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi thay đổi vai trò người dùng' });
    }
  }

  // === QUẢN LÝ ĐĂNG KÝ TÀI XẾ ===

  // Lấy danh sách đơn đăng ký tài xế
  static async getDriverRegistrations(req, res) {
    try {
      const { trang_thai } = req.query;
      const registrations = await DriverRegistration.getAll(trang_thai);

      // Normalize returned rows to ensure `trang_thai` is a status string.
      const normalized = registrations.map(r => {
        const row = Object.assign({}, r);

        // If trang_thai looks like a date (possible schema mixup), move it to ngay_duyet and mark as approved
        const maybeStatus = row.trang_thai;
        if (maybeStatus && typeof maybeStatus === 'string') {
          // check for ISO date or common date formats
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}/; // 2025-10-30
          const slashDateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}/; // 30/10/2025
          if (isoDateRegex.test(maybeStatus) || slashDateRegex.test(maybeStatus) || !isNaN(Date.parse(maybeStatus))) {
            // move this value to ngay_duyet if not already set
            if (!row.ngay_duyet) row.ngay_duyet = maybeStatus;
            row.trang_thai = 'da_duyet';
          }
        }

        // Normalize common English keys to Vietnamese DB keys to keep UI consistent
        if (row.trang_thai === 'pending') row.trang_thai = 'cho_duyet';
        if (row.trang_thai === 'approved') row.trang_thai = 'da_duyet';
        if (row.trang_thai === 'rejected') row.trang_thai = 'tu_choi';

        return row;
      });

      res.json({
        success: true,
        data: normalized
      });
    } catch (error) {
      console.error('Get driver registrations error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách đơn đăng ký'
      });
    }
  }

  // Lấy chi tiết đơn đăng ký
  static async getDriverRegistrationById(req, res) {
    try {
      const { id } = req.params;
      const registration = await DriverRegistration.getById(id);

      if (!registration) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn đăng ký'
        });
      }

      res.json({
        success: true,
        data: registration
      });
    } catch (error) {
      console.error('Get driver registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin đơn đăng ký'
      });
    }
  }

  // Duyệt đơn đăng ký tài xế
  static async approveDriverRegistration(req, res) {
    try {
      const { id } = req.params;
      const { password = '123456' } = req.body;
      const approverId = req.user.id;

      const result = await DriverRegistration.approve(id, approverId, password);

      res.json({
        success: true,
        message: 'Đã duyệt thành công đơn đăng ký tài xế',
        data: result
      });
    } catch (error) {
      console.error('Approve driver registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi duyệt đơn đăng ký'
      });
    }
  }

  // Từ chối đơn đăng ký tài xế
  static async rejectDriverRegistration(req, res) {
    try {
      const { id } = req.params;
      const { ly_do_tu_choi } = req.body;
      const approverId = req.user.id;

      console.log('Reject request data:', { id, ly_do_tu_choi, body: req.body }); // Debug log

      if (!ly_do_tu_choi) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập lý do từ chối'
        });
      }

      await DriverRegistration.reject(id, approverId, ly_do_tu_choi);

      res.json({
        success: true,
        message: 'Đã từ chối đơn đăng ký tài xế'
      });
    } catch (error) {
      console.error('Reject driver registration error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Lỗi khi từ chối đơn đăng ký'
      });
    }
  }

  // === QUẢN LÝ VOUCHER/KHUYẾN MÃI ===

  // Tạo voucher mới
  static async createVoucher(req, res) {
    try {
      const {
        ma_khuyen_mai, ten_khuyen_mai, mo_ta,
        loai_khuyen_mai, gia_tri, gia_tri_toi_da, gia_tri_toi_thieu,
        ngay_bat_dau, ngay_ket_thuc, gioi_han_su_dung
      } = req.body;

      const created_by = req.user.id;

      // Validate required fields
      if (!ma_khuyen_mai || !ten_khuyen_mai || !loai_khuyen_mai || !gia_tri || !ngay_bat_dau || !ngay_ket_thuc) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng điền đầy đủ thông tin bắt buộc'
        });
      }

      const promotion = await Promotion.create({
        ma_khuyen_mai, ten_khuyen_mai, mo_ta,
        loai_khuyen_mai, gia_tri, gia_tri_toi_da, gia_tri_toi_thieu,
        ngay_bat_dau, ngay_ket_thuc, gioi_han_su_dung, created_by
      });

      res.status(201).json({
        success: true,
        message: 'Tạo voucher thành công',
        data: promotion
      });
    } catch (error) {
      console.error('Create voucher error:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher đã tồn tại'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo voucher'
      });
    }
  }

  // Cập nhật voucher
  static async updateVoucher(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const updated = await Promotion.update(id, updateData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy voucher'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật voucher thành công'
      });
    } catch (error) {
      console.error('Update voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật voucher'
      });
    }
  }

  // Xóa voucher
  static async deleteVoucher(req, res) {
    try {
      const { id } = req.params;

      const deleted = await Promotion.delete(id);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy voucher'
        });
      }

      res.json({
        success: true,
        message: 'Xóa voucher thành công'
      });
    } catch (error) {
      console.error('Delete voucher error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa voucher'
      });
    }
  }

  // Lấy danh sách voucher (cho admin)
  static async getVouchers(req, res) {
    try {
      const { trang_thai } = req.query;
      const vouchers = await Promotion.getAll(trang_thai);

      res.json({
        success: true,
        data: vouchers
      });
    } catch (error) {
      console.error('Get vouchers error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách voucher'
      });
    }
  }

  // Lấy voucher theo ID
  static async getVoucherById(req, res) {
    try {
      const { id } = req.params;
      const voucher = await Promotion.findById(id);

      if (!voucher) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy voucher'
        });
      }

      res.json({
        success: true,
        data: voucher
      });
    } catch (error) {
      console.error('Get voucher by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin voucher'
      });
    }
  }

  // Lấy danh sách người dùng theo role (api cho admin sidebar)
  static async getUsersByRole(req, res) {
    try {
      const { role, status } = req.query;
      console.log(`AdminController.getUsersByRole called with role=${role}, status=${status}`);
      const allowed = ['tai_xe', 'khach_hang', 'admin'];
      const target = allowed.includes(role) ? role : null;

      // Build WHERE clauses dynamically. If status is provided use it; otherwise default to active users.
      const whereClauses = [];
      const params = [];

      // If status is provided and not 'all', filter by it. If status === 'all' do not filter by trang_thai.
      if (status && status !== 'all') {
        whereClauses.push('trang_thai = ?');
        params.push(status);
      } else if (!status) {
        // default behavior: only active users
        whereClauses.push('trang_thai = ?');
        params.push('hoat_dong');
      }

      if (target) {
        whereClauses.push('loai_tai_khoan = ?');
        params.push(target);
      }

      let query = `SELECT id, ten, email, so_dien_thoai, loai_tai_khoan, trang_thai, created_at FROM nguoi_dung`;
      if (whereClauses.length) query += ' WHERE ' + whereClauses.join(' AND ');
      query += ' ORDER BY created_at DESC LIMIT 200';

  const [rows] = await pool.execute(query, params);
  console.log(`AdminController.getUsersByRole returning ${rows.length} users`);

  res.json({ success: true, data: { users: rows } });
    } catch (error) {
      console.error('Get users by role error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách người dùng' });
    }
  }

  // Lấy thông tin chi tiết người dùng theo ID (bao gồm profile tài xế nếu có)
  static async getUserById(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await pool.execute(
        `SELECT n.id, n.ten, n.email, n.so_dien_thoai, n.loai_tai_khoan, n.trang_thai, n.created_at,
                t.id AS tai_xe_id, t.so_bang_lai, t.loai_bang_lai, t.kinh_nghiem_lien_tuc, t.trang_thai_tai_xe
         FROM nguoi_dung n
         LEFT JOIN tai_xe t ON t.nguoi_dung_id = n.id
         WHERE n.id = ?
         LIMIT 1`,
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
      }

      // Normalize keys for frontend convenience
      const user = rows[0];

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ success: false, message: 'Lỗi khi lấy thông tin người dùng' });
    }
  }
}

module.exports = AdminController;