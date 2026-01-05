/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 FACEBOOK ADS SYNC SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Fetch Facebook Ads data and store in traffic_facebook_ads_raw
 *
 * Data Flow:
 * 1. Fetch user settings (tracked campaigns, FB token)
 * 2. For each campaign, fetch insights from Facebook Graph API
 * 3. Store raw data in traffic_facebook_ads_raw
 * 4. Trigger metrics aggregation
 *
 * Schedule: Run every hour via cron
 */

import axios from 'axios';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const FB_API_VERSION = 'v21.0';
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

interface FacebookCampaignInsight {
  campaign_id: string;
  campaign_name: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  reach?: string;
}

interface UserSettings {
  user_id: string;
  team_name: string;
  facebook_access_token: string;
  fb_ad_accounts: any[];
  tracked_campaigns: any[];
}

/**
 * Fetch Facebook Ads insights for a campaign
 */
async function fetchCampaignInsights(
  campaignId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<FacebookCampaignInsight[]> {
  try {
    const response = await axios.get(`${FB_BASE_URL}/${campaignId}/insights`, {
      params: {
        access_token: accessToken,
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,date_start,date_stop',
        level: 'ad',
        limit: 500
      },
      timeout: 30000
    });

    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.data?.error) {
      console.error(`[FB Sync] Campaign ${campaignId} error:`, error.response.data.error.message);
    } else {
      console.error(`[FB Sync] Campaign ${campaignId} exception:`, error.message);
    }
    return [];
  }
}

/**
 * Fetch Ad Account insights (for users without tracked campaigns)
 */
async function fetchAdAccountInsights(
  adAccountId: string,
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<FacebookCampaignInsight[]> {
  try {
    const response = await axios.get(`${FB_BASE_URL}/${adAccountId}/insights`, {
      params: {
        access_token: accessToken,
        time_range: JSON.stringify({ since: startDate, until: endDate }),
        fields: 'campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,reach,date_start,date_stop',
        level: 'ad',
        limit: 500
      },
      timeout: 30000
    });

    return response.data.data || [];
  } catch (error: any) {
    if (error.response?.data?.error) {
      console.error(`[FB Sync] Ad Account ${adAccountId} error:`, error.response.data.error.message);
    } else {
      console.error(`[FB Sync] Ad Account ${adAccountId} exception:`, error.message);
    }
    return [];
  }
}

/**
 * Store Facebook Ads data in traffic_facebook_ads_raw
 */
async function storeFacebookAdsData(
  userId: string,
  teamName: string,
  adAccountId: string,
  insights: FacebookCampaignInsight[]
): Promise<number> {
  let storedCount = 0;

  for (const insight of insights) {
    try {
      const { error } = await trafficAdminSupabase
        .from('traffic_facebook_ads_raw')
        .upsert(
          {
            user_id: userId,
            team_name: teamName,
            ad_account_id: adAccountId,
            campaign_id: insight.campaign_id,
            campaign_name: insight.campaign_name,
            adset_id: insight.adset_id || null,
            adset_name: insight.adset_name || null,
            ad_id: insight.ad_id || null,
            ad_name: insight.ad_name || null,
            stat_date: insight.date_start,
            impressions: parseInt(insight.impressions || '0', 10),
            clicks: parseInt(insight.clicks || '0', 10),
            reach: parseInt(insight.reach || '0', 10),
            spend: parseFloat(insight.spend || '0'),
            raw_data: insight,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'campaign_id,stat_date'
          }
        );

      if (error) {
        console.error(`[FB Sync] Error storing ${insight.campaign_id}:`, error.message);
      } else {
        storedCount++;
      }
    } catch (error: any) {
      console.error(`[FB Sync] Exception storing insight:`, error.message);
    }
  }

  return storedCount;
}

/**
 * Sync Facebook Ads data for a single user
 */
async function syncUserFacebookAds(
  user: UserSettings,
  startDate: string,
  endDate: string
): Promise<number> {
  console.log(`[FB Sync] Processing ${user.team_name}...`);

  let totalInsights = 0;

  // Get Facebook access token
  const fbToken = user.facebook_access_token || process.env.FACEBOOK_ADS_TOKEN;

  if (!fbToken) {
    console.warn(`[FB Sync] ${user.team_name} - No Facebook token configured`);
    return 0;
  }

  // Get ad accounts
  const adAccounts = user.fb_ad_accounts || [];

  if (adAccounts.length === 0) {
    console.warn(`[FB Sync] ${user.team_name} - No ad accounts configured`);
    return 0;
  }

  // Fetch insights for each campaign/ad account
  const trackedCampaigns = user.tracked_campaigns || [];

  for (const adAccount of adAccounts) {
    const adAccountId = adAccount.id || adAccount;

    let insights: FacebookCampaignInsight[] = [];

    if (trackedCampaigns.length > 0) {
      // Fetch specific campaigns
      for (const campaign of trackedCampaigns) {
        const campaignId = campaign.id || campaign;
        const campaignInsights = await fetchCampaignInsights(
          campaignId,
          fbToken,
          startDate,
          endDate
        );
        insights.push(...campaignInsights);
      }
    } else {
      // Fetch all campaigns from ad account
      const accountInsights = await fetchAdAccountInsights(
        adAccountId,
        fbToken,
        startDate,
        endDate
      );
      insights.push(...accountInsights);
    }

    // Store insights
    const storedCount = await storeFacebookAdsData(
      user.user_id,
      user.team_name,
      adAccountId,
      insights
    );

    totalInsights += storedCount;
  }

  console.log(`[FB Sync] ${user.team_name} - Stored ${totalInsights} insights`);

  return totalInsights;
}

/**
 * Main sync function - sync all users
 */
export async function syncAllFacebookAds(daysBack: number = 7): Promise<void> {
  console.log('[FB Sync] 🔄 Starting Facebook Ads sync...');

  const startTime = Date.now();

  // Calculate date range
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  console.log(`[FB Sync] Period: ${startDateStr} to ${endDateStr}`);

  // Log to sync history
  const { data: syncRecord } = await trafficAdminSupabase
    .from('traffic_sync_history')
    .insert({
      sync_type: 'facebook_ads',
      started_at: new Date().toISOString()
    })
    .select()
    .single();

  const syncId = syncRecord?.id;

  try {
    // 1. Get all users with settings
    const { data: users, error: usersError } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('user_id, team_name, facebook_access_token, fb_ad_accounts, tracked_campaigns');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('[FB Sync] ⚠️  No users with Facebook settings found');
      return;
    }

    console.log(`[FB Sync] 📥 Found ${users.length} users`);

    // 2. Sync each user
    let totalRecordsSynced = 0;
    let usersProcessed = 0;

    for (const user of users) {
      const recordsSync = await syncUserFacebookAds(
        user as any,
        startDateStr,
        endDateStr
      );
      totalRecordsSynced += recordsSync;
      if (recordsSync > 0) usersProcessed++;
    }

    // 3. Update sync history
    const duration = Date.now() - startTime;

    if (syncId) {
      await trafficAdminSupabase
        .from('traffic_sync_history')
        .update({
          completed_at: new Date().toISOString(),
          success: true,
          users_processed: usersProcessed,
          records_synced: totalRecordsSynced,
          duration_ms: duration
        })
        .eq('id', syncId);
    }

    console.log(`[FB Sync] ✅ Complete: ${totalRecordsSynced} records synced in ${duration}ms`);
  } catch (error: any) {
    console.error('[FB Sync] ❌ Fatal error:', error.message);

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
 * Sync Facebook Ads for a specific user (on-demand)
 */
export async function syncUserFacebookAdsOnDemand(
  userId: string,
  daysBack: number = 30
): Promise<void> {
  console.log(`[FB Sync] 🔄 Syncing Facebook Ads for user ${userId}...`);

  // Get user settings
  const { data: user, error: userError } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('user_id, team_name, facebook_access_token, fb_ad_accounts, tracked_campaigns')
    .eq('user_id', userId)
    .single();

  if (userError || !user) {
    throw new Error(`User settings not found: ${userId}`);
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysBack);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // Sync
  const recordsSynced = await syncUserFacebookAds(
    user as any,
    startDateStr,
    endDateStr
  );

  console.log(`[FB Sync] ✅ User ${user.team_name} sync complete: ${recordsSynced} records`);
}
