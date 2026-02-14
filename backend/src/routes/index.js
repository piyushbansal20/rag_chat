import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import documentRoutes from './document.routes.js';
import chatRoutes from './chat.routes.js';
import statsRoutes from './stats.routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/documents', documentRoutes);
router.use('/chat', chatRoutes);
router.use('/stats', statsRoutes);

// Future routes will be added here:
// router.use('/users', userRoutes);
// router.use('/companies', companyRoutes);

export default router;
