/**
 * Redis Configuration for BullMQ Queue System
 * С защитой от блокировки сервера
 */
import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();

// Redis connection URL from environment or default to localhost
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Create Redis client for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 * Но мы ограничим количество попыток подключения
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true, // НЕ подключаться автоматически
  retryStrategy: (times) => {
    // Ограничиваем до 10 попыток
    if (times > 10) {
      logger.error('❌ Redis: Max connection attempts reached (10). Stopping retries.');
      logger.warn('⚠️ Server will continue without Redis. BullMQ queues will be disabled.');
      return null; // Останавливаем попытки
    }
    const delay = Math.min(times * 100, 2000);
    logger.warn(`Redis retry ${times}/10 in ${delay}ms`);
    return delay;
  },
  connectionName: 'onai-backend',
});

// Event handlers
redis.on('error', (err) => {
  logger.error('Redis connection error:', err.message);
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

// Попытка подключения в фоне (НЕБЛОКИРУЮЩАЯ)
let redisConnected = false;

redis.connect().then(() => {
  redisConnected = true;
  logger.info('✅ Redis connected successfully');
}).catch((err) => {
  redisConnected = false;
  logger.warn('⚠️ Redis not available, server will work without it:', err.message);
  logger.info('ℹ️ BullMQ queues will be disabled, but server will function normally');
});

/**
 * Проверить доступность Redis
 */
export const isRedisAvailable = async (): Promise<boolean> => {
  if (!redisConnected) return false;
  
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
};

/**
 * Graceful shutdown
 */
export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisConnected) {
      await redis.quit();
      logger.info('✅ Redis disconnected gracefully');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting Redis:', error);
  }
};

export default redis;
