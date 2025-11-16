const express = require('express');
const TripController = require('../controllers/TripController');
const { authenticate, requireCustomer, requireDriver, requireAdmin } = require('../middleware/auth');
const { validateTripCreation } = require('../middleware/validation');

const router = express.Router();

// Tạo chuyến đi mới (chỉ khách hàng)
router.post('/', authenticate, requireCustomer, validateTripCreation, TripController.createTrip);

// Lấy danh sách chuyến đi của người dùng
router.get('/my-trips', authenticate, TripController.getUserTrips);

// Lấy danh sách chuyến đi của người dùng (alias endpoint)
router.get('/user', authenticate, TripController.getUserTrips);

// Lấy chi tiết chuyến đi
router.get('/:id', authenticate, TripController.getTripDetail);

// Tài xế nhận chuyến đi
router.post('/:id/accept', authenticate, requireDriver, TripController.acceptTrip);

// Bắt đầu chuyến đi (tài xế)
router.post('/:id/start', authenticate, requireDriver, TripController.startTrip);

// Hoàn thành chuyến đi (tài xế)
router.post('/:id/complete', authenticate, requireDriver, TripController.completeTrip);

// Hủy chuyến đi
router.post('/:id/cancel', authenticate, TripController.cancelTrip);

// Lấy danh sách chuyến đi có sẵn (tài xế)
router.get('/available/list', authenticate, requireDriver, TripController.getAvailableTrips);

// Thống kê chuyến đi (admin)
router.get('/admin/statistics', authenticate, requireAdmin, TripController.getTripStatistics);

module.exports = router;