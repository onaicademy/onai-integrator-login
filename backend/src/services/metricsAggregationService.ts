/**
 * Metrics Aggregation Service
 *
 * Server-initiated data aggregation that:
 * 1. Runs on a schedule (every 10 minutes)
 * 2. Fetches data from Facebook Ads API
 * 3. Aggregates with AmoCRM sales data
 * 4. Stores pre-computed metrics in Supabase
 * 5. Dashboard reads from cache, not live API
 *
 * BENEFITS:
 * - Avoids infinite API requests from frontend
 * - Respects Facebook API rate limits
 * - Provides consistent data snapshots
 * - Enables offline dashboard viewing
 * - Reduces latency for end users
 *
 * IMPROVEMENTS (v2):
 * - Token validation before sync
 * - Mutex with timeout protection (prevents overlap)
 * - Batch processing with concurrency limit
 * - Sync history logging
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import axios from 'axios';

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Aggregation interval in milliseconds (10 minutes)
const AGGREGATION_INTERVAL = 10 * 60 * 1000;

// Max sync duration before considering it "stuck" (8 minutes)
const MAX_SYNC_DURATION = 8 * 60 * 1000;

// Concurrency limit for Facebook API requests
const FB_CONCURRENCY_LIMIT = 3;

// Delay between batches (respects rate limits)
const BATCH_DELAY_MS = 500;

// In-memory state for sync status
let lastSyncTime: Date | null = null;
let syncInProgress = false;
let syncStartTime: Date | null = null;
let lastSyncError: string | null = null;
let tokenStatus: 'valid' | 'invalid' | 'unknown' = 'unknown';
let tokenExpiresAt: Date | null = null;

let syncStats = {
  usersProcessed: 0,
  campaignsProcessed: 0,
  metricsUpdated: 0,
  duration: 0
};

interface AggregatedMetrics {
  userId: string;
  teamName: string;
  period: string; // '7d', '30d', 'today'
  impressions: number;
  clicks: number;
  spend: number;
  spendKzt: number;
  conversions: number;
  revenue: number;
  sales: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  cpa: number;
  campaigns: CampaignMetrics[];
  updatedAt: Date;
}

interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
}

interface SyncStatus {
  inProgress: boolean;
  lastSync: Date | null;
  lastError: string | null;
  stats: typeof syncStats;
  nextSync: Date | null;
  tokenStatus: typeof tokenStatus;
  tokenExpiresAt: Date | null;
}

/**
 * Simple concurrency limiter (like p-limit)
 */
function createLimiter(concurrency: number) {
  let running = 0;
  const queue: (() => void)[] = [];

  const run = async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        running++;
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          running--;
          if (queue.length > 0) {
            const next = queue.shift();
            if (next) next();
          }
        }
      };

      if (running < concurrency) {
        execute();
      } else {
        queue.push(execute);
      }
    });
  };

  return run;
}

const fbLimiter = createLimiter(FB_CONCURRENCY_LIMIT);

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return {
    inProgress: syncInProgress,
    lastSync: lastSyncTime,
    lastError: lastSyncError,
    stats: syncStats,
    nextSync: lastSyncTime
      ? new Date(lastSyncTime.getTime() + AGGREGATION_INTERVAL)
      : null,
    tokenStatus,
    tokenExpiresAt
  };
}

/**
 * Validate Facebook access token
 * Returns true if valid, false if expired/invalid
 */
async function validateFbToken(token: string): Promise<boolean> {
  try {
    const response = await axios.get(`${FB_API_BASE}/debug_token`, {
      params: {
        input_token: token,
        access_token: token
      },
      timeout: 10000
    });

    const data = response.data.data;

    if (!data.is_valid) {
      tokenStatus = 'invalid';
      console.error('[Aggregation] FB Token is INVALID:', data.error?.message);
      return false;
    }

    tokenStatus = 'valid';

    // Check expiration
    if (data.expires_at) {
      tokenExpiresAt = new Date(data.expires_at * 1000);
      const daysUntilExpiry = Math.floor((tokenExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

      if (daysUntilExpiry <= 7) {
        console.warn(`[Aggregation] FB Token expires in ${daysUntilExpiry} days! Consider refreshing.`);
      }

      if (daysUntilExpiry <= 0) {
        tokenStatus = 'invalid';
        console.error('[Aggregation] FB Token has EXPIRED!');
        return false;
      }
    }

    return true;
  } catch (error: any) {
    // Check for specific error codes
    if (error.response?.data?.error) {
      const fbError = error.response.data.error;

      if (fbError.code === 190) {
        tokenStatus = 'invalid';
        console.error('[Aggregation] FB Token expired or invalid:', fbError.message);
        return false;
      }
    }

    console.warn('[Aggregation] Could not validate FB token:', error.message);
    tokenStatus = 'unknown';
    return true; // Continue anyway, will fail on actual requests if invalid
  }
}

/**
 * Check if sync is stuck and reset mutex if needed
 */
function checkAndResetStuckSync(): boolean {
  if (syncInProgress && syncStartTime) {
    const elapsed = Date.now() - syncStartTime.getTime();

    if (elapsed > MAX_SYNC_DURATION) {
      console.warn(`[Aggregation] Sync appears stuck (running for ${Math.round(elapsed / 1000)}s). Resetting mutex.`);
      syncInProgress = false;
      syncStartTime = null;
      lastSyncError = 'Previous sync was stuck and reset';
      return true;
    }
  }
  return false;
}

/**
 * Fetch Facebook Ads metrics for a single campaign
 */
async function fetchCampaignMetrics(
  campaignId: string,
  datePreset: string,
  fbToken: string
): Promise<CampaignMetrics | null> {
  try {
    const response = await axios.get(`${FB_API_BASE}/${campaignId}/insights`, {
      params: {
        access_token: fbToken,
        date_preset: datePreset,
        fields: 'campaign_name,spend,impressions,clicks,ctr,actions,action_values'
      },
      timeout: 30000
    });

    if (response.data.data?.[0]) {
      const data = response.data.data[0];
      const conversions = data.actions?.find((a: any) => a.action_type === 'purchase')?.value || 0;
      const revenue = data.action_values?.find((a: any) => a.action_type === 'purchase')?.value || 0;

      return {
        campaignId,
        campaignName: data.campaign_name,
        spend: parseFloat(data.spend) || 0,
        impressions: parseInt(data.impressions) || 0,
        clicks: parseInt(data.clicks) || 0,
        ctr: parseFloat(data.ctr) || 0,
        conversions: parseInt(conversions) || 0,
        revenue: parseFloat(revenue) || 0
      };
    }

    return null;
  } catch (error: any) {
    // Check for token errors
    if (error.response?.data?.error?.code === 190) {
      tokenStatus = 'invalid';
      throw new Error('Facebook token expired');
    }

    console.warn(`[Aggregation] Failed to fetch campaign ${campaignId}:`, error.message);
    return null;
  }
}

/**
 * Fetch Facebook Ads metrics with concurrency limit
 */
async function fetchFacebookMetrics(
  campaignIds: string[],
  datePreset: string,
  fbToken: string
): Promise<CampaignMetrics[]> {
  if (!campaignIds.length) return [];

  const results: CampaignMetrics[] = [];

  // Process in batches with concurrency limit
  const batches: string[][] = [];
  for (let i = 0; i < campaignIds.length; i += FB_CONCURRENCY_LIMIT) {
    batches.push(campaignIds.slice(i, i + FB_CONCURRENCY_LIMIT));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(campaignId =>
      fbLimiter(() => fetchCampaignMetrics(campaignId, datePreset, fbToken))
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result) {
        results.push(result);
      }
    }

    // Delay between batches for rate limiting
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}

/**
 * Fetch sales from AmoCRM via traffic_sales table
 */
async function fetchSalesForUser(
  userId: string,
  utmSource: string,
  dateFrom: string,
  dateTo: string
): Promise<{ count: number; revenue: number }> {
  try {
    const { data: sales, error } = await trafficAdminSupabase
      .from('traffic_sales')
      .select('amount')
      .eq('utm_source', utmSource)
      .gte('sale_date', dateFrom)
      .lte('sale_date', dateTo);

    if (error) throw error;

    const count = sales?.length || 0;
    const revenue = sales?.reduce((sum, s) => sum + (s.amount || 0), 0) || 0;

    return { count, revenue };
  } catch {
    return { count: 0, revenue: 0 };
  }
}

/**
 * Get exchange rate USD -> KZT
 */
async function getExchangeRate(): Promise<number> {
  try {
    const response = await axios.get('https://api.exchangerate.host/latest?base=USD&symbols=KZT', {
      timeout: 5000
    });
    return response.data.rates?.KZT || 507;
  } catch {
    return 507; // Fallback rate
  }
}

/**
 * Aggregate metrics for a single user
 */
async function aggregateUserMetrics(
  userId: string,
  teamName: string,
  period: string,
  fbToken: string,
  exchangeRate: number
): Promise<{ metrics: AggregatedMetrics | null; campaignsCount: number }> {
  // Get user settings
  const { data: settings } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('tracked_campaigns, utm_source')
    .eq('user_id', userId)
    .single();

  if (!settings?.tracked_campaigns?.length) {
    return { metrics: null, campaignsCount: 0 };
  }

  const campaignIds = settings.tracked_campaigns.map((c: any) => c.id || c);
  const utmSource = settings.utm_source || '';

  // Calculate date range
  const dateTo = new Date().toISOString().split('T')[0];
  let dateFrom: string;
  let datePreset: string;

  switch (period) {
    case 'today':
      dateFrom = dateTo;
      datePreset = 'today';
      break;
    case '30d':
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      datePreset = 'last_30d';
      break;
    default: // 7d
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      datePreset = 'last_7d';
  }

  // Fetch Facebook metrics with concurrency limit
  const campaigns = await fetchFacebookMetrics(campaignIds, datePreset, fbToken);

  // Calculate totals
  const totals = campaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      spend: acc.spend + c.spend,
      conversions: acc.conversions + c.conversions,
      revenue: acc.revenue + c.revenue
    }),
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0 }
  );

  // Fetch sales from AmoCRM
  const sales = await fetchSalesForUser(userId, utmSource, dateFrom, dateTo);

  // Calculate derived metrics
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const totalRevenue = totals.revenue + sales.revenue;
  const roas = totals.spend > 0 ? totalRevenue / totals.spend : 0;
  const cpa = sales.count > 0 ? totals.spend / sales.count : 0;

  return {
    metrics: {
      userId,
      teamName,
      period,
      impressions: totals.impressions,
      clicks: totals.clicks,
      spend: totals.spend,
      spendKzt: totals.spend * exchangeRate,
      conversions: totals.conversions,
      revenue: totalRevenue,
      sales: sales.count,
      ctr,
      cpc,
      cpm,
      roas,
      cpa,
      campaigns,
      updatedAt: new Date()
    },
    campaignsCount: campaignIds.length
  };
}

/**
 * Log sync to history table
 */
async function logSyncHistory(
  success: boolean,
  usersProcessed: number,
  metricsUpdated: number,
  durationMs: number,
  errorMessage: string | null
): Promise<void> {
  try {
    await trafficAdminSupabase
      .from('traffic_sync_history')
      .insert({
        started_at: syncStartTime?.toISOString(),
        completed_at: new Date().toISOString(),
        success,
        users_processed: usersProcessed,
        metrics_updated: metricsUpdated,
        duration_ms: durationMs,
        error_message: errorMessage
      });
  } catch (error) {
    console.warn('[Aggregation] Failed to log sync history:', error);
  }
}

/**
 * Run full aggregation for all users
 */
export async function runAggregation(): Promise<void> {
  // Check for stuck sync and reset if needed
  checkAndResetStuckSync();

  if (syncInProgress) {
    console.log('[Aggregation] Already in progress, skipping...');
    return;
  }

  syncInProgress = true;
  syncStartTime = new Date();
  lastSyncError = null;
  const startTime = Date.now();

  console.log('[Aggregation] Starting metrics aggregation...');

  try {
    // Get Facebook token
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    if (!fbToken) {
      throw new Error('Facebook access token not configured');
    }

    // Validate token before proceeding
    const isTokenValid = await validateFbToken(fbToken);
    if (!isTokenValid) {
      throw new Error('Facebook token is invalid or expired. Please reconnect Facebook integration.');
    }

    // Get exchange rate
    const exchangeRate = await getExchangeRate();

    // Get all active users
    const { data: users, error: usersError } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, team_name')
      .eq('is_active', true);

    if (usersError) throw usersError;

    const periods = ['7d', '30d', 'today'];
    let usersProcessed = 0;
    let metricsUpdated = 0;
    let totalCampaignsProcessed = 0;

    for (const user of users || []) {
      for (const period of periods) {
        const { metrics, campaignsCount } = await aggregateUserMetrics(
          user.id,
          user.team_name,
          period,
          fbToken,
          exchangeRate
        );

        totalCampaignsProcessed += campaignsCount;

        if (metrics) {
          // Upsert to aggregated_metrics table
          const { error: upsertError } = await trafficAdminSupabase
            .from('traffic_aggregated_metrics')
            .upsert(
              {
                user_id: metrics.userId,
                team_name: metrics.teamName,
                period: metrics.period,
                impressions: metrics.impressions,
                clicks: metrics.clicks,
                spend: metrics.spend,
                spend_kzt: metrics.spendKzt,
                conversions: metrics.conversions,
                revenue: metrics.revenue,
                sales: metrics.sales,
                ctr: metrics.ctr,
                cpc: metrics.cpc,
                cpm: metrics.cpm,
                roas: metrics.roas,
                cpa: metrics.cpa,
                campaigns_json: JSON.stringify(metrics.campaigns),
                updated_at: metrics.updatedAt.toISOString()
              },
              { onConflict: 'user_id,period' }
            );

          if (!upsertError) {
            metricsUpdated++;
          }
        }
      }
      usersProcessed++;
    }

    const duration = Date.now() - startTime;

    syncStats = {
      usersProcessed,
      campaignsProcessed: totalCampaignsProcessed,
      metricsUpdated,
      duration
    };

    lastSyncTime = new Date();

    // Log to history
    await logSyncHistory(true, usersProcessed, metricsUpdated, duration, null);

    console.log(`[Aggregation] Completed in ${duration}ms. Users: ${usersProcessed}, Campaigns: ${totalCampaignsProcessed}, Metrics: ${metricsUpdated}`);
  } catch (error: any) {
    lastSyncError = error.message;
    const duration = Date.now() - startTime;

    // Log failed sync to history
    await logSyncHistory(false, syncStats.usersProcessed, syncStats.metricsUpdated, duration, error.message);

    console.error('[Aggregation] Failed:', error);
  } finally {
    syncInProgress = false;
    syncStartTime = null;
  }
}

/**
 * Get cached metrics for a user
 */
export async function getCachedMetrics(
  userId: string,
  period: string = '7d'
): Promise<AggregatedMetrics | null> {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('traffic_aggregated_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .single();

    if (error || !data) return null;

    return {
      userId: data.user_id,
      teamName: data.team_name,
      period: data.period,
      impressions: data.impressions,
      clicks: data.clicks,
      spend: data.spend,
      spendKzt: data.spend_kzt,
      conversions: data.conversions,
      revenue: data.revenue,
      sales: data.sales,
      ctr: data.ctr,
      cpc: data.cpc,
      cpm: data.cpm,
      roas: data.roas,
      cpa: data.cpa,
      campaigns: JSON.parse(data.campaigns_json || '[]'),
      updatedAt: new Date(data.updated_at)
    };
  } catch {
    return null;
  }
}

/**
 * Start the aggregation scheduler
 */
export function startAggregationScheduler(): void {
  console.log(`[Aggregation] Starting scheduler (interval: ${AGGREGATION_INTERVAL / 1000}s)`);
  console.log(`[Aggregation] Concurrency limit: ${FB_CONCURRENCY_LIMIT}, Batch delay: ${BATCH_DELAY_MS}ms`);

  // Run immediately on startup (after 5s delay)
  setTimeout(() => runAggregation(), 5000);

  // Then run on interval
  setInterval(() => runAggregation(), AGGREGATION_INTERVAL);
}

/**
 * Force manual sync (for admin use)
 */
export async function forceSync(): Promise<SyncStatus> {
  await runAggregation();
  return getSyncStatus();
}
