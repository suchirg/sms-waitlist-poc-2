const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Middleware to verify JWT token from cookies or Authorization header
 */
const verifyToken = (req, res, next) => {
  try {
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.restaurantId = decoded.restaurantId;
    req.restaurantPhone = decoded.phone;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Generate a JWT token for a restaurant
 */
const generateToken = (restaurantId, phone) => {
  return jwt.sign(
    { restaurantId, phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/**
 * Hash a password using bcrypt
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plaintext password with a hashed password
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

/**
 * Middleware to set JWT token in response and in a secure httpOnly cookie
 */
const setAuthCookie = (res, restaurantId, phone) => {
  const token = generateToken(restaurantId, phone);
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
  });
  return token;
};

/**
 * Middleware to clear the auth cookie
 */
const clearAuthCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
};

module.exports = {
  verifyToken,
  generateToken,
  hashPassword,
  comparePassword,
  setAuthCookie,
  clearAuthCookie,
};