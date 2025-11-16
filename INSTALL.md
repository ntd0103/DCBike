# Hướng dẫn cài đặt và chạy DC Car Booking

## Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- MySQL (phiên bản 5.7 trở lên)
- Git

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình database

1. Tạo database MySQL:
```sql
CREATE DATABASE dc_car_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Cập nhật thông tin database trong file `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=dc_car_booking
```

### 3. Tạo bảng database

```bash
node database/createTables.js
```

### 4. Thêm dữ liệu mẫu (tùy chọn)

```bash
node database/seedData.js
```

### 5. Khởi động server

Chế độ development:
```bash
npm run dev
```

Chế độ production:
```bash
npm start
```

Server sẽ chạy tại: http://localhost:3000

## Cấu trúc API

### Authentication Endpoints

- `POST /api/auth/register/customer` - Đăng ký khách hàng
- `POST /api/auth/register/driver` - Đăng ký tài xế
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/profile` - Xem profile (yêu cầu token)
- `PUT /api/auth/profile` - Cập nhật profile (yêu cầu token)

### Trip Endpoints

- `POST /api/trips` - Tạo chuyến đi (khách hàng)
- `GET /api/trips/my-trips` - Lấy chuyến đi của user
- `GET /api/trips/:id` - Chi tiết chuyến đi
- `POST /api/trips/:id/accept` - Tài xế nhận chuyến
- `POST /api/trips/:id/start` - Bắt đầu chuyến đi
- `POST /api/trips/:id/complete` - Hoàn thành chuyến đi
- `POST /api/trips/:id/cancel` - Hủy chuyến đi
- `GET /api/trips/available/list` - Chuyến đi có sẵn (tài xế)

### Driver Endpoints

- `POST /api/drivers/location` - Cập nhật vị trí (tài xế)
- `POST /api/drivers/status` - Cập nhật trạng thái (tài xế)
- `GET /api/drivers/nearby` - Tìm tài xế gần nhất
- `GET /api/drivers` - Danh sách tài xế (admin)

## Tài khoản mẫu

Sau khi chạy seed data, bạn có thể sử dụng các tài khoản sau để test:

### Admin
- Email: admin@dc.com
- Password: 123456

### Khách hàng
- Email: khachhang1@gmail.com
- Password: 123456

### Tài xế
- Email: taixe1@gmail.com
- Password: 123456

## Các tính năng chính

### Cho Khách hàng:
- Đăng ký/Đăng nhập tài khoản
- Đặt chuyến đi với tính năng tính giá tự động
- Xem lịch sử chuyến đi
- Đánh giá tài xế
- Theo dõi trạng thái chuyến đi

### Cho Tài xế:
- Đăng ký tài khoản với thông tin xe và bằng lái
- Nhận thông báo chuyến đi mới
- Cập nhật vị trí và trạng thái
- Quản lý chuyến đi
- Xem thu nhập

### Cho Admin:
- Quản lý người dùng
- Thống kê chuyến đi
- Quản lý tài xế
- Xem báo cáo doanh thu

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra MySQL đã chạy chưa
- Kiểm tra thông tin kết nối trong file `.env`
- Đảm bảo database đã được tạo

### Lỗi port đã được sử dụng
- Thay đổi PORT trong file `.env`
- Hoặc dừng process đang sử dụng port 3000

### Lỗi module không tìm thấy
- Chạy `npm install` để cài đặt dependencies

## Phát triển thêm

Dự án được thiết kế để dễ dàng mở rộng:

1. **Thêm tính năng thanh toán online**: Tích hợp VNPay, ZaloPay
2. **Thêm bản đồ**: Tích hợp Google Maps hoặc Here Maps
3. **Thêm notification**: Sử dụng Socket.io cho real-time
4. **Mobile app**: Phát triển app React Native hoặc Flutter
5. **Thêm AI**: Tối ưu định tuyến, dự đoán giá

## Liên hệ

Nếu có vấn đề gì, vui lòng tạo issue trên GitHub hoặc liên hệ team phát triển.