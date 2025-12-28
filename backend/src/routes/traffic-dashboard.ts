/**
 * Traffic Dashboard API Routes
 *
 * Endpoints для управления Traffic Dashboard:
 * - Агрегация продаж из AmoCRM
 * - UTM атрибуция
 * - Получение статистики
 * - Facebook Ads интеграция
 */

import { Router } from 'express';
import TrafficSalesAggregator, { trafficSupabase } from '../services/traffic-sales-aggregator';
import TrafficUTMAttribution from '../services/traffic-utm-attribution';
import { amocrmLeadsFetcher } from '../services/amocrm-leads-fetcher';

const router = Router();

// Инициализация сервисов
const salesAggregator = new TrafficSalesAggregator();
const utmAttribution = new TrafficUTMAttribution();

/**
 * POST /api/traffic-dashboard/aggregate
 * Запускает агрегацию продаж из AmoCRM
 * 
 * Body:
 * {
 *   startDate: string (ISO date),
 *   endDate: string (ISO date),
 *   periodType: 'daily' | 'weekly' | 'monthly'
 * }
 */
router.post('/aggregate', async (req, res) => {
  try {
    const { startDate, endDate, periodType } = req.body;

    // Валидация входных данных
    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const period = periodType || 'daily';

    // Запускаем агрегацию
    await salesAggregator.aggregateSales(start, end, period);

    res.json({
      success: true,
      message: 'Sales aggregation completed successfully',
      data: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        periodType: period
      }
    });
  } catch (error) {
    console.error('❌ Error in /aggregate:', error);
    res.status(500).json({
      error: 'Failed to aggregate sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/traffic-dashboard/aggregate/today
 * Запускает агрегацию за сегодня
 */
router.post('/aggregate/today', async (req, res) => {
  try {
    await salesAggregator.aggregateToday();

    res.json({
      success: true,
      message: 'Today sales aggregation completed successfully'
    });
  } catch (error) {
    console.error('❌ Error in /aggregate/today:', error);
    res.status(500).json({
      error: 'Failed to aggregate today sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/traffic-dashboard/aggregate/last-30-days
 * Запускает агрегацию за последние 30 дней
 */
router.post('/aggregate/last-30-days', async (req, res) => {
  try {
    await salesAggregator.aggregateLast30Days();

    res.json({
      success: true,
      message: 'Last 30 days sales aggregation completed successfully'
    });
  } catch (error) {
    console.error('❌ Error in /aggregate/last-30-days:', error);
    res.status(500).json({
      error: 'Failed to aggregate last 30 days sales',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/traffic-dashboard/attribute
 * Атрибутирует UTM параметры к команде
 * 
 * Body:
 * {
 *   utm_source: string,
 *   utm_medium: string,
 *   utm_campaign: string,
 *   utm_content: string,
 *   utm_term: string
 * }
 */
router.post('/attribute', async (req, res) => {
  try {
    const utmParams = req.body;

    const result = await utmAttribution.attribute(utmParams);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error in /attribute:', error);
    res.status(500).json({
      error: 'Failed to attribute UTM params',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/traffic-dashboard/attribute/batch
 * Пакетная атрибуция UTM параметров
 * 
 * Body:
 * {
 *   utmParams: Array<{
 *     utm_source: string,
 *     utm_medium: string,
 *     utm_campaign: string,
 *     utm_content: string,
 *     utm_term: string
 *   }>
 * }
 */
router.post('/attribute/batch', async (req, res) => {
  try {
    const { utmParams } = req.body;

    if (!Array.isArray(utmParams)) {
      return res.status(400).json({
        error: 'utmParams must be an array'
      });
    }

    const results = await utmAttribution.attributeBatch(utmParams);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Error in /attribute/batch:', error);
    res.status(500).json({
      error: 'Failed to attribute UTM params batch',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/traffic-dashboard/attribution-stats
 * Получает статистику атрибуции
 */
router.get('/attribution-stats', async (req, res) => {
  try {
    const stats = await utmAttribution.getAttributionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error in /attribution-stats:', error);
    res.status(500).json({
      error: 'Failed to get attribution stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/traffic-dashboard/stats
 * Получает агрегированную статистику
 * 
 * Query params:
 * - teamName: string (опционально)
 * - startDate: string (ISO date, опционально)
 * - endDate: string (ISO date, опционально)
 * - periodType: 'daily' | 'weekly' | 'monthly' (опционально)
 */
router.get('/stats', async (req, res) => {
  try {
    const { teamName, startDate, endDate, periodType } = req.query;

    // TODO: Реализовать получение статистики из traffic_sales_stats
    // Это будет сделано позже

    res.json({
      success: true,
      message: 'Stats endpoint - TODO: Implement',
      data: {
        teamName,
        startDate,
        endDate,
        periodType
      }
    });
  } catch (error) {
    console.error('❌ Error in /stats:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/traffic-dashboard/health
 * Health check для Traffic Dashboard
 */
router.get('/health', async (req, res) => {
  try {
    // Проверяем подключение к Traffic Dashboard DB
    const { data: teams, error } = await trafficSupabase
      .from('traffic_teams')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('❌ Traffic DB health check error:', error);
      throw error;
    }
    
    console.log('✅ Traffic DB health check passed:', teams);

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        teamsCount: teams?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Error in /health:', error);
    res.status(500).json({
      error: 'Traffic Dashboard health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/traffic-dashboard/leads/total
 * Получает общую статистику по лидам из AmoCRM
 *
 * Query params:
 * - startDate: string (ISO date, опционально)
 * - endDate: string (ISO date, опционально)
 * - pipeline: 'express' | 'flagship' | 'all' (опционально, по умолчанию 'all')
 */
router.get('/leads/total', async (req, res) => {
  try {
    const { startDate, endDate, pipeline } = req.query;

    let options: any = {};

    if (startDate && endDate) {
      const dateFrom = new Date(startDate as string);
      const dateTo = new Date(endDate as string);
      options.date_from = Math.floor(dateFrom.getTime() / 1000);
      options.date_to = Math.floor(dateTo.getTime() / 1000);
    }

    if (pipeline === 'express') {
      options.pipeline_id = 10350882;
    } else if (pipeline === 'flagship') {
      options.pipeline_id = 10418746;
    }

    const stats = await amocrmLeadsFetcher.getLeadsStats(options);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('❌ Error in /leads/total:', error);
    res.status(500).json({
      error: 'Failed to get total leads',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/traffic-dashboard/leads/by-funnel
 * Получает лиды разбитые по воронкам
 *
 * Query params:
 * - startDate: string (ISO date, опционально)
 * - endDate: string (ISO date, опционально)
 * - status: string (опционально, ID статуса)
 */
router.get('/leads/by-funnel', async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;

    let options: any = {};

    if (startDate && endDate) {
      const dateFrom = new Date(startDate as string);
      const dateTo = new Date(endDate as string);
      options.date_from = Math.floor(dateFrom.getTime() / 1000);
      options.date_to = Math.floor(dateTo.getTime() / 1000);
    }

    if (status) {
      options.status_id = parseInt(status as string);
    }

    const leads = await amocrmLeadsFetcher.fetchAllLeads(options);

    // Группируем лиды по воронкам
    const byFunnel = {
      express: leads.express.map(lead => ({
        id: lead.id,
        name: lead.name,
        price: lead.price,
        status_id: lead.status_id,
        created_at: new Date(lead.created_at * 1000).toISOString(),
        updated_at: new Date(lead.updated_at * 1000).toISOString(),
      })),
      flagship: leads.flagship.map(lead => ({
        id: lead.id,
        name: lead.name,
        price: lead.price,
        status_id: lead.status_id,
        created_at: new Date(lead.created_at * 1000).toISOString(),
        updated_at: new Date(lead.updated_at * 1000).toISOString(),
      })),
    };

    res.json({
      success: true,
      data: {
        by_funnel: byFunnel,
        summary: {
          express_count: leads.express.length,
          flagship_count: leads.flagship.length,
          total_count: leads.total,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error in /leads/by-funnel:', error);
    res.status(500).json({
      error: 'Failed to get leads by funnel',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/traffic-dashboard/sales/total
 * Получает общую статистику продаж из AmoCRM
 *
 * Query params:
 * - startDate: string (ISO date, опционально)
 * - endDate: string (ISO date, опционально)
 * - pipeline: 'express' | 'flagship' | 'all' (опционально, по умолчанию 'all')
 */
router.get('/sales/total', async (req, res) => {
  try {
    const { startDate, endDate, pipeline } = req.query;

    let options: any = {};

    if (startDate && endDate) {
      const dateFrom = new Date(startDate as string);
      const dateTo = new Date(endDate as string);
      options.date_from = Math.floor(dateFrom.getTime() / 1000);
      options.date_to = Math.floor(dateTo.getTime() / 1000);
    }

    if (pipeline === 'express') {
      options.pipeline_id = 10350882;
    } else if (pipeline === 'flagship') {
      options.pipeline_id = 10418746;
    }

    const sales = await amocrmLeadsFetcher.fetchSuccessfulSales(options);

    res.json({
      success: true,
      data: {
        express_sales: sales.express.length,
        flagship_sales: sales.flagship.length,
        total_sales: sales.total,
        total_revenue: sales.total_revenue,
        flagman_sales: sales.flagship.filter(l => l.price >= 50000).length,
        express_sales_count: sales.express.length,
      },
    });
  } catch (error) {
    console.error('❌ Error in /sales/total:', error);
    res.status(500).json({
      error: 'Failed to get total sales',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
