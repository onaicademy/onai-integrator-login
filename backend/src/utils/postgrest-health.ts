/**
 * PostgREST Health Check Utility
 * Based on Perplexity AI research: "RPC-ONLY Architecture for Hosted Supabase"
 * 
 * Purpose: Verify that PostgREST schema cache has propagated to all cluster instances
 */

import { tripwireAdminSupabase } from '../config/supabase-tripwire';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  rpc_accessible: boolean;
  timestamp: string;
  error?: string;
  details?: {
    leaderboard: boolean;
    stats: boolean;
    users: boolean;
    activity: boolean;
    chart: boolean;
  };
}

/**
 * Check if all RPC functions are accessible via PostgREST
 */
export async function checkPostgRESTHealth(): Promise<HealthCheckResult> {
  const results = {
    leaderboard: false,
    stats: false,
    users: false,
    activity: false,
    chart: false,
  };

  try {
    // Test 1: rpc_get_sales_leaderboard (no params)
    const { error: err1 } = await tripwireAdminSupabase.rpc('rpc_get_sales_leaderboard');
    results.leaderboard = !err1;

    // Test 2: rpc_get_tripwire_stats (with params)
    const { error: err2 } = await tripwireAdminSupabase.rpc('rpc_get_tripwire_stats', {
      p_end_date: null,
      p_manager_id: null,
      p_start_date: null,
    });
    results.stats = !err2;

    // Test 3: rpc_get_tripwire_users (with params)
    const { error: err3 } = await tripwireAdminSupabase.rpc('rpc_get_tripwire_users', {
      p_end_date: null,
      p_limit: 1,
      p_manager_id: null,
      p_page: 1,
      p_start_date: null,
      p_status: null,
    });
    results.users = !err3;

    // Test 4: rpc_get_sales_activity_log (with params)
    const { error: err4 } = await tripwireAdminSupabase.rpc('rpc_get_sales_activity_log', {
      p_end_date: null,
      p_limit: 1,
      p_manager_id: null,
      p_start_date: null,
    });
    results.activity = !err4;

    // Test 5: rpc_get_sales_chart_data (with params)
    const { error: err5 } = await tripwireAdminSupabase.rpc('rpc_get_sales_chart_data', {
      p_end_date: null,
      p_manager_id: null,
      p_start_date: null,
    });
    results.chart = !err5;

    // Calculate overall status
    const allHealthy = Object.values(results).every(v => v === true);
    const someHealthy = Object.values(results).some(v => v === true);

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      rpc_accessible: allHealthy,
      timestamp: new Date().toISOString(),
      details: results,
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      rpc_accessible: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      details: results,
    };
  }
}

/**
 * Wait for PostgREST schema cache to propagate
 * Retry up to maxAttempts with exponential backoff
 */
export async function waitForSchemaCache(maxAttempts: number = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`🔍 [Health Check] Attempt ${i + 1}/${maxAttempts}...`);
    
    const health = await checkPostgRESTHealth();
    
    if (health.status === 'healthy') {
      console.log('✅ [Health Check] All RPC functions accessible!');
      return true;
    }
    
    console.log(`⏳ [Health Check] Status: ${health.status}`, health.details);
    
    // Exponential backoff: 2^i seconds (2s, 4s, 8s, 16s, ...)
    const waitSeconds = Math.min(Math.pow(2, i), 60); // Max 60s
    console.log(`   Waiting ${waitSeconds}s before retry...`);
    
    await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
    
    // Try reloading schema cache again
    if (i < maxAttempts - 1) {
      try {
        await tripwireAdminSupabase.rpc('reload_postgrest_cache');
        console.log('   🔄 Schema cache reload triggered');
      } catch (err) {
        console.warn('   ⚠️ Failed to trigger reload:', (err as Error).message);
      }
    }
  }
  
  console.error('❌ [Health Check] Failed after', maxAttempts, 'attempts');
  return false;
}

