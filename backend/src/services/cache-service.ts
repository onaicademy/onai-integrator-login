import NodeCache from 'node-cache';

/**
 * In-memory cache service for API responses
 * Default TTL: 5 minutes (300 seconds)
 */
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false // Performance optimization
});

/**
 * Get cached value or fetch fresh data if cache miss
 * @param key Cache key
 * @param fetchFn Function to fetch fresh data
 * @param ttl Time to live in seconds (default: 300s = 5 min)
 * @returns Cached or fresh data
 */
export async function getCachedOrFresh<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = cache.get<T>(key);
  
  if (cached !== undefined) {
    console.log(`🔥 Cache HIT: ${key}`);
    return cached;
  }
  
  console.log(`❄️  Cache MISS: ${key}, fetching fresh data...`);
  const fresh = await fetchFn();
  cache.set(key, fresh, ttl);
  
  return fresh;
}

/**
 * Clear cache by pattern or all
 * @param pattern Optional string pattern to match keys
 */
export function clearCache(pattern?: string) {
  if (pattern) {
    const keys = cache.keys();
    const matchedKeys = keys.filter(key => key.includes(pattern));
    matchedKeys.forEach(key => cache.del(key));
    console.log(`🔄 Cleared ${matchedKeys.length} cache entries matching: ${pattern}`);
  } else {
    cache.flushAll();
    console.log('🔄 Cleared all cache');
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    keys: cache.keys(),
    stats: cache.getStats()
  };
}
