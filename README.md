# DC Car Booking System

Hệ thống đặt xe trực tuyến sử dụng Node.js, Express và MySQL.

## Cài đặt

1. Clone dự án
2. Cài đặt dependencies:
   ```bash
   npm install
   ```

3. Tạo file `.env` và cấu hình database:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=dc_car_booking
   JWT_SECRET=your_jwt_secret
   PORT=3000
   ```

4. Chạy script tạo database:
   ```bash
   node database/createTables.js
   ```

5. Khởi động server:
   ```bash
   npm run dev
   ```

## Cấu trúc dự án

- `/config` - Cấu hình database và JWT
- `/controllers` - Logic xử lý business
- `/models` - Models tương tác với database
- `/routes` - API endpoints
- `/middleware` - Middleware cho authentication, validation
- `/public` - Static files (CSS, JS, images)
- `/views` - HTML templates
- `/database` - Scripts tạo database và seed data

## API Endpoints

### Người dùng
- POST `/api/auth/register` - Đăng ký
- POST `/api/auth/login` - Đăng nhập
- GET `/api/users/profile` - Xem profile
- PUT `/api/users/profile` - Cập nhật profile

### Chuyến đi
- POST `/api/trips` - Tạo chuyến đi
- GET `/api/trips` - Lấy danh sách chuyến đi
- PUT `/api/trips/:id` - Cập nhật chuyến đi
- DELETE `/api/trips/:id` - Hủy chuyến đi

### Thanh toán
- POST `/api/payments` - Tạo thanh toán
- GET `/api/payments/:id` - Xem chi tiết thanh toán

### Đánh giá
- POST `/api/reviews` - Tạo đánh giá
- GET `/api/reviews/:tripId` - Xem đánh giá chuyến đi