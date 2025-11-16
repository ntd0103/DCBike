const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const Promotion = require('../models/Promotion');
const QRCode = require('qrcode');
const crypto = require('crypto');

class TripController {
  // Tạo chuyến đi mới
  static async createTrip(req, res) {
    try {
      const {
        diem_don, diem_den, lat_don, lng_don, lat_den, lng_den,
        khoang_cach, thoi_gian_du_kien, gia_cuoc, phi_dich_vu,
        khuyen_mai_id, ma_khuyen_mai, so_tien_giam_gia, ghi_chu,
        phuong_thuc_thanh_toan
      } = req.body;

      const khach_hang_id = req.user.id;

      // Nếu có khuyến mãi, xác nhận và tăng lượt sử dụng ngay tại server để đảm bảo đồng bộ
      let appliedPromotionId = null;
      let appliedDiscount = 0;
      let promoIdToUse = khuyen_mai_id;
      // Allow using promotion by code from client
      if (!promoIdToUse && ma_khuyen_mai) {
        try {
          const promo = await Promotion.findByCode(ma_khuyen_mai);
          if (promo) promoIdToUse = promo.id;
        } catch (e) {
          console.warn('findByCode failed', e?.message);
        }
      }

      if (promoIdToUse) {
        try {
          const baseAmount = Number(gia_cuoc) + Number(phi_dich_vu || 0);
          const result = await Promotion.useIfAvailableById(promoIdToUse, baseAmount);
          if (result && result.ok) {
            appliedPromotionId = promoIdToUse;
            appliedDiscount = result.giam_gia || 0;
          } else {
            // Không thể dùng khuyến mãi (hết lượt/hết hạn). Vẫn tiếp tục tạo chuyến nhưng bỏ voucher.
            appliedPromotionId = null;
            appliedDiscount = 0;
          }
        } catch (e) {
          console.error('Apply promotion error:', e);
          appliedPromotionId = null;
          appliedDiscount = 0;
        }
      }

      // Tính tổng tiền
      const tong_tien = (Number(gia_cuoc) + Number(phi_dich_vu || 0)) - (appliedDiscount || Number(so_tien_giam_gia || 0));

      const tripData = {
        khach_hang_id,
        diem_don,
        diem_den,
        lat_don,
        lng_don,
        lat_den,
        lng_den,
        khoang_cach,
        thoi_gian_du_kien,
        gia_cuoc,
        phi_dich_vu: phi_dich_vu || 0,
        tong_tien,
        khuyen_mai_id: appliedPromotionId,
        so_tien_giam_gia: appliedDiscount || so_tien_giam_gia || 0,
        ghi_chu
      };

      const tripId = await Trip.create(tripData);

      // If client included a payment method, create a payment record to track it
      try {
        const { pool } = require('../config/database');
        const allowed = ['tien_mat', 'the_tin_dung', 'vi_dien_tu', 'chuyen_khoan'];
        const method = phuong_thuc_thanh_toan && allowed.includes(phuong_thuc_thanh_toan) ? phuong_thuc_thanh_toan : null;
        if (method) {
          // If cash, mark as paid immediately; otherwise set to pending
          const status = method === 'tien_mat' ? 'da_thanh_toan' : 'cho_thanh_toan';
          const thoi_gian_thanh_toan = method === 'tien_mat' ? new Date() : null;

          // generate transaction id for non-cash payments (and for traceability)
          const ma_giao_dich = crypto.randomUUID ? crypto.randomUUID() : crypto.createHash('sha1').update(Date.now().toString() + Math.random().toString()).digest('hex');

          await pool.execute(`
            INSERT INTO thanh_toan (chuyen_di_id, so_tien, phuong_thuc_thanh_toan, ma_giao_dich, trang_thai, thoi_gian_thanh_toan)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [tripId, tripData.tong_tien || 0, method, ma_giao_dich, status, thoi_gian_thanh_toan]);

          // If bank transfer, generate a QR code payload and attach to responseData
          if (method === 'chuyen_khoan') {
            try {
              // Build EMVCo / VNQR compliant payload (TLV format) and generate CRC16
              // Helper to build TLV
              function tlv(id, value) {
                const len = value ? String(value.length).padStart(2, '0') : '00';
                return `${id}${len}${value || ''}`;
              }

              // CRC16-CCITT (XModem) implementation
              function crc16(buf) {
                let crc = 0xFFFF;
                for (let i = 0; i < buf.length; i++) {
                  crc ^= buf.charCodeAt(i) << 8;
                  for (let j = 0; j < 8; j++) {
                    crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
                  }
                }
                return crc.toString(16).toUpperCase().padStart(4, '0');
              }

              // Build Merchant Account Information (Tag 26) for VNPAYQR
              // Subfield 00 = GUI (VNPAYQR), 01 = merchant id/account, 02 = optional biller/store id
              const gui = process.env.PAYMENT_VNQR_GUI || 'VNPAYQR';
              const merchantId = process.env.PAYMENT_VNPAY_MERCHANT_ID || process.env.PAYMENT_BANK_ACCOUNT || '0123456789';
              const billerId = process.env.PAYMENT_VNPAY_BILLER_ID || '';
              let merchantAccountInfo = tlv('00', gui) + tlv('01', merchantId);
              if (billerId) merchantAccountInfo += tlv('02', billerId);
              const tag26 = tlv('26', merchantAccountInfo);

              // Other tags
              const payloadFormat = tlv('00', '01'); // version
              const poi = tlv('01', '11'); // static QR (11) or dynamic (12). Use static by default
              const mcc = tlv('52', '0000');
              const currency = tlv('53', '704'); // VND
              const amount = (Number(tripData.tong_tien) || 0).toFixed(2);
              const amtTag = amount && Number(amount) > 0 ? tlv('54', amount) : '';
              const country = tlv('58', 'VN');
              const merchantName = tlv('59', (process.env.PAYMENT_MERCHANT_NAME || 'DC Car Booking').slice(0,25));
              const merchantCity = tlv('60', (process.env.PAYMENT_MERCHANT_CITY || 'HCMC').slice(0,15));

              // Additional data field template (Tag 62) with Reference (05)
              const additionalData = tlv('05', ma_giao_dich);
              const tag62 = tlv('62', additionalData);

              // Compose payload without CRC (Tag 63)
              let emvPayload = '';
              emvPayload += payloadFormat;
              emvPayload += poi;
              emvPayload += tag26;
              emvPayload += mcc;
              emvPayload += currency;
              if (amtTag) emvPayload += amtTag;
              emvPayload += country;
              emvPayload += merchantName;
              emvPayload += merchantCity;
              emvPayload += tag62;

              // Append CRC tag placeholder
              emvPayload += '63' + '04' + '0000';

              const crc = crc16(emvPayload);
              // Replace CRC placeholder
              emvPayload = emvPayload.slice(0, -4) + crc;

              // Generate QR image
              const qrDataUrl = await QRCode.toDataURL(emvPayload, { margin: 2, width: 300 });

              tripData._payment_qr = qrDataUrl;
              tripData._payment_reference = ma_giao_dich;
              tripData._payment_emv = emvPayload;
            } catch (e) {
              console.error('EMV QR generation failed:', e?.message || e);
            }
          }
        }
      } catch (e) {
        console.debug('Create payment record failed:', e?.message || e);
      }

      // Tạo thông báo cho các tài xế đang sẵn sàng
      (async () => {
        try {
          let availableDrivers = [];
          if (tripData.lat_don && tripData.lng_don) {
            // Tìm các tài xế gần nhất
            availableDrivers = await Driver.findNearestDrivers(tripData.lat_don, tripData.lng_don, 10, 10);
          }

          if (!availableDrivers || availableDrivers.length === 0) {
            // Fallback: list of available drivers
            availableDrivers = await Driver.findAvailableDrivers();
          }

          const DriverNotification = require('../models/DriverNotification');

          const msg = `Chuyến mới: ${diem_don} → ${diem_den}. Giá ${gia_cuoc} VND`;

          for (const drv of availableDrivers.slice(0, 20)) {
            try {
              await DriverNotification.create({ driver_id: drv.id, trip_id: tripId, message: msg });
            } catch (e) {
              console.debug('Notification create failed for driver', drv.id, e.message);
            }
          }
        } catch (e) {
          console.error('Error creating driver notifications:', e);
        }
      })();

      res.status(201).json({
        success: true,
        message: 'Tạo chuyến đi thành công',
        data: {
          tripId,
          ...tripData
        }
      });
    } catch (error) {
      console.error('Create trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi tạo chuyến đi'
      });
    }
  }

  // Lấy danh sách chuyến đi của người dùng
  static async getUserTrips(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.loai_tai_khoan === 'tai_xe' ? 'tai_xe' : 'khach_hang';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await Trip.getByUserId(userId, userType, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get user trips error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy danh sách chuyến đi'
      });
    }
  }

  // Lấy chi tiết chuyến đi
  static async getTripDetail(req, res) {
    try {
      const tripId = req.params.id;
      const trip = await Trip.findById(tripId);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi'
        });
      }

      // Kiểm tra quyền xem (chỉ khách hàng, tài xế của chuyến đi hoặc admin)
      const userId = req.user.id;
      const userType = req.user.loai_tai_khoan;

      if (userType !== 'admin') {
        // use numeric-safe comparisons because DB drivers/ids may come back as strings
        const isOwner = Number(trip.khach_hang_id) === Number(userId);
        let isDriver = false;

        // If the current user is a driver, resolve driver's internal id and compare
        if (userType === 'tai_xe') {
          const driver = await Driver.findByUserId(userId);
          if (driver && trip.tai_xe_id) {
            // primary check: compare trip.tai_xe_id with driver's internal id
            isDriver = Number(trip.tai_xe_id) === Number(driver.id);
          }
          // fallback: in some setups tai_xe_id may accidentally store the user's id
          if (!isDriver && trip.tai_xe_id) {
            isDriver = Number(trip.tai_xe_id) === Number(userId);
          }
        }

        if (!isOwner && !isDriver) {
          return res.status(403).json({
            success: false,
            message: 'Chỉ khi tài xế đã nhận chuyến đi mới có quyền xem chi tiết'
          });
        }
      }

      res.json({
        success: true,
        data: trip
      });
    } catch (error) {
      console.error('Get trip detail error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy chi tiết chuyến đi'
      });
    }
  }

  // Tài xế nhận chuyến đi
  static async acceptTrip(req, res) {
    try {
      const tripId = req.params.id;
      const userId = req.user.id;

      // Lấy thông tin tài xế
      const driver = await Driver.findByUserId(userId);
      if (!driver) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là tài xế'
        });
      }

      // Kiểm tra trạng thái tài xế
      if (driver.trang_thai_tai_xe !== 'san_sang') {
        return res.status(400).json({
          success: false,
          message: 'Tài xế hiện không sẵn sàng nhận chuyến'
        });
      }

      // Ensure driver has no other active trips (da_nhan or dang_di)
      const activeTrips = await Trip.getActiveTripsByDriver(driver.id);
      if (activeTrips && activeTrips.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đang có chuyến đang xử lý. Hoàn thành chuyến đó trước khi nhận chuyến mới.'
        });
      }

      // Lấy thông tin chuyến đi
      const trip = await Trip.findById(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi'
        });
      }

      if (trip.trang_thai !== 'cho_tai_xe') {
        return res.status(400).json({
          success: false,
          message: 'Chuyến đi này đã được nhận hoặc đã hủy'
        });
      }

      // Cập nhật chuyến đi atomically and check result to avoid double-accept
      const updated = await Trip.updateStatus(tripId, 'da_nhan', { tai_xe_id: driver.id });
      if (!updated) {
        return res.status(400).json({ success: false, message: 'Chuyến đi đã được người khác nhận hoặc đã không còn hợp lệ.' });
      }

      // Now set driver status to 'dang_di'
      await Driver.updateStatus(driver.id, 'dang_di');

      res.json({
        success: true,
        message: 'Đã nhận chuyến đi thành công'
      });
    } catch (error) {
      console.error('Accept trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi nhận chuyến đi'
      });
    }
  }

  // Bắt đầu chuyến đi
  static async startTrip(req, res) {
    try {
      const tripId = req.params.id;
      const userId = req.user.id;

      // Lấy thông tin tài xế
      const driver = await Driver.findByUserId(userId);
      if (!driver) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là tài xế'
        });
      }

      // Lấy thông tin chuyến đi
      const trip = await Trip.findById(tripId);
      if (!trip || trip.tai_xe_id !== driver.id) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi hoặc bạn không phải tài xế của chuyến này'
        });
      }

      if (trip.trang_thai !== 'da_nhan') {
        return res.status(400).json({
          success: false,
          message: 'Không thể bắt đầu chuyến đi ở trạng thái hiện tại'
        });
      }

      await Trip.updateStatus(tripId, 'dang_di');

      res.json({
        success: true,
        message: 'Đã bắt đầu chuyến đi'
      });
    } catch (error) {
      console.error('Start trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi bắt đầu chuyến đi'
      });
    }
  }

  // Hoàn thành chuyến đi
  static async completeTrip(req, res) {
    try {
      const tripId = req.params.id;
      const userId = req.user.id;

      // Lấy thông tin tài xế
      const driver = await Driver.findByUserId(userId);
      if (!driver) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là tài xế'
        });
      }

      // Lấy thông tin chuyến đi
      const trip = await Trip.findById(tripId);
      if (!trip || trip.tai_xe_id !== driver.id) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi hoặc bạn không phải tài xế của chuyến này'
        });
      }

      if (trip.trang_thai !== 'dang_di') {
        return res.status(400).json({
          success: false,
          message: 'Không thể hoàn thành chuyến đi ở trạng thái hiện tại'
        });
      }

      await Trip.updateStatus(tripId, 'hoan_thanh');
      await Driver.updateStatus(driver.id, 'san_sang');

      res.json({
        success: true,
        message: 'Đã hoàn thành chuyến đi'
      });
    } catch (error) {
      console.error('Complete trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi hoàn thành chuyến đi'
      });
    }
  }

  // Hủy chuyến đi
  static async cancelTrip(req, res) {
    try {
      const tripId = req.params.id;
      const { ly_do_huy } = req.body;
      const userId = req.user.id;

      // Lấy thông tin chuyến đi
      const trip = await Trip.findById(tripId);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi'
        });
      }

      // Kiểm tra quyền hủy
      const isCustomer = Number(trip.khach_hang_id) === Number(userId);
      let isDriver = false;
      // If current user is a driver, resolve driver's internal id and compare
      if (req.user.loai_tai_khoan === 'tai_xe') {
        const driver = await Driver.findByUserId(userId);
        if (driver && trip.tai_xe_id) {
          isDriver = Number(trip.tai_xe_id) === Number(driver.id);
        }
      }
      const isAdmin = req.user.loai_tai_khoan === 'admin';

      if (!isCustomer && !isDriver && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền hủy chuyến đi này'
        });
      }

      // Kiểm tra trạng thái có thể hủy
      if (!['cho_tai_xe', 'da_nhan'].includes(trip.trang_thai)) {
        return res.status(400).json({
          success: false,
          message: 'Không thể hủy chuyến đi ở trạng thái hiện tại'
        });
      }

      await Trip.updateStatus(tripId, 'huy_bo', { ly_do_huy });

      // Nếu có tài xế đã nhận, cập nhật trạng thái tài xế về sẵn sàng
      if (trip.tai_xe_id) {
        await Driver.updateStatus(trip.tai_xe_id, 'san_sang');
      }

      res.json({
        success: true,
        message: 'Đã hủy chuyến đi'
      });
    } catch (error) {
      console.error('Cancel trip error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi hủy chuyến đi'
      });
    }
  }

  // Lấy danh sách chuyến đi có sẵn cho tài xế
  static async getAvailableTrips(req, res) {
    try {
      const userId = req.user.id;
      const { lat, lng, radius = 10 } = req.query;

      // Kiểm tra quyền tài xế
      const driver = await Driver.findByUserId(userId);
      if (!driver) {
        return res.status(403).json({
          success: false,
          message: 'Bạn không phải là tài xế'
        });
      }

      const trips = await Trip.getAvailableTrips(
        lat ? parseFloat(lat) : null,
        lng ? parseFloat(lng) : null,
        radius ? parseInt(radius) : 10
      );

      res.json({
        success: true,
        data: trips
      });
    } catch (error) {
      console.error('Get available trips error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy danh sách chuyến đi'
      });
    }
  }

  // Thống kê chuyến đi (Admin)
  static async getTripStatistics(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      const statistics = await Trip.getStatistics(start_date, end_date);

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Get trip statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi lấy thống kê'
      });
    }
  }
}

module.exports = TripController;