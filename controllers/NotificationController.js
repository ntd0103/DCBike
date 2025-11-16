const Driver = require('../models/Driver');
const DriverNotification = require('../models/DriverNotification');

class NotificationController {
  // Lấy thông báo cho tài xế (mặc định trả về pending trước)
  static async getNotificationsForDriver(req, res) {
    try {
      const userId = req.user.id;
      const driver = await Driver.findByUserId(userId);
      if (!driver) {
        return res.status(403).json({ success: false, message: 'Bạn không phải là tài xế' });
      }

      const notifications = await DriverNotification.getByDriverId(driver.id);
      res.json({ success: true, data: notifications });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống khi lấy thông báo' });
    }
  }

  // Đánh dấu thông báo đã xem
  static async markAsSeen(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      const driver = await Driver.findByUserId(userId);
      if (!driver) return res.status(403).json({ success: false, message: 'Bạn không phải là tài xế' });

      const ok = await DriverNotification.markAsSeen(notificationId, driver.id);
      res.json({ success: ok, message: ok ? 'Đã đánh dấu đã xem' : 'Không tìm thấy thông báo' });
    } catch (error) {
      console.error('Mark as seen error:', error);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật thông báo' });
    }
  }

  // (Optional) update status - use existing trip accept endpoint for accepting a trip
  static async updateNotificationStatus(req, res) {
    try {
      const userId = req.user.id;
      const notificationId = parseInt(req.params.id);
      const { status } = req.body; // 'accepted' or 'rejected'
      const driver = await Driver.findByUserId(userId);
      if (!driver) return res.status(403).json({ success: false, message: 'Bạn không phải là tài xế' });

      if (!['accepted', 'rejected', 'seen', 'pending'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
      }

      const ok = await DriverNotification.updateStatus(notificationId, driver.id, status);
      res.json({ success: ok, message: ok ? 'Cập nhật trạng thái thông báo' : 'Không tìm thấy thông báo' });
    } catch (error) {
      console.error('Update notification status error:', error);
      res.status(500).json({ success: false, message: 'Lỗi hệ thống khi cập nhật thông báo' });
    }
  }
}

module.exports = NotificationController;
