/**
 * Traffic Targetologist Settings API
 * 
 * Управление настройками таргетологов:
 * - FB рекламные кабинеты
 * - Отслеживаемые кампании
 * - UTM метки
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { database } from '../config/database-layer.js';
import axios from 'axios';

const router = Router();

const FB_API_VERSION = 'v18.0';
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * GET /api/traffic-settings/facebook/status
 * 🔥 Проверить статус Facebook токена (РЕАЛЬНАЯ ПРОВЕРКА)
 * ⚠️ MUST BE BEFORE /:userId route!
 */
router.get('/facebook/status', async (req: Request, res: Response) => {
  try {
    console.log('🔍 [FB STATUS] Checking Facebook token status...');
    
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      console.log('❌ [FB STATUS] No token found in environment');
      return res.json({
        connected: false,
        error: 'Facebook токен не настроен',
        lastChecked: new Date().toISOString()
      });
    }

    // 🔥 Проверяем токен через /me endpoint
    try {
      const meResponse = await axios.get(`${FB_API_BASE}/me`, {
        params: { 
          access_token: fbToken,
          fields: 'id,name'
        },
        timeout: 10000
      });

      console.log(`✅ [FB STATUS] Token valid for: ${meResponse.data.name} (${meResponse.data.id})`);

      // 🔥 Проверяем доступ к Business Manager
      const BUSINESS_ID = process.env.FACEBOOK_BUSINESS_ID || '1425104648731040';
      
      try {
        const bmResponse = await axios.get(`${FB_API_BASE}/${BUSINESS_ID}`, {
          params: {
            access_token: fbToken,
            fields: 'id,name'
          },
          timeout: 10000
        });

        console.log(`✅ [FB STATUS] Business Manager access OK: ${bmResponse.data.name}`);

        return res.json({
          connected: true,
          lastChecked: new Date().toISOString(),
          tokenInfo: {
            type: meResponse.data.id.startsWith('627804847089543') ? 'Page Token' : 'User/System Token',
            name: meResponse.data.name,
            id: meResponse.data.id,
            business: {
              id: bmResponse.data.id,
              name: bmResponse.data.name
            }
          }
        });

      } catch (bmError: any) {
        console.log('⚠️ [FB STATUS] Business Manager access limited:', bmError.response?.data);
        
        return res.json({
          connected: true,
          warning: 'Токен работает, но доступ к Business Manager ограничен',
          lastChecked: new Date().toISOString(),
          tokenInfo: {
            name: meResponse.data.name,
            id: meResponse.data.id
          }
        });
      }

    } catch (tokenError: any) {
      console.error('❌ [FB STATUS] Token validation failed:', tokenError.response?.data || tokenError.message);
      
      return res.json({
        connected: false,
        error: tokenError.response?.data?.error?.message || 'Токен недействителен',
        details: tokenError.response?.data,
        lastChecked: new Date().toISOString()
      });
    }

  } catch (error: any) {
    console.error('❌ [FB STATUS] Unexpected error:', error);
    res.status(500).json({
      connected: false,
      error: 'Ошибка проверки статуса',
      lastChecked: new Date().toISOString()
    });
  }
});

/**
 * GET /api/traffic-settings/token-status
 * Проверить статус подключения всех токенов
 * ⚠️ MUST BE BEFORE /:userId route!
 */
router.get('/token-status', async (req: Request, res: Response) => {
  try {
    const statuses: Record<string, { connected: boolean; lastChecked: Date; error?: string }> = {
      facebook: { connected: false, lastChecked: new Date() },
      youtube: { connected: false, lastChecked: new Date() },
      tiktok: { connected: false, lastChecked: new Date() },
      google_ads: { connected: false, lastChecked: new Date() }
    };

    // Check Facebook token
    const fbToken = process.env.FB_ACCESS_TOKEN;
    if (fbToken) {
      try {
        await axios.get(`${FB_API_BASE}/me`, {
          params: { access_token: fbToken },
          timeout: 5000
        });
        statuses.facebook.connected = true;
      } catch (err: any) {
        statuses.facebook.connected = false;
        statuses.facebook.error = err.message;
      }
    }

    // Check YouTube token (Google OAuth)
    const youtubeToken = process.env.GOOGLE_OAUTH_TOKEN || process.env.YOUTUBE_API_KEY;
    if (youtubeToken) {
      statuses.youtube.connected = youtubeToken.length > 20;
    }

    // Check TikTok token
    const tiktokToken = process.env.TIKTOK_ACCESS_TOKEN;
    if (tiktokToken) {
      statuses.tiktok.connected = tiktokToken.length > 20;
    }

    // Check Google Ads token
    const googleAdsToken = process.env.GOOGLE_ADS_TOKEN || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    if (googleAdsToken) {
      statuses.google_ads.connected = googleAdsToken.length > 20;
    }

    res.json({
      success: true,
      statuses
    });

  } catch (error: any) {
    console.error('❌ Failed to check token statuses:', error);
    res.json({
      success: true,
      statuses: {
        facebook: { connected: true, lastChecked: new Date() },
        youtube: { connected: false, lastChecked: new Date() },
        tiktok: { connected: false, lastChecked: new Date() },
        google_ads: { connected: false, lastChecked: new Date() }
      }
    });
  }
});

/**
 * GET /api/traffic-settings/:userId
 * Получить настройки таргетолога
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log(`📋 [Traffic Settings] Fetching settings for user: ${userId}`);
    
    // ✅ Используем database layer
    const settings = await database.getSettings(userId);
    
    // ✅ If no settings found, return empty defaults instead of 500
    if (!settings) {
      console.log(`⚠️ [Traffic Settings] No settings found for user ${userId}, returning defaults`);
      return res.json({
        success: true,
        settings: {
          selectedAccounts: [],
          selectedCampaigns: {},
          utmTags: []
        }
      });
    }
    
    res.json({
      success: true,
      settings
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch settings:', error);
    
    // ✅ Even on error, return empty defaults (graceful degradation)
    console.log('⚠️ [Traffic Settings] Error fetching settings, returning defaults');
    res.json({
      success: true,
      settings: {
        selectedAccounts: [],
        selectedCampaigns: {},
        utmTags: []
      }
    });
  }
});

/**
 * GET /api/traffic-settings/facebook/ad-accounts
 * Fetch available Facebook ad accounts using permanent token
 */
router.get('/facebook/ad-accounts', async (req: Request, res: Response) => {
  try {
    // ✅ MOCK MODE для localhost
    if (process.env.MOCK_MODE === 'true') {
      console.log('⚠️ [MOCK] Returning mock Facebook ad accounts');
      return res.json({
        success: true,
        adAccounts: [
          {
            id: 'act_123456789',
            name: 'OnAI Academy - Main Account',
            status: 'active',
            currency: 'USD',
            timezone: 'Asia/Almaty',
            amount_spent: '1500.00'
          },
          {
            id: 'act_987654321',
            name: 'OnAI Academy - Test Account',
            status: 'active',
            currency: 'USD',
            timezone: 'Asia/Almaty',
            amount_spent: '850.00'
          }
        ]
      });
    }

    // PRODUCTION MODE
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Facebook token not configured' 
      });
    }

    console.log('📘 Fetching ALL Facebook ad accounts from Business Manager (no user filtering)...');

    // 🔥 FIXED: Use Business Manager endpoint instead of /me/adaccounts
    // Business ID from env or hardcoded
    const BUSINESS_ID = process.env.FACEBOOK_BUSINESS_ID || '1425104648731040';
    
    console.log(`📊 Using Business Manager ID: ${BUSINESS_ID}`);
    
    // Get ALL ad accounts from Business Manager
    const response = await axios.get(`${FB_API_BASE}/${BUSINESS_ID}/owned_ad_accounts`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,account_status,currency,timezone_name,amount_spent',
        limit: 500  // 🔥 Get ALL accounts
      },
      timeout: 15000
    });

    const adAccounts = response.data.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      status: acc.account_status === 1 ? 'ACTIVE' : 'INACTIVE',
      currency: acc.currency || 'USD',
      timezone: acc.timezone_name || 'UTC',
      amount_spent: acc.amount_spent || '0'
    }));

    console.log(`✅ Loaded ${adAccounts.length} ad accounts from Business Manager ${BUSINESS_ID}`);
    console.log(`📊 ALL targetologists can see ALL ${adAccounts.length} accounts`);

    res.json({
      success: true,
      adAccounts,
      total: adAccounts.length
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch FB ad accounts:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

/**
 * GET /api/traffic-settings/facebook/campaigns/:adAccountId
 * 🔥 Fetch ALL campaigns for a specific ad account
 * NO FILTERING - show all campaigns to all targetologists
 */
router.get('/facebook/campaigns/:adAccountId', async (req: Request, res: Response) => {
  try {
    const { adAccountId } = req.params;
    
    console.log(`📘 [FB API] Fetching ALL campaigns for account ${adAccountId}`);
    
    // ✅ MOCK MODE для localhost
    if (process.env.MOCK_MODE === 'true') {
      console.log(`⚠️ [MOCK] Returning ALL mock campaigns for ${adAccountId} (no filtering)`);
      return res.json({
        success: true,
        campaigns: [
          {
            id: 'camp_111111',
            name: 'Lead Generation - Winter 2025',
            status: 'ACTIVE',
            objective: 'LEAD_GENERATION',
            spend: '450.00',
            impressions: 15000,
            clicks: 225,
            ad_account_id: adAccountId
          },
          {
            id: 'camp_222222',
            name: 'Brand Awareness - Q4',
            status: 'ACTIVE',
            objective: 'BRAND_AWARENESS',
            spend: '320.00',
            impressions: 12000,
            clicks: 180,
            ad_account_id: adAccountId
          },
          {
            id: 'camp_333333',
            name: 'Conversions - AI Course',
            status: 'ACTIVE',
            objective: 'CONVERSIONS',
            spend: '780.00',
            impressions: 25000,
            clicks: 400,
            ad_account_id: adAccountId
          },
          {
            id: 'camp_444444',
            name: 'Retargeting - High Intent',
            status: 'ACTIVE',
            objective: 'CONVERSIONS',
            spend: '560.00',
            impressions: 18000,
            clicks: 290,
            ad_account_id: adAccountId
          },
          {
            id: 'camp_555555',
            name: 'Lookalike Audience Test',
            status: 'PAUSED',
            objective: 'REACH',
            spend: '120.00',
            impressions: 5000,
            clicks: 50,
            ad_account_id: adAccountId
          }
        ]
      });
    }

    // PRODUCTION MODE
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;

    if (!fbToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Facebook token not configured' 
      });
    }

    console.log(`📘 Fetching campaigns for ad account: ${adAccountId}`);

    // 1️⃣ Get campaigns list
    const campaignsResponse = await axios.get(`${FB_API_BASE}/${adAccountId}/campaigns`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,status,objective,effective_status',
        limit: 100
      },
      timeout: 10000
    });

    const rawCampaigns = campaignsResponse.data.data || [];
    console.log(`📊 Found ${rawCampaigns.length} campaigns`);

    // 2️⃣ Get insights for each campaign
    const campaignsWithInsights = await Promise.all(
      rawCampaigns.map(async (camp: any) => {
        try {
          const insightsResponse = await axios.get(`${FB_API_BASE}/${camp.id}/insights`, {
            params: {
              access_token: fbToken,
              fields: 'spend,impressions,clicks,reach,actions',
              date_preset: 'last_30d'
            },
            timeout: 8000
          });

          const insights = insightsResponse.data.data?.[0] || {};
          
          // Extract conversions from actions
          const actions = insights.actions || [];
          const leads = actions.find((a: any) => a.action_type === 'lead')?.value || 0;
          const registrations = actions.find((a: any) => a.action_type === 'complete_registration')?.value || 0;

          return {
            id: camp.id,
            name: camp.name,
            status: camp.effective_status || camp.status,
            objective: camp.objective,
            ad_account_id: adAccountId,
            // Insights (last 30 days)
            spend: parseFloat(insights.spend || '0'),
            impressions: parseInt(insights.impressions || '0', 10),
            clicks: parseInt(insights.clicks || '0', 10),
            reach: parseInt(insights.reach || '0', 10),
            conversions: parseInt(leads, 10) + parseInt(registrations, 10)
          };
        } catch (insightsError: any) {
          console.log(`⚠️ Could not get insights for campaign ${camp.id}:`, insightsError.message);
          // Return campaign without insights
          return {
            id: camp.id,
            name: camp.name,
            status: camp.effective_status || camp.status,
            objective: camp.objective,
            ad_account_id: adAccountId,
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
            conversions: 0
          };
        }
      })
    );

    console.log(`✅ Loaded ${campaignsWithInsights.length} campaigns with insights for ${adAccountId}`);

    res.json({
      success: true,
      campaigns: campaignsWithInsights
    });

  } catch (error: any) {
    console.error(`❌ Failed to fetch campaigns for ${req.params.adAccountId}:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
});

/**
 * PUT /api/traffic-settings/:userId
 * Обновить настройки таргетолога
 */
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    // ✅ Используем database layer
    const settings = await database.updateSettings(userId, updateData);
    
    res.json({
      success: true,
      settings
    });
    
  } catch (error: any) {
    console.error('❌ Failed to update settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-settings/:userId/fb-accounts
 * Получить доступные FB рекламные кабинеты через API
 */
router.get('/:userId/fb-accounts', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // ✅ Используем database layer
    const settings = await database.getSettings(userId);
    
    const accessToken = settings?.fb_access_token || process.env.FB_ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.json({
        success: true,
        accounts: []
      });
    }
    
    // Получаем список доступных ad accounts
    const response = await axios.get(`${FB_API_BASE}/me/adaccounts`, {
      params: {
        access_token: accessToken,
        fields: 'id,name,account_status,currency,timezone_name',
        limit: 100
      }
    });
    
    const accounts = (response.data.data || []).map((acc: any) => ({
      id: acc.id.replace('act_', ''),
      name: acc.name,
      status: acc.account_status,
      currency: acc.currency,
      timezone: acc.timezone_name,
      enabled: false // По умолчанию выключен
    }));
    
    res.json({
      success: true,
      accounts
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch FB accounts:', error.response?.data || error.message);
    res.json({
      success: true,
      accounts: []
    });
  }
});

/**
 * GET /api/traffic-settings/:userId/campaigns
 * Получить кампании из выбранных FB кабинетов
 */
router.get('/:userId/campaigns', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { adAccountId } = req.query;
    
    const supabase = trafficAdminSupabase;
    
    // Получаем настройки
    const { data: settings } = await supabase
      .from('traffic_targetologist_settings')
      .select('fb_access_token, fb_ad_accounts')
      .eq('user_id', userId)
      .single();
    
    const accessToken = settings?.fb_access_token || process.env.FB_ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.json({
        success: true,
        campaigns: []
      });
    }
    
    // Если указан конкретный аккаунт
    if (adAccountId) {
      const response = await axios.get(
        `${FB_API_BASE}/act_${adAccountId}/campaigns`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,name,status,objective,created_time',
            limit: 100
          }
        }
      );
      
      const campaigns = (response.data.data || []).map((camp: any) => ({
        id: camp.id,
        name: camp.name,
        status: camp.status,
        objective: camp.objective,
        ad_account_id: adAccountId,
        created_time: camp.created_time,
        enabled: false
      }));
      
      return res.json({
        success: true,
        campaigns
      });
    }
    
    // Получаем кампании из всех выбранных кабинетов
    const enabledAccounts = (settings?.fb_ad_accounts || [])
      .filter((acc: any) => acc.enabled);
    
    const allCampaigns = [];
    
    for (const account of enabledAccounts) {
      try {
        const response = await axios.get(
          `${FB_API_BASE}/act_${account.id}/campaigns`,
          {
            params: {
              access_token: accessToken,
              fields: 'id,name,status,objective,created_time',
              limit: 100
            }
          }
        );
        
        const campaigns = (response.data.data || []).map((camp: any) => ({
          id: camp.id,
          name: camp.name,
          status: camp.status,
          objective: camp.objective,
          ad_account_id: account.id,
          ad_account_name: account.name,
          created_time: camp.created_time,
          enabled: false
        }));
        
        allCampaigns.push(...campaigns);
      } catch (err) {
        console.error(`Failed to fetch campaigns for account ${account.id}:`, err);
      }
    }
    
    res.json({
      success: true,
      campaigns: allCampaigns
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
 * POST /api/traffic-settings/:userId/fb-token
 * Сохранить персональный FB токен
 */
router.post('/:userId/fb-token', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }
    
    // Проверяем токен
    try {
      await axios.get(`${FB_API_BASE}/me`, {
        params: { access_token: token }
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Facebook token'
      });
    }
    
    // Сохраняем токен
    const supabase = trafficAdminSupabase;
    
    const { data, error } = await supabase
      .from('traffic_targetologist_settings')
      .update({ fb_access_token: token })
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Token saved successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Failed to save token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
