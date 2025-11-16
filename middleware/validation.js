const { body, validationResult } = require('express-validator');

// Middleware kiểm tra lỗi validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu không hợp lệ',
      errors: errors.array()
    });
  }
  next();
};

// Validation đăng ký người dùng
const validateUserRegistration = [
  body('ten')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Tên phải có từ 2-255 ký tự'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('so_dien_thoai')
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),
  
  body('mat_khau')
    .isLength({ min: 6 })
    .withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  
  body('dia_chi')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Địa chỉ tối đa 500 ký tự'),

  handleValidationErrors
];

// Validation đăng nhập
const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email không hợp lệ'),
  
  body('mat_khau')
    .notEmpty()
    .withMessage('Mật khẩu không được để trống'),

  handleValidationErrors
];

// Validation đăng ký tài xế
const validateDriverRegistration = [
  ...validateUserRegistration.slice(0, -1), // Lấy validation user nhưng không có handleValidationErrors
  
  body('so_bang_lai')
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Số bằng lái phải có từ 8-20 ký tự'),
  
  body('loai_bang_lai')
    .isIn(['A1', 'A2', 'A3', 'B1', 'B2', 'C', 'D', 'E', 'F'])
    .withMessage('Loại bằng lái không hợp lệ'),
  
  body('kinh_nghiem_lien_tuc')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Kinh nghiệm lái xe phải từ 0-50 năm'),
  
  body('bien_so_xe')
    .trim()
    .matches(/^[0-9]{2}[A-Z]{1,2}-[0-9]{4,5}$/)
    .withMessage('Biển số xe không đúng định dạng (VD: 30A-12345)'),
  
  body('loai_xe')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Loại xe phải có từ 2-50 ký tự'),
  
  body('so_cho_ngoi')
    .optional()
    .isInt({ min: 2, max: 50 })
    .withMessage('Số chỗ ngồi phải từ 2-50'),

  handleValidationErrors
];

// Validation tạo chuyến đi
const validateTripCreation = [
  body('diem_don')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Điểm đón phải có từ 5-255 ký tự'),
  
  body('diem_den')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Điểm đến phải có từ 5-255 ký tự'),
  
  body('lat_don')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude điểm đón không hợp lệ'),
  
  body('lng_don')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude điểm đón không hợp lệ'),
  
  body('lat_den')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude điểm đến không hợp lệ'),
  
  body('lng_den')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude điểm đến không hợp lệ'),
  
  body('khoang_cach')
    .isFloat({ min: 0.1, max: 1000 })
    .withMessage('Khoảng cách phải từ 0.1-1000 km'),
  
  body('gia_cuoc')
    .isFloat({ min: 1000 })
    .withMessage('Giá cước phải ít nhất 1000 VND'),
  
  // Vehicle type and passenger count
  body('loai_xe')
    .optional()
    .isIn(['4-cho', '7-cho', '16-cho', '45-cho'])
    .withMessage('Loại xe không hợp lệ'),

  body('so_hanh_khach')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Số hành khách không hợp lệ')
    .bail()
    .custom((value, { req }) => {
      const capacityMap = { '4-cho': 4, '7-cho': 7, '16-cho': 16, '45-cho': 45 };
      const car = req.body.loai_xe || '4-cho';
      const capacity = capacityMap[car] || 4;
      if (parseInt(value, 10) > capacity) {
        throw new Error(`Số lượng khách (${value}) vượt quá sức chứa của loại xe đã chọn (${capacity} chỗ). Vui lòng chọn loại xe lớn hơn.`);
      }
      return true;
    }),

  handleValidationErrors
];

// Validation cập nhật vị trí
const validateLocationUpdate = [
  body('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude không hợp lệ'),
  
  body('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude không hợp lệ'),

  handleValidationErrors
];

// Validation đánh giá
const validateReview = [
  body('diem_so')
    .isInt({ min: 1, max: 5 })
    .withMessage('Điểm số phải từ 1-5'),
  
  body('binh_luan')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bình luận tối đa 1000 ký tự'),

  handleValidationErrors
];

// Validation thanh toán
const validatePayment = [
  body('so_tien')
    .isFloat({ min: 1000 })
    .withMessage('Số tiền phải ít nhất 1000 VND'),
  
  body('phuong_thuc_thanh_toan')
    .isIn(['tien_mat', 'the_tin_dung', 'vi_dien_tu', 'chuyen_khoan'])
    .withMessage('Phương thức thanh toán không hợp lệ'),

  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateLogin,
  validateDriverRegistration,
  validateTripCreation,
  validateLocationUpdate,
  validateReview,
  validatePayment
};