const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const User = require('../models/User');
const Driver = require('../models/Driver');
const DriverRegistration = require('../models/DriverRegistration');

class AuthController {
  // Đăng ký khách hàng
  static async registerCustomer(req, res) {
    try {
      const { ten, email, so_dien_thoai, mat_khau, dia_chi, loai_tai_khoan } = req.body;

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      // Kiểm tra số điện thoại đã tồn tại
      const existingPhone = await User.findByPhone(so_dien_thoai);
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được sử dụng'
        });
      }

      // Hash mật khẩu
      const hashedPassword = await bcrypt.hash(mat_khau, 12);

      // Tạo người dùng mới
      const userType = loai_tai_khoan === 'tai_xe' ? 'tai_xe' : 'khach_hang';

      const userId = await User.create({
        ten,
        email,
        so_dien_thoai,
        mat_khau: hashedPassword,
        dia_chi,
        loai_tai_khoan: userType
      });

      // Tạo token
  const token = generateToken({ userId, email, loai_tai_khoan: userType });

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          userId,
          token,
          user: {
            id: userId,
            ten,
            email,
            so_dien_thoai,
            loai_tai_khoan: userType
          }
        }
      });
    } catch (error) {
      console.error('Register customer error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đăng ký'
      });
    }
  }

  // Đăng ký tài xế
  static async registerDriver(req, res) {
    try {
      const {
        ten, email, so_dien_thoai, mat_khau, dia_chi,
        so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
        bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
      } = req.body;

      // Kiểm tra email đã tồn tại
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng'
        });
      }

      // Kiểm tra số điện thoại đã tồn tại
      const existingPhone = await User.findByPhone(so_dien_thoai);
      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại đã được sử dụng'
        });
      }

      // Hash mật khẩu
      const hashedPassword = await bcrypt.hash(mat_khau, 12);

      // Đăng ký tài xế
      const result = await Driver.register({
        ten, email, so_dien_thoai, 
        mat_khau: hashedPassword, 
        dia_chi,
        so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc,
        bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
      });

      // Tạo token
      const token = generateToken({ 
        userId: result.userId, 
        email, 
        loai_tai_khoan: 'tai_xe' 
      });

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài xế thành công',
        data: {
          userId: result.userId,
          driverId: result.driverId,
          token,
          user: {
            id: result.userId,
            ten,
            email,
            so_dien_thoai,
            loai_tai_khoan: 'tai_xe'
          }
        }
      });
    } catch (error) {
      console.error('Register driver error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đăng ký tài xế'
      });
    }
  }

  // Đăng nhập
  static async login(req, res) {
    try {
      const { email, mat_khau } = req.body;

      // Tìm người dùng
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Kiểm tra mật khẩu
      const isPasswordValid = await bcrypt.compare(mat_khau, user.mat_khau);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không đúng'
        });
      }

      // Tạo token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        loai_tai_khoan: user.loai_tai_khoan
      });

      // Lấy thông tin bổ sung nếu là tài xế
      let additionalInfo = {};
      if (user.loai_tai_khoan === 'tai_xe') {
        const driverInfo = await Driver.findByUserId(user.id);
        additionalInfo.driverInfo = driverInfo;
      }

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token,
          user: {
            id: user.id,
            ten: user.ten,
            email: user.email,
            so_dien_thoai: user.so_dien_thoai,
            dia_chi: user.dia_chi,
            loai_tai_khoan: user.loai_tai_khoan
          },
          ...additionalInfo
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đăng nhập'
      });
    }
  }

  // Lấy thông tin profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Lấy thông tin bổ sung nếu là tài xế
      let additionalInfo = {};
      if (user.loai_tai_khoan === 'tai_xe') {
        const driverInfo = await Driver.findByUserId(user.id);
        additionalInfo.driverInfo = driverInfo;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          ten: user.ten,
          email: user.email,
          so_dien_thoai: user.so_dien_thoai,
          dia_chi: user.dia_chi,
          loai_tai_khoan: user.loai_tai_khoan,
          created_at: user.created_at,
          ...additionalInfo
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy thông tin profile'
      });
    }
  }

  // Cập nhật profile
  static async updateProfile(req, res) {
    try {
      const { ten, dia_chi, so_dien_thoai } = req.body;
      const userId = req.user.id;

      // Kiểm tra số điện thoại đã tồn tại (trừ của chính user này)
      if (so_dien_thoai) {
        const existingPhone = await User.findByPhone(so_dien_thoai);
        if (existingPhone && existingPhone.id !== userId) {
          return res.status(400).json({
            success: false,
            message: 'Số điện thoại đã được sử dụng'
          });
        }
      }

      const updateData = {};
      if (ten) updateData.ten = ten;
      if (dia_chi) updateData.dia_chi = dia_chi;
      if (so_dien_thoai) updateData.so_dien_thoai = so_dien_thoai;

      const updated = await User.update(userId, updateData);
      
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Không thể cập nhật thông tin'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật thông tin thành công'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật profile'
      });
    }
  }

  // Đổi mật khẩu
  static async changePassword(req, res) {
    try {
      const { mat_khau_cu, mat_khau_moi } = req.body;
      const userId = req.user.id;

      // Lấy thông tin user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Kiểm tra mật khẩu cũ
      const isOldPasswordValid = await bcrypt.compare(mat_khau_cu, user.mat_khau);
      if (!isOldPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu cũ không đúng'
        });
      }

      // Hash mật khẩu mới
      const hashedNewPassword = await bcrypt.hash(mat_khau_moi, 12);

      // Cập nhật mật khẩu
      const updated = await User.update(userId, { mat_khau: hashedNewPassword });
      
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Không thể đổi mật khẩu'
        });
      }

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi đổi mật khẩu'
      });
    }
  }

  // Gửi đăng ký tài xế (chờ duyệt)
  static async submitDriverRegistration(req, res) {
    try {
      // Simple server-side validation helper
      const validationError = (message, field = null) => {
        return { message, field };
      };
      // Allow minimal driver registration: page may submit only CCCD, license and vehicle info
      const {
        ho_ten, email, so_dien_thoai, ngay_sinh, cccd, dia_chi,
        bang_lai, so_bang_lai, kinh_nghiem_lai_xe, mat_khau, ghi_chu,
        bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi
      } = req.body;

      // Validate required minimal fields and return specific messages
      // Required: cccd, so_bang_lai, bang_lai, bien_so_xe, loai_xe
      if (!cccd || String(cccd).trim() === '') {
        return res.status(400).json({ success: false, ...validationError('Căn cước công dân (CCCD) là bắt buộc', 'cccd') });
      }

      if (!so_bang_lai || String(so_bang_lai).trim() === '') {
        return res.status(400).json({ success: false, ...validationError('Số bằng lái là bắt buộc', 'so_bang_lai') });
      }

      if (!bang_lai || String(bang_lai).trim() === '') {
        return res.status(400).json({ success: false, ...validationError('Loại bằng lái là bắt buộc', 'bang_lai') });
      }

      if (!bien_so_xe || String(bien_so_xe).trim() === '') {
        return res.status(400).json({ success: false, ...validationError('Biển số xe là bắt buộc', 'bien_so_xe') });
      }

      if (!loai_xe || String(loai_xe).trim() === '') {
        return res.status(400).json({ success: false, ...validationError('Loại xe là bắt buộc', 'loai_xe') });
      }

      // Basic format checks
      const cccdStr = String(cccd).trim();
      if (!/^[0-9]{9,12}$/.test(cccdStr)) {
        return res.status(400).json({ success: false, ...validationError('CCCD không hợp lệ (9-12 chữ số)', 'cccd') });
      }

      const plate = String(bien_so_xe).trim();
      if (!/^[\w\-\s]{3,15}$/.test(plate)) {
        return res.status(400).json({ success: false, ...validationError('Biển số xe không hợp lệ', 'bien_so_xe') });
      }

      // If email provided, check uniqueness but allow if it's the same as the authenticated user
      if (email) {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
          // If request is authenticated and belongs to the same user, allow
          if (!(req.user && existingUser.id === req.user.id)) {
            return res.status(400).json({ success: false, ...validationError('Email đã được sử dụng', 'email') });
          }
        }

        const existingPhone = await User.findByPhone(so_dien_thoai);
        if (existingPhone) {
          if (!(req.user && existingPhone.id === req.user.id)) {
            return res.status(400).json({ success: false, ...validationError('Số điện thoại đã được sử dụng', 'so_dien_thoai') });
          }
        }

        const existingRegistration = await DriverRegistration.findByEmail(email);
        if (existingRegistration) {
          return res.status(400).json({ success: false, ...validationError('Email này đã có đơn đăng ký tài xế', 'email') });
        }
      }

      // Hash mật khẩu only if provided (optional for minimal flow)
      let hashedPassword = null;
      if (mat_khau) {
        hashedPassword = await bcrypt.hash(mat_khau, 12);
      }

      // Build registration data. If license number not provided, fall back to CCCD value.
      const registrationData = {
        // DB schema requires these fields NOT NULL, provide empty string when not available
        ten: ho_ten || '',
        email: email || '',
        so_dien_thoai: so_dien_thoai || '',
        dia_chi: dia_chi || '',
        so_bang_lai: so_bang_lai || cccd || null,
        loai_bang_lai: bang_lai || null,
        kinh_nghiem_lien_tuc: kinh_nghiem_lai_xe || 0,
        bien_so_xe: bien_so_xe || 'CHƯA CẬP NHẬT',
        loai_xe: loai_xe || 'CHƯA CẬP NHẬT',
        mau_xe: mau_xe || null,
        hang_xe: hang_xe || null,
        so_cho_ngoi: so_cho_ngoi || null,
        giay_phep_kinh_doanh: null,
        anh_bang_lai: null,
        anh_cmnd: null,
        anh_xe: null,
        ghi_chu: (cccd ? `CCCD: ${cccd}${ghi_chu ? ' | ' + ghi_chu : ''}` : (ghi_chu || null))
      };

      const registration = await DriverRegistration.create(registrationData);

      res.status(201).json({
        success: true,
        message: 'Đăng ký đã được gửi thành công. Vui lòng chờ admin duyệt.',
        data: {
          registrationId: registration.id
        }
      });
    } catch (error) {
      console.error('Driver registration submission error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi gửi đăng ký'
      });
    }
  }
}

module.exports = AuthController;