import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {string} Access token
 */
export const generateAccessToken = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    companyId: user.company,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Generate JWT refresh token
 * @returns {string} Random refresh token
 */
export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

/**
 * Calculate refresh token expiry date
 * @returns {Date} Expiry date
 */
export const getRefreshTokenExpiry = () => {
  const expiresIn = config.jwt.refreshExpiresIn;
  const match = expiresIn.match(/^(\d+)([dhms])$/);

  if (!match) {
    // Default to 7 days
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(Date.now() + value * multipliers[unit]);
};
