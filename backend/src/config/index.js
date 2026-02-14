import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  mongoose: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/knowledge_base',
    options: {
      maxPoolSize: 10,
    },
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  },

  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    allowedMimeTypes: [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',

      // Spreadsheets
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',

      // Presentations
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint',

      // Web/Markup
      'text/html',
      'text/markdown',
      'text/x-markdown',

      // Images (OCR)
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/tiff',
      'image/bmp',
      'image/webp',
    ],
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    chatModel: 'claude-sonnet-4-20250514',
  },

  voyage: {
    apiKey: process.env.VOYAGE_API_KEY,
    embeddingModel: 'voyage-3',
    rerankModel: process.env.VOYAGE_RERANK_MODEL || 'rerank-2',
    enableReranking: process.env.VOYAGE_ENABLE_RERANKING !== 'false', // enabled by default
  },

  chroma: {
    host: process.env.CHROMA_HOST || 'http://localhost:8000',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 60,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required config
const requiredEnvVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    if (config.env === 'production') {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
    // Set defaults for development
    if (envVar === 'JWT_ACCESS_SECRET') {
      config.jwt.accessSecret = 'dev-access-secret-key-min-32-chars!!';
    }
    if (envVar === 'JWT_REFRESH_SECRET') {
      config.jwt.refreshSecret = 'dev-refresh-secret-key-min-32-chars!';
    }
  }
}

export default config;
