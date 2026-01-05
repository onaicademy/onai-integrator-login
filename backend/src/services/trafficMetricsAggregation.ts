/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 TRAFFIC METRICS AGGREGATION SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Aggregate raw data into traffic_aggregated_metrics table
 *
 * Data Sources:
 * - traffic_facebook_ads_raw (Facebook Ads spend)
 * - traffic_leads (Lead counts)
 * - challenge3d_sales (Challenge3D sales)
 * - express_course_sales (Express course sales)
 * - intensive1d_sales (Intensive 1D sales)
 *
 * Output: traffic_aggregated_metrics (pre-computed dashboard metrics)
 *
 * Schedule: Run every 10 minutes via cron
 */

import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { getAverageExchangeRate } from './exchangeRateService.js';

interface AggregationPeriod {
  period: 'today' | '7d' | '30d';
  startDate: string;
  endDate: string;
}

/**
 * Calculate date ranges for standard periods
 */
function getPeriodDateRanges(): AggregationPeriod[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = today.toISOString().split('T')[0];

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sevenDaysStr = sevenDaysAgo.toISOString().split('T')[0];

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split('T')[0];

  return [
    { period: 'today', startDate: todayStr, endDate: todayStr },
    { period: '7d', startDate: sevenDaysStr, endDate: todayStr },
    { period: '30d', startDate: thirtyDaysStr, endDate: todayStr }
  ];
}

/**
 * Aggregate Facebook Ads spend for a user and period
 */
async function aggregateFacebookSpend(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{
  spend_usd: number;
  spend_kzt: number;
  impressions: number;
  clicks: number;
  reach: number;
}> {
  const { data, error } = await trafficAdminSupabase
    .from('traffic_facebook_ads_raw')
    .select('spend, impressions, clicks, reach')
    .eq('user_id', userId)
    .gte('stat_date', startDate)
    .lte('stat_date', endDate);

  if (error) {
    console.error(`[Aggregation] Error fetching FB ads for user ${userId}:`, error.message);
    return { spend_usd: 0, spend_kzt: 0, impressions: 0, clicks: 0, reach: 0 };
  }

  if (!data || data.length === 0) {
    return { spend_usd: 0, spend_kzt: 0, impressions: 0, clicks: 0, reach: 0 };
  }

  const exchangeRate = await getAverageExchangeRate(startDate, endDate);

  const totals = data.reduce(
    (acc, row) => {
      const spend = parseFloat(row.spend || '0');
      acc.spend_usd += spend;
      acc.spend_kzt += spend * exchangeRate;
      acc.impressions += parseInt(row.impressions || '0', 10);
      acc.clicks += parseInt(row.clicks || '0', 10);
      acc.reach += parseInt(row.reach || '0', 10);
      return acc;
    },
    { spend_usd: 0, spend_kzt: 0, impressions: 0, clicks: 0, reach: 0 }
  );

  return totals;
}

/**
 * Aggregate lead counts for a user and period
 */
async function aggregateLeads(
  userId: string,
  teamName: string,
  startDate: string,
  endDate: string
): Promise<{
  total_leads: number;
  challenge3d_leads: number;
  intensive1d_leads: number;
  express_leads: number;
}> {
  const startDateTime = `${startDate}T00:00:00Z`;
  const endDateTime = `${endDate}T23:59:59Z`;

  const { data, error } = await trafficAdminSupabase
    .from('traffic_leads')
    .select('funnel_type')
    .gte('created_at', startDateTime)
    .lte('created_at', endDateTime);

  if (error) {
    console.error(`[Aggregation] Error fetching leads for user ${userId}:`, error.message);
    return { total_leads: 0, challenge3d_leads: 0, intensive1d_leads: 0, express_leads: 0 };
  }

  if (!data || data.length === 0) {
    return { total_leads: 0, challenge3d_leads: 0, intensive1d_leads: 0, express_leads: 0 };
  }

  const byFunnel = data.reduce(
    (acc, lead) => {
      acc.total_leads++;
      if (lead.funnel_type === 'challenge3d') acc.challenge3d_leads++;
      else if (lead.funnel_type === 'intensive1d') acc.intensive1d_leads++;
      else if (lead.funnel_type === 'express') acc.express_leads++;
      return acc;
    },
    { total_leads: 0, challenge3d_leads: 0, intensive1d_leads: 0, express_leads: 0 }
  );

  return byFunnel;
}

/**
 * Aggregate Challenge3D sales for a user and period
 */
async function aggregateChallenge3DSales(
  startDate: string,
  endDate: string
): Promise<{
  prepayments: number;
  prepayment_revenue: number;
  full_purchases: number;
  full_revenue: number;
}> {
  const startDateTime = `${startDate}T00:00:00Z`;
  const endDateTime = `${endDate}T23:59:59Z`;

  const { data, error } = await trafficAdminSupabase
    .from('challenge3d_sales')
    .select('sale_amount, sale_type')
    .gte('sale_date', startDateTime)
    .lte('sale_date', endDateTime);

  if (error) {
    console.error('[Aggregation] Error fetching Challenge3D sales:', error.message);
    return { prepayments: 0, prepayment_revenue: 0, full_purchases: 0, full_revenue: 0 };
  }

  if (!data || data.length === 0) {
    return { prepayments: 0, prepayment_revenue: 0, full_purchases: 0, full_revenue: 0 };
  }

  const totals = data.reduce(
    (acc, sale) => {
      if (sale.sale_type === 'Prepayment') {
        acc.prepayments++;
        acc.prepayment_revenue += parseFloat(sale.sale_amount || '0');
      } else if (sale.sale_type === 'Full Payment') {
        acc.full_purchases++;
        acc.full_revenue += parseFloat(sale.sale_amount || '0');
      }
      return acc;
    },
    { prepayments: 0, prepayment_revenue: 0, full_purchases: 0, full_revenue: 0 }
  );

  return totals;
}

/**
 * Aggregate Express Course sales for a period
 */
async function aggregateExpressSales(
  startDate: string,
  endDate: string
): Promise<{ sales: number; revenue: number }> {
  const startDateTime = `${startDate}T00:00:00Z`;
  const endDateTime = `${endDate}T23:59:59Z`;

  const { data, error } = await trafficAdminSupabase
    .from('express_course_sales')
    .select('sale_amount')
    .gte('sale_date', startDateTime)
    .lte('sale_date', endDateTime);

  if (error) {
    console.error('[Aggregation] Error fetching Express sales:', error.message);
    return { sales: 0, revenue: 0 };
  }

  if (!data || data.length === 0) {
    return { sales: 0, revenue: 0 };
  }

  const revenue = data.reduce((sum, sale) => sum + parseFloat(sale.sale_amount || '0'), 0);

  return { sales: data.length, revenue };
}

/**
 * Aggregate Intensive1D sales for a period
 */
async function aggregateIntensive1DSales(
  startDate: string,
  endDate: string
): Promise<{ sales: number; revenue: number }> {
  const startDateTime = `${startDate}T00:00:00Z`;
  const endDateTime = `${endDate}T23:59:59Z`;

  const { data, error } = await trafficAdminSupabase
    .from('intensive1d_sales')
    .select('sale_amount, sale_type')
    .gte('sale_date', startDateTime)
    .lte('sale_date', endDateTime);

  if (error) {
    console.error('[Aggregation] Error fetching Intensive1D sales:', error.message);
    return { sales: 0, revenue: 0 };
  }

  if (!data || data.length === 0) {
    return { sales: 0, revenue: 0 };
  }

  const revenue = data.reduce((sum, sale) => sum + parseFloat(sale.sale_amount || '0'), 0);

  return { sales: data.length, revenue };
}

/**
 * Aggregate metrics for a single user and period
 */
async function aggregateUserPeriod(
  userId: string,
  teamName: string,
  period: AggregationPeriod
): Promise<void> {
  try {
    console.log(`[Aggregation] Processing ${teamName} (${period.period})...`);

    // 1. Facebook Ads spend
    const fbSpend = await aggregateFacebookSpend(userId, period.startDate, period.endDate);

    // 2. Lead counts
    const leads = await aggregateLeads(userId, teamName, period.startDate, period.endDate);

    // 3. Challenge3D sales
    const challenge3d = await aggregateChallenge3DSales(period.startDate, period.endDate);

    // 4. Express sales
    const express = await aggregateExpressSales(period.startDate, period.endDate);

    // 5. Intensive1D sales
    const intensive1d = await aggregateIntensive1DSales(period.startDate, period.endDate);

    // 6. Calculate totals
    const totalRevenue =
      challenge3d.prepayment_revenue +
      challenge3d.full_revenue +
      express.revenue +
      intensive1d.revenue;

    const totalSales =
      challenge3d.prepayments +
      challenge3d.full_purchases +
      express.sales +
      intensive1d.sales;

    const roas = fbSpend.spend_usd > 0 ? totalRevenue / fbSpend.spend_kzt : 0;
    const cpaUsd = totalSales > 0 ? fbSpend.spend_usd / totalSales : 0;

    // 7. Upsert to traffic_aggregated_metrics
    const { error: upsertError } = await trafficAdminSupabase
      .from('traffic_aggregated_metrics')
      .upsert(
        {
          user_id: userId,
          team_name: teamName,
          period: period.period,
          period_start: period.startDate,
          period_end: period.endDate,

          // Facebook Ads
          impressions: fbSpend.impressions,
          clicks: fbSpend.clicks,
          reach: fbSpend.reach,
          spend_usd: fbSpend.spend_usd,
          spend_kzt: fbSpend.spend_kzt,

          // Leads
          leads: leads.total_leads,
          challenge3d_leads: leads.challenge3d_leads,
          intensive1d_leads: leads.intensive1d_leads,
          express_leads: leads.express_leads,

          // Challenge3D sales
          challenge3d_prepayments: challenge3d.prepayments,
          challenge3d_prepayment_revenue: challenge3d.prepayment_revenue,
          challenge3d_full_purchases: challenge3d.full_purchases,
          challenge3d_full_revenue: challenge3d.full_revenue,

          // Express sales
          express_sales: express.sales,
          express_revenue: express.revenue,

          // Intensive1D sales
          intensive1d_sales: intensive1d.sales,
          intensive1d_revenue: intensive1d.revenue,

          // Totals
          total_revenue: totalRevenue,
          total_sales: totalSales,
          roas,
          cpa_usd: cpaUsd,

          // Exchange rate
          usd_to_kzt_rate: fbSpend.spend_kzt / (fbSpend.spend_usd || 1),

          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,period,period_start,period_end'
        }
      );

    if (upsertError) {
      console.error(`[Aggregation] Error upserting for ${teamName}:`, upsertError.message);
    } else {
      console.log(`[Aggregation] ✅ ${teamName} (${period.period}) - Revenue: ${totalRevenue.toLocaleString()} ₸, ROAS: ${roas.toFixed(2)}x`);
    }
  } catch (error: any) {
    console.error(`[Aggregation] Exception for ${teamName}:`, error.message);
  }
}

/**
 * Main aggregation function - process all users and periods
 */
export async function aggregateAllMetrics(): Promise<void> {
  console.log('[Aggregation] 🔄 Starting metrics aggregation...');

  const startTime = Date.now();

  // Log to sync history
  const { data: syncRecord } = await trafficAdminSupabase
    .from('traffic_sync_history')
    .insert({
      sync_type: 'full',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  const syncId = syncRecord?.id;

  try {
    // 1. Get all users
    const { data: users, error: usersError } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, team_name');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('[Aggregation] ⚠️  No users found');
      return;
    }

    console.log(`[Aggregation] 📥 Found ${users.length} users`);

    // 2. Get period date ranges
    const periods = getPeriodDateRanges();

    // 3. Aggregate for each user and period
    let metricsUpdated = 0;

    for (const user of users) {
      for (const period of periods) {
        await aggregateUserPeriod(user.id, user.team_name, period);
        metricsUpdated++;
      }
    }

    // 4. Update sync history
    const duration = Date.now() - startTime;

    if (syncId) {
      await trafficAdminSupabase
        .from('traffic_sync_history')
        .update({
          completed_at: new Date().toISOString(),
          success: true,
          users_processed: users.length,
          metrics_updated: metricsUpdated,
          duration_ms: duration
        })
        .eq('id', syncId);
    }

    console.log(`[Aggregation] ✅ Complete: ${metricsUpdated} metrics updated in ${duration}ms`);
  } catch (error: any) {
    console.error('[Aggregation] ❌ Fatal error:', error.message);

    // Update sync history with error
    if (syncId) {
      await trafficAdminSupabase
        .from('traffic_sync_history')
        .update({
          completed_at: new Date().toISOString(),
          success: false,
          error_message: error.message,
          duration_ms: Date.now() - startTime
        })
        .eq('id', syncId);
    }

    throw error;
  }
}

/**
 * Aggregate metrics for a specific user (on-demand)
 */
export async function aggregateUserMetrics(userId: string): Promise<void> {
  console.log(`[Aggregation] 🔄 Aggregating metrics for user ${userId}...`);

  // Get user info
  const { data: user, error: userError } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, team_name')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Get period date ranges
  const periods = getPeriodDateRanges();

  // Aggregate for each period
  for (const period of periods) {
    await aggregateUserPeriod(user.id, user.team_name, period);
  }

  console.log(`[Aggregation] ✅ User ${user.team_name} aggregation complete`);
}
