/**
 * Traffic Force Sync Router
 * Принудительная синхронизация данных из AmoCRM, Facebook и Database
 */

import { Router, Request, Response } from 'express';
import { trafficSupabase } from '../services/traffic-sales-aggregator.js';
import { landingSupabase } from '../config/supabase-landing.js';
import { IntegrationLogger } from '../services/integrationLogger.js';

const router = Router();

/**
 * POST /api/traffic-dashboard/force-sync
 * Принудительная синхронизация всех данных
 *
 * Body:
 * {
 *   sources: ['amocrm', 'facebook', 'database'], // optional
 *   recalculate: true, // optional
 *   dateRange: { start: '2024-01-01', end: '2024-12-31' } // optional
 * }
 */
router.post('/force-sync', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const {
      sources = ['amocrm', 'database'],
      recalculate = true,
      dateRange
    } = req.body;

    console.log('🔄 Force Sync initiated');
    console.log('   Sources:', sources);
    console.log('   Recalculate:', recalculate);
    console.log('   Date Range:', dateRange);

    const results: any = {
      started_at: new Date().toISOString(),
      sources: {},
      errors: []
    };

    // ==========================================
    // 1. SYNC FROM AMOCRM (Skipped - use webhook instead)
    // ==========================================
    if (sources.includes('amocrm')) {
      console.log('\n📞 AmoCRM sync via force-sync is deprecated.');
      console.log('   Use AmoCRM webhooks for real-time sync instead.');

      results.sources.amocrm = {
        status: 'skipped',
        message: 'AmoCRM sync uses webhooks for real-time data. Manual sync not needed.'
      };
    }

    // ==========================================
    // 2. SYNC FROM DATABASE
    // ==========================================
    if (sources.includes('database')) {
      console.log('\n💾 Syncing from Database...');

      try {
        // Count all sales in all_sales_tracking
        const { count: salesCount, error: salesError } = await landingSupabase
          .from('all_sales_tracking')
          .select('*', { count: 'exact', head: true });

        if (salesError) throw salesError;

        // Count active traffic users
        const { count: usersCount, error: usersError } = await trafficSupabase
          .from('traffic_users')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        if (usersError) throw usersError;

        results.sources.database = {
          status: 'success',
          sales_count: salesCount || 0,
          active_users: usersCount || 0,
          message: `Database has ${salesCount || 0} sales and ${usersCount || 0} active users`
        };

        console.log(`   ✅ ${salesCount || 0} sales, ${usersCount || 0} users`);

      } catch (error: any) {
        console.error('   ❌ Database sync failed:', error.message);
        results.sources.database = {
          status: 'failed',
          error: error.message
        };
        results.errors.push({
          source: 'database',
          error: error.message
        });
      }
    }

    // ==========================================
    // 3. RECALCULATE METRICS
    // ==========================================
    if (recalculate) {
      console.log('\n📊 Recalculating metrics...');

      try {
        // Recalculate total revenue
        const { data: sales } = await landingSupabase
          .from('all_sales_tracking')
          .select('sale_price');

        const totalRevenue = sales?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0;

        // Recalculate by funnel
        const { data: expressSales } = await landingSupabase
          .from('all_sales_tracking')
          .select('sale_price')
          .eq('funnel_type', 'express');

        const expressRevenue = expressSales?.reduce((sum, sale) => sum + (sale.sale_price || 0), 0) || 0;

        results.recalculation = {
          status: 'success',
          total_revenue: totalRevenue,
          express_revenue: expressRevenue,
          metrics_updated: ['total_revenue', 'express_revenue', 'funnel_breakdown']
        };

        console.log(`   ✅ Total Revenue: ${totalRevenue} KZT`);
        console.log(`   ✅ Express Revenue: ${expressRevenue} KZT`);

      } catch (error: any) {
        console.error('   ❌ Recalculation failed:', error.message);
        results.recalculation = {
          status: 'failed',
          error: error.message
        };
        results.errors.push({
          source: 'recalculation',
          error: error.message
        });
      }
    }

    // ==========================================
    // FINALIZE RESULTS
    // ==========================================
    results.completed_at = new Date().toISOString();
    results.duration_ms = Date.now() - startTime;
    results.success = results.errors.length === 0;

    // Log successful sync
    if (results.success) {
      await integrationLogger.log({
        service_name: 'traffic_dashboard',
        action: 'force_sync',
        status: 'success',
        duration_ms: results.duration_ms,
        request_payload: { sources, recalculate, dateRange },
        response_payload: results
      });
    }

    console.log(`\n✅ Force Sync completed in ${results.duration_ms}ms\n`);

    res.json({
      success: results.success,
      message: results.success ? 'Force sync completed successfully' : 'Force sync completed with errors',
      data: results
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error('❌ Force Sync failed:', error);

    await integrationLogger.log({
      service_name: 'traffic_dashboard',
      action: 'force_sync',
      status: 'failed',
      error_message: error.message,
      duration_ms: duration
    });

    res.status(500).json({
      success: false,
      error: 'Force sync failed',
      message: error.message,
      duration_ms: duration
    });
  }
});

/**
 * GET /api/traffic-dashboard/sync-status
 * Получить статус последней синхронизации
 */
router.get('/sync-status', async (req: Request, res: Response) => {
  try {
    // Get last sync from integration_logs
    const { data: lastSync } = await landingSupabase
      .from('integration_logs')
      .select('*')
      .eq('service_name', 'traffic_dashboard')
      .eq('action', 'force_sync')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastSync) {
      return res.json({
        success: true,
        data: {
          last_sync: null,
          message: 'No sync history found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        last_sync: {
          timestamp: lastSync.created_at,
          status: lastSync.status,
          duration_ms: lastSync.duration_ms,
          error: lastSync.error_message
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
