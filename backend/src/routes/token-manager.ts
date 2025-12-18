import { Router, Request, Response } from 'express';
import { 
  getTokenStatus as getFBTokenStatus, 
  debugToken as debugFBToken,
  refreshFacebookTokenIfNeeded 
} from '../services/facebookTokenManager.js';
import { 
  getAmoCRMTokenStatus,
  refreshAmoCRMTokenIfNeeded,
  refreshAmoCRMToken
} from '../services/amocrmTokenManager.js';
import { getAllTokensStatus } from '../services/tokenAutoRefresh.js';

const router = Router();

/**
 * GET /api/tokens/status
 * Получить статус всех токенов
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = getAllTokensStatus();
    
    res.json({
      success: true,
      tokens: status,
      healthy: status.facebook.isValid && status.amocrm.isValid
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get tokens status',
      message: error.message
    });
  }
});

/**
 * POST /api/tokens/refresh
 * Принудительное обновление всех токенов
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const results = {
      facebook: { success: false, message: '' },
      amocrm: { success: false, message: '' }
    };
    
    // Refresh Facebook token
    try {
      await refreshFacebookTokenIfNeeded();
      const fbStatus = getFBTokenStatus();
      results.facebook = {
        success: fbStatus.isValid,
        message: fbStatus.isValid 
          ? `Token valid (${fbStatus.daysUntilExpire} days)`
          : 'Token invalid or expired'
      };
    } catch (error: any) {
      results.facebook = {
        success: false,
        message: error.message
      };
    }
    
    // Refresh AmoCRM token
    try {
      await refreshAmoCRMTokenIfNeeded();
      const amocrmStatus = getAmoCRMTokenStatus();
      results.amocrm = {
        success: amocrmStatus.isValid,
        message: amocrmStatus.isValid
          ? `Token valid (${amocrmStatus.hoursUntilExpire} hours)`
          : 'Token invalid or expired'
      };
    } catch (error: any) {
      results.amocrm = {
        success: false,
        message: error.message
      };
    }
    
    res.json({
      success: true,
      refreshed: results
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message
    });
  }
});

/**
 * POST /api/tokens/amocrm/refresh
 * Обновить только AmoCRM токен
 */
router.post('/amocrm/refresh', async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'refresh_token is required'
      });
    }
    
    const newTokens = await refreshAmoCRMToken(refresh_token);
    
    res.json({
      success: true,
      tokens: {
        access_token: newTokens.access_token.substring(0, 20) + '...',
        refresh_token: newTokens.refresh_token.substring(0, 20) + '...',
        expires_at: new Date(newTokens.expires_at).toISOString(),
        hours_until_expire: Math.floor((newTokens.expires_at - Date.now()) / 3600000)
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'AmoCRM token refresh failed',
      message: error.message
    });
  }
});

/**
 * GET /api/tokens/facebook/debug
 * Debug Facebook token info
 */
router.get('/facebook/debug', async (req: Request, res: Response) => {
  try {
    const token = process.env.FACEBOOK_ADS_TOKEN;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'FACEBOOK_ADS_TOKEN not configured'
      });
    }
    
    const debugInfo = await debugFBToken(token);
    
    res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Facebook token debug failed',
      message: error.message
    });
  }
});

export default router;
