const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// helper.js service is a utility function for password hashing, token generation, and input validation

const JWT_SECRET = process.env.JWT_SECRET || 'fieldops-jwt-secret-2024';

// Hash password
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId: userId,
      iat: Math.floor(Date.now() / 1000) // issued at
    }, 
    JWT_SECRET, 
    { 
      expiresIn: '7d' // Token expires in 7 days
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  return input;
};

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  isValidEmail,
  sanitizeInput,
  JWT_SECRET
};