/**
 * Traffic Funnel API Routes
 * 
 * Endpoints для воронки продаж ONAI Academy:
 * - GET /api/traffic-dashboard/funnel - все этапы воронки
 * - GET /api/traffic-dashboard/funnel/:stageId - детали по конкретному этапу
 */

import { Router, Request, Response } from 'express';
import { getFunnelMetrics, getFunnelStageDetails } from '../services/funnel-service.js';

const router = Router();

/**
 * GET /api/traffic-dashboard/funnel?team=kenesary
 * 
 * Получить полную воронку продаж со всеми этапами
 * 
 * Query params:
 * - team (optional): Фильтр по таргетологу (kenesary, traf4, arystan, muha)
 * 
 * Response:
 * {
 *   "success": true,
 *   "stages": [...],
 *   "totalRevenue": 73950000,
 *   "totalConversions": 142,
 *   "overallConversionRate": 11.5,
 *   "roi": 456.78,
 *   "timestamp": "2025-12-22T..."
 * }
 */
router.get('/funnel', async (req: Request, res: Response) => {
  try {
    const teamFilter = req.query.team as string | undefined;
    
    console.log('[Funnel API] GET /funnel - fetching all stages');
    console.log('[Funnel API] Team filter:', teamFilter || 'all teams');

    const result = await getFunnelMetrics(teamFilter);

    return res.json(result);

  } catch (error: any) {
    console.error('[Funnel API] Error getting funnel:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch funnel metrics',
      stages: [],
      totalRevenue: 0,
      totalConversions: 0,
      overallConversionRate: 0,
      roi: 0,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/traffic-dashboard/funnel/:stageId
 * 
 * Получить детальную информацию по конкретному этапу воронки
 * 
 * Params:
 * - stageId: 'proftest' | 'express' | 'payment' | 'tripwire' | 'main'
 * 
 * Response:
 * {
 *   "success": true,
 *   "stage": { ... }
 * }
 */
router.get('/funnel/:stageId', async (req: Request, res: Response) => {
  try {
    const { stageId } = req.params;
    const teamFilter = req.query.team as string | undefined;

    console.log(`[Funnel API] GET /funnel/${stageId} - fetching stage details`);
    console.log('[Funnel API] Team filter:', teamFilter || 'all teams');

    // Validate stageId
    const validStages = ['spend', 'proftest', 'express', 'main']; // Updated stages
    if (!validStages.includes(stageId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stageId. Must be one of: ${validStages.join(', ')}`,
        stage: null
      });
    }

    const stage = await getFunnelStageDetails(stageId, teamFilter);

    if (!stage) {
      return res.status(404).json({
        success: false,
        error: `Stage not found: ${stageId}`,
        stage: null
      });
    }

    return res.json({
      success: true,
      stage
    });

  } catch (error: any) {
    console.error('[Funnel API] Error getting stage details:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stage details',
      stage: null
    });
  }
});

/**
 * GET /api/traffic-dashboard/funnel/health
 * 
 * Health check для funnel API
 */
router.get('/funnel/health', async (req: Request, res: Response) => {
  return res.json({
    success: true,
    status: 'healthy',
    service: 'funnel-api',
    timestamp: new Date().toISOString()
  });
});

export default router;
