import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authMiddleware, validate, authLimiter } from '../middleware/index.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes (with rate limiting)
router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  authController.login
);

router.post(
  '/refresh',
  authLimiter,
  validate(refreshTokenSchema),
  authController.refreshToken
);

router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authMiddleware, authController.getMe);

router.post('/logout-all', authMiddleware, authController.logoutAll);

export default router;
