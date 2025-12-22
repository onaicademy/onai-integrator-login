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

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Cache TTL: 5 minutes
const CACHE_TTL = 300;

interface FacebookAdAccount {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  amount_spent?: string;
}

interface FacebookCampaign {
  id: string;
  name: string;
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
}

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

    // 🔥 МНОЖЕСТВЕННЫЕ Business Managers
    const BUSINESS_IDS = [
      process.env.FACEBOOK_BUSINESS_ID || '627807087089319',
      '109908023605532' // Второй BM
    ];

    console.log(`📊 [Facebook Service] Fetching from ${BUSINESS_IDS.length} Business Managers...`);

    // Fetch from ALL Business Managers in parallel
    const allRequests = BUSINESS_IDS.flatMap(businessId => [
      // Owned accounts
      axios.get(`${FB_API_BASE}/${businessId}/owned_ad_accounts`, {
        params: {
          access_token: fbToken,
          fields: 'id,name,account_status,currency,timezone_name,amount_spent',
          limit: 500
        },
        timeout: 15000
      }).catch(err => ({ data: { data: [] } })),
      
      // Client accounts
      axios.get(`${FB_API_BASE}/${businessId}/client_ad_accounts`, {
        params: {
          access_token: fbToken,
          fields: 'id,name,account_status,currency,timezone_name,amount_spent',
          limit: 500
        },
        timeout: 15000
      }).catch(err => ({ data: { data: [] } }))
    ]);

    const results = await Promise.allSettled(allRequests);

    // Extract ALL successful results from all BMs
    const allAccounts: FacebookAdAccount[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const accounts = result.value.data?.data || [];
        allAccounts.push(...accounts);
        console.log(`📊 [Facebook Service] BM ${Math.floor(index / 2) + 1} (${index % 2 === 0 ? 'owned' : 'client'}): ${accounts.length} accounts`);
      }
    });

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
  forceRefresh = false
): Promise<{
  success: boolean;
  campaigns: FacebookCampaign[];
  count: number;
  cached: boolean;
  error?: string;
}> {
  const cacheKey = `fb:campaigns:${accountId}`;

  try {
    // Validate account ID format
    if (!accountId || !accountId.startsWith('act_')) {
      throw new Error('Invalid account ID format (must start with "act_")');
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = await cacheGet<{
        campaigns: FacebookCampaign[];
        count: number;
      }>(cacheKey);

      if (cachedData) {
        console.log(`✅ [Facebook Service] Returning cached campaigns for ${accountId}`);
        return {
          success: true,
          campaigns: cachedData.campaigns,
          count: cachedData.count,
          cached: true
        };
      }
    }

    console.log(`📡 [Facebook Service] Fetching campaigns for ${accountId}...`);

    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      throw new Error('Facebook access token not configured');
    }

    // Step 1: Fetch basic campaign data
    const campaignsResponse = await axios.get(`${FB_API_BASE}/${accountId}/campaigns`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,status,objective,effective_status',
        limit: 500
      },
      timeout: 15000
    });

    const campaigns = campaignsResponse.data.data || [];
    console.log(`📊 [Facebook Service] Found ${campaigns.length} campaigns`);

    // Step 2: Fetch insights for each campaign (in batches to avoid rate limits)
    const campaignsWithInsights: FacebookCampaign[] = [];
    
    for (const campaign of campaigns) {
      try {
        const insightsResponse = await axios.get(`${FB_API_BASE}/${campaign.id}/insights`, {
          params: {
            access_token: fbToken,
            fields: 'spend,impressions,clicks,reach,actions',
            date_preset: 'last_30d'
          },
          timeout: 10000
        });

        const insights = insightsResponse.data.data?.[0] || {};
        
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

        campaignsWithInsights.push({
          ...campaign,
          spend: insights.spend || '0',
          impressions: insights.impressions || '0',
          clicks: insights.clicks || '0',
          reach: insights.reach || '0',
          conversions,
          ctr,
          cpc
        });

      } catch (insightsError: any) {
        console.warn(`⚠️ [Facebook Service] Failed to fetch insights for campaign ${campaign.id}:`, insightsError.message);
        
        // Include campaign without insights
        campaignsWithInsights.push({
          ...campaign,
          spend: '0',
          impressions: '0',
          clicks: '0',
          reach: '0',
          conversions: 0,
          ctr: '0.00',
          cpc: '0.00'
        });
      }
    }

    console.log(`✅ [Facebook Service] Processed ${campaignsWithInsights.length} campaigns with insights`);

    // Cache the result
    await cacheSet(cacheKey, {
      campaigns: campaignsWithInsights,
      count: campaignsWithInsights.length
    }, CACHE_TTL);

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
