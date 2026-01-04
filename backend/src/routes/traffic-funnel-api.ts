/**
 * Traffic Funnel API Routes
 *
 * Endpoints для воронки продаж ONAI Academy:
 * - GET /api/traffic-dashboard/funnel - все этапы воронки
 * - GET /api/traffic-dashboard/funnel/health - health check
 * - GET /api/traffic-dashboard/funnel/leads-by-date - разбивка лидов по датам
 * - GET /api/traffic-dashboard/funnel-analytics - cross-device analytics
 * - GET /api/traffic-dashboard/funnel/:stageId - детали по конкретному этапу
 *
 * ⚠️ ВАЖНО: Статические роуты (/health, /leads-by-date) ОБЯЗАНЫ идти ПЕРЕД динамическими (/:stageId)
 */

import { Router, Request, Response } from 'express';
import { getFunnelMetrics, getFunnelStageDetails, resolveFunnelDateRange, getDateBounds } from '../services/funnel-service.js';
import { getTeamUtmRule, matchesTeamUtm } from '../services/funnel-service.js';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 1. MAIN FUNNEL ENDPOINT
// ════════════════════════════════════════════════════════════════════════
/**
 * GET /api/traffic-dashboard/funnel?team=kenesary&funnel=challenge3d
 *
 * Получить полную воронку продаж со всеми этапами
 *
 * Query params:
 * - team (optional): Фильтр по таргетологу (kenesary, traf4, arystan, muha)
 * - funnel (optional): Тип воронки (express, challenge3d, intensive1d)
 * - userId (optional): ID пользователя для персональной фильтрации
 * - preset (optional): Пресет диапазона (7d, 14d, 30d, today, yesterday)
 * - start/end (optional): Кастомный диапазон дат (YYYY-MM-DD)
 */
router.get('/funnel', async (req: Request, res: Response) => {
  const startTime = Date.now();
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

    const duration = Date.now() - startTime;
    console.log(`[Funnel API] ✅ Completed in ${duration}ms`);

    return res.json(result);

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Funnel API] ❌ Error in ${duration}ms:`, error.message);
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

// ════════════════════════════════════════════════════════════════════════
// 2. HEALTH CHECK (STATIC ROUTE - MUST BE BEFORE /:stageId)
// ════════════════════════════════════════════════════════════════════════
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
    version: '2.0.0',
    supportedFunnels: ['express', 'challenge3d', 'intensive1d'],
    timestamp: new Date().toISOString()
  });
});

// ════════════════════════════════════════════════════════════════════════
// 3. LEADS BY DATE (STATIC ROUTE - MUST BE BEFORE /:stageId)
// ════════════════════════════════════════════════════════════════════════
/**
 * GET /api/traffic-dashboard/funnel/leads-by-date
 *
 * Получить разбивку лидов по датам для Challenge3D / Express / Intensive1D
 *
 * Query params:
 * - team (optional): Фильтр по команде
 * - funnel (optional): Тип воронки (express, challenge3d, intensive1d)
 * - start (optional): Начальная дата (YYYY-MM-DD)
 * - end (optional): Конечная дата (YYYY-MM-DD)
 * - preset (optional): Пресет диапазона (7d, 14d, 30d)
 */
router.get('/funnel/leads-by-date', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const teamFilter = req.query.team as string | undefined;
    const funnel = req.query.funnel as 'express' | 'challenge3d' | 'intensive1d' | undefined;
    const preset = typeof req.query.preset === 'string' ? req.query.preset : undefined;
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    const dateRange = resolveFunnelDateRange(preset, undefined, start, end);
    const { start: startDate, end: endDate } = getDateBounds(dateRange);

    console.log('[Funnel API] GET /funnel/leads-by-date');
    console.log('[Funnel API] Team filter:', teamFilter || 'all teams');
    console.log('[Funnel API] Funnel type:', funnel || 'express (default)');
    console.log('[Funnel API] Date range:', startDate, '-', endDate);

    let tableName = 'landing_leads';
    let sourceFilter: string | null = null;

    // Определяем таблицу и фильтр по типу воронки
    if (funnel === 'challenge3d') {
      sourceFilter = 'challenge3d';
    } else if (funnel === 'intensive1d') {
      sourceFilter = 'intensive1d';
    }

    // Получаем лиды из Landing DB
    let query = trafficAdminSupabase
      .from(tableName)
      .select('id, created_at, source, utm_source, utm_medium, metadata')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Фильтр по типу источника
    if (sourceFilter) {
      query = query.eq('source', sourceFilter);
    } else if (funnel === 'express' || !funnel) {
      // Express funnel: proftest%, TF4, expresscourse
      query = query.or('source.like.proftest%,source.eq.TF4,source.eq.expresscourse');
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('[Funnel API] Error fetching leads by date:', error);
      throw error;
    }

    // Фильтр по UTM команде
    const teamUtmRule = teamFilter ? getTeamUtmRule(teamFilter) : null;
    let filteredLeads = leads || [];

    if (teamFilter && teamUtmRule) {
      filteredLeads = filteredLeads.filter(lead => matchesTeamUtm(lead, teamUtmRule));
    }

    // Группировка по датам
    const leadsByDate = new Map<string, number>();

    filteredLeads.forEach((lead: any) => {
      const date = lead.created_at.split('T')[0]; // YYYY-MM-DD
      leadsByDate.set(date, (leadsByDate.get(date) || 0) + 1);
    });

    // Преобразуем в массив и сортируем по дате
    const data = Array.from(leadsByDate.entries())
      .map(([date, leads]) => ({ date, leads }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalLeads = filteredLeads.length;
    const duration = Date.now() - startTime;

    console.log(`[Funnel API] ✅ Leads by date: ${totalLeads} total, ${data.length} days in ${duration}ms`);

    return res.json({
      success: true,
      data,
      totalLeads,
      period: {
        start: dateRange.since,
        end: dateRange.until
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Funnel API] ❌ Error in ${duration}ms:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leads by date',
      data: [],
      totalLeads: 0
    });
  }
});

// ════════════════════════════════════════════════════════════════════════
// 4. FUNNEL ANALYTICS (STATIC ROUTE)
// ════════════════════════════════════════════════════════════════════════
/**
 * GET /api/traffic-dashboard/funnel-analytics
 *
 * Cross-Device Funnel Analytics
 * Tracks: ProfTest → Express Visit → Express Submit → Purchase
 */
router.get('/funnel-analytics', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const teamFilter = req.query.team as string | undefined;
    const campaignFilter = req.query.utm_campaign as string | undefined;
    const startDate = req.query.start as string | undefined;
    const endDate = req.query.end as string | undefined;

    console.log('[Funnel Analytics API] Fetching conversion funnel data');
    console.log('[Funnel Analytics API] Filters:', { teamFilter, campaignFilter, startDate, endDate });

    // Build query
    let query = trafficAdminSupabase
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

    const duration = Date.now() - startTime;
    console.log(`[Funnel Analytics API] ✅ Completed in ${duration}ms`);

    return res.json({
      success: true,
      stats,
      conversions,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Funnel Analytics API] ❌ Error in ${duration}ms:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch funnel analytics',
    });
  }
});

// ════════════════════════════════════════════════════════════════════════
// 5. STAGE DETAILS (DYNAMIC ROUTE - MUST BE LAST!)
// ════════════════════════════════════════════════════════════════════════
/**
 * GET /api/traffic-dashboard/funnel/:stageId
 *
 * Получить детальную информацию по конкретному этапу воронки
 *
 * Params:
 * - stageId: 'spend' | 'proftest' | 'express' | 'main' | 'challenge3d_leads' | 'challenge3d_prepayments' | 'challenge3d_full_purchases'
 *
 * ⚠️ ВАЖНО: Этот маршрут ДОЛЖЕН быть последним, т.к. он динамический!
 */
router.get('/funnel/:stageId', async (req: Request, res: Response) => {
  const startTime = Date.now();
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

    // Validate stageId - поддержка всех типов воронок
    const validStages = [
      'spend', 'proftest', 'express', 'main',
      'challenge3d_leads', 'challenge3d_prepayments', 'challenge3d_full_purchases'
    ];

    if (!validStages.includes(stageId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid stageId "${stageId}". Must be one of: ${validStages.join(', ')}`,
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

    const duration = Date.now() - startTime;
    console.log(`[Funnel API] ✅ Stage ${stageId} completed in ${duration}ms`);

    return res.json({
      success: true,
      stage
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Funnel API] ❌ Error in ${duration}ms:`, error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch stage details',
      stage: null
    });
  }
});

export default router;
