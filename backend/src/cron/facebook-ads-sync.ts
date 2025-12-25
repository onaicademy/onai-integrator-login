/**
 * ════════════════════════════════════════════════════════════════════════
 * 📊 FACEBOOK ADS SYNC TO LANDING DB
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Синхронизация данных Facebook Ads из Traffic DB в Landing DB
 * Запускается каждый час для обновления воронки
 */

import cron from 'node-cron';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { landingSupabase } from '../config/supabase-landing.js';

async function buildTeamUserMap() {
  const { data } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, team_name, username');

  const map = new Map<string, string>();
  (data || []).forEach((row: any) => {
    if (row.team_name) {
      map.set(row.team_name.toLowerCase(), row.id);
    }
    if (row.username) {
      map.set(row.username.toLowerCase(), row.id);
    }
  });
  return map;
}

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
    
    const teamUserMap = await buildTeamUserMap();

    for (const stat of trafficStats) {
      try {
        const teamKey = (stat.team || '').toLowerCase();
        const userId = teamUserMap.get(teamKey);
        if (!userId) {
          continue;
        }

        const { error: upsertError } = await landingSupabase
          .from('traffic_stats')
          .upsert({
            stat_date: stat.date,
            user_id: userId,
            team: stat.team,
            ad_account_id: null,
            campaign_id: 'team_total',
            campaign_name: 'team_total',
            impressions: stat.impressions || 0,
            clicks: stat.clicks || 0,
            spend_usd: stat.spend_usd || 0,
            spend_kzt: stat.spend_kzt || (stat.spend_usd || 0) * 475,
            ctr: stat.ctr || 0,
            cpc_usd: stat.cpc || 0,
            usd_to_kzt_rate: stat.usd_to_kzt_rate || 475,
            updated_at: new Date().toISOString()
          }, { 
            onConflict: 'stat_date,user_id,campaign_id',
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
export function startFacebookAdsSyncJob() {
  // node-cron syntax: minute hour day month weekday  
  // '0 * * * *' = every hour at :00
  const job = cron.schedule('0 * * * *', async () => {
    console.log('[FB Sync] 🕒 Cron triggered');
    await syncFacebookAdsToLanding();
  }, {
    scheduled: false, // не запускать автоматически
    timezone: 'Europe/Moscow'
  });
  
  return job;
}

export const facebookAdsSyncJob = {
  start: () => {
    const job = startFacebookAdsSyncJob();
    job.start();
    console.log('✅ [FB Sync] Cron job started (hourly)');
  }
};

console.log('✅ [FB Sync] Cron job module loaded');
