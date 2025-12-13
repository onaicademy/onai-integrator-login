import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { createOrUpdateLead } from '../lib/amocrm.js';
import { scheduleProftestNotifications } from '../services/scheduledNotifications.js';
import { PIXEL_CONFIGS, sendConversionApiEvent } from './facebook-conversion.js';

const router = express.Router();

// ============================================
// LANDING DATABASE CLIENT (New Supabase)
// ============================================
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || 'https://placeholder.supabase.co';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

if (!process.env.LANDING_SUPABASE_URL || !process.env.LANDING_SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ LANDING SUPABASE CREDENTIALS NOT CONFIGURED! Using placeholders.');
}

const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================
// AMOCRM CONFIG
// ============================================
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz.amocrm.ru';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';
const AMOCRM_PIPELINE_ID = process.env.AMOCRM_PIPELINE_ID || '10350882';
const AMOCRM_STATUS_ID = process.env.AMOCRM_STATUS_ID || ''; // Получим автоматически для "Не разобранное"

// ============================================
// TYPES
// ============================================
interface LandingLead {
  email: string;
  name: string;
  phone: string;
  source?: string;
  metadata?: Record<string, any>;
}

interface AmoCRMContact {
  name: string;
  custom_fields_values?: Array<{
    field_code: string;
    values: Array<{ value: string }>;
  }>;
}

interface AmoCRMLead {
  name: string;
  pipeline_id?: number;
  status_id?: number;
  _embedded?: {
    contacts?: AmoCRMContact[];
  };
}

// ============================================
// AMOCRM HELPER FUNCTIONS
// ============================================

/**
 * Создание контакта в AmoCRM
 */
async function createAmoCRMContact(lead: LandingLead): Promise<number | null> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    console.warn('⚠️ AmoCRM not configured, skipping contact creation');
    return null;
  }

  try {
    const contactData: AmoCRMContact = {
      name: lead.name,
      custom_fields_values: [
        {
          field_code: 'EMAIL',
          values: [{ value: lead.email }]
        },
        {
          field_code: 'PHONE',
          values: [{ value: lead.phone }]
        }
      ]
    };

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}/api/v4/contacts`,
      [contactData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data._embedded?.contacts?.[0]?.id) {
      const contactId = response.data._embedded.contacts[0].id;
      console.log(`✅ AmoCRM contact created: ${contactId}`);
      return contactId;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error creating AmoCRM contact:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Получить статус "Не разобранное" для воронки
 */
async function getUnsortedStatusId(pipelineId: string): Promise<number | null> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/leads/pipelines/${pipelineId}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Ищем статус "Не разобранное" или первый статус в воронке
    const statuses = response.data._embedded?.statuses;
    if (statuses && statuses.length > 0) {
      // Ищем по имени "Не разобранное" или "Неразобранное"
      const unsortedStatus = statuses.find((s: any) => 
        s.name?.toLowerCase().includes('не разобран') || 
        s.name?.toLowerCase().includes('неразобран')
      );
      
      if (unsortedStatus) {
        console.log(`✅ Found "Не разобранное" status: ${unsortedStatus.id}`);
        return unsortedStatus.id;
      }
      
      // Если не нашли, берем первый статус
      console.log(`⚠️ "Не разобранное" not found, using first status: ${statuses[0].id}`);
      return statuses[0].id;
    }
    
    return null;
  } catch (error: any) {
    console.error('❌ Error getting pipeline statuses:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Создание сделки в AmoCRM
 */
async function createAmoCRMLead(lead: LandingLead, contactId?: number): Promise<string | null> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    console.warn('⚠️ AmoCRM not configured, skipping lead creation');
    return null;
  }

  try {
    // Не указываем status_id - AmoCRM сам поставит "Неразобранное"
    const leadData: AmoCRMLead = {
      name: `Заявка на Tripwire: ${lead.name}`,
      pipeline_id: AMOCRM_PIPELINE_ID ? parseInt(AMOCRM_PIPELINE_ID) : undefined,
    };

    // Привязываем контакт к сделке, если он был создан
    if (contactId) {
      leadData._embedded = {
        contacts: [{ id: contactId } as any]
      };
    }

    console.log('📤 Creating AmoCRM lead:', leadData);

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}/api/v4/leads`,
      [leadData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data._embedded?.leads?.[0]?.id) {
      const leadId = response.data._embedded.leads[0].id;
      console.log(`✅ AmoCRM lead created: ${leadId} (Pipeline: ${AMOCRM_PIPELINE_ID}, Status: Неразобранное)`);
      
      // Добавляем примечание с данными лида
      try {
        const noteText = `📋 Данные лида:\n\n👤 Имя: ${lead.name}\n📧 Email: ${lead.email}\n📱 Телефон: ${lead.phone}\n\n🌐 Источник: Лендинг /expresscourse`;
        
        await axios.post(
          `https://${AMOCRM_DOMAIN}/api/v4/leads/${leadId}/notes`,
          [
            {
              note_type: 'common',
              params: {
                text: noteText
              }
            }
          ],
          {
            headers: {
              'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`✅ Note added to lead ${leadId}`);
      } catch (noteError: any) {
        console.error('⚠️ Failed to add note to lead:', noteError.response?.data || noteError.message);
      }
      
      return leadId.toString();
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error creating AmoCRM lead:', error.response?.data || error.message);
    return null;
  }
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/landing/submit
 * Принимает заявку с основного лендинга с выбором способа оплаты
 * ДЕДУПЛИКАЦИЯ: находит существующую сделку и обновляет её этап
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { email, name, phone, source = 'twland', paymentMethod, campaignSlug, metadata = {} } = req.body;

    // Валидация
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, phone'
      });
    }

    // Validate paymentMethod
    if (paymentMethod && !['kaspi', 'card', 'manager'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    console.log(`📝 Landing lead submission: ${name}, payment: ${paymentMethod || 'not selected'}`);

    // 1. Save to Supabase (landing DB)
    const { data: supabaseLead, error: supabaseError } = await landingSupabase
      .from('landing_leads')
      .insert({
        email: email || null,
        name,
        phone,
        source,
        metadata: {
          ...metadata,
          paymentMethod,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date().toISOString()
        },
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ Supabase error:', supabaseError);
      return res.status(500).json({
        success: false,
        error: 'Failed to save lead to database'
      });
    }

    console.log(`✅ Lead saved to Supabase: ${supabaseLead.id}`);

    // ⚡ OPTIMIZATION: Return response immediately to user
    // All following operations run in background (non-blocking)
    res.status(200).json({
      success: true,
      leadId: supabaseLead.id,
      message: 'Заявка успешно отправлена!'
    });

    // 2. 🔥 BACKGROUND TASKS (fire-and-forget with retry)
    (async () => {
      try {
        // 2a. Create or update in AmoCRM with deduplication and stage update (with retry)
        const amocrmResult = await retryWithBackoff(
          () => createOrUpdateLead({
            name,
            email: email || undefined,
            phone,
            paymentMethod: paymentMethod as 'kaspi' | 'card' | 'manager' | undefined,
          }),
          3, // 3 retries
          2000 // 2s initial delay
        );

        if (amocrmResult) {
          console.log(`✅ AmoCRM: Lead ${amocrmResult.action} (ID: ${amocrmResult.leadId}, isNew: ${amocrmResult.isNew})`);
        } else {
          console.error('❌ AmoCRM: Failed after all retries');
        }

        // 2b. Send Facebook Conversion API Event (server-side tracking) - если указан campaignSlug
        if (campaignSlug && PIXEL_CONFIGS[campaignSlug]) {
          const pixelConfig = PIXEL_CONFIGS[campaignSlug];
          const userAgent = req.headers['user-agent'] || undefined;
          const ipAddress = 
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            undefined;
          const referer = req.headers['referer'] || '';
          const fbc = req.cookies?._fbc;
          const fbp = req.cookies?._fbp;

          const fbResult = await retryWithBackoff(
            () => sendConversionApiEvent(
              pixelConfig,
              'Lead',
              { email: email || '', phone, name },
              referer,
              userAgent,
              ipAddress,
              fbc,
              fbp
            ),
            2, // 2 retries
            1000 // 1s initial delay
          );

          if (fbResult !== null) {
            console.log('✅ Facebook Conversion API: Lead event sent');
          } else {
            console.error('❌ Facebook Conversion API: Failed after all retries');
          }
        }

      } catch (bgError: any) {
        console.error('❌ Background task error:', bgError.message);
        // Don't crash the server, just log the error
      }
    })();

  } catch (error: any) {
    console.error('❌ Error processing lead:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/landing/stats
 * Статистика по заявкам
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data: stats, error } = await landingSupabase
      .from('landing_leads')
      .select('id, amocrm_synced, created_at');

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stats'
      });
    }

    const totalLeads = stats?.length || 0;
    const syncedLeads = stats?.filter(s => s.amocrm_synced).length || 0;
    const pendingLeads = totalLeads - syncedLeads;

    return res.status(200).json({
      success: true,
      stats: {
        total: totalLeads,
        synced: syncedLeads,
        pending: pendingLeads,
        syncRate: totalLeads > 0 ? ((syncedLeads / totalLeads) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/landing/health
 * Проверка подключения к БД и AmoCRM
 */
router.get('/health', async (req: Request, res: Response) => {
  const health = {
    database: false,
    amocrm: false,
    timestamp: new Date().toISOString()
  };

  // Check database
  try {
    const { error } = await landingSupabase
      .from('landing_leads')
      .select('id')
      .limit(1);
    
    health.database = !error;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check AmoCRM
  if (AMOCRM_DOMAIN && AMOCRM_ACCESS_TOKEN) {
    try {
      const response = await axios.get(
        `https://${AMOCRM_DOMAIN}/api/v4/account`,
        {
          headers: { 'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}` }
        }
      );
      health.amocrm = response.status === 200;
    } catch (error) {
      console.error('AmoCRM health check failed:', error);
    }
  }

  return res.status(200).json(health);
});

/**
 * POST /api/landing/amocrm/callback
 * Callback URL для AmoCRM (для OAuth авторизации)
 */
router.post('/amocrm/callback', async (req: Request, res: Response) => {
  try {
    const { code, referer, client_id } = req.body;
    
    console.log('📥 AmoCRM OAuth callback received:', {
      code: code ? 'present' : 'missing',
      referer,
      client_id
    });

    // TODO: Здесь можно обработать OAuth код для получения токенов
    // Для долгосрочного токена это не требуется
    
    return res.status(200).json({
      success: true,
      message: 'Callback received'
    });
  } catch (error: any) {
    console.error('❌ Error processing AmoCRM callback:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/landing/amocrm/callback
 * Callback URL для AmoCRM (GET версия)
 */
router.get('/amocrm/callback', async (req: Request, res: Response) => {
  try {
    const { code, referer, client_id } = req.query;
    
    console.log('📥 AmoCRM OAuth callback received (GET):', {
      code: code ? 'present' : 'missing',
      referer,
      client_id
    });

    // TODO: Здесь можно обработать OAuth код для получения токенов
    // Для долгосрочного токена это не требуется
    
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>AmoCRM Integration</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #00FF94 0%, #00CC75 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
          }
          h1 { color: #00FF94; margin-bottom: 20px; }
          p { color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>✅ AmoCRM Integration</h1>
          <p>Callback успешно получен!</p>
          <p>Вы можете закрыть это окно.</p>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('❌ Error processing AmoCRM callback:', error);
    return res.status(500).send('Error processing callback');
  }
});

// ============================================
// HELPER: RETRY WITH EXPONENTIAL BACKOFF
// ============================================
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        console.error(`❌ Failed after ${maxRetries} attempts:`, error.message);
        return null;
      }
      const delay = initialDelay * Math.pow(2, attempt - 1);
      console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return null;
}

// ============================================
// PROFTEST LEAD SUBMISSION WITH DEDUPLICATION
// ============================================
router.post('/proftest', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, source, answers, proftestAnswers, campaignSlug, utmParams, metadata } = req.body;

    // Validate (email теперь опциональный)
    if (!name || !phone) {
      return res.status(400).json({ error: 'Missing required fields: name, phone' });
    }

    console.log('📝 Processing proftest lead submission:', {
      name,
      email: email ? email.substring(0, 3) + '***' : 'N/A',
      phone: phone.substring(0, 3) + '***',
      source,
      campaignSlug,
      answersCount: proftestAnswers?.length || answers?.length || 0,
    });

    // 1. Проверяем - нет ли уже заявки от этого пользователя (защита от повторного прохождения)
    // ⚠️ ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ТЕСТИРОВАНИЯ
    /*
    const { data: existingLead } = await landingSupabase
      .from('landing_leads')
      .select('id, email, phone, created_at')
      .or(`email.eq.${email},phone.eq.${phone}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingLead) {
      console.log(`⚠️ User already submitted proftest: ${email} / ${phone}`);
      return res.status(400).json({ 
        error: 'Вы уже проходили этот тест ранее. Ожидайте ответа от нашей команды.',
        alreadySubmitted: true 
      });
    }
    */

    // 2. Save to Supabase (landing DB) - CRITICAL, MUST SUCCEED
    const { data: supabaseLead, error: supabaseError } = await landingSupabase
      .from('landing_leads')
      .insert({
        name,
        email: email || null, // Email опциональный (может быть null)
        phone,
        source: source || `proftest_${campaignSlug || 'unknown'}`,
        metadata: {
          ...metadata,
          answers, // Старый формат для совместимости
          proftestAnswers, // Новый формат с полными текстами
          campaignSlug,
          utmParams,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (supabaseError) {
      console.error('❌ Supabase error:', supabaseError);
      throw new Error('Failed to save lead to database');
    }

    console.log('✅ Lead saved to Supabase:', supabaseLead.id);

    // ⚡ OPTIMIZATION: Return response immediately to user
    // All following operations run in background (non-blocking)
    res.json({
      success: true,
      leadId: supabaseLead.id,
    });

    // 3. 🔥 BACKGROUND TASKS (fire-and-forget with retry)
    (async () => {
      try {
        // 3a. Create or update in AmoCRM with deduplication (with retry)
        const amocrmResult = await retryWithBackoff(
          () => createOrUpdateLead({
            name,
            email: email || undefined,
            phone,
            utmParams,
            proftestAnswers: proftestAnswers || answers,
            campaignSlug,
          }),
          3, // 3 retries
          2000 // 2s initial delay
        );

        if (amocrmResult) {
          console.log(`✅ AmoCRM: Lead ${amocrmResult.action} (ID: ${amocrmResult.leadId}, isNew: ${amocrmResult.isNew})`);
        } else {
          console.error('❌ AmoCRM: Failed after all retries');
        }

        // 3b. Send Facebook Conversion API Event (with retry)
        if (campaignSlug && PIXEL_CONFIGS[campaignSlug]) {
          const pixelConfig = PIXEL_CONFIGS[campaignSlug];
          const userAgent = req.headers['user-agent'] || undefined;
          const ipAddress = 
            (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            (req.headers['x-real-ip'] as string) ||
            req.socket.remoteAddress ||
            undefined;
          const referer = req.headers['referer'] || '';
          const fbc = req.cookies?._fbc;
          const fbp = req.cookies?._fbp;

          const fbResult = await retryWithBackoff(
            () => sendConversionApiEvent(
              pixelConfig,
              'Lead',
              { email: email || '', phone, name },
              referer,
              userAgent,
              ipAddress,
              fbc,
              fbp
            ),
            2, // 2 retries
            1000 // 1s initial delay
          );

          if (fbResult !== null) {
            console.log('✅ Facebook Conversion API: Lead event sent');
          } else {
            console.error('❌ Facebook Conversion API: Failed after all retries');
          }
        }

        // 3c. Schedule email + SMS notifications (10 minutes delay)
        scheduleProftestNotifications({
          name,
          email,
          phone,
          leadId: supabaseLead.id,
        });
        console.log('✅ Notifications scheduled');

      } catch (bgError: any) {
        console.error('❌ Background task error:', bgError.message);
        // Don't crash the server, just log the error
      }
    })();

  } catch (error: any) {
    console.error('❌ Error processing proftest lead:', error);
    return res.status(500).json({
      error: 'Failed to process lead',
      message: error.message,
    });
  }
});

export default router;
