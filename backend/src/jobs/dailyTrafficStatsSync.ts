/**
 * Daily Traffic Stats Sync (Landing DB)
 * Runs after exchange rate fetch to snapshot selected campaigns per user.
 */

import cron from 'node-cron';
import { syncAllTargetologists } from '../services/trafficStatsSyncService.js';

export function startDailyTrafficStatsSync() {
  cron.schedule('15 2 * * *', async () => {
    try {
      console.log('[08:15 Almaty] Running daily traffic stats sync...');
      await syncAllTargetologists({
        daysBack: 2,
        includeToday: false,
        reason: 'daily_snapshot',
      });
      console.log('✅ Daily traffic stats sync complete');
    } catch (error: any) {
      console.error('❌ Daily traffic stats sync failed:', error.message);
    }
  }, {
    timezone: 'Asia/Almaty'
  });

  console.log('✅ Daily traffic stats sync scheduled (08:15 Almaty / 02:15 UTC)');
}
