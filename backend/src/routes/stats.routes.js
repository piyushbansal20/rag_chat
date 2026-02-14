import { Router } from 'express';
import * as statsController from '../controllers/stats.controller.js';
import { authMiddleware, tenantMiddleware } from '../middleware/index.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Dashboard stats
router.get('/dashboard', statsController.getDashboardStats);

// Usage over time
router.get('/usage', statsController.getUsageStats);

export default router;
