/**
 * Traffic Aggregation API Routes
 *
 * Endpoints for:
 * - Getting sync status
 * - Triggering manual refresh
 * - Reading cached metrics
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from './traffic-auth.js';
import {
  getSyncStatus,
  forceSync,
  getCachedMetrics,
  runAggregation
} from '../services/metricsAggregationService.js';

const router = Router();

/**
 * GET /api/traffic-aggregation/status
 * Get current sync status
 */
router.get('/status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const status = getSyncStatus();

    res.json({
      success: true,
      ...status,
      lastSync: status.lastSync?.toISOString() || null,
      nextSync: status.nextSync?.toISOString() || null,
      tokenStatus: status.tokenStatus,
      tokenExpiresAt: status.tokenExpiresAt?.toISOString() || null
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/traffic-aggregation/refresh
 * Trigger manual refresh (admin only)
 */
router.post('/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Only admin can force refresh
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required for manual refresh'
      });
    }

    console.log(`[Aggregation] Manual refresh triggered by ${user.email}`);

    // Run aggregation in background
    runAggregation().catch(err => {
      console.error('[Aggregation] Background refresh failed:', err);
    });

    res.json({
      success: true,
      message: 'Aggregation started in background',
      status: getSyncStatus()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-aggregation/metrics
 * Get cached metrics for current user
 */
router.get('/metrics', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const period = (req.query.period as string) || '7d';

    // Get userId - admin can specify, others get own
    let userId = user.userId;
    if (user.role === 'admin' && req.query.userId) {
      userId = req.query.userId as string;
    }

    const metrics = await getCachedMetrics(userId, period);

    if (!metrics) {
      return res.json({
        success: true,
        cached: false,
        message: 'No cached metrics found. Wait for next sync or trigger manual refresh.',
        metrics: null
      });
    }

    // Check if data is stale (>15 minutes old)
    const isStale = Date.now() - metrics.updatedAt.getTime() > 15 * 60 * 1000;

    res.json({
      success: true,
      cached: true,
      isStale,
      updatedAt: metrics.updatedAt.toISOString(),
      metrics: {
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        spend: metrics.spend,
        spendKzt: metrics.spendKzt,
        conversions: metrics.conversions,
        revenue: metrics.revenue,
        sales: metrics.sales,
        ctr: metrics.ctr,
        cpc: metrics.cpc,
        cpm: metrics.cpm,
        roas: metrics.roas,
        cpa: metrics.cpa
      },
      campaigns: metrics.campaigns
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-aggregation/metrics/all
 * Get cached metrics for all users (admin only)
 */
router.get('/metrics/all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const period = (req.query.period as string) || '7d';

    // This would need to be implemented in the service
    // For now, return sync status
    const status = getSyncStatus();

    res.json({
      success: true,
      syncStatus: status,
      message: 'Use /metrics?userId=X for individual user metrics'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
