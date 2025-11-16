const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateDriverRegistration,
  validateLogin
} = require('../middleware/validation');

const router = express.Router();

// Đăng ký khách hàng
router.post('/register/customer', validateUserRegistration, AuthController.registerCustomer);

// Đăng ký tài xế  
router.post('/register/driver', validateDriverRegistration, AuthController.registerDriver);

// Đăng ký đơn xin làm tài xế (chờ duyệt) - yêu cầu xác thực để lấy thông tin user tự động
router.post('/register-driver', authenticate, AuthController.submitDriverRegistration);

// Đăng nhập
router.post('/login', validateLogin, AuthController.login);

// Lấy thông tin profile (yêu cầu xác thực)
router.get('/profile', authenticate, AuthController.getProfile);

// Cập nhật profile (yêu cầu xác thực)
router.put('/profile', authenticate, AuthController.updateProfile);

// Đổi mật khẩu (yêu cầu xác thực)
router.post('/change-password', authenticate, AuthController.changePassword);

module.exports = router;