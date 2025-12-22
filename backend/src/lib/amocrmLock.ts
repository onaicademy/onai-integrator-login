/**
 * 🔒 DISTRIBUTED LOCK for AmoCRM Lead Creation
 * Prevents race condition when multiple requests try to create same lead simultaneously
 * 
 * How it works:
 * 1. Before creating/updating lead, acquire lock by email+phone
 * 2. If lock already held by another request → wait and retry
 * 3. After operation complete → release lock
 * 
 * This prevents:
 * - Double-click submissions
 * - Concurrent webhook triggers
 * - Duplicate leads from same user
 */

import { getAmoCRMRedis } from '../config/redis-amocrm.js';

const LOCK_TTL = 30000; // 30 seconds (AmoCRM operations timeout)
const LOCK_RETRY_DELAY = 500; // 500ms between retries
const MAX_RETRIES = 10; // Max 10 retries (5 seconds total)

interface LockResult {
  acquired: boolean;
  lockKey: string;
}

/**
 * Generate unique lock key for a lead based on email and/or phone
 */
function generateLockKey(email?: string, phone?: string): string {
  // Normalize inputs
  const normalizedEmail = email?.toLowerCase().trim() || '';
  const normalizedPhone = phone?.replace(/\D/g, '') || ''; // Remove non-digits
  
  // Use both email and phone for strongest deduplication
  // Fall back to whichever is available
  if (normalizedEmail && normalizedPhone) {
    return `amocrm:lead:${normalizedEmail}:${normalizedPhone}`;
  } else if (normalizedEmail) {
    return `amocrm:lead:email:${normalizedEmail}`;
  } else if (normalizedPhone) {
    return `amocrm:lead:phone:${normalizedPhone}`;
  } else {
    // Should never happen (validation should prevent this)
    return `amocrm:lead:unknown:${Date.now()}`;
  }
}

/**
 * Acquire distributed lock for lead creation
 * Returns true if lock acquired, false if already locked
 */
async function acquireLock(lockKey: string, requestId: string): Promise<boolean> {
  const redis = getAmoCRMRedis();
  
  if (!redis) {
    console.warn('⚠️ Redis not available, skipping lock (fallback mode - race condition possible)');
    return true; // Allow operation to proceed without lock
  }

  try {
    // SET NX EX - Set if Not eXists with EXpiration
    // Returns 1 if key was set, 0 if key already exists
    const result = await redis.set(
      lockKey,
      requestId,
      'PX', // Milliseconds
      LOCK_TTL,
      'NX' // Only set if not exists
    );

    const acquired = result === 'OK';
    
    if (acquired) {
      console.log(`🔒 Lock ACQUIRED: ${lockKey} by request ${requestId}`);
    } else {
      console.log(`⏳ Lock BUSY: ${lockKey} (request ${requestId} waiting...)`);
    }
    
    return acquired;
  } catch (error: any) {
    console.error('❌ Error acquiring lock:', error.message);
    return true; // Fallback: allow operation if Redis fails
  }
}

/**
 * Release distributed lock
 */
async function releaseLock(lockKey: string, requestId: string): Promise<void> {
  const redis = getAmoCRMRedis();
  
  if (!redis) {
    return; // Nothing to release
  }

  try {
    // Only release if we own the lock (check requestId matches)
    // This prevents releasing someone else's lock
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await redis.eval(script, 1, lockKey, requestId);
    
    if (result === 1) {
      console.log(`🔓 Lock RELEASED: ${lockKey} by request ${requestId}`);
    } else {
      console.log(`⚠️ Lock NOT released: ${lockKey} (not owned by request ${requestId})`);
    }
  } catch (error: any) {
    console.error('❌ Error releasing lock:', error.message);
  }
}

/**
 * Wait and retry acquiring lock
 */
async function waitForLock(lockKey: string, requestId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const acquired = await acquireLock(lockKey, requestId);
    
    if (acquired) {
      return true;
    }
    
    // Wait before retry
    console.log(`⏳ Retry ${attempt}/${MAX_RETRIES} for lock ${lockKey}...`);
    await new Promise(resolve => setTimeout(resolve, LOCK_RETRY_DELAY));
  }
  
  console.error(`❌ Failed to acquire lock after ${MAX_RETRIES} attempts: ${lockKey}`);
  return false; // Failed to acquire lock
}

/**
 * Execute function with distributed lock protection
 * Prevents race condition for AmoCRM lead creation
 */
export async function withAmoCrmLock<T>(
  email: string | undefined,
  phone: string | undefined,
  operation: () => Promise<T>
): Promise<T> {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const lockKey = generateLockKey(email, phone);
  
  console.log(`\n🔐 [LOCK] Attempting to acquire lock for lead: ${email || 'no-email'} / ${phone || 'no-phone'}`);
  console.log(`   Request ID: ${requestId}`);
  console.log(`   Lock Key: ${lockKey}`);
  
  // Try to acquire lock (with retries)
  const acquired = await waitForLock(lockKey, requestId);
  
  if (!acquired) {
    throw new Error(
      `Failed to acquire lock for lead creation after ${MAX_RETRIES} attempts. ` +
      `This likely means another request is already processing this lead. ` +
      `Please try again in a few seconds.`
    );
  }
  
  try {
    console.log(`✅ [LOCK] Lock acquired, executing operation...`);
    const result = await operation();
    console.log(`✅ [LOCK] Operation completed successfully`);
    return result;
  } finally {
    // Always release lock, even if operation fails
    await releaseLock(lockKey, requestId);
    console.log(`🔓 [LOCK] Lock released for ${lockKey}\n`);
  }
}

/**
 * Clear all AmoCRM locks (for debugging/maintenance)
 * USE WITH CAUTION!
 */
export async function clearAllAmoCrmLocks(): Promise<number> {
  const redis = getAmoCRMRedis();
  
  if (!redis) {
    console.warn('⚠️ Redis not available');
    return 0;
  }

  try {
    const keys = await redis.keys('amocrm:lead:*');
    
    if (keys.length === 0) {
      console.log('ℹ️ No AmoCRM locks found');
      return 0;
    }
    
    const deleted = await redis.del(...keys);
    console.log(`🗑️ Cleared ${deleted} AmoCRM locks`);
    return deleted;
  } catch (error: any) {
    console.error('❌ Error clearing locks:', error.message);
    return 0;
  }
}

/**
 * Get status of all active locks (for debugging)
 */
export async function getActiveLocks(): Promise<Array<{ key: string; ttl: number }>> {
  const redis = getAmoCRMRedis();
  
  if (!redis) {
    return [];
  }

  try {
    const keys = await redis.keys('amocrm:lead:*');
    const locks = [];
    
    for (const key of keys) {
      const ttl = await redis.pttl(key);
      locks.push({ key, ttl });
    }
    
    return locks;
  } catch (error: any) {
    console.error('❌ Error getting active locks:', error.message);
    return [];
  }
}
