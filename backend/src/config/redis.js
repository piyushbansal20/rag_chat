import Redis from 'ioredis';
import config from './index.js';
import logger from './logger.js';

// Redis connection for general use
const createRedisClient = () => {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  client.on('reconnecting', () => {
    logger.warn('Redis client reconnecting...');
  });

  return client;
};

// Redis connection options for BullMQ
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password || undefined,
  maxRetriesPerRequest: null,
};

const redisClient = createRedisClient();

export { redisClient, redisConnection, createRedisClient };
