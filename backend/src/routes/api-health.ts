/**
 * API Health Check & Token Management
 *
 * Проверка статуса подключения к внешним API:
 * - Facebook Ads API
 * - AmoCRM API
 * - Supabase connections
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

interface ApiHealthStatus {
  service: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  details?: any;
  lastChecked: string;
}

/**
 * GET /api/health/facebook
 * Проверка Facebook Ads API токена
 */
router.get('/facebook', async (req: Request, res: Response) => {
  try {
    const token = process.env.FB_ACCESS_TOKEN || process.env.FACEBOOK_ADS_TOKEN;

    if (!token) {
      return res.json({
        service: 'Facebook Ads API',
        status: 'error',
        message: 'Токен не настроен в переменных окружения',
        lastChecked: new Date().toISOString()
      } as ApiHealthStatus);
    }

    // Check token validity
    const debugResponse = await axios.get('https://graph.facebook.com/v21.0/debug_token', {
      params: {
        input_token: token,
        access_token: token
      },
      timeout: 10000
    });

    const tokenData = debugResponse.data.data;

    if (!tokenData.is_valid) {
      return res.json({
        service: 'Facebook Ads API',
        status: 'offline',
        message: 'Токен недействителен. Требуется обновление.',
        details: {
          error: tokenData.error?.message || 'Token is not valid'
        },
        lastChecked: new Date().toISOString()
      } as ApiHealthStatus);
    }

    // Check if token is about to expire
    const expiresAt = tokenData.expires_at;
    const dataAccessExpiresAt = tokenData.data_access_expires_at;
    const now = Math.floor(Date.now() / 1000);

    let expiryWarning = '';
    if (expiresAt > 0) {
      const daysUntilExpiry = Math.floor((expiresAt - now) / 86400);
      if (daysUntilExpiry < 30) {
        expiryWarning = `Токен истекает через ${daysUntilExpiry} дней!`;
      }
    }

    if (dataAccessExpiresAt > 0) {
      const daysUntilDataExpiry = Math.floor((dataAccessExpiresAt - now) / 86400);
      if (daysUntilDataExpiry < 30) {
        expiryWarning += ` Доступ к данным истекает через ${daysUntilDataExpiry} дней.`;
      }
    }

    res.json({
      service: 'Facebook Ads API',
      status: 'online',
      message: expiryWarning || 'Токен действителен и работает корректно',
      details: {
        type: tokenData.type,
        appId: tokenData.app_id,
        application: tokenData.application,
        expiresAt: expiresAt === 0 ? 'Никогда' : new Date(expiresAt * 1000).toISOString(),
        dataAccessExpiresAt: dataAccessExpiresAt > 0 ? new Date(dataAccessExpiresAt * 1000).toISOString() : 'N/A',
        scopes: tokenData.scopes?.length || 0,
        userId: tokenData.user_id
      },
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);

  } catch (error: any) {
    console.error('❌ Facebook API Health Check Error:', error);

    let errorMessage = 'Ошибка при проверке токена';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error.message;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Не удалось подключиться к Facebook API';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Превышено время ожидания ответа от Facebook API';
    } else {
      errorMessage = error.message;
    }

    res.json({
      service: 'Facebook Ads API',
      status: 'error',
      message: errorMessage,
      details: {
        error: error.message,
        code: error.code
      },
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);
  }
});

/**
 * GET /api/health/amocrm
 * Проверка AmoCRM API токена
 */
router.get('/amocrm', async (req: Request, res: Response) => {
  try {
    const token = process.env.AMOCRM_ACCESS_TOKEN;
    const domain = process.env.AMOCRM_DOMAIN;

    if (!token || !domain) {
      return res.json({
        service: 'AmoCRM API',
        status: 'error',
        message: 'Токен или домен не настроены в переменных окружения',
        lastChecked: new Date().toISOString()
      } as ApiHealthStatus);
    }

    // Test API call (AmoCRM can be slow, use 20 second timeout)
    const response = await axios.get(`https://${domain}.amocrm.ru/api/v4/account`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 20000
    });

    res.json({
      service: 'AmoCRM API',
      status: 'online',
      message: 'Токен действителен и работает корректно',
      details: {
        accountName: response.data.name,
        accountId: response.data.id,
        subdomain: domain
      },
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);

  } catch (error: any) {
    console.error('❌ AmoCRM API Health Check Error:', error);

    let errorMessage = 'Ошибка при проверке токена';
    let status: 'offline' | 'error' = 'error';

    if (error.response?.status === 401) {
      errorMessage = 'Токен недействителен или истек. Требуется обновление.';
      status = 'offline';
    } else if (error.response?.status === 403) {
      errorMessage = 'Доступ запрещен. IP-адрес может быть заблокирован AmoCRM. Добавьте IP сервера в белый список.';
      status = 'offline';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Не удалось подключиться к AmoCRM API';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Превышено время ожидания ответа от AmoCRM API (>20 сек). Возможно сервер AmoCRM медленно отвечает.';
    } else {
      errorMessage = error.message;
    }

    res.json({
      service: 'AmoCRM API',
      status,
      message: errorMessage,
      details: {
        error: error.message,
        code: error.code,
        statusCode: error.response?.status
      },
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);
  }
});

/**
 * GET /api/health/supabase
 * Проверка Supabase подключений
 */
router.get('/supabase', async (req: Request, res: Response) => {
  try {
    const connections = [
      {
        name: 'Traffic Dashboard',
        url: process.env.TRAFFIC_SUPABASE_URL,
        key: process.env.TRAFFIC_SERVICE_ROLE_KEY
      },
      {
        name: 'Tripwire',
        url: process.env.TRIPWIRE_SUPABASE_URL,
        key: process.env.TRIPWIRE_SERVICE_ROLE_KEY
      },
      {
        name: 'Landing',
        url: process.env.LANDING_SUPABASE_URL,
        key: process.env.LANDING_SUPABASE_SERVICE_KEY
      }
    ];

    const results = await Promise.all(
      connections.map(async (conn) => {
        if (!conn.url || !conn.key) {
          return {
            name: conn.name,
            status: 'error',
            message: 'URL или ключ не настроены'
          };
        }

        try {
          const response = await axios.get(`${conn.url}/rest/v1/`, {
            headers: {
              'apikey': conn.key,
              'Authorization': `Bearer ${conn.key}`
            },
            timeout: 5000
          });

          return {
            name: conn.name,
            status: 'online',
            message: 'Подключение работает'
          };
        } catch (err: any) {
          return {
            name: conn.name,
            status: 'error',
            message: err.message
          };
        }
      })
    );

    res.json({
      service: 'Supabase Connections',
      status: results.every(r => r.status === 'online') ? 'online' : 'error',
      message: `${results.filter(r => r.status === 'online').length}/${results.length} подключений работают`,
      details: results,
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);

  } catch (error: any) {
    console.error('❌ Supabase Health Check Error:', error);

    res.json({
      service: 'Supabase Connections',
      status: 'error',
      message: error.message,
      lastChecked: new Date().toISOString()
    } as ApiHealthStatus);
  }
});

/**
 * GET /api/health/all
 * Получить статус всех API
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    const [facebook, amocrm, supabase] = await Promise.all([
      axios.get(`${req.protocol}://${req.get('host')}/api/integrations/facebook`),
      axios.get(`${req.protocol}://${req.get('host')}/api/integrations/amocrm`),
      axios.get(`${req.protocol}://${req.get('host')}/api/integrations/supabase`)
    ]);

    res.json({
      facebook: facebook.data,
      amocrm: amocrm.data,
      supabase: supabase.data,
      overall: {
        status: [facebook.data, amocrm.data, supabase.data].every(s => s.status === 'online') ? 'online' : 'error',
        lastChecked: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Health Check All Error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;
