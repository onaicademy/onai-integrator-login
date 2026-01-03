/**
 * UTM Analytics API
 *
 * Анализ всех продаж по UTM-меткам (не только таргетологи)
 * Для админ панели "Источники продаж"
 *
 * ВАЖНО: Использует view'ы из migration 013.
 * Если view'ы не созданы - использует fallback на прямые запросы к таблицам.
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const router = Router();

/**
 * Helper: Check if view exists and fallback to direct query if not
 */
async function getSalesData(days: number = 30, start?: string, end?: string) {
  // Calculate date filter
  const startDate = start || new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const endDate = end || new Date().toISOString().split('T')[0];

  // Try using the view first
  let { data, error } = await trafficAdminSupabase
    .from('all_sales_tracking')
    .select('*')
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .order('sale_date', { ascending: false });

  if (error) {
    console.warn('⚠️ all_sales_tracking view not available, using fallback');

    // Fallback: Query traffic_sales directly
    const { data: expressSales, error: expressError } = await trafficAdminSupabase
      .from('traffic_sales')
      .select('id, deal_id, amount, utm_source, utm_campaign, utm_medium, utm_content, utm_term, customer_name, phone, email, sale_date, created_at')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .gt('amount', 0);

    // Also try challenge3d_sales if exists
    const { data: challenge3dSales } = await trafficAdminSupabase
      .from('challenge3d_sales')
      .select('id, deal_id, amount, utm_source, utm_campaign, utm_medium, utm_content, utm_term, customer_name, phone, email, sale_date, created_at')
      .gte('sale_date', startDate)
      .lte('sale_date', endDate)
      .gt('amount', 0)
      .eq('prepaid', false);

    // Normalize data
    const normalizedExpress = (expressSales || []).map(s => ({
      ...s,
      sale_amount: s.amount,
      funnel_type: 'express'
    }));

    const normalizedChallenge = (challenge3dSales || []).map(s => ({
      ...s,
      sale_amount: s.amount,
      funnel_type: 'challenge3d'
    }));

    data = [...normalizedExpress, ...normalizedChallenge];
  }

  return data || [];
}

/**
 * GET /api/utm-analytics/overview
 * Общая статистика по UTM-меткам за период
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { start, end, days = 30 } = req.query;

    const allSales = await getSalesData(Number(days), start as string, end as string);

    // Группировка по источникам
    const bySource: Record<string, any> = {};
    const byCampaign: Record<string, any> = {};
    const byMedium: Record<string, any> = {};
    const byFunnelType: Record<string, any> = {};

    let totalSales = 0;
    let totalRevenue = 0;
    let salesWithoutUTM = 0;

    allSales.forEach((sale: any) => {
      totalSales++;
      const amount = parseFloat(sale.sale_amount || sale.amount || 0);
      totalRevenue += amount;

      // По источникам
      const source = sale.utm_source || 'No UTM Source';
      if (!bySource[source]) {
        bySource[source] = { source, sales: 0, revenue: 0 };
      }
      bySource[source].sales++;
      bySource[source].revenue += amount;

      // По кампаниям
      const campaign = sale.utm_campaign || 'No Campaign';
      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { campaign, source: sale.utm_source, sales: 0, revenue: 0 };
      }
      byCampaign[campaign].sales++;
      byCampaign[campaign].revenue += amount;

      // По medium
      const medium = sale.utm_medium || 'No Medium';
      if (!byMedium[medium]) {
        byMedium[medium] = { medium, sales: 0, revenue: 0 };
      }
      byMedium[medium].sales++;
      byMedium[medium].revenue += amount;

      // По типу воронки
      const funnelType = sale.funnel_type || 'unknown';
      if (!byFunnelType[funnelType]) {
        byFunnelType[funnelType] = { funnel_type: funnelType, sales: 0, revenue: 0 };
      }
      byFunnelType[funnelType].sales++;
      byFunnelType[funnelType].revenue += amount;

      // Подсчет продаж без UTM
      if (!sale.utm_source && !sale.utm_campaign) {
        salesWithoutUTM++;
      }
    });

    // Сортировка
    const sortedSources = Object.values(bySource).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedCampaigns = Object.values(byCampaign).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedMediums = Object.values(byMedium).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedFunnels = Object.values(byFunnelType).sort((a: any, b: any) => b.revenue - a.revenue);

    res.json({
      success: true,
      period: {
        start: start || `${days} days ago`,
        end: end || 'now',
        days: Number(days)
      },
      summary: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        avg_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
        sales_without_utm: salesWithoutUTM,
        utm_coverage: totalSales > 0 ? ((totalSales - salesWithoutUTM) / totalSales * 100).toFixed(2) : '0'
      },
      by_source: sortedSources.slice(0, 20),
      by_campaign: sortedCampaigns.slice(0, 20),
      by_medium: sortedMediums,
      by_funnel_type: sortedFunnels
    });

  } catch (error: any) {
    console.error('❌ Error fetching UTM overview:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure migration 013 (UTM analytics views) has been applied'
    });
  }
});

/**
 * GET /api/utm-analytics/top-sources
 * Топ источников по выручке
 */
router.get('/top-sources', async (req: Request, res: Response) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    // Try view first
    let { data, error } = await trafficAdminSupabase
      .from('top_utm_sources')
      .select('*')
      .limit(Number(limit));

    if (error) {
      console.warn('⚠️ top_utm_sources view not available, calculating manually');

      // Fallback: calculate from sales data
      const sales = await getSalesData(Number(days));

      const sourceMap: Record<string, any> = {};
      sales.forEach((sale: any) => {
        const source = sale.utm_source;
        if (!source) return;

        if (!sourceMap[source]) {
          sourceMap[source] = {
            utm_source: source,
            total_sales: 0,
            total_revenue: 0
          };
        }
        sourceMap[source].total_sales++;
        sourceMap[source].total_revenue += parseFloat(sale.sale_amount || sale.amount || 0);
      });

      data = Object.values(sourceMap)
        .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
        .slice(0, Number(limit));
    }

    res.json({ success: true, sources: data || [] });

  } catch (error: any) {
    console.error('❌ Error fetching top sources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/top-campaigns
 * Топ кампаний по выручке
 */
router.get('/top-campaigns', async (req: Request, res: Response) => {
  try {
    const { limit = 10, source, days = 30 } = req.query;

    // Try view first
    let { data, error } = await trafficAdminSupabase
      .from('top_utm_campaigns')
      .select('*')
      .order('total_revenue', { ascending: false })
      .limit(Number(limit));

    if (error) {
      console.warn('⚠️ top_utm_campaigns view not available, calculating manually');

      const sales = await getSalesData(Number(days));

      const campaignMap: Record<string, any> = {};
      sales.forEach((sale: any) => {
        const campaign = sale.utm_campaign;
        if (!campaign) return;
        if (source && sale.utm_source !== source) return;

        if (!campaignMap[campaign]) {
          campaignMap[campaign] = {
            utm_source: sale.utm_source,
            utm_campaign: campaign,
            total_sales: 0,
            total_revenue: 0
          };
        }
        campaignMap[campaign].total_sales++;
        campaignMap[campaign].total_revenue += parseFloat(sale.sale_amount || sale.amount || 0);
      });

      data = Object.values(campaignMap)
        .sort((a: any, b: any) => b.total_revenue - a.total_revenue)
        .slice(0, Number(limit));
    }

    res.json({ success: true, campaigns: data || [] });

  } catch (error: any) {
    console.error('❌ Error fetching top campaigns:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/without-utm
 * Продажи без UTM меток (требуют внимания)
 */
router.get('/without-utm', async (req: Request, res: Response) => {
  try {
    const { limit = 50, days = 30 } = req.query;

    // Try view first
    let { data, error } = await trafficAdminSupabase
      .from('sales_without_utm')
      .select('*')
      .limit(Number(limit));

    if (error) {
      console.warn('⚠️ sales_without_utm view not available, querying directly');

      const allSales = await getSalesData(Number(days));

      data = allSales
        .filter((s: any) => !s.utm_source && !s.utm_campaign)
        .slice(0, Number(limit))
        .map((s: any) => ({
          id: s.id,
          deal_id: s.deal_id,
          sale_amount: s.sale_amount || s.amount,
          funnel_type: s.funnel_type,
          customer_name: s.customer_name,
          phone: s.phone,
          email: s.email,
          sale_date: s.sale_date,
          created_at: s.created_at
        }));
    }

    res.json({
      success: true,
      count: data?.length || 0,
      sales: data || []
    });

  } catch (error: any) {
    console.error('❌ Error fetching sales without UTM:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/daily-stats
 * Дневная статистика по источникам (для графиков)
 */
router.get('/daily-stats', async (req: Request, res: Response) => {
  try {
    const { days = 30, source, campaign } = req.query;

    // Try view first
    let { data, error } = await trafficAdminSupabase
      .from('daily_utm_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(Number(days) * 10); // Multiple entries per day

    if (error) {
      console.warn('⚠️ daily_utm_stats view not available, calculating manually');

      const sales = await getSalesData(Number(days));

      const dailyMap: Record<string, any> = {};
      sales.forEach((sale: any) => {
        if (source && sale.utm_source !== source) return;
        if (campaign && sale.utm_campaign !== campaign) return;

        const date = sale.sale_date?.split('T')[0] || 'unknown';
        const key = `${date}_${sale.utm_source || 'none'}_${sale.utm_campaign || 'none'}`;

        if (!dailyMap[key]) {
          dailyMap[key] = {
            date,
            utm_source: sale.utm_source,
            utm_campaign: sale.utm_campaign,
            sales_count: 0,
            total_revenue: 0
          };
        }
        dailyMap[key].sales_count++;
        dailyMap[key].total_revenue += parseFloat(sale.sale_amount || sale.amount || 0);
      });

      data = Object.values(dailyMap)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
    }

    // Apply filters if using view data
    if (!error && data) {
      if (source) {
        data = data.filter((d: any) => d.utm_source === source);
      }
      if (campaign) {
        data = data.filter((d: any) => d.utm_campaign === campaign);
      }
    }

    res.json({ success: true, daily_stats: data || [] });

  } catch (error: any) {
    console.error('❌ Error fetching daily stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/search
 * Поиск продаж по UTM параметрам
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const {
      utm_source,
      utm_campaign,
      utm_medium,
      funnel_type,
      start,
      end,
      limit = 100
    } = req.query;

    const sales = await getSalesData(90, start as string, end as string);

    // Apply filters
    let filtered = sales;

    if (utm_source) {
      filtered = filtered.filter((s: any) =>
        s.utm_source?.toLowerCase() === (utm_source as string).toLowerCase()
      );
    }

    if (utm_campaign) {
      filtered = filtered.filter((s: any) =>
        s.utm_campaign?.toLowerCase().includes((utm_campaign as string).toLowerCase())
      );
    }

    if (utm_medium) {
      filtered = filtered.filter((s: any) =>
        s.utm_medium?.toLowerCase() === (utm_medium as string).toLowerCase()
      );
    }

    if (funnel_type) {
      filtered = filtered.filter((s: any) => s.funnel_type === funnel_type);
    }

    // Limit results
    filtered = filtered.slice(0, Number(limit));

    // Статистика по результатам поиска
    const totalSales = filtered.length;
    const totalRevenue = filtered.reduce((sum: number, sale: any) =>
      sum + parseFloat(sale.sale_amount || sale.amount || 0), 0);

    res.json({
      success: true,
      count: totalSales,
      total_revenue: totalRevenue,
      avg_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
      sales: filtered
    });

  } catch (error: any) {
    console.error('❌ Error searching sales:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/source-details/:source
 * Детальная информация по источнику
 */
router.get('/source-details/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const { days = 30 } = req.query;

    const allSales = await getSalesData(Number(days));

    // Filter by source
    const sales = allSales.filter((s: any) =>
      s.utm_source?.toLowerCase() === source.toLowerCase()
    );

    // Группировка по кампаниям
    const byCampaign: Record<string, any> = {};
    sales.forEach((sale: any) => {
      const campaign = sale.utm_campaign || 'No Campaign';
      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { campaign, sales: 0, revenue: 0 };
      }
      byCampaign[campaign].sales++;
      byCampaign[campaign].revenue += parseFloat(sale.sale_amount || sale.amount || 0);
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum: number, sale: any) =>
      sum + parseFloat(sale.sale_amount || sale.amount || 0), 0);

    res.json({
      success: true,
      source,
      summary: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        avg_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
        first_sale: sales[sales.length - 1]?.sale_date,
        last_sale: sales[0]?.sale_date
      },
      campaigns: Object.values(byCampaign).sort((a: any, b: any) => b.revenue - a.revenue),
      recent_sales: sales.slice(0, 20)
    });

  } catch (error: any) {
    console.error('❌ Error fetching source details:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if we can access sales tables
    const { error: salesError } = await trafficAdminSupabase
      .from('traffic_sales')
      .select('id')
      .limit(1);

    const { error: viewError } = await trafficAdminSupabase
      .from('all_sales_tracking')
      .select('id')
      .limit(1);

    res.json({
      success: true,
      status: 'healthy',
      tables: {
        traffic_sales: !salesError,
        all_sales_tracking_view: !viewError
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

export default router;
