/**
 * Traffic Facebook API Routes
 * 
 * NEW dedicated endpoints for Facebook Ads API operations:
 * - GET /api/traffic-facebook/accounts - Get all ad accounts (cached)
 * - GET /api/traffic-facebook/campaigns/:accountId - Get campaigns for account (cached)
 * - POST /api/traffic-facebook/refresh - Clear cache and fetch fresh data
 * - GET /api/traffic-facebook/health - Quick health check
 * 
 * Features:
 * - Uses service layer for business logic
 * - Redis caching with 5 min TTL
 * - Graceful error handling
 * - Force refresh capability
 */

import { Router, Request, Response } from 'express';
import { 
  fetchAllAdAccounts, 
  fetchCampaignsForAccount, 
  clearFacebookCache 
} from '../services/facebook-service.js';
import { getCacheStats } from '../config/redis.js';

const router = Router();

/**
 * GET /api/traffic-facebook/accounts
 * 
 * Get all ad accounts from Facebook Business Manager
 * 
 * Query params:
 * - ?refresh=true : Force refresh (skip cache)
 * 
 * Response:
 * {
 *   success: true,
 *   accounts: [...],
 *   count: 5,
 *   cached: false,
 *   timestamp: "2025-12-22T20:00:00.000Z"
 * }
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    console.log('📋 [Traffic Facebook API] GET /accounts');
    
    const forceRefresh = req.query.refresh === 'true';
    
    if (forceRefresh) {
      console.log('🔄 [Traffic Facebook API] Force refresh requested');
    }

    const result = await fetchAllAdAccounts(forceRefresh);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch ad accounts',
        accounts: [],
        count: 0
      });
    }

    return res.json({
      success: true,
      accounts: result.accounts,
      count: result.count,
      cached: result.cached,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Traffic Facebook API] Error in GET /accounts:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      accounts: [],
      count: 0
    });
  }
});

/**
 * GET /api/traffic-facebook/campaigns/:accountId
 * 
 * Get campaigns with insights for specific ad account
 * 
 * Path params:
 * - accountId : Facebook ad account ID (e.g., "act_123456")
 * 
 * Query params:
 * - ?refresh=true : Force refresh (skip cache)
 * 
 * Response:
 * {
 *   success: true,
 *   campaigns: [...],
 *   count: 12,
 *   cached: false,
 *   accountId: "act_123456"
 * }
 */
router.get('/campaigns/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    console.log(`📋 [Traffic Facebook API] GET /campaigns/${accountId}`);

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required',
        campaigns: [],
        count: 0
      });
    }

    if (!accountId.startsWith('act_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format (must start with "act_")',
        campaigns: [],
        count: 0
      });
    }

    const forceRefresh = req.query.refresh === 'true';

    const result = await fetchCampaignsForAccount(accountId, forceRefresh);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch campaigns',
        campaigns: [],
        count: 0,
        accountId
      });
    }

    return res.json({
      success: true,
      campaigns: result.campaigns,
      count: result.count,
      cached: result.cached,
      accountId
    });

  } catch (error: any) {
    console.error('❌ [Traffic Facebook API] Error in GET /campaigns/:accountId:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      campaigns: [],
      count: 0
    });
  }
});

/**
 * POST /api/traffic-facebook/refresh
 * 
 * Clear all Facebook cache and fetch fresh data
 * 
 * Used by: "Загрузить доступные кабинеты" button
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Cache cleared and data refreshed",
 *   accounts: [...],
 *   count: 5,
 *   clearedKeys: 10
 * }
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('🔄 [Traffic Facebook API] POST /refresh - Clearing cache...');

    // Clear all Facebook cache
    const clearedKeys = await clearFacebookCache();
    console.log(`✅ [Traffic Facebook API] Cleared ${clearedKeys} cache entries`);

    // Fetch fresh data
    console.log('📡 [Traffic Facebook API] Fetching fresh data...');
    const result = await fetchAllAdAccounts(true);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to refresh data',
        message: 'Cache cleared but failed to fetch fresh data',
        clearedKeys
      });
    }

    return res.json({
      success: true,
      message: 'Cache cleared and data refreshed',
      accounts: result.accounts,
      count: result.count,
      clearedKeys,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Traffic Facebook API] Error in POST /refresh:', error.message);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to refresh data'
    });
  }
});

/**
 * GET /api/traffic-facebook/health
 * 
 * Quick health check - minimal data
 * 
 * Response:
 * {
 *   success: true,
 *   status: "healthy" | "degraded",
 *   cache: { type: "redis" | "memory", available: true, memoryCacheSize: 0 },
 *   accounts: 5
 * }
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    console.log('🏥 [Traffic Facebook API] GET /health');

    const cacheStats = getCacheStats();
    
    // Quick check: can we fetch accounts?
    const result = await fetchAllAdAccounts(false);

    const status = result.success ? 'healthy' : 'degraded';

    return res.json({
      success: true,
      status,
      cache: cacheStats,
      accounts: result.count,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [Traffic Facebook API] Error in GET /health:', error.message);
    
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
