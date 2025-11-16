const Promotion = require('../models/Promotion');

class PromotionController {
  // Tạo khuyến mãi mới (Admin)
  static async createPromotion(req, res) {
    try {
      const {
        ma_khuyen_mai, ten_khuyen_mai, mo_ta, loai_khuyen_mai,
        gia_tri, gia_tri_toi_da, gia_tri_toi_thieu,
        ngay_bat_dau, ngay_ket_thuc, gioi_han_su_dung
      } = req.body;

      // Kiểm tra mã khuyến mãi đã tồn tại
      const existingPromotion = await Promotion.findByCode(ma_khuyen_mai);
      if (existingPromotion) {
        return res.status(400).json({
          success: false,
          message: 'Mã khuyến mãi đã tồn tại'
        });
      }

      const promotionId = await Promotion.create({
        ma_khuyen_mai,
        ten_khuyen_mai,
        mo_ta,
        loai_khuyen_mai,
        gia_tri,
        gia_tri_toi_da,
        gia_tri_toi_thieu,
        ngay_bat_dau,
        ngay_ket_thuc,
        gioi_han_su_dung
      });

      res.status(201).json({
        success: true,
        message: 'Tạo khuyến mãi thành công',
        data: { promotionId }
      });
    } catch (error) {
      console.error('Create promotion error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tạo khuyến mãi'
      });
    }
  }

  // Kiểm tra mã khuyến mãi
  static async validatePromotion(req, res) {
    try {
      const { ma_khuyen_mai, gia_don_hang } = req.body;

      if (!ma_khuyen_mai || !gia_don_hang) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu thông tin mã khuyến mãi hoặc giá đơn hàng'
        });
      }

      const result = await Promotion.validatePromotion(ma_khuyen_mai, gia_don_hang);

      res.json({
        success: result.valid,
        message: result.message,
        data: result.valid ? {
          promotion: result.promotion,
          giam_gia: result.giam_gia
        } : null
      });
    } catch (error) {
      console.error('Validate promotion error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi kiểm tra khuyến mãi'
      });
    }
  }

  // Lấy danh sách khuyến mãi đang hoạt động
  static async getActivePromotions(req, res) {
    try {
      const promotions = await Promotion.getActivePromotions();

      res.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error('Get active promotions error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy danh sách khuyến mãi'
      });
    }
  }

  // Lấy tất cả khuyến mãi công khai (không yêu cầu auth)
  static async getPublicPromotions(req, res) {
    try {
      const promotions = await Promotion.getAllPublic();

      res.json({
        success: true,
        data: promotions
      });
    } catch (error) {
      console.error('Get public promotions error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy danh sách khuyến mãi'
      });
    }
  }

  // Lấy danh sách tất cả khuyến mãi (Admin)
  static async getAllPromotions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const trang_thai = req.query.trang_thai;

      const result = await Promotion.getAll(page, limit, trang_thai);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get all promotions error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy danh sách khuyến mãi'
      });
    }
  }

  // Cập nhật khuyến mãi (Admin)
  static async updatePromotion(req, res) {
    try {
      const promotionId = req.params.id;
      const updateData = req.body;

      // Loại bỏ các field không được phép cập nhật
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.so_luong_su_dung;

      const updated = await Promotion.update(promotionId, updateData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khuyến mãi'
        });
      }

      res.json({
        success: true,
        message: 'Cập nhật khuyến mãi thành công'
      });
    } catch (error) {
      console.error('Update promotion error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi cập nhật khuyến mãi'
      });
    }
  }

  // Xóa khuyến mãi (Admin)
  static async deletePromotion(req, res) {
    try {
      const promotionId = req.params.id;

      const deleted = await Promotion.delete(promotionId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy khuyến mãi'
        });
      }

      res.json({
        success: true,
        message: 'Xóa khuyến mãi thành công'
      });
    } catch (error) {
      console.error('Delete promotion error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xóa khuyến mãi'
      });
    }
  }

  // Thống kê khuyến mãi (Admin)
  static async getPromotionStatistics(req, res) {
    try {
      const statistics = await Promotion.getStatistics();

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Get promotion statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy thống kê khuyến mãi'
      });
    }
  }
}

module.exports = PromotionController;