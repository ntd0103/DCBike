const express = require('express');
const PromotionController = require('../controllers/PromotionController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation cho tạo khuyến mãi
const validatePromotionCreation = [
  body('ma_khuyen_mai')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Mã khuyến mãi phải có từ 3-50 ký tự'),
  
  body('ten_khuyen_mai')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Tên khuyến mãi phải có từ 5-255 ký tự'),
  
  body('loai_khuyen_mai')
    .isIn(['phan_tram', 'so_tien'])
    .withMessage('Loại khuyến mãi không hợp lệ'),
  
  body('gia_tri')
    .isFloat({ min: 0 })
    .withMessage('Giá trị khuyến mãi phải lớn hơn 0'),
  
  body('ngay_bat_dau')
    .isDate()
    .withMessage('Ngày bắt đầu không hợp lệ'),
  
  body('ngay_ket_thuc')
    .isDate()
    .withMessage('Ngày kết thúc không hợp lệ')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.ngay_bat_dau)) {
        throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      }
      return true;
    }),

  handleValidationErrors
];

// Validation kiểm tra mã khuyến mãi
const validatePromotionCheck = [
  body('ma_khuyen_mai')
    .trim()
    .notEmpty()
    .withMessage('Mã khuyến mãi không được để trống'),
  
  body('gia_don_hang')
    .isFloat({ min: 0 })
    .withMessage('Giá đơn hàng phải lớn hơn 0'),

  handleValidationErrors
];

// Kiểm tra mã khuyến mãi (public)
router.post('/validate', validatePromotionCheck, PromotionController.validatePromotion);

// Lấy danh sách khuyến mãi đang hoạt động (public)
router.get('/active', PromotionController.getActivePromotions);

// Lấy tất cả khuyến mãi (public)
router.get('/all', PromotionController.getPublicPromotions);

// === Routes yêu cầu xác thực ===

// Tạo khuyến mãi mới (admin)
router.post('/', authenticate, requireAdmin, validatePromotionCreation, PromotionController.createPromotion);

// Lấy danh sách tất cả khuyến mãi (admin)
router.get('/', authenticate, requireAdmin, PromotionController.getAllPromotions);

// Cập nhật khuyến mãi (admin)
router.put('/:id', authenticate, requireAdmin, PromotionController.updatePromotion);

// Xóa khuyến mãi (admin)
router.delete('/:id', authenticate, requireAdmin, PromotionController.deletePromotion);

// Thống kê khuyến mãi (admin)
router.get('/admin/statistics', authenticate, requireAdmin, PromotionController.getPromotionStatistics);

module.exports = router;