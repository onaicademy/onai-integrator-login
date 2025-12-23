/**
 * ════════════════════════════════════════════════════════════════════════
 * 📊 FACEBOOK ADS DATA LOADER
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Загружает данные из Facebook Marketing API для каждого таргетолога
 * Использует настройки из traffic_targetologist_settings
 * Сохраняет результаты в traffic_stats (Traffic DB)
 * 
 * Запускается каждые 6 часов
 */

import { CronJob } from 'cron';
import axios from 'axios';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const FB_API_VERSION = 'v21.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Permanent Token из .env
const FACEBOOK_ACCESS_TOKEN = process.env.FACEBOOK_PERMANENT_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN || '';

if (!FACEBOOK_ACCESS_TOKEN) {
  console.warn('⚠️ [FB Loader] WARNING: No Facebook access token found in environment!');
}

interface TargetologistSettings {
  user_id: string;
  fb_ad_accounts: Array<{
    id: string;
    name: string;
    enabled?: boolean;
  }>;
  tracked_campaigns: Array<{
    id: string;
    name: string;
    ad_account_id: string;
    enabled?: boolean;
  }>;
  utm_sources: Record<string, string>;
}

interface FacebookInsights {
  spend: string;
  impressions: string;
  clicks: string;
  date_start: string;
  date_stop: string;
}

/**
 * Получить настройки всех таргетологов
 */
async function getTargetologistsSettings(): Promise<TargetologistSettings[]> {
  const { data, error } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select(`
      user_id,
      fb_ad_accounts,
      tracked_campaigns,
      utm_sources
    `);
  
  if (error) {
    console.error('[FB Loader] ❌ Error fetching settings:', error.message);
    return [];
  }
  
  return (data || []).filter(s => 
    s.fb_ad_accounts && 
    s.fb_ad_accounts.length > 0
  );
}

/**
 * Получить имя таргетолога по user_id
 */
async function getTargetologistName(userId: string): Promise<string> {
  const { data } = await trafficAdminSupabase
    .from('traffic_users')
    .select('username')
    .eq('id', userId)
    .single();
  
  return data?.username || userId.slice(0, 8);
}

/**
 * Получить UTM source для таргетолога
 */
function getUTMSource(settings: TargetologistSettings): string {
  return settings.utm_sources?.facebook || 'facebook';
}

/**
 * Загрузить insights для кампании
 */
async function getCampaignInsights(
  campaignId: string,
  dateStart: string,
  dateStop: string
): Promise<FacebookInsights | null> {
  try {
    const url = `${FB_API_BASE}/${campaignId}/insights`;
    const response = await axios.get(url, {
      params: {
        access_token: FACEBOOK_ACCESS_TOKEN,
        fields: 'spend,impressions,clicks',
        time_range: JSON.stringify({
          since: dateStart,
          until: dateStop
        }),
        level: 'campaign'
      },
      timeout: 30000
    });
    
    if (response.data?.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    return null;
  } catch (error: any) {
    console.error(`[FB Loader] ❌ Error fetching insights for campaign ${campaignId}:`, error.message);
    return null;
  }
}

/**
 * Загрузить данные для одного таргетолога
 */
async function loadDataForTargetologist(
  settings: TargetologistSettings,
  dateStart: string,
  dateStop: string
): Promise<void> {
  const targetologistName = await getTargetologistName(settings.user_id);
  const utmSource = getUTMSource(settings);
  
  console.log(`[FB Loader] 📥 Loading data for ${targetologistName} (${utmSource})`);
  
  // Фильтруем только enabled campaigns
  const enabledCampaigns = settings.tracked_campaigns.filter(c => c.enabled !== false);
  
  if (enabledCampaigns.length === 0) {
    console.log(`[FB Loader] ⚠️  No enabled campaigns for ${targetologistName}`);
    return;
  }
  
  console.log(`[FB Loader] 📊 Loading ${enabledCampaigns.length} campaigns...`);
  
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  const campaignIds: string[] = [];
  
  // Загружаем данные для каждой кампании
  for (const campaign of enabledCampaigns) {
    console.log(`[FB Loader]   - Campaign: ${campaign.name} (${campaign.id})`);
    
    const insights = await getCampaignInsights(campaign.id, dateStart, dateStop);
    
    if (insights) {
      totalSpend += parseFloat(insights.spend || '0');
      totalImpressions += parseInt(insights.impressions || '0');
      totalClicks += parseInt(insights.clicks || '0');
      campaignIds.push(campaign.id);
      
      console.log(`[FB Loader]     ✅ Spend: $${insights.spend}, Impressions: ${insights.impressions}, Clicks: ${insights.clicks}`);
    } else {
      console.log(`[FB Loader]     ⚠️  No data available`);
    }
    
    // Rate limiting: 1 request per second
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Вычисляем метрики
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const usdToKztRate = 475; // Можно подтянуть из exchange_rates таблицы
  
  // Сохраняем в traffic_stats
  const statsData = {
    team: utmSource,
    date: dateStop, // используем последний день периода
    impressions: totalImpressions,
    clicks: totalClicks,
    spend_usd: totalSpend,
    spend_kzt: totalSpend * usdToKztRate,
    ctr: parseFloat(ctr.toFixed(4)),
    cpc: parseFloat(cpc.toFixed(4)),
    campaign_ids: campaignIds,
    usd_to_kzt_rate: usdToKztRate,
    // Продажи будут обновлены отдельно через вебхуки
    registrations: 0,
    express_sales: 0,
    main_sales: 0,
    revenue_express_usd: 0,
    revenue_main_usd: 0,
    revenue_total_usd: 0,
    revenue_kzt: 0,
    profit_usd: 0,
    profit_kzt: 0,
    roi_percent: 0,
    updated_at: new Date().toISOString()
  };
  
  const { error } = await trafficAdminSupabase
    .from('traffic_stats')
    .upsert(statsData, { 
      onConflict: 'team,date',
      ignoreDuplicates: false 
    });
  
  if (error) {
    console.error(`[FB Loader] ❌ Error saving stats for ${targetologistName}:`, error.message);
  } else {
    console.log(`[FB Loader] ✅ Saved stats for ${targetologistName}: $${totalSpend.toFixed(2)}, ${totalImpressions} impressions, ${totalClicks} clicks`);
  }
}

/**
 * Главная функция загрузки
 */
export async function loadFacebookAdsData(dateRange?: { start: string; end: string }): Promise<void> {
  console.log('[FB Loader] 🚀 Starting Facebook Ads data load...');
  
  if (!FACEBOOK_ACCESS_TOKEN) {
    console.error('[FB Loader] ❌ No Facebook access token configured!');
    console.error('[FB Loader] ℹ️  Set FACEBOOK_PERMANENT_TOKEN or FACEBOOK_ACCESS_TOKEN in .env');
    return;
  }
  
  try {
    // Определяем диапазон дат (по умолчанию: вчера)
    let dateStart: string;
    let dateStop: string;
    
    if (dateRange) {
      dateStart = dateRange.start;
      dateStop = dateRange.end;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      dateStart = yesterday.toISOString().split('T')[0];
      dateStop = dateStart;
    }
    
    console.log(`[FB Loader] 📅 Date range: ${dateStart} to ${dateStop}`);
    
    // 1. Получить настройки всех таргетологов
    const allSettings = await getTargetologistsSettings();
    
    if (allSettings.length === 0) {
      console.log('[FB Loader] ⚠️  No targetologists with configured Facebook Ads found');
      console.log('[FB Loader] ℹ️  Configure settings at /traffic/settings');
      return;
    }
    
    console.log(`[FB Loader] 👥 Found ${allSettings.length} targetologists with Facebook Ads configured`);
    
    // 2. Загрузить данные для каждого таргетолога
    for (const settings of allSettings) {
      await loadDataForTargetologist(settings, dateStart, dateStop);
      
      // Rate limiting между таргетологами: 2 секунды
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('[FB Loader] ✅ Facebook Ads data load complete!');
    
  } catch (error: any) {
    console.error('[FB Loader] ❌ Fatal error:', error.message);
    console.error('[FB Loader] Stack:', error.stack);
  }
}

/**
 * Cron job - запускается каждые 6 часов
 */
export const facebookAdsLoaderJob = new CronJob(
  '0 */6 * * *', // Every 6 hours at :00
  async () => {
    console.log('[FB Loader] 🕒 Cron triggered');
    await loadFacebookAdsData();
  },
  null, // onComplete
  false, // start (будем запускать вручную)
  'Europe/Moscow' // timezone
);

/**
 * API endpoint для ручного запуска с custom date range
 */
export async function loadFacebookAdsForDateRange(startDate: string, endDate: string): Promise<void> {
  console.log(`[FB Loader] 🎯 Manual load triggered: ${startDate} to ${endDate}`);
  await loadFacebookAdsData({
    start: startDate,
    end: endDate
  });
}

console.log('✅ [FB Loader] Module loaded');
