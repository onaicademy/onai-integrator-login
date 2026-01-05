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
    
    // ✅ FIXED: Read from traffic_facebook_ads_raw instead of non-existent traffic_stats
    const { data: trafficStats, error: fetchError } = await trafficAdminSupabase
      .from('traffic_facebook_ads_raw')
      .select('*')
      .gte('stat_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('stat_date', { ascending: false });
    
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

        // ✅ FIXED: Upsert to traffic_facebook_ads_raw with correct schema
        const { error: upsertError } = await trafficAdminSupabase
          .from('traffic_facebook_ads_raw')
          .upsert({
            user_id: userId,
            team_name: stat.team_name || stat.team,
            ad_account_id: stat.ad_account_id || null,
            campaign_id: stat.campaign_id || 'team_total',
            campaign_name: stat.campaign_name || 'team_total',
            adset_id: stat.adset_id || null,
            adset_name: stat.adset_name || null,
            ad_id: stat.ad_id || null,
            ad_name: stat.ad_name || null,
            stat_date: stat.stat_date,
            impressions: stat.impressions || 0,
            clicks: stat.clicks || 0,
            reach: stat.reach || 0,
            spend: stat.spend || 0,
            raw_data: stat.raw_data || {},
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'campaign_id,stat_date',
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
