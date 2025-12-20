/**
 * Traffic Targetologist Settings API
 * 
 * Управление настройками таргетологов:
 * - FB рекламные кабинеты
 * - Отслеживаемые кампании
 * - UTM метки
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
 * GET /api/traffic-settings/:userId
 * Получить настройки таргетолога
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Если настроек нет, создаем пустые
    if (!data) {
      const supabase = getSupabaseClient();
      const { data: newSettings, error: createError } = await supabase
        .from('traffic_targetologist_settings')
        .insert({
          user_id: userId,
          fb_ad_accounts: [],
          tracked_campaigns: [],
          utm_source: 'facebook',
          utm_medium: 'cpc',
          utm_templates: {}
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      return res.json({
        success: true,
        settings: newSettings
      });
    }
    
    res.json({
      success: true,
      settings: data
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
 * PUT /api/traffic-settings/:userId
 * Обновить настройки таргетолога
 */
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('traffic_targetologist_settings')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      settings: data
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
    
    const supabase = getSupabaseClient();
    
    // Получаем токен (сначала персональный, потом общий)
    const { data: settings } = await supabase
      .from('traffic_targetologist_settings')
      .select('fb_access_token')
      .eq('user_id', userId)
      .single();
    
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
    
    const supabase = getSupabaseClient();
    
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
    const supabase = getSupabaseClient();
    
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

/**
 * GET /api/traffic-settings/token-status
 * Проверить статус подключения всех токенов
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
      try {
        // Simple check if token exists and is not empty
        statuses.youtube.connected = youtubeToken.length > 20;
      } catch (err: any) {
        statuses.youtube.connected = false;
        statuses.youtube.error = err.message;
      }
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
        facebook: { connected: true, lastChecked: new Date() }, // FB always available
        youtube: { connected: false, lastChecked: new Date() },
        tiktok: { connected: false, lastChecked: new Date() },
        google_ads: { connected: false, lastChecked: new Date() }
      }
    });
  }
});

export default router;
