/**
 * 🔒 Admin Endpoints for AmoCRM Lock Management
 * 
 * Allows monitoring and clearing distributed locks
 */

import { Router, Request, Response } from 'express';
import { getActiveLocks, clearAllAmoCrmLocks } from '../lib/amocrmLock.js';
import { getAmoCRMRedisStatus } from '../config/redis-amocrm.js';

const router = Router();

/**
 * GET /api/admin/amocrm-locks
 * Get all active locks
 */
router.get('/amocrm-locks', async (req: Request, res: Response) => {
  try {
    const redisStatus = getAmoCRMRedisStatus();
    const activeLocks = await getActiveLocks();
    
    return res.json({
      success: true,
      redis: redisStatus,
      locks: {
        count: activeLocks.length,
        items: activeLocks.map(lock => ({
          key: lock.key,
          ttl_ms: lock.ttl,
          ttl_seconds: Math.floor(lock.ttl / 1000),
          expires_in: `${Math.floor(lock.ttl / 1000)}s`
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error fetching locks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch locks',
      message: error.message
    });
  }
});

/**
 * DELETE /api/admin/amocrm-locks
 * Clear all active locks (DANGEROUS - use only if needed!)
 */
router.delete('/amocrm-locks', async (req: Request, res: Response) => {
  try {
    console.log('⚠️ [ADMIN] Clearing all AmoCRM locks...');
    
    const deletedCount = await clearAllAmoCrmLocks();
    
    console.log(`✅ [ADMIN] Cleared ${deletedCount} locks`);
    
    return res.json({
      success: true,
      message: `Cleared ${deletedCount} AmoCRM locks`,
      deleted: deletedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error clearing locks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clear locks',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/amocrm-locks/status
 * Get Redis and lock system status
 */
router.get('/amocrm-locks/status', async (req: Request, res: Response) => {
  try {
    const redisStatus = getAmoCRMRedisStatus();
    const activeLocks = await getActiveLocks();
    
    return res.json({
      success: true,
      system: {
        redis_connected: redisStatus.connected,
        redis_available: redisStatus.available,
        locks_enabled: redisStatus.connected && redisStatus.available,
        active_locks: activeLocks.length
      },
      message: redisStatus.connected 
        ? '✅ Lock system operational' 
        : '⚠️ Redis not connected - locks disabled (race condition protection unavailable)',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error checking status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check status',
      message: error.message
    });
  }
});

export default router;

