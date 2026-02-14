import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a rate limiter with custom options
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.maxRequests,
    keyGenerator,
    message = 'Too many requests, please slow down',
  } = options;

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: keyGenerator || ((req) => {
      // Rate limit by user ID if authenticated, otherwise by IP
      return req.userId || req.ip;
    }),
    handler: (req, res, next) => {
      throw ApiError.tooManyRequests(message);
    },
    skip: (req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    },
  });
};

// Standard rate limiter
export const standardLimiter = createRateLimiter();

// Stricter limiter for auth endpoints
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later',
});

// Limiter for AI endpoints (more restrictive)
export const aiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many AI requests, please slow down',
});

// Limiter for file uploads
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: 'Too many file uploads, please try again later',
});

export default createRateLimiter;
