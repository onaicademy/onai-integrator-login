/**
 * Traffic Detailed Analytics API
 * 
 * Детальная аналитика по кампаниям, группам объявлений и объявлениям
 * Берет данные из наших кабинетов Facebook Ads напрямую
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

// Helper to get Supabase client (lazy initialization)
function getSupabaseClient() {
  return createClient(
    process.env.TRIPWIRE_SUPABASE_URL || '',
    process.env.TRIPWIRE_SERVICE_ROLE_KEY || ''
  );
}

/**
 * GET /api/traffic-detailed-analytics
 * Получить все кампании для команды из их FB кабинета
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { team, dateRange = '7d', status = 'all' } = req.query;
    
    if (!team) {
      return res.status(400).json({
        success: false,
        error: 'team parameter is required'
      });
    }
    
    // Получаем FB Ad Account ID из БД traffic_teams
    const supabase = getSupabaseClient();
    
    const { data: teamData, error: teamError } = await supabase
      .from('traffic_teams')
      .select('fb_ad_account_id')
      .eq('name', team)
      .single();
    
    if (teamError || !teamData || !teamData.fb_ad_account_id) {
      // Возвращаем пустой массив вместо ошибки
      return res.json({
        success: true,
        campaigns: []
      });
    }
    
    const adAccountId = teamData.fb_ad_account_id;
    
    // Получаем токен доступа
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        campaigns: []
      });
    }
    
    // Calculate date range
    const since = getDateRange(dateRange as string);
    
    // Fetch campaigns из кабинета команды (basic data only)
    const campaignsResponse = await axios.get(
      `${FB_API_BASE}/act_${adAccountId}/campaigns`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,objective',
          date_preset: dateRange === '14d' ? 'last_14d' : dateRange === '30d' ? 'last_30d' : dateRange === '90d' ? 'last_90d' : 'last_7d',
          limit: 100
        }
      }
    );
    
    const campaigns = (campaignsResponse.data.data || []).map((campaign: any) => {
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend: 0, // TODO: Get from insights
        impressions: 0,
        clicks: 0,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        conversions: 0,
        revenue: 0,
        roas: 0
      };
    });
    
    // Filter by status if needed
    const filteredCampaigns = status === 'all' 
      ? campaigns 
      : campaigns.filter((c: any) => c.status.toLowerCase() === status);
    
    res.json({
      success: true,
      campaigns: filteredCampaigns
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch campaigns:', error.response?.data || error.message);
    res.json({
      success: true,
      campaigns: []
    });
  }
});

/**
 * GET /api/traffic-detailed-analytics/campaign/:campaignId/adsets
 * Получить группы объявлений для кампании
 */
router.get('/campaign/:campaignId/adsets', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { dateRange = '7d' } = req.query;
    
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        adsets: []
      });
    }
    
    const since = getDateRange(dateRange as string);
    
    // Fetch ad sets
    const adsetsResponse = await axios.get(
      `${FB_API_BASE}/${campaignId}/adsets`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,insights.time_range({"since":"' + since + '","until":"today"}){spend,impressions,clicks,ctr,cpc,actions}',
          limit: 100
        }
      }
    );
    
    const adsets = (adsetsResponse.data.data || []).map((adset: any) => {
      const insights = adset.insights?.data?.[0] || {};
      const conversions = extractConversions(insights.actions);
      
      return {
        id: adset.id,
        campaign_id: campaignId,
        name: adset.name,
        status: adset.status,
        spend: parseFloat(insights.spend || 0),
        impressions: parseInt(insights.impressions || 0),
        clicks: parseInt(insights.clicks || 0),
        ctr: parseFloat(insights.ctr || 0),
        cpc: parseFloat(insights.cpc || 0),
        conversions
      };
    });
    
    res.json({
      success: true,
      adsets
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch adsets:', error.response?.data || error.message);
    res.json({
      success: true,
      adsets: []
    });
  }
});

/**
 * GET /api/traffic-detailed-analytics/adset/:adsetId/ads
 * Получить объявления для группы
 */
router.get('/adset/:adsetId/ads', async (req: Request, res: Response) => {
  try {
    const { adsetId } = req.params;
    const { dateRange = '7d' } = req.query;
    
    const accessToken = process.env.FB_ACCESS_TOKEN;
    if (!accessToken) {
      return res.json({
        success: true,
        ads: []
      });
    }
    
    const since = getDateRange(dateRange as string);
    
    // Fetch ads
    const adsResponse = await axios.get(
      `${FB_API_BASE}/${adsetId}/ads`,
      {
        params: {
          access_token: accessToken,
          fields: 'id,name,status,insights.time_range({"since":"' + since + '","until":"today"}){spend,impressions,clicks,ctr,cpc,actions}',
          limit: 100
        }
      }
    );
    
    const ads = (adsResponse.data.data || []).map((ad: any) => {
      const insights = ad.insights?.data?.[0] || {};
      const conversions = extractConversions(insights.actions);
      
      return {
        id: ad.id,
        adset_id: adsetId,
        name: ad.name,
        status: ad.status,
        spend: parseFloat(insights.spend || 0),
        impressions: parseInt(insights.impressions || 0),
        clicks: parseInt(insights.clicks || 0),
        ctr: parseFloat(insights.ctr || 0),
        cpc: parseFloat(insights.cpc || 0),
        conversions
      };
    });
    
    res.json({
      success: true,
      ads
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch ads:', error.response?.data || error.message);
    res.json({
      success: true,
      ads: []
    });
  }
});

// Helper functions

function getDateRange(range: string): string {
  const now = new Date();
  let daysAgo = 7;
  
  switch (range) {
    case '14d': daysAgo = 14; break;
    case '30d': daysAgo = 30; break;
    case '90d': daysAgo = 90; break;
    default: daysAgo = 7;
  }
  
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  // ✅ Format as YYYY-MM-DD in UTC
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractConversions(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const conversionAction = actions.find(
    (a: any) => a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
  );
  
  return conversionAction ? parseInt(conversionAction.value) : 0;
}

function extractRevenue(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const revenueAction = actions.find(
    (a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase' && a.value
  );
  
  return revenueAction ? parseFloat(revenueAction.value) : 0;
}

export default router;
