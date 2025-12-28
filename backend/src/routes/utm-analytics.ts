/**
 * UTM Analytics API
 *
 * Анализ всех продаж по UTM-меткам (не только таргетологи)
 * Для админ панели "Источники продаж"
 */

import { Router, Request, Response } from 'express';
import { trafficSupabase } from '../config/supabase-traffic';

const router = Router();

/**
 * GET /api/utm-analytics/overview
 * Общая статистика по UTM-меткам за период
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const { start, end, days = 30 } = req.query;
    
    let dateFilter = '';
    if (start && end) {
      dateFilter = `sale_date >= '${start}' AND sale_date <= '${end}'`;
    } else {
      dateFilter = `sale_date >= NOW() - INTERVAL '${days} days'`;
    }

    // Получить все продажи за период
    const { data: allSales, error } = await trafficSupabase
      .from('all_sales_tracking')
      .select('*')
      .gte('sale_date', start || new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString())
      .order('sale_date', { ascending: false });

    if (error) throw error;

    // Группировка по источникам
    const bySource: Record<string, any> = {};
    const byCampaign: Record<string, any> = {};
    const byMedium: Record<string, any> = {};
    const byTargetologist: Record<string, any> = {};

    let totalSales = 0;
    let totalRevenue = 0;
    let salesWithoutUTM = 0;

    allSales?.forEach((sale: any) => {
      totalSales++;
      totalRevenue += parseFloat(sale.sale_amount);

      // По источникам
      const source = sale.utm_source || 'No UTM Source';
      if (!bySource[source]) {
        bySource[source] = { source, sales: 0, revenue: 0 };
      }
      bySource[source].sales++;
      bySource[source].revenue += parseFloat(sale.sale_amount);

      // По кампаниям
      const campaign = sale.utm_campaign || 'No Campaign';
      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { campaign, source: sale.utm_source, sales: 0, revenue: 0 };
      }
      byCampaign[campaign].sales++;
      byCampaign[campaign].revenue += parseFloat(sale.sale_amount);

      // По medium
      const medium = sale.utm_medium || 'No Medium';
      if (!byMedium[medium]) {
        byMedium[medium] = { medium, sales: 0, revenue: 0 };
      }
      byMedium[medium].sales++;
      byMedium[medium].revenue += parseFloat(sale.sale_amount);

      // По таргетологам
      const targetologist = sale.targetologist || 'Unknown';
      if (!byTargetologist[targetologist]) {
        byTargetologist[targetologist] = { targetologist, sales: 0, revenue: 0 };
      }
      byTargetologist[targetologist].sales++;
      byTargetologist[targetologist].revenue += parseFloat(sale.sale_amount);

      // Подсчет продаж без UTM
      if (!sale.utm_source && !sale.utm_campaign) {
        salesWithoutUTM++;
      }
    });

    // Сортировка
    const sortedSources = Object.values(bySource).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedCampaigns = Object.values(byCampaign).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedMediums = Object.values(byMedium).sort((a: any, b: any) => b.revenue - a.revenue);
    const sortedTargetologists = Object.values(byTargetologist).sort((a: any, b: any) => b.revenue - a.revenue);

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
        utm_coverage: totalSales > 0 ? ((totalSales - salesWithoutUTM) / totalSales * 100).toFixed(2) : 0
      },
      by_source: sortedSources,
      by_campaign: sortedCampaigns,
      by_medium: sortedMediums,
      by_targetologist: sortedTargetologists
    });

  } catch (error: any) {
    console.error('❌ Error fetching UTM overview:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/utm-analytics/top-sources
 * Топ источников по выручке
 */
router.get('/top-sources', async (req: Request, res: Response) => {
  try {
    const { limit = 10, days = 30 } = req.query;

    const { data, error } = await trafficSupabase
      .from('top_utm_sources')
      .select('*')
      .limit(Number(limit));

    if (error) throw error;

    res.json({ success: true, sources: data });

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
    const { limit = 10, source } = req.query;

    let query = trafficSupabase
      .from('top_utm_campaigns')
      .select('*');

    if (source) {
      query = query.eq('utm_source', source);
    }

    const { data, error } = await query
      .order('total_revenue', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    res.json({ success: true, campaigns: data });

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
    const { limit = 50 } = req.query;

    const { data, error } = await trafficSupabase
      .from('sales_without_utm')
      .select('*')
      .limit(Number(limit));

    if (error) throw error;

    res.json({ 
      success: true, 
      count: data.length,
      sales: data 
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

    let query = trafficSupabase
      .from('daily_utm_stats')
      .select('*');

    if (source) {
      query = query.eq('utm_source', source);
    }

    if (campaign) {
      query = query.eq('utm_campaign', campaign);
    }

    const { data, error } = await query
      .order('date', { ascending: false })
      .limit(Number(days));

    if (error) throw error;

    res.json({ success: true, daily_stats: data });

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
      targetologist,
      start,
      end,
      limit = 100 
    } = req.query;

    let query = trafficSupabase
      .from('all_sales_tracking')
      .select('*');

    if (utm_source) {
      query = query.eq('utm_source', utm_source);
    }

    if (utm_campaign) {
      query = query.ilike('utm_campaign', `%${utm_campaign}%`);
    }

    if (utm_medium) {
      query = query.eq('utm_medium', utm_medium);
    }

    if (targetologist) {
      query = query.eq('targetologist', targetologist);
    }

    if (start) {
      query = query.gte('sale_date', start);
    }

    if (end) {
      query = query.lte('sale_date', end);
    }

    const { data, error } = await query
      .order('sale_date', { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    // Статистика по результатам поиска
    const totalSales = data.length;
    const totalRevenue = data.reduce((sum, sale: any) => sum + parseFloat(sale.sale_amount), 0);

    res.json({ 
      success: true,
      count: totalSales,
      total_revenue: totalRevenue,
      avg_sale: totalSales > 0 ? totalRevenue / totalSales : 0,
      sales: data 
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

    // Все продажи по этому источнику
    const { data: sales, error } = await trafficSupabase
      .from('all_sales_tracking')
      .select('*')
      .eq('utm_source', source)
      .gte('sale_date', new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000).toISOString())
      .order('sale_date', { ascending: false });

    if (error) throw error;

    // Группировка по кампаниям
    const byCampaign: Record<string, any> = {};
    sales?.forEach((sale: any) => {
      const campaign = sale.utm_campaign || 'No Campaign';
      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { campaign, sales: 0, revenue: 0 };
      }
      byCampaign[campaign].sales++;
      byCampaign[campaign].revenue += parseFloat(sale.sale_amount);
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale: any) => sum + parseFloat(sale.sale_amount), 0);

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

export default router;
