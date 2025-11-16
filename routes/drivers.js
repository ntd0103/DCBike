const express = require('express');
const Driver = require('../models/Driver');
const { authenticate, requireDriver, requireAdmin } = require('../middleware/auth');
const { validateLocationUpdate } = require('../middleware/validation');

const router = express.Router();

// Tạo hồ sơ tài xế cho user đã đăng ký (hoàn thiện hồ sơ) - yêu cầu xác thực
router.post('/create', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { so_bang_lai, loai_bang_lai, kinh_nghiem_lien_tuc, bien_so_xe, loai_xe, mau_xe, hang_xe, so_cho_ngoi } = req.body;

    // Basic validation
    if (!so_bang_lai || !loai_bang_lai || !bien_so_xe || !loai_xe) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
    }

    // Check user exists and is permitted
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
    }

    // Create driver profile
    const Driver = require('../models/Driver');
    const result = await Driver.createForUser(userId, {
      so_bang_lai,
      loai_bang_lai,
      kinh_nghiem_lien_tuc,
      bien_so_xe,
      loai_xe,
      mau_xe,
      hang_xe,
      so_cho_ngoi
    });

    res.json({ success: true, message: 'Hoàn tất hồ sơ tài xế', data: result });
  } catch (error) {
    console.error('Create driver profile error:', error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lưu hồ sơ tài xế' });
  }
});

// Cập nhật vị trí tài xế
router.post('/location', authenticate, requireDriver, validateLocationUpdate, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const userId = req.user.id;

    // Lấy thông tin tài xế
    const driver = await Driver.findByUserId(userId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải là tài xế'
      });
    }

    const updated = await Driver.updateLocation(driver.id, lat, lng);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật vị trí'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật vị trí thành công'
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật vị trí'
    });
  }
});

// Cập nhật trạng thái tài xế
router.post('/status', authenticate, requireDriver, async (req, res) => {
  try {
    const { trang_thai } = req.body;
    const userId = req.user.id;

    // Validate trạng thái
    const validStatuses = ['san_sang', 'dang_di', 'nghi_lam', 'tam_khoa'];
    if (!validStatuses.includes(trang_thai)) {
      return res.status(400).json({
        success: false,
        message: 'Trạng thái không hợp lệ'
      });
    }

    // Lấy thông tin tài xế
    const driver = await Driver.findByUserId(userId);
    if (!driver) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không phải là tài xế'
      });
    }

    const updated = await Driver.updateStatus(driver.id, trang_thai);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật trạng thái'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công'
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi cập nhật trạng thái'
    });
  }
});

// Tìm tài xế gần nhất (cho admin hoặc debug)
router.get('/nearby', authenticate, async (req, res) => {
  try {
    const { lat, lng, radius = 5, limit = 10 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Cần cung cấp tọa độ lat và lng'
      });
    }

    const drivers = await Driver.findNearestDrivers(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radius),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Find nearby drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi tìm tài xế gần nhất'
    });
  }
});

// Lấy danh sách tài xế có sẵn (không cần auth để test)
router.get('/available', async (req, res) => {
  try {
    // Lấy dữ liệu thật từ database
    const drivers = await Driver.findAvailableDrivers();

    res.json({
      success: true,
      data: drivers || []
    });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách tài xế có sẵn'
    });
  }
});

// Lấy thông tin tài xế cho mục đích hiển thị công khai (không yêu cầu admin)
router.get('/public/:id', async (req, res) => {
  try {
    const driverId = req.params.id;
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài xế' });
    }

    // Return driver data (suitable for public display)
    return res.json({ success: true, data: driver });
  } catch (error) {
    console.error('Get public driver error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy thông tin tài xế' });
  }
});

// Lấy danh sách tài xế (admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const trang_thai = req.query.trang_thai;

    const result = await Driver.getAll(page, limit, trang_thai);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy danh sách tài xế'
    });
  }
});

// Lấy thông tin tài xế theo ID (admin)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const driverId = req.params.id;
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài xế'
      });
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thông tin tài xế'
    });
  }
});

// Thống kê tài xế (admin)
router.get('/admin/statistics', authenticate, requireAdmin, async (req, res) => {
  try {
    const statistics = await Driver.getStatistics();

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    console.error('Get driver statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi hệ thống khi lấy thống kê tài xế'
    });
  }
});

module.exports = router;