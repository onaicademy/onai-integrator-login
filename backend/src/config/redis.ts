/**
 * Redis Configuration for BullMQ Queue System
 */
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

// Redis connection URL from environment or default to localhost
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Create Redis client for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

// Event handlers
redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('✅ Redis connected');
});

redis.on('ready', () => {
  logger.info('✅ Redis ready');
});

redis.on('close', () => {
  logger.warn('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('🔄 Redis reconnecting...');
});

/**
 * Graceful shutdown
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('✅ Redis disconnected gracefully');
  } catch (error) {
    logger.error('❌ Error disconnecting Redis:', error);
  }
};

export default redis;

