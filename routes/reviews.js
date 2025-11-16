const express = require('express');
const { authenticate, requireCustomer } = require('../middleware/auth');
const ReviewController = require('../controllers/ReviewController');

const router = express.Router();

// Tạo đánh giá (khách hàng)
router.post('/', authenticate, requireCustomer, ReviewController.createReview);

// Lấy đánh giá theo tài xế (PUBLIC - cho phép cả khách vãng lai xem đánh giá)
router.get('/driver/:driverId', ReviewController.getByDriver);

module.exports = router;
