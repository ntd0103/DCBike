const { verifyToken } = require('../config/jwt');
const User = require('../models/User');

// Middleware xác thực token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực'
      });
    }

    const token = authHeader.substring(7); // Bỏ "Bearer "
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Kiểm tra user còn tồn tại (không lọc theo trang_thai) để có thể trả lỗi rõ ràng nếu bị khoá
    const user = await User.findByIdRaw(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }

    // Nếu tài khoản đang bị khoá hoặc đã xoá - chặn truy cập và trả thông báo rõ ràng
    // Note: DB uses 'tam_khoa' for nguoi_dung.trang_thai
    if (user.trang_thai === 'tam_khoa') {
      return res.status(403).json({ success: false, message: 'Tài khoản đã bị khoá' });
    }
    if (user.trang_thai === 'da_xoa') {
      return res.status(403).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    // Gắn thông tin user vào request
    req.user = {
      id: user.id,
      email: user.email,
      ten: user.ten,
      loai_tai_khoan: user.loai_tai_khoan,
      trang_thai: user.trang_thai
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
};

// Middleware kiểm tra quyền
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    if (!roles.includes(req.user.loai_tai_khoan)) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập'
      });
    }

    next();
  };
};

// Middleware kiểm tra quyền admin
const requireAdmin = authorize('admin');

// Middleware kiểm tra quyền tài xế
const requireDriver = authorize('tai_xe', 'admin');

// Middleware kiểm tra quyền khách hàng
const requireCustomer = authorize('khach_hang', 'admin');

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireDriver,
  requireCustomer
};