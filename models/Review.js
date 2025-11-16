const { pool } = require('../config/database');

class Review {
  // Tạo đánh giá cho chuyến đi (khách hàng đánh giá tài xế)
  static async create({ chuyen_di_id, nguoi_danh_gia_id, diem_so, binh_luan }) {
    // ...existing code...
  }

  // Lấy danh sách đánh giá cho tài xế
  static async getByDriverId(driverId) {
    const [rows] = await pool.execute(`
      SELECT dg.*, nd.ten AS khach_hang
      FROM danh_gia dg
      JOIN chuyen_di cd ON dg.chuyen_di_id = cd.id
      JOIN nguoi_dung nd ON dg.nguoi_danh_gia_id = nd.id
      WHERE cd.tai_xe_id = ? AND dg.loai_danh_gia = 'danh_gia_tai_xe'
      ORDER BY dg.created_at DESC
    `, [driverId]);
    return rows;
  }
}
// ...existing code...

module.exports = Review;
