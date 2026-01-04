/**
 * API Интеграции - Frontend Endpoints
 * 
 * Endpoints:
 * - GET /api/integrations/all - Статус всех API
 * - GET /api/integrations/facebook - Статус Facebook API
 * - GET /api/integrations/amocrm - Статус AmoCRM API
 * - GET /api/integrations/supabase - Статус Supabase
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic';
import { trafficSupabase } from '../config/supabase-traffic';
import { AMOCRM_CONFIG } from '../config/amocrm-config';

const router = Router();

/**
 * GET /api/integrations/all
 * 
 * Возвращает статус всех API интеграций
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching all API statuses...');
    
    // Проверяем все API параллельно
    const [facebookStatus, amocrmStatus, supabaseStatus] = await Promise.all([
      checkFacebookAPI(),
      checkAmoCRMAPI(),
      checkSupabaseAPI()
    ]);
    
    const allOnline = facebookStatus.status === 'online' && 
                     amocrmStatus.status === 'online' && 
                     supabaseStatus.status === 'online';
    
    const response = {
      facebook: facebookStatus,
      amocrm: amocrmStatus,
      supabase: supabaseStatus,
      overall: {
        status: allOnline ? 'online' : 'error',
        lastChecked: new Date().toISOString()
      }
    };
    
    console.log('✅ API statuses fetched');
    res.json(response);
  } catch (error: any) {
    console.error('❌ Failed to fetch API statuses:', error);
    
    const errorResponse = {
      facebook: createErrorResponse('Facebook Ads API', error.message),
      amocrm: createErrorResponse('AmoCRM API', error.message),
      supabase: createErrorResponse('Supabase', error.message),
      overall: {
        status: 'error' as const,
        lastChecked: new Date().toISOString()
      }
    };
    
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /api/integrations/facebook
 * 
 * Возвращает статус Facebook API
 */
router.get('/facebook', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching Facebook API status...');
    const status = await checkFacebookAPI();
    console.log('✅ Facebook API status fetched');
    res.json(status);
  } catch (error: any) {
    console.error('❌ Failed to fetch Facebook status:', error);
    res.status(500).json(createErrorResponse('Facebook Ads API', error.message));
  }
});

/**
 * GET /api/integrations/amocrm
 * 
 * Возвращает статус AmoCRM API
 */
router.get('/amocrm', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching AmoCRM API status...');
    const status = await checkAmoCRMAPI();
    console.log('✅ AmoCRM API status fetched');
    res.json(status);
  } catch (error: any) {
    console.error('❌ Failed to fetch AmoCRM status:', error);
    res.status(500).json(createErrorResponse('AmoCRM API', error.message));
  }
});

/**
 * GET /api/integrations/supabase
 * 
 * Возвращает статус Supabase
 */
router.get('/supabase', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching Supabase status...');
    const status = await checkSupabaseAPI();
    console.log('✅ Supabase status fetched');
    res.json(status);
  } catch (error: any) {
    console.error('❌ Failed to fetch Supabase status:', error);
    res.status(500).json(createErrorResponse('Supabase', error.message));
  }
});

// ==================== Helper Functions ====================

/**
 * Проверяет статус Facebook API
 */
async function checkFacebookAPI(): Promise<{
  service: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  details?: any;
  lastChecked: string;
}> {
  try {
    const token = process.env.FACEBOOK_ADS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    
    if (!token) {
      return {
        service: 'Facebook Ads API',
        status: 'error',
        message: 'Токен не настроен',
        lastChecked: new Date().toISOString()
      };
    }
    
    // Проверяем токен через API
    const response = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${token}`);
    const data: any = await response.json();
    
    if (response.ok && data.id) {
      return {
        service: 'Facebook Ads API',
        status: 'online',
        message: 'API работает корректно',
        details: {
          account_id: data.id,
          token_length: token.length
        },
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        service: 'Facebook Ads API',
        status: 'error',
        message: data.error?.message || 'Ошибка подключения',
        details: { error: data.error },
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      service: 'Facebook Ads API',
      status: 'offline',
      message: `Ошибка: ${error.message}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Проверяет статус AmoCRM API
 */
async function checkAmoCRMAPI(): Promise<{
  service: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  details?: any;
  lastChecked: string;
}> {
  try {
    const token = process.env.AMOCRM_ACCESS_TOKEN;
    const domain = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
    
    if (!token) {
      return {
        service: 'AmoCRM API',
        status: 'error',
        message: 'Токен не настроен',
        lastChecked: new Date().toISOString()
      };
    }
    
    // Проверяем токен через API
    const response = await fetch(`https://${domain}.amocrm.ru/api/v4/account`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data: any = await response.json();
      return {
        service: 'AmoCRM API',
        status: 'online',
        message: 'API работает корректно',
        details: {
          account_name: data.name || 'Unknown',
          domain: domain
        },
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        service: 'AmoCRM API',
        status: 'error',
        message: 'Ошибка авторизации',
        details: { status: response.status },
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      service: 'AmoCRM API',
      status: 'offline',
      message: `Ошибка: ${error.message}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Проверяет статус Supabase
 */
async function checkSupabaseAPI(): Promise<{
  service: string;
  status: 'online' | 'offline' | 'error';
  message: string;
  details?: any;
  lastChecked: string;
}> {
  try {
    // Проверяем подключение ко всем БД
    const checks = await Promise.allSettled([
      checkSupabaseConnection(trafficAdminSupabase, 'Landing DB'),
      checkSupabaseConnection(trafficSupabase, 'Traffic DB')
    ]);
    
    const successful = checks.filter(c => c.status === 'fulfilled').length;
    const total = checks.length;
    
    if (successful === total) {
      return {
        service: 'Supabase',
        status: 'online',
        message: 'Все базы данных доступны',
        details: {
          databases: checks.map(c => c.status === 'fulfilled' ? c.value : null)
        },
        lastChecked: new Date().toISOString()
      };
    } else if (successful > 0) {
      return {
        service: 'Supabase',
        status: 'error',
        message: `Доступно ${successful} из ${total} баз данных`,
        details: {
          databases: checks.map(c => c.status === 'fulfilled' ? c.value : { error: 'Failed' })
        },
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        service: 'Supabase',
        status: 'offline',
        message: 'Нет доступа к базам данных',
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error: any) {
    return {
      service: 'Supabase',
      status: 'offline',
      message: `Ошибка: ${error.message}`,
      lastChecked: new Date().toISOString()
    };
  }
}

/**
 * Проверяет подключение к конкретной Supabase БД
 */
async function checkSupabaseConnection(supabase: any, dbName: string): Promise<{ name: string; status: string; error?: string }> {
  try {
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table not found, это нормально если таблицы нет
      throw error;
    }
    
    return { name: dbName, status: 'ok' };
  } catch (error: any) {
    return { name: dbName, status: 'error', error: error.message };
  }
}

/**
 * Создает ответ об ошибке
 */
function createErrorResponse(service: string, message: string): {
  service: string;
  status: 'error';
  message: string;
  lastChecked: string;
} {
  return {
    service,
    status: 'error',
    message: message || 'Не удалось получить статус',
    lastChecked: new Date().toISOString()
  };
}

export default router;
