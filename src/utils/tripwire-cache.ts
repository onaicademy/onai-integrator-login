/**
 * 🚀 Tripwire Cache Utility with TTL support
 * Provides localStorage caching with Time-To-Live (TTL) mechanism
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

/**
 * Set item in cache with TTL
 */
export function setCacheItem<T>(key: string, data: T, ttlMinutes: number = 60): void {
  try {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000, // convert to milliseconds
    };
    localStorage.setItem(key, JSON.stringify(item));
    console.log(`✅ [Cache] Set "${key}" with TTL ${ttlMinutes}min`);
  } catch (error) {
    console.error('❌ [Cache] Failed to set item:', error);
  }
}

/**
 * Get item from cache (returns null if expired or not found)
 */
export function getCacheItem<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) {
      console.log(`⚠️ [Cache] Miss: "${key}"`);
      return null;
    }

    const item: CacheItem<T> = JSON.parse(cached);
    const now = Date.now();
    const age = now - item.timestamp;

    if (age > item.ttl) {
      console.log(`⚠️ [Cache] Expired: "${key}" (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(item.ttl / 1000)}s)`);
      localStorage.removeItem(key);
      return null;
    }

    console.log(`✅ [Cache] Hit: "${key}" (age: ${Math.round(age / 1000)}s)`);
    return item.data;
  } catch (error) {
    console.error('❌ [Cache] Failed to get item:', error);
    return null;
  }
}

/**
 * Remove item from cache
 */
export function removeCacheItem(key: string): void {
  try {
    localStorage.removeItem(key);
    console.log(`🗑️ [Cache] Removed: "${key}"`);
  } catch (error) {
    console.error('❌ [Cache] Failed to remove item:', error);
  }
}

/**
 * Clear all cache items matching a prefix
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage);
    const matchingKeys = keys.filter(key => key.startsWith(prefix));
    
    matchingKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`🗑️ [Cache] Cleared ${matchingKeys.length} items with prefix "${prefix}"`);
  } catch (error) {
    console.error('❌ [Cache] Failed to clear by prefix:', error);
  }
}

/**
 * Get cache stats (for debugging)
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage);
    const tripwireKeys = keys.filter(key => key.startsWith('tripwire_'));
    
    return {
      total: keys.length,
      tripwire: tripwireKeys.length,
      keys: tripwireKeys,
    };
  } catch (error) {
    console.error('❌ [Cache] Failed to get stats:', error);
    return { total: 0, tripwire: 0, keys: [] };
  }
}
