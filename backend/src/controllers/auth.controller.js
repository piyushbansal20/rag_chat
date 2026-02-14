import authService from '../services/auth.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Register a new user and company
 * POST /api/v1/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, companyName } = req.body;

  const result = await authService.register({
    email,
    password,
    firstName,
    lastName,
    companyName,
  });

  res.status(201).json(new ApiResponse(201, result, 'Registration successful'));
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const deviceInfo = {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  const result = await authService.login(email, password, deviceInfo);

  res.json(new ApiResponse(200, result, 'Login successful'));
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const result = await authService.refreshAccessToken(refreshToken);

  res.json(new ApiResponse(200, result, 'Token refreshed'));
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  await authService.logout(refreshToken);

  res.json(new ApiResponse(200, null, 'Logout successful'));
});

/**
 * Logout from all devices
 * POST /api/v1/auth/logout-all
 */
export const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.userId);

  res.json(new ApiResponse(200, null, 'Logged out from all devices'));
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.userId);

  res.json(new ApiResponse(200, user, 'User profile retrieved'));
});
