const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/public', express.static(path.join(__dirname, 'public')));

// Protect access to admin.html: serve a small gatekeeper page that verifies
// the user's JWT (from localStorage) via /api/auth/profile before allowing
// the actual admin HTML to be served. This is necessary because the app
// stores JWT in localStorage (not cookies) so the initial HTML request
// cannot include Authorization header. The gatekeeper performs a client-side
// check and then reloads /admin.html?allow=1 which will be passed to static.
app.get('/admin.html', (req, res, next) => {
  if (req.query && req.query.allow === '1') return next();

  // Gatekeeper HTML
  return res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Checking access...</title>
      </head>
      <body>
        <p>Đang kiểm tra quyền truy cập...</p>
        <script>
          (async function(){
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                // no token -> redirect to login
                window.location.href = '/index.html';
                return;
              }

              const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
              });

              if (!res.ok) {
                window.location.href = '/index.html';
                return;
              }

              const data = await res.json();
              // AuthController.getProfile returns user in data.data or similar
              const user = data && (data.data || data.user || data);
              if (user && user.loai_tai_khoan === 'admin') {
                // allow: reload admin.html through static with allow=1
                const nextUrl = '/admin.html?allow=1';
                window.location.href = nextUrl;
              } else {
                alert('Bạn không có quyền truy cập trang này');
                window.location.href = '/index.html';
              }
            } catch (e) {
              console.error('Gatekeeper error', e);
              window.location.href = '/index.html';
            }
          })();
        </script>
      </body>
    </html>
  `);
});

// Generic gatekeeper for protected HTML pages
// Allow public pages (index, registration) but require login for others.
app.get('/*.html', (req, res, next) => {
  const publicPages = ['/index.html', '/', '/driver-registration.html', '/views/booking.html'];
  const reqPath = req.path;

  // If the requested page is in the allow list or already has allow=1, proceed
  if (publicPages.includes(reqPath) || (req.query && req.query.allow === '1')) {
    return next();
  }

  // Otherwise send a client-side gatekeeper that checks localStorage token
  // and calls /api/auth/profile. If authenticated, reload with ?allow=1.
  return res.send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Checking access...</title>
      </head>
      <body>
        <p>Đang kiểm tra quyền truy cập...</p>
        <script>
          (async function(){
            try {
              const token = localStorage.getItem('token');
              if (!token) {
                // no token -> redirect to home (login available there)
                window.location.href = '/index.html';
                return;
              }

              const res = await fetch('/api/auth/profile', {
                headers: { 'Authorization': 'Bearer ' + token }
              });

              if (!res.ok) {
                window.location.href = '/index.html';
                return;
              }

              // If profile is ok, reload the original page with allow=1
              const nextUrl = location.pathname + '?allow=1' + (location.hash || '');
              window.location.href = nextUrl;
            } catch (e) {
              console.error('Gatekeeper error', e);
              window.location.href = '/index.html';
            }
          })();
        </script>
      </body>
    </html>
  `);
});

// Test database connection
testConnection();

// Routes
app.use('/api/auth', require('./routes/auth'));

// Protect API routes (require valid token) - /api/auth remains public
const { authenticate } = require('./middleware/auth');

app.use('/api/trips', authenticate, require('./routes/trips'));
// Mount drivers router without global authentication so the router can
// expose public endpoints (like /available) while protecting others
// with route-level middleware inside the router file.
app.use('/api/drivers', require('./routes/drivers'));
// Driver notifications (protected)
app.use('/api/drivers/notifications', require('./routes/notifications'));
// Promotions router contains some public endpoints (active/all) and some admin-only endpoints.
// Mount it without the global `authenticate` so the routes file can opt-in where needed.
app.use('/api/promotions', require('./routes/promotions'));
// Reviews (protected): customers rate trips
app.use('/api/reviews', authenticate, require('./routes/reviews'));
app.use('/api/admin', authenticate, require('./routes/admin'));

// Serve static HTML pages
app.use(express.static(path.join(__dirname, 'public')));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DC Car Booking API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint không tồn tại'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Lỗi hệ thống'
  });
});

// Start server (store server instance so we can handle errors)
const server = app.listen(PORT, () => {
  console.log(`🚗 DC Car Booking Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});

// Graceful error handling for common server errors
server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} đã được sử dụng. Hãy dừng tiến trình khác hoặc đổi PORT.`);
    process.exit(1);
  }
  console.error('Unhandled server error:', err);
  process.exit(1);
});

module.exports = app;