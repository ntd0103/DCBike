const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const { authenticate } = require('../middleware/auth');

// Middleware để kiểm tra quyền admin
const adminAuth = (req, res, next) => {
  if (req.user.loai_tai_khoan !== 'admin') {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
  next();
};

// Dashboard
router.get('/dashboard', authenticate, adminAuth, AdminController.getDashboard);

// Quản lý đăng ký tài xế
router.get('/driver-registrations', authenticate, adminAuth, AdminController.getDriverRegistrations);
router.get('/driver-registrations/:id', authenticate, adminAuth, AdminController.getDriverRegistrationById);
router.post('/driver-registrations/:id/approve', authenticate, adminAuth, AdminController.approveDriverRegistration);
router.post('/driver-registrations/:id/reject', authenticate, adminAuth, AdminController.rejectDriverRegistration);

// New: list users by role (tai_xe, khach_hang, admin)
router.get('/users', authenticate, adminAuth, AdminController.getUsersByRole);

// Lấy thông tin người dùng theo ID
router.get('/users/:id', authenticate, adminAuth, AdminController.getUserById);

// Lock/unlock user
router.post('/users/:id/lock', authenticate, adminAuth, AdminController.lockUser);

// Change user role (body: { role: 'tai_xe'|'khach_hang'|'admin' })
router.post('/users/:id/role', authenticate, adminAuth, AdminController.changeUserRole);

// Quản lý voucher
router.get('/vouchers', authenticate, adminAuth, AdminController.getVouchers);
router.post('/vouchers', authenticate, adminAuth, AdminController.createVoucher);
router.get('/vouchers/:id', authenticate, adminAuth, AdminController.getVoucherById);
router.put('/vouchers/:id', authenticate, adminAuth, AdminController.updateVoucher);
router.delete('/vouchers/:id', authenticate, adminAuth, AdminController.deleteVoucher);

// Quản lý chuyến đi (lịch sử chuyến đi)
router.get('/trips', authenticate, adminAuth, AdminController.getAllTrips);
router.get('/trips/:id', authenticate, adminAuth, AdminController.getTripById);

module.exports = router;