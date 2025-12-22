import Redis from 'ioredis';

/**
 * Redis connection for BullMQ job queue (OPTIONAL - graceful degradation)
 * Used for Tripwire user creation async processing
 * 
 * If Redis is not available, app continues to work without queues
 */

let redis: Redis | null = null;
let redisAvailable = false;

// Only try to connect if REDIS_ENABLED is set
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

if (REDIS_ENABLED) {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        console.warn('⚠️ Redis max retries reached, disabling Redis features');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 50, 500);
      return delay;
    },
    lazyConnect: true, // Don't connect immediately
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
    redisAvailable = true;
  });

  redis.on('ready', () => {
    console.log('✅ Redis ready for commands');
    redisAvailable = true;
  });

  redis.on('error', (err) => {
    console.warn('⚠️ Redis error (non-critical):', err.message);
    redisAvailable = false;
  });

  redis.on('close', () => {
    console.warn('⚠️ Redis connection closed (continuing without Redis)');
    redisAvailable = false;
  });

  // Try to connect
  redis.connect().catch(err => {
    console.warn('⚠️ Redis not available, continuing without queue features:', err.message);
    redisAvailable = false;
  });
} else {
  console.log('ℹ️ Redis disabled (set REDIS_ENABLED=true to enable)');
}

export { redis, redisAvailable };
export default redis;
