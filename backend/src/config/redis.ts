/**
 * Redis Configuration and Caching Layer
 * 
 * Provides:
 * - Optional Redis connection (graceful degradation)
 * - Caching helpers: cacheSet, cacheGet, cacheClear
 * - In-memory fallback if Redis unavailable
 * - Auto-reconnection strategy
 */

import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;
let redisAvailable = false;
let initializationAttempted = false;

// In-memory cache fallback
const memoryCache = new Map<string, { value: any; expires: number }>();

/**
 * Initialize Redis client
 */
export async function initRedis(): Promise<void> {
  if (initializationAttempted) {
    return;
  }

  initializationAttempted = true;

  try {
    // Use REDIS_URL for Docker compatibility
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const db = parseInt(process.env.REDIS_DB || '0');

    console.log(`🔌 [Redis] Attempting connection to ${redisUrl} (db: ${db})...`);

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.log('⚠️ [Redis] Max reconnection attempts reached, giving up');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(`🔄 [Redis] Reconnecting in ${delay}ms (attempt ${retries})...`);
          return delay;
        },
      },
      database: db
    });

    // Error handler
    redisClient.on('error', (err) => {
      console.error('❌ [Redis] Error:', err.message);
      redisAvailable = false;
    });

    // Ready handler
    redisClient.on('ready', () => {
      console.log('✅ [Redis] Connected and ready');
      redisAvailable = true;
    });

    // Reconnecting handler
    redisClient.on('reconnecting', () => {
      console.log('🔄 [Redis] Reconnecting...');
      redisAvailable = false;
    });

    // Connect
    await redisClient.connect();
    redisAvailable = true;

    console.log('✅ [Redis] Initialization successful');
  } catch (error: any) {
    console.warn('⚠️ [Redis] Not available:', error.message);
    console.warn('⚠️ [Redis] Falling back to in-memory cache');
    redisAvailable = false;
    redisClient = null;
  }
}

/**
 * Set value in cache (Redis or memory fallback)
 * 
 * @param key Cache key
 * @param value Value to cache (will be JSON stringified)
 * @param ttlSeconds TTL in seconds (default: 300 = 5 minutes)
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const serialized = JSON.stringify(value);

    if (redisAvailable && redisClient) {
      // Use Redis
      await redisClient.setEx(key, ttlSeconds, serialized);
      console.log(`💾 [Redis Cache] SET ${key} (TTL: ${ttlSeconds}s)`);
    } else {
      // Use memory cache
      const expires = Date.now() + (ttlSeconds * 1000);
      memoryCache.set(key, { value: serialized, expires });
      console.log(`💾 [Memory Cache] SET ${key} (TTL: ${ttlSeconds}s)`);
    }
  } catch (error: any) {
    console.error(`❌ [Cache] Failed to set ${key}:`, error.message);
  }
}

/**
 * Get value from cache (Redis or memory fallback)
 * 
 * @param key Cache key
 * @returns Parsed value or null if not found/expired
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    let serialized: string | null = null;

    if (redisAvailable && redisClient) {
      // Use Redis
      serialized = await redisClient.get(key);
      if (serialized) {
        console.log(`✅ [Redis Cache] HIT ${key}`);
      } else {
        console.log(`❌ [Redis Cache] MISS ${key}`);
      }
    } else {
      // Use memory cache
      const cached = memoryCache.get(key);
      if (cached) {
        if (Date.now() < cached.expires) {
          serialized = cached.value;
          console.log(`✅ [Memory Cache] HIT ${key}`);
        } else {
          // Expired
          memoryCache.delete(key);
          console.log(`❌ [Memory Cache] MISS ${key} (expired)`);
        }
      } else {
        console.log(`❌ [Memory Cache] MISS ${key}`);
      }
    }

    if (serialized) {
      return JSON.parse(serialized) as T;
    }

    return null;
  } catch (error: any) {
    console.error(`❌ [Cache] Failed to get ${key}:`, error.message);
    return null;
  }
}

/**
 * Delete specific key(s) from cache
 * 
 * @param pattern Key pattern (e.g., "fb:*" or specific key)
 */
export async function cacheClear(pattern: string): Promise<number> {
  try {
    let deletedCount = 0;

    if (redisAvailable && redisClient) {
      // Use Redis with pattern matching
      if (pattern.includes('*')) {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await redisClient.del(keys);
        }
      } else {
        deletedCount = await redisClient.del(pattern);
      }
      console.log(`🗑️ [Redis Cache] Cleared ${deletedCount} keys matching "${pattern}"`);
    } else {
      // Use memory cache with pattern matching
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        for (const key of memoryCache.keys()) {
          if (regex.test(key)) {
            memoryCache.delete(key);
            deletedCount++;
          }
        }
      } else {
        if (memoryCache.has(pattern)) {
          memoryCache.delete(pattern);
          deletedCount = 1;
        }
      }
      console.log(`🗑️ [Memory Cache] Cleared ${deletedCount} keys matching "${pattern}"`);
    }

    return deletedCount;
  } catch (error: any) {
    console.error(`❌ [Cache] Failed to clear "${pattern}":`, error.message);
    return 0;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable;
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  return {
    type: redisAvailable ? 'redis' : 'memory',
    available: redisAvailable,
    memoryCacheSize: memoryCache.size
  };
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('👋 [Redis] Connection closed');
  }
}

/**
 * Get Redis connection object for BullMQ
 * BullMQ expects { url: string } or { host, port } object
 * ioredis (used by redis-amocrm) expects { host, port, db }
 */
export function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  // Parse Redis URL to extract host and port
  // Format: redis://host:port/db or redis://host:port
  const urlMatch = redisUrl.match(/redis:\/\/([^:]+):(\d+)(?:\/(\d+))?/);
  
  if (urlMatch) {
    return {
      host: urlMatch[1],
      port: parseInt(urlMatch[2]),
      db: urlMatch[3] ? parseInt(urlMatch[3]) : 0,
    };
  }
  
  // Fallback to host/port format
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0'),
  };
}
