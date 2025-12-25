/**
 * Facebook Ads API Service Layer
 * 
 * Provides:
 * - fetchAllAdAccounts() - Get ALL ad accounts from Business Manager
 * - fetchCampaignsForAccount() - Get campaigns with insights for specific account
 * - clearFacebookCache() - Clear all cached Facebook data
 * 
 * Features:
 * - Fetches from multiple endpoints (owned + client accounts)
 * - Merges and deduplicates results
 * - Redis caching with 5 min TTL
 * - Graceful error handling with cached fallback
 */

import axios from 'axios';
import { cacheGet, cacheSet, cacheClear } from '../config/redis.js';
import { detectTargetologist, type Targetologist, type DetectionMethod, type DetectionConfidence } from './targetologist-detector.js';

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Cache TTL: 5 minutes
const CACHE_TTL = 300;
const CAMPAIGNS_CACHE_TTL = 300;
const CAMPAIGNS_LITE_TTL = 900;

interface FacebookAdAccount {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  amount_spent?: string;
  business_manager_id?: string;
  business_manager_name?: string;
}

interface FacebookCampaign {
  id: string;
  name: string;
  ad_account_id: string;
  status?: string;
  objective?: string;
  effective_status?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  conversions?: number;
  ctr?: string;
  cpc?: string;
  // 🔥 NEW: Targetologist detection
  targetologist?: Targetologist;
  detectionMethod?: DetectionMethod;
  detectionConfidence?: DetectionConfidence;
}

type CampaignInsights = {
  campaign_id?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  actions?: Array<{
    action_type?: string;
    value?: string;
  }>;
};

/**
 * Fetch ALL ad accounts from Facebook Business Manager
 * 
 * Fetches from multiple endpoints:
 * 1. /{BUSINESS_ID}/owned_ad_accounts
 * 2. /{BUSINESS_ID}/client_ad_accounts
 * 
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns Object with accounts array, count, and cached flag
 */
export async function fetchAllAdAccounts(forceRefresh = false): Promise<{
  success: boolean;
  accounts: FacebookAdAccount[];
  count: number;
  cached: boolean;
  error?: string;
}> {
  const cacheKey = 'fb:accounts:all';

  try {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await cacheGet<{
        accounts: FacebookAdAccount[];
        count: number;
      }>(cacheKey);

      if (cachedData) {
        console.log('✅ [Facebook Service] Returning cached ad accounts');
        return {
          success: true,
          accounts: cachedData.accounts,
          count: cachedData.count,
          cached: true
        };
      }
    }

    console.log('📡 [Facebook Service] Fetching ad accounts from Facebook API...');

    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      throw new Error('Facebook access token not configured');
    }

    // 🔥 Business Managers (без Дискурс Реклама - removed per user request)
    const ALL_BUSINESS_MANAGERS = [
      { id: '109908023605532', name: 'Residence Astana' },
      { id: '627807087089319', name: 'ONAI Academy, TOO' },
      { id: '219720327894125', name: 'Nakama group' },
      { id: '1425104648731040', name: 'TOO Academy' },
      { id: '1174363964568351', name: 'White Kimberly Flores' },
      { id: '1166877195542037', name: 'labonte__1uwx25' },
      { id: '1142153484339267', name: 'Onai academy' }
    ];

    console.log(`📊 [Facebook Service] Fetching from ${ALL_BUSINESS_MANAGERS.length} Business Managers...`);

    // Fetch from ALL Business Managers in parallel
    const bmResults = await Promise.all(
      ALL_BUSINESS_MANAGERS.map(async (bm) => {
        try {
          // Fetch owned accounts for this BM
          const ownedResponse = await axios.get(`${FB_API_BASE}/${bm.id}/owned_ad_accounts`, {
            params: {
              access_token: fbToken,
              fields: 'id,name,account_status,currency,timezone_name,amount_spent',
              limit: 100
            },
            timeout: 15000
          }).catch(() => ({ data: { data: [] } }));

          const ownedAccounts = (ownedResponse.data?.data || []).map((acc: any) => ({
            ...acc,
            business_manager_id: bm.id,
            business_manager_name: bm.name
          }));

          console.log(`  📂 ${bm.name}: ${ownedAccounts.length} accounts`);
          return ownedAccounts;
        } catch (err: any) {
          console.log(`  ⚠️ ${bm.name}: No access (${err.message})`);
          return [];
        }
      })
    );

    // Flatten all accounts
    const allAccounts: FacebookAdAccount[] = bmResults.flat();
    console.log(`📊 [Facebook Service] Total accounts before dedup: ${allAccounts.length}`);

    // Deduplicate by ID
    const uniqueAccounts = Array.from(
      new Map(allAccounts.map(acc => [acc.id, acc])).values()
    );

    console.log(`✅ [Facebook Service] Total unique accounts: ${uniqueAccounts.length}`);

    // Cache the result
    await cacheSet(cacheKey, {
      accounts: uniqueAccounts,
      count: uniqueAccounts.length
    }, CACHE_TTL);

    return {
      success: true,
      accounts: uniqueAccounts,
      count: uniqueAccounts.length,
      cached: false
    };

  } catch (error: any) {
    console.error('❌ [Facebook Service] Error fetching ad accounts:', error.message);

    // Try to return cached data as fallback
    const cachedData = await cacheGet<{
      accounts: FacebookAdAccount[];
      count: number;
    }>(cacheKey);

    if (cachedData) {
      console.log('⚠️ [Facebook Service] Returning stale cached data due to error');
      return {
        success: true,
        accounts: cachedData.accounts,
        count: cachedData.count,
        cached: true
      };
    }

    return {
      success: false,
      accounts: [],
      count: 0,
      cached: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Fetch campaigns with insights for a specific ad account
 * 
 * @param accountId Facebook ad account ID (e.g., "act_123456")
 * @param forceRefresh Skip cache and fetch fresh data
 * @returns Object with campaigns array, count, and cached flag
 */
export async function fetchCampaignsForAccount(
  accountId: string,
  forceRefresh = false,
  lite = false
): Promise<{
  success: boolean;
  campaigns: FacebookCampaign[];
  count: number;
  cached: boolean;
  error?: string;
}> {
  const cacheKey = `fb:campaigns:${accountId}:${lite ? 'lite' : 'full'}`;

  try {
    // Validate account ID format
    if (!accountId || !accountId.startsWith('act_')) {
      throw new Error('Invalid account ID format (must start with "act_")');
    }

    const cachedData = !forceRefresh
      ? await cacheGet<{
          campaigns: FacebookCampaign[];
          count: number;
        }>(cacheKey)
      : null;

    if (cachedData) {
      console.log(`✅ [Facebook Service] Returning cached campaigns for ${accountId}`);
      return {
        success: true,
        campaigns: cachedData.campaigns,
        count: cachedData.count,
        cached: true
      };
    }

    console.log(`📡 [Facebook Service] Fetching campaigns for ${accountId}${lite ? ' (lite)' : ''}...`);

    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      throw new Error('Facebook access token not configured');
    }

    const metaKey = `fb:campaigns:meta:${accountId}:${lite ? 'lite' : 'full'}`;
    const cachedMeta = await cacheGet<{ etag?: string; lastModified?: string }>(metaKey);
    const headers: Record<string, string> = {};
    if (cachedMeta?.etag) headers['If-None-Match'] = cachedMeta.etag;
    if (cachedMeta?.lastModified) headers['If-Modified-Since'] = cachedMeta.lastModified;

    // Step 1: Fetch basic campaign data (conditional request if meta exists)
    const campaignsResponse = await axios.get(`${FB_API_BASE}/${accountId}/campaigns`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,status,objective,effective_status',
        limit: 500
      },
      headers,
      timeout: 15000,
      validateStatus: (status) => status === 200 || status === 304,
    });

    if (campaignsResponse.status === 304) {
      if (cachedData) {
        console.log(`✅ [Facebook Service] Campaigns not modified for ${accountId}, using cache`);
        return {
          success: true,
          campaigns: cachedData.campaigns,
          count: cachedData.count,
          cached: true
        };
      }
      console.log(`⚠️ [Facebook Service] 304 without cache for ${accountId}, retrying full fetch`);
      return fetchCampaignsForAccount(accountId, true, lite);
    }

    const campaigns = campaignsResponse.data?.data || [];
    const etag = campaignsResponse.headers?.etag;
    const lastModified = campaignsResponse.headers?.['last-modified'];
    if (etag || lastModified) {
      await cacheSet(metaKey, { etag, lastModified }, CACHE_TTL);
    }
    console.log(`📊 [Facebook Service] Found ${campaigns.length} campaigns`);

    if (lite) {
      const liteCampaigns: FacebookCampaign[] = campaigns.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.effective_status || campaign.status,
        objective: campaign.objective,
        effective_status: campaign.effective_status,
        ad_account_id: accountId
      }));

      await cacheSet(cacheKey, {
        campaigns: liteCampaigns,
        count: liteCampaigns.length
      }, CAMPAIGNS_LITE_TTL);

      return {
        success: true,
        campaigns: liteCampaigns,
        count: liteCampaigns.length,
        cached: false
      };
    }

    // Step 2: Fetch insights at account level (avoid N+1 requests)
    const insightsResponse = await axios.get(`${FB_API_BASE}/${accountId}/insights`, {
      params: {
        access_token: fbToken,
        fields: 'campaign_id,spend,impressions,clicks,reach,actions',
        date_preset: 'last_30d',
        level: 'campaign',
        limit: 500
      },
      timeout: 15000
    });

    const insightsRows = insightsResponse.data.data || [];
    const insightsMap = new Map<string, CampaignInsights>(
      insightsRows.map((row: any) => [row.campaign_id, row as CampaignInsights])
    );

    const campaignsWithInsights: FacebookCampaign[] = [];
    
    for (const campaign of campaigns) {
      try {
        const insights = insightsMap.get(campaign.id) || ({} as CampaignInsights);
        
        // Calculate conversions from actions
        let conversions = 0;
        if (insights.actions) {
          for (const action of insights.actions) {
            if (action.action_type === 'lead' || action.action_type === 'complete_registration') {
              conversions += parseInt(action.value || '0');
            }
          }
        }

        // Calculate CTR and CPC
        const spend = parseFloat(insights.spend || '0');
        const clicks = parseInt(insights.clicks || '0');
        const impressions = parseInt(insights.impressions || '0');
        
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        const cpc = clicks > 0 ? (spend / clicks).toFixed(2) : '0.00';

        // 🔥 Detect targetologist for this campaign
        const detection = await detectTargetologist(
          campaign.id,
          campaign.name,
          accountId,
          undefined // UTM params not available from Facebook API directly
        );

        campaignsWithInsights.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.effective_status || campaign.status,
          objective: campaign.objective,
          effective_status: campaign.effective_status,
          ad_account_id: accountId,
          spend: insights.spend || '0',
          impressions: insights.impressions || '0',
          clicks: insights.clicks || '0',
          reach: insights.reach || '0',
          conversions,
          ctr,
          cpc,
          // 🔥 Add targetologist detection results
          targetologist: detection.targetologist,
          detectionMethod: detection.method,
          detectionConfidence: detection.confidence
        });

      } catch (insightsError: any) {
        console.warn(`⚠️ [Facebook Service] Failed to process campaign ${campaign.id}:`, insightsError.message);

        // 🔥 Detect targetologist even for campaigns without insights
        const detection = await detectTargetologist(
          campaign.id,
          campaign.name,
          accountId,
          undefined
        );

        // Include campaign without insights
        campaignsWithInsights.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.effective_status || campaign.status,
          objective: campaign.objective,
          effective_status: campaign.effective_status,
          ad_account_id: accountId,
          spend: '0',
          impressions: '0',
          clicks: '0',
          reach: '0',
          conversions: 0,
          ctr: '0.00',
          cpc: '0.00',
          // 🔥 Add targetologist detection results
          targetologist: detection.targetologist,
          detectionMethod: detection.method,
          detectionConfidence: detection.confidence
        });
      }
    }

    console.log(`✅ [Facebook Service] Processed ${campaignsWithInsights.length} campaigns with insights`);

    // Cache the result
    await cacheSet(cacheKey, {
      campaigns: campaignsWithInsights,
      count: campaignsWithInsights.length
    }, CAMPAIGNS_CACHE_TTL);

    return {
      success: true,
      campaigns: campaignsWithInsights,
      count: campaignsWithInsights.length,
      cached: false
    };

  } catch (error: any) {
    console.error(`❌ [Facebook Service] Error fetching campaigns for ${accountId}:`, error.message);

    // Try to return cached data as fallback
    const cachedData = await cacheGet<{
      campaigns: FacebookCampaign[];
      count: number;
    }>(cacheKey);

    if (cachedData) {
      console.log(`⚠️ [Facebook Service] Returning stale cached data for ${accountId}`);
      return {
        success: true,
        campaigns: cachedData.campaigns,
        count: cachedData.count,
        cached: true
      };
    }

    return {
      success: false,
      campaigns: [],
      count: 0,
      cached: false,
      error: error.response?.data?.error?.message || error.message
    };
  }
}

/**
 * Clear all Facebook-related cache entries
 * 
 * @returns Number of keys cleared
 */
export async function clearFacebookCache(): Promise<number> {
  console.log('🗑️ [Facebook Service] Clearing Facebook cache...');
  const deletedCount = await cacheClear('fb:*');
  console.log(`✅ [Facebook Service] Cleared ${deletedCount} cache entries`);
  return deletedCount;
}
