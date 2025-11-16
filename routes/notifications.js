const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const { authenticate, requireDriver } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and driver role
router.use(authenticate, requireDriver);

// GET /api/drivers/notifications/ -> list notifications for current driver
router.get('/', NotificationController.getNotificationsForDriver);

// POST /api/drivers/notifications/:id/seen -> mark as seen
router.post('/:id/seen', NotificationController.markAsSeen);

// POST /api/drivers/notifications/:id/status -> update status (accepted/rejected)
router.post('/:id/status', NotificationController.updateNotificationStatus);

module.exports = router;
