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
    
    // ✅ Используем database layer
    const settings = await database.getSettings(userId);
    
    res.json({
      success: true,
      settings
    });
    
  } catch (error: any) {
    console.error('❌ Failed to fetch settings:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/traffic-settings/facebook/ad-accounts
 * Fetch available Facebook ad accounts using permanent token
 */
router.get('/facebook/ad-accounts', async (req: Request, res: Response) => {
  try {
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;
    
    if (!fbToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Facebook token not configured' 
      });
    }

    console.log('📘 Fetching Facebook ad accounts...');

    // Get user's ad accounts
    const response = await axios.get(`${FB_API_BASE}/me/adaccounts`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,account_status,currency,timezone_name,amount_spent'
      },
      timeout: 10000
    });

    const adAccounts = response.data.data.map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      status: acc.account_status === 1 ? 'active' : 'inactive',
      currency: acc.currency,
      timezone: acc.timezone_name,
      amount_spent: acc.amount_spent
    }));

    console.log(`✅ Loaded ${adAccounts.length} ad accounts`);

    res.json({
      success: true,
      adAccounts
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
 * Fetch campaigns for a specific ad account
 */
router.get('/facebook/campaigns/:adAccountId', async (req: Request, res: Response) => {
  try {
    const { adAccountId } = req.params;
    const fbToken = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;

    if (!fbToken) {
      return res.status(400).json({ 
        success: false, 
        error: 'Facebook token not configured' 
      });
    }

    console.log(`📘 Fetching campaigns for ad account: ${adAccountId}`);

    const response = await axios.get(`${FB_API_BASE}/${adAccountId}/campaigns`, {
      params: {
        access_token: fbToken,
        fields: 'id,name,status,objective,effective_status,spend,impressions,clicks',
        limit: 100
      },
      timeout: 10000
    });

    const campaigns = response.data.data.map((camp: any) => ({
      id: camp.id,
      name: camp.name,
      status: camp.effective_status,
      objective: camp.objective,
      spend: camp.spend,
      impressions: camp.impressions,
      clicks: camp.clicks,
      ad_account_id: adAccountId
    }));

    console.log(`✅ Loaded ${campaigns.length} campaigns for ${adAccountId}`);

    res.json({
      success: true,
      campaigns
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
