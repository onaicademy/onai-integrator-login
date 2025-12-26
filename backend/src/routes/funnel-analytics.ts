/**
 * 📊 Funnel Analytics API Route
 * 
 * Provides conversion funnel data from funnel_analytics SQL view
 * Supports cross-device tracking (Desktop → Mobile attribution)
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

// Landing Supabase client
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * GET /api/traffic/funnel-analytics
 * Get funnel conversion data
 * Query params:
 *  - team: filter by team name (optional)
 *  - start_date: filter by start date (optional, YYYY-MM-DD)
 *  - end_date: filter by end date (optional, YYYY-MM-DD)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { team, start_date, end_date } = req.query;

    console.log('📊 [Funnel Analytics] Fetching data:', { team, start_date, end_date });

    // Build query
    let query = landingSupabase
      .from('funnel_analytics')
      .select('*')
      .order('date', { ascending: false });

    // Apply filters
    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    // Note: Team filter would require utm_source to team mapping
    // For now, we filter on frontend if needed

    const { data, error } = await query;

    if (error) {
      console.error('❌ [Funnel Analytics] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    console.log(`✅ [Funnel Analytics] Returned ${data?.length || 0} rows`);

    res.json({
      success: true,
      data: data || [],
      count: data?.length || 0,
    });

  } catch (error: any) {
    console.error('❌ [Funnel Analytics] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/traffic/funnel-analytics/summary
 * Get aggregated funnel summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { team, start_date, end_date } = req.query;

    console.log('📊 [Funnel Summary] Fetching data:', { team, start_date, end_date });

    // Build query (same as above)
    let query = landingSupabase
      .from('funnel_analytics')
      .select('*');

    if (start_date) {
      query = query.gte('date', start_date);
    }
    if (end_date) {
      query = query.lte('date', end_date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ [Funnel Summary] Error:', error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    // Aggregate totals
    const summary = (data || []).reduce(
      (acc, row) => ({
        proftest_count: acc.proftest_count + (row.proftest_count || 0),
        express_visit_count: acc.express_visit_count + (row.express_visit_count || 0),
        express_submit_count: acc.express_submit_count + (row.express_submit_count || 0),
        purchase_count: acc.purchase_count + (row.purchase_count || 0),
      }),
      {
        proftest_count: 0,
        express_visit_count: 0,
        express_submit_count: 0,
        purchase_count: 0,
      }
    );

    // Calculate conversion rates
    const rates = {
      proftest_to_express:
        summary.proftest_count > 0
          ? ((summary.express_visit_count / summary.proftest_count) * 100).toFixed(2)
          : '0.00',
      express_visit_to_submit:
        summary.express_visit_count > 0
          ? ((summary.express_submit_count / summary.express_visit_count) * 100).toFixed(2)
          : '0.00',
      express_submit_to_purchase:
        summary.express_submit_count > 0
          ? ((summary.purchase_count / summary.express_submit_count) * 100).toFixed(2)
          : '0.00',
      overall:
        summary.proftest_count > 0
          ? ((summary.purchase_count / summary.proftest_count) * 100).toFixed(2)
          : '0.00',
    };

    console.log(`✅ [Funnel Summary] Aggregated ${data?.length || 0} rows`);

    res.json({
      success: true,
      summary,
      rates,
      period: {
        start: start_date || 'all',
        end: end_date || 'all',
      },
    });

  } catch (error: any) {
    console.error('❌ [Funnel Summary] Fatal error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
