import { Router } from 'express';
import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';

const router = Router();

/**
 * Basic health check
 * GET /api/v1/health
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check
 * GET /api/v1/health/detailed
 */
router.get('/detailed', async (req, res) => {
  const health = {
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Check MongoDB
  try {
    const mongoState = mongoose.connection.readyState;
    health.services.mongodb = {
      status: mongoState === 1 ? 'healthy' : 'unhealthy',
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoState],
    };
  } catch (error) {
    health.services.mongodb = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check Redis
  try {
    await redisClient.ping();
    health.services.redis = {
      status: 'healthy',
    };
  } catch (error) {
    health.services.redis = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Overall status
  const allHealthy = Object.values(health.services).every(
    (service) => service.status === 'healthy'
  );
  health.status = allHealthy ? 'healthy' : 'degraded';
  health.success = allHealthy;

  res.status(allHealthy ? 200 : 503).json(health);
});

export default router;
