import { User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { verifyAccessToken } from '../utils/tokenUtils.js';

/**
 * Authentication middleware - verifies JWT and attaches user to request
 */
export const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Access token required');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.userId).select('+company').lean();

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status !== 'active') {
      throw ApiError.unauthorized('User account is not active');
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
      if (decoded.iat < changedTimestamp) {
        throw ApiError.unauthorized('Password changed, please login again');
      }
    }

    // Attach user info to request
    req.user = user;
    req.userId = user._id;
    req.companyId = user.company;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Invalid access token');
    }
    throw error;
  }
});

/**
 * Role-based access control middleware
 * @param {...string} roles - Allowed roles
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token provided
 */
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('+company').lean();

    if (user && user.status === 'active') {
      req.user = user;
      req.userId = user._id;
      req.companyId = user.company;
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
});
