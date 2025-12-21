import Redis from 'ioredis';

/**
 * Redis connection for BullMQ job queue
 * Used for Tripwire user creation async processing
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`🔄 Redis retry attempt ${times}, delay: ${delay}ms`);
    return delay;
  }
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('ready', () => {
  console.log('✅ Redis ready for commands');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err.message);
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

export default redis;
