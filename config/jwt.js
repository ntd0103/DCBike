const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtConfig = {
  secret: process.env.JWT_SECRET || 'dc_car_booking_secret',
  expiresIn: '24h'
};

const generateToken = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });
};

const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

module.exports = {
  jwtConfig,
  generateToken,
  verifyToken
};