/**
 * Traffic Funnel API Routes
 * 
 * Endpoints для воронки продаж ONAI Academy:
 * - GET /api/traffic-dashboard/funnel - все этапы воронки
 * - GET /api/traffic-dashboard/funnel/:stageId - детали по конкретному этапу
 */

import { Router, Request, Response } from 'express';
import { getFunnelMetrics, getFunnelStageDetails, resolveFunnelDateRange } from '../services/funnel-service.js';

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
    const userId = req.query.userId as string | undefined;
    const preset = typeof req.query.preset === 'string' ? req.query.preset : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    const funnel = req.query.funnel as 'express' | 'challenge3d' | 'intensive1d' | undefined;
    const dateRange = resolveFunnelDateRange(preset, date, start, end);

    console.log('[Funnel API] GET /funnel - fetching all stages');
    console.log('[Funnel API] Team filter:', teamFilter || 'all teams');
    console.log('[Funnel API] Funnel type:', funnel || 'express (default)');

    const result = await getFunnelMetrics(teamFilter, userId, dateRange, funnel);

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
    const userId = req.query.userId as string | undefined;
    const preset = typeof req.query.preset === 'string' ? req.query.preset : undefined;
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    const dateRange = resolveFunnelDateRange(preset, date, start, end);

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

    const stage = await getFunnelStageDetails(stageId, teamFilter, userId, dateRange);

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

/**
 * GET /api/traffic-dashboard/funnel-analytics
 *
 * Cross-Device Funnel Analytics
 * Tracks: ProfTest → Express Visit → Express Submit → Purchase
 *
 * Query params:
 * - team (optional): Filter by utm_source
 * - utm_campaign (optional): Filter by campaign
 * - start (optional): Start date (YYYY-MM-DD)
 * - end (optional): End date (YYYY-MM-DD)
 *
 * Response: Funnel stages with conversion rates
 */
router.get('/funnel-analytics', async (req: Request, res: Response) => {
  try {
    const { landingSupabase } = await import('../config/supabase-landing.js');

    const teamFilter = req.query.team as string | undefined;
    const campaignFilter = req.query.utm_campaign as string | undefined;
    const startDate = req.query.start as string | undefined;
    const endDate = req.query.end as string | undefined;

    console.log('[Funnel Analytics API] Fetching conversion funnel data');
    console.log('[Funnel Analytics API] Filters:', { teamFilter, campaignFilter, startDate, endDate });

    // Build query
    let query = landingSupabase
      .from('journey_stages')
      .select(`
        lead_id,
        event_type,
        created_at,
        metadata,
        landing_leads!inner (
          id,
          client_id,
          metadata
        )
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: journeyData, error } = await query;

    if (error) {
      console.error('[Funnel Analytics API] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    // Group by client_id and track progression
    const clientJourneys = new Map<string, any>();

    journeyData?.forEach((stage: any) => {
      const clientId = stage.landing_leads?.client_id || stage.lead_id;
      const utmParams = stage.landing_leads?.metadata?.utmParams || stage.metadata?.utmParams || {};
      const utmSource = utmParams.utm_source || '';
      const utmCampaign = utmParams.utm_campaign || '';

      // Apply filters
      if (teamFilter && !utmSource.includes(teamFilter)) return;
      if (campaignFilter && utmCampaign !== campaignFilter) return;

      if (!clientJourneys.has(clientId)) {
        clientJourneys.set(clientId, {
          client_id: clientId,
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          proftest_submit: false,
          express_visit: false,
          express_submit: false,
          purchase: false,
          revenue: 0,
        });
      }

      const journey = clientJourneys.get(clientId);

      if (stage.event_type === 'proftest_submit') journey.proftest_submit = true;
      if (stage.event_type === 'express_visit') journey.express_visit = true;
      if (stage.event_type === 'express_submit') journey.express_submit = true;
      if (stage.event_type === 'purchase') {
        journey.purchase = true;
        journey.revenue = stage.metadata?.sale_amount || 0;
      }
    });

    // Calculate funnel metrics
    const journeys = Array.from(clientJourneys.values());

    const stats = {
      total_users: journeys.length,
      proftest_leads: journeys.filter(j => j.proftest_submit).length,
      express_visits: journeys.filter(j => j.express_visit).length,
      express_apps: journeys.filter(j => j.express_submit).length,
      purchases: journeys.filter(j => j.purchase).length,
      total_revenue: journeys.reduce((sum, j) => sum + j.revenue, 0),
    };

    const conversions = {
      cr1_proftest_to_express: stats.proftest_leads > 0
        ? ((stats.express_apps / stats.proftest_leads) * 100).toFixed(2)
        : '0.00',
      cr2_express_to_purchase: stats.express_apps > 0
        ? ((stats.purchases / stats.express_apps) * 100).toFixed(2)
        : '0.00',
      overall_cr: stats.proftest_leads > 0
        ? ((stats.purchases / stats.proftest_leads) * 100).toFixed(2)
        : '0.00',
    };

    return res.json({
      success: true,
      stats,
      conversions,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[Funnel Analytics API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch funnel analytics',
    });
  }
});

export default router;
