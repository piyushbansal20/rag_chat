import app from './app.js';
import config from './config/index.js';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import { redisClient } from './config/redis.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create required directories
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, '../logs'),
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../uploads/documents'),
    path.join(__dirname, '../uploads/temp'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  });
};

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close server
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close Redis
  try {
    await redisClient.quit();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.error('Error closing Redis:', error);
  }

  // Exit
  process.exit(0);
};

let server;

// Start server
const startServer = async () => {
  try {
    // Create required directories
    createDirectories();

    // Connect to MongoDB
    await connectDB();

    // Start HTTP server
    server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
      logger.info(`API available at http://localhost:${config.port}/api/v1`);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${config.port} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    // Graceful shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', { promise, reason });
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
