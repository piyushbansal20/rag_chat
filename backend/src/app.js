import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import { v4 as uuidv4 } from 'uuid';

import config from './config/index.js';
import routes from './routes/index.js';
import {
  errorMiddleware,
  transformError,
  notFoundHandler,
} from './middleware/index.js';
import logger from './config/logger.js';

const app = express();

// Trust proxy (if behind reverse proxy like nginx)
app.set('trust proxy', 1);

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (config.cors.origins.includes(origin)) {
        callback(null, true);
      } else if (config.env === 'development') {
        // Allow all origins in development
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL injection prevention
app.use(mongoSanitize());

// Response compression (skip for SSE endpoints)
app.use(compression({
  filter: (req, res) => {
    // Don't compress SSE responses
    if (req.headers.accept === 'text/event-stream') {
      return false;
    }
    // Don't compress chat message endpoints (SSE streaming)
    if (req.path.includes('/messages') && req.method === 'POST') {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Request ID tracking
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
});

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Knowledge Base API',
    version: '1.0.0',
    docs: '/api/v1/health',
  });
});

// 404 handler
app.use(notFoundHandler);

// Error transformation
app.use(transformError);

// Global error handler
app.use(errorMiddleware);

export default app;
