import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';

/**
 * Handle specific error types and convert to ApiError
 */
const handleCastError = (err) => {
  return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
};

const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new ApiError(409, `${field} already exists`);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => e.message);
  return new ApiError(400, 'Validation failed', errors);
};

const handleJWTError = () => {
  return new ApiError(401, 'Invalid token');
};

const handleJWTExpiredError = () => {
  return new ApiError(401, 'Token expired');
};

/**
 * Transform errors to ApiError format
 */
export const transformError = (err, req, res, next) => {
  let error = err;

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKeyError(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

  next(error);
};

/**
 * Global error handler middleware
 */
export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log the error
  const logData = {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    userId: req.userId,
    companyId: req.companyId,
    statusCode: err.statusCode,
    message: err.message,
  };

  if (err.statusCode >= 500) {
    logger.error('Server error', { ...logData, stack: err.stack });
  } else {
    logger.warn('Client error', logData);
  }

  // Development response - include stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || [],
      stack: err.stack,
      requestId: req.requestId,
    });
  }

  // Production response - don't leak error details
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
      errors: err.errors || [],
      requestId: req.requestId,
    });
  }

  // Programming or unknown error - don't leak details
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Something went wrong',
    requestId: req.requestId,
  });
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};
