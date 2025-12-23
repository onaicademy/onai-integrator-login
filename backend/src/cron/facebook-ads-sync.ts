/**
 * ════════════════════════════════════════════════════════════════════════
 * 📊 FACEBOOK ADS SYNC TO LANDING DB
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Синхронизация данных Facebook Ads из Traffic DB в Landing DB
 * Запускается каждый час для обновления воронки
 */

import { CronJob } from 'cron';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { landingSupabase } from '../config/supabase-landing.js';

/**
 * Синхронизация Facebook Ads статистики
 */
export async function syncFacebookAdsToLanding(): Promise<void> {
  console.log('[FB Sync] 🔄 Starting Facebook Ads sync to Landing DB...');
  
  try {
    // 1. Получить данные из Traffic DB за последние 30 дней
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: trafficStats, error: fetchError } = await trafficAdminSupabase
      .from('traffic_stats')
      .select('*')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });
    
    if (fetchError) {
      console.error('[FB Sync] ❌ Error fetching from Traffic DB:', fetchError.message);
      return;
    }
    
    if (!trafficStats || trafficStats.length === 0) {
      console.log('[FB Sync] ℹ️  No data in Traffic DB (this is OK if Facebook sync not configured yet)');
      return;
    }
    
    console.log(`[FB Sync] 📥 Found ${trafficStats.length} records in Traffic DB`);
    
    // 2. Upsert в Landing DB
    let syncedCount = 0;
    let errors = 0;
    
    for (const stat of trafficStats) {
      try {
        const { error: upsertError } = await landingSupabase
          .from('traffic_stats')
          .upsert({
            team: stat.team,
            date: stat.date,
            impressions: stat.impressions || 0,
            clicks: stat.clicks || 0,
            spend_usd: stat.spend_usd || 0,
            ctr: stat.ctr || 0,
            cpc: stat.cpc || 0,
            registrations: stat.registrations || 0,
            express_sales: stat.express_sales || 0,
            main_sales: stat.main_sales || 0,
            revenue_express_usd: stat.revenue_express_usd || 0,
            revenue_main_usd: stat.revenue_main_usd || 0,
            revenue_total_usd: stat.revenue_total_usd || 0,
            profit_usd: stat.profit_usd || 0,
            roi_percent: stat.roi_percent || 0,
            usd_to_kzt_rate: stat.usd_to_kzt_rate || 475,
            spend_kzt: stat.spend_kzt || (stat.spend_usd || 0) * 475,
            revenue_kzt: stat.revenue_kzt || 0,
            profit_kzt: stat.profit_kzt || 0,
            campaign_ids: stat.campaign_ids || [],
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'team,date',
            ignoreDuplicates: false 
          });
        
        if (upsertError) {
          console.error(`[FB Sync] ❌ Error upserting ${stat.team} ${stat.date}:`, upsertError.message);
          errors++;
        } else {
          syncedCount++;
        }
      } catch (error: any) {
        console.error(`[FB Sync] ❌ Exception upserting record:`, error.message);
        errors++;
      }
    }
    
    console.log(`[FB Sync] ✅ Sync complete: ${syncedCount} synced, ${errors} errors`);
    
  } catch (error: any) {
    console.error('[FB Sync] ❌ Fatal error:', error.message);
  }
}

/**
 * Cron job - запускается каждый час
 */
export const facebookAdsSyncJob = new CronJob(
  '0 * * * *', // Every hour at :00
  async () => {
    console.log('[FB Sync] 🕒 Cron triggered');
    await syncFacebookAdsToLanding();
  },
  null, // onComplete
  false, // start (будем запускать вручную)
  'Europe/Moscow' // timezone
);

console.log('✅ [FB Sync] Cron job module loaded');
