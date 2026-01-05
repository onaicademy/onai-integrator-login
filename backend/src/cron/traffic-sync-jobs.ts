/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 TRAFFIC SYNC CRON JOBS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Automated synchronization jobs:
 * 1. Facebook Ads Sync - Every hour
 * 2. Metrics Aggregation - Every 10 minutes
 */

import cron from 'node-cron';
import { syncAllFacebookAds } from '../services/facebookAdsSync.js';
import { aggregateAllMetrics } from '../services/trafficMetricsAggregation.js';

/**
 * Facebook Ads Sync Job
 * Schedule: Every hour at :05 (e.g., 1:05, 2:05, 3:05)
 * Purpose: Fetch latest Facebook Ads data
 */
export function startFacebookAdsSyncJob() {
  const job = cron.schedule(
    '5 * * * *', // Every hour at 5 minutes past
    async () => {
      console.log('[Cron] 🕒 Facebook Ads Sync triggered');
      try {
        await syncAllFacebookAds(7); // Sync last 7 days
        console.log('[Cron] ✅ Facebook Ads Sync complete');
      } catch (error: any) {
        console.error('[Cron] ❌ Facebook Ads Sync failed:', error.message);
      }
    },
    {
      scheduled: false, // Don't start automatically
      timezone: 'Asia/Almaty'
    }
  );

  return job;
}

/**
 * Metrics Aggregation Job
 * Schedule: Every 10 minutes
 * Purpose: Compute aggregated metrics from raw data
 */
export function startMetricsAggregationJob() {
  const job = cron.schedule(
    '*/10 * * * *', // Every 10 minutes
    async () => {
      console.log('[Cron] 🕒 Metrics Aggregation triggered');
      try {
        await aggregateAllMetrics();
        console.log('[Cron] ✅ Metrics Aggregation complete');
      } catch (error: any) {
        console.error('[Cron] ❌ Metrics Aggregation failed:', error.message);
      }
    },
    {
      scheduled: false, // Don't start automatically
      timezone: 'Asia/Almaty'
    }
  );

  return job;
}

/**
 * Start all traffic sync jobs
 */
export function startAllTrafficSyncJobs() {
  console.log('[Cron] 🚀 Starting Traffic Sync Jobs...');

  const fbSyncJob = startFacebookAdsSyncJob();
  const aggregationJob = startMetricsAggregationJob();

  // Start the jobs
  fbSyncJob.start();
  aggregationJob.start();

  console.log('[Cron] ✅ Facebook Ads Sync: Running (every hour at :05)');
  console.log('[Cron] ✅ Metrics Aggregation: Running (every 10 minutes)');

  return {
    fbSyncJob,
    aggregationJob
  };
}

/**
 * Manual trigger for testing
 */
export async function runManualSync() {
  console.log('[Manual] 🔄 Running manual sync...\n');

  console.log('[Manual] 1️⃣ Facebook Ads Sync...');
  try {
    await syncAllFacebookAds(30); // Sync last 30 days
    console.log('[Manual] ✅ Facebook Ads Sync complete\n');
  } catch (error: any) {
    console.error('[Manual] ❌ Facebook Ads Sync failed:', error.message, '\n');
  }

  console.log('[Manual] 2️⃣ Metrics Aggregation...');
  try {
    await aggregateAllMetrics();
    console.log('[Manual] ✅ Metrics Aggregation complete\n');
  } catch (error: any) {
    console.error('[Manual] ❌ Metrics Aggregation failed:', error.message, '\n');
  }

  console.log('[Manual] 🎉 Manual sync complete!');
}
