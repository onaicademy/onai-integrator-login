import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { createOrUpdateLead } from '../lib/amocrm.js';
import { scheduleProftestNotifications, sendProftestEmailWithTracking } from '../services/scheduledNotifications.js';
import { PIXEL_CONFIGS, sendConversionApiEvent } from './facebook-conversion.js';
import { sendProftestResultSMS } from '../services/mobizon.js';
import { sendLeadNotification } from '../services/telegramService.js';

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
    // Создаём custom_fields_values только с существующими полями
    const customFieldsValues: any[] = [
      {
        field_code: 'PHONE',
        values: [{ value: lead.phone }]
      }
    ];

    // Добавляем email ТОЛЬКО если он есть
    if (lead.email && lead.email.trim()) {
      customFieldsValues.push({
        field_code: 'EMAIL',
        values: [{ value: lead.email }]
      });
    }

    const contactData: AmoCRMContact = {
      name: lead.name,
      custom_fields_values: customFieldsValues
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
        const noteText = `📋 Данные лида:

👤 Имя: ${lead.name}
📧 Email: ${lead.email}
📱 Телефон: ${lead.phone}

🌐 Источник: Лендинг /expresscourse`;
        
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
    const { email, name, phone, source = 'expresscourse', paymentMethod, campaignSlug, metadata = {} } = req.body;

    // ✅ ВАЛИДАЦИЯ: Только имя и телефон обязательны (email опционален)
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Имя обязательно для заполнения'
      });
    }
    
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Телефон обязателен для заполнения'
      });
    }

    // Validate email format ТОЛЬКО если email указан
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Неверный формат email адреса'
        });
      }
    }

    // Validate phone format (basic check)
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Неверный формат номера телефона'
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

    // 1. 🔥 BACKWARDS COMPATIBLE: Try unified lead system first, fallback to direct insert
    let leadId: string;
    
    // Try using the new journey-based system (if migration applied)
    const { data: unifiedLeadResult, error: leadFunctionError } = await landingSupabase
      .rpc('find_or_create_unified_lead', {
        p_email: email || null,
        p_name: name,
        p_phone: phone,
        p_source: source,
        p_metadata: {
          ...metadata,
          paymentMethod,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date().toISOString()
        }
      });

    if (leadFunctionError) {
      console.warn('⚠️ Unified lead function not available (migration not applied?), using fallback:', leadFunctionError.message);
      
      // FALLBACK: Direct insert (old method - works without migration)
      const { data: leadData, error: insertError } = await landingSupabase
        .from('landing_leads')
        .insert({
          name,
          email,
          phone,
          source,
          metadata: {
            ...metadata,
            paymentMethod,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        })
        .select('id')
        .single();
      
      if (insertError || !leadData) {
        console.error('❌ Error inserting lead:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to save lead to database'
        });
      }
      
      leadId = leadData.id;
      console.log(`✅ Lead created (fallback method): ${leadId}`);
    } else {
      leadId = unifiedLeadResult;
      console.log(`✅ Unified lead ID: ${leadId}`);
    }

    // 2. Add journey stage (optional - only if table exists)
    const stage = paymentMethod ? `payment_${paymentMethod}` : 'expresscourse_submitted';
    const { error: journeyError } = await landingSupabase
      .from('journey_stages')
      .insert({
        lead_id: leadId,
        stage,
        source,
        metadata: {
          paymentMethod,
          utmParams: metadata?.utmParams || {},
        }
      });

    if (journeyError) {
      console.warn('⚠️ Failed to track journey stage:', journeyError);
      // Don't fail the request, just log
    } else {
      console.log(`✅ Journey stage tracked: ${stage}`);
    }

    // Get the full lead record for response
    const { data: supabaseLead, error: fetchError } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching lead:', fetchError);
      // Continue anyway, we have the ID
    }

    // ⚡ OPTIMIZATION: Return response immediately to user
    // All following operations run in background (non-blocking)
    res.status(200).json({
      success: true,
      leadId,
      message: 'Заявка успешно отправлена!'
    });

    // 2. 🔥 BACKGROUND TASKS (fire-and-forget with retry)
    (async () => {
      try {
        // 🔔 TELEGRAM NOTIFICATION: Отправляем уведомление о новом лиде (первым делом!)
        try {
          console.log('📱 Sending Telegram lead notification...');
          const telegramSent = await sendLeadNotification({
            name,
            phone,
            email: email || undefined,
            paymentMethod: paymentMethod as 'kaspi' | 'card' | 'manager' | undefined,
            source,
          });
          
          if (telegramSent) {
            console.log('✅ Telegram: Lead notification sent successfully');
          } else {
            console.warn('⚠️ Telegram: Lead notification skipped (not configured or failed)');
          }
        } catch (telegramError: any) {
          console.error('❌ Telegram notification error:', telegramError.message);
          // Продолжаем выполнение, не блокируем другие задачи
        }

        // 🔥 CRITICAL: Check AmoCRM credentials before attempting sync
        if (!process.env.AMOCRM_ACCESS_TOKEN) {
          console.error('❌❌❌ AmoCRM: ACCESS_TOKEN NOT SET! Cannot sync to AmoCRM!');
          console.error('⚠️ Lead saved to database but NOT synced to AmoCRM');
          console.error('📝 Lead ID:', leadId);
          return; // Exit early, don't attempt sync
        }
        
        console.log('🚀 Starting AmoCRM background sync for ExpressCourse lead:', leadId);
        
        // 2a. Create or update in AmoCRM with deduplication and stage update (with retry)
        // 🔥 ENHANCED: Pass UTM params and campaign slug to AmoCRM
        const amocrmResult = await retryWithBackoff(
          () => createOrUpdateLead({
            name,
            email: email || undefined,
            phone,
            utmParams: metadata?.utmParams || {},
            campaignSlug,
            paymentMethod: paymentMethod as 'kaspi' | 'card' | 'manager' | undefined,
          }),
          3, // 3 retries
          2000 // 2s initial delay
        );

        if (amocrmResult) {
          console.log(`✅ AmoCRM: Lead ${amocrmResult.action} (ID: ${amocrmResult.leadId}, isNew: ${amocrmResult.isNew})`);
          
          // ✅ UPDATE БД с AmoCRM ID
          const { error: updateError } = await landingSupabase
            .from('landing_leads')
            .update({ 
              amocrm_lead_id: amocrmResult.leadId.toString(),
              amocrm_synced: true 
            })
            .eq('id', leadId);
          
          if (updateError) {
            console.error('⚠️ Failed to update amocrm_lead_id in DB:', updateError);
          } else {
            console.log('✅ Database updated with AmoCRM ID');
          }
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
        console.error('❌❌❌ Background task error:', bgError.message);
        console.error('🔎 Full error:', bgError);
        console.error('📝 Lead ID:', leadId);
        console.error('👤 Lead data:', { name, email, phone });
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

    // ✅ УСИЛЕННАЯ ВАЛИДАЦИЯ: Все поля обязательны
    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    // ✅ Проверка имени (минимум 2 символа)
    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'Имя должно содержать минимум 2 символа' });
    }

    // ✅ Проверка email формата
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Введите корректный Email адрес' });
    }

    // ✅ Проверка телефона (минимум 11 цифр)
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length < 11) {
      return res.status(400).json({ error: 'Введите корректный номер телефона' });
    }

    console.log('📝 Processing proftest lead submission:', {
      name,
      email: email.substring(0, 3) + '***',
      phone: phone.substring(0, 3) + '***',
      source,
      campaignSlug,
      answersCount: proftestAnswers?.length || answers?.length || 0,
    });

    // 1. 🔥 BACKWARDS COMPATIBLE: Try unified lead system first, fallback to direct insert
    let leadId: string;
    
    // Try using the new journey-based system (if migration applied)
    const { data: unifiedLeadResult, error: leadFunctionError } = await landingSupabase
      .rpc('find_or_create_unified_lead', {
        p_email: email,
        p_name: name,
        p_phone: phone,
        p_source: source || `proftest_${campaignSlug || 'unknown'}`,
        p_metadata: {
          ...metadata,
          answers, // Старый формат для совместимости
          proftestAnswers, // Новый формат с полными текстами
          campaignSlug,
          utmParams,
          timestamp: new Date().toISOString(),
        }
      });

    if (leadFunctionError) {
      console.warn('⚠️ Unified lead function not available (migration not applied?), using fallback:', leadFunctionError.message);
      
      // FALLBACK: Direct insert (old method - works without migration)
      const { data: leadData, error: insertError } = await landingSupabase
        .from('landing_leads')
        .insert({
          name,
          email,
          phone,
          source: source || `proftest_${campaignSlug || 'unknown'}`,
          metadata: {
            ...metadata,
            answers,
            proftestAnswers,
            campaignSlug,
            utmParams,
          },
        })
        .select('id')
        .single();
      
      if (insertError || !leadData) {
        console.error('❌ Error inserting lead:', insertError);
        throw new Error('Failed to save lead to database');
      }
      
      leadId = leadData.id;
      console.log('✅ Lead created (fallback method):', leadId);
    } else {
      leadId = unifiedLeadResult;
      console.log('✅ Unified lead ID:', leadId);
    }

    // 2. Add journey stage (optional - only if table exists)
    const { error: journeyError } = await landingSupabase
      .from('journey_stages')
      .insert({
        lead_id: leadId,
        stage: 'proftest_submitted',
        source: source || `proftest_${campaignSlug || 'unknown'}`,
        metadata: {
          answers,
          proftestAnswers,
          utmParams,
        }
      });

    if (journeyError) {
      console.warn('⚠️ Failed to track journey stage:', journeyError);
      // Don't fail the request, just log
    } else {
      console.log('✅ Journey stage tracked: proftest_submitted');
    }

    // Get the full lead record for response
    const { data: supabaseLead } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    // ⚡ OPTIMIZATION: Return response immediately to user
    // All following operations run in background (non-blocking)
    res.json({
      success: true,
      leadId,
    });

    // 3. 🔥 BACKGROUND TASKS (fire-and-forget with retry)
    (async () => {
      try {
        // 🔔 TELEGRAM NOTIFICATION: Отправляем уведомление о новом лиде (первым делом!)
        try {
          console.log('📱 Sending Telegram lead notification for ProfTest...');
          const telegramSent = await sendLeadNotification({
            name,
            phone,
            email: email || undefined,
            source: source || `proftest_${campaignSlug || 'unknown'}`,
          });
          console.log(telegramSent ? '✅ Telegram notification sent' : '⚠️ Telegram notification failed');
        } catch (telegramError: any) {
          console.error('❌ Telegram notification error:', telegramError.message);
          // Don't block the rest of the process
        }

        // 🔥 CRITICAL: Check AmoCRM credentials before attempting sync
        if (!process.env.AMOCRM_ACCESS_TOKEN) {
          console.error('❌❌❌ AmoCRM: ACCESS_TOKEN NOT SET! Cannot sync to AmoCRM!');
          console.error('⚠️ Lead saved to database but NOT synced to AmoCRM');
          console.error('📝 Lead ID:', leadId);
          return; // Exit early, don't attempt sync
        }
        
        console.log('🚀 Starting AmoCRM background sync for lead:', leadId);
        
        // 3a. Create or update in AmoCRM with deduplication (with retry)
        const amocrmResult = await retryWithBackoff(
          () => createOrUpdateLead({
            name,
            email, // Email обязательный
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
          
          // ✅ UPDATE БД с AmoCRM ID
          const { error: updateError } = await landingSupabase
            .from('landing_leads')
            .update({ 
              amocrm_lead_id: amocrmResult.leadId.toString(),
              amocrm_synced: true 
            })
            .eq('id', leadId);
          
          if (updateError) {
            console.error('⚠️ Failed to update amocrm_lead_id in DB:', updateError);
          } else {
            console.log('✅ Database updated with AmoCRM ID');
          }
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
              { email, phone, name }, // Email обязательный
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
          leadId,
          sourceCampaign: `proftest_${campaignSlug || 'unknown'}`,
        });
        console.log('✅ Notifications scheduled');

      } catch (bgError: any) {
        console.error('❌❌❌ Background task error:', bgError.message);
        console.error('🔎 Full error:', bgError);
        console.error('📝 Lead ID:', leadId);
        console.error('👤 Lead data:', { name, email, phone });
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

// ============================================
// UTM CLICK TRACKING ENDPOINT
// ============================================
router.get('/track/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { source } = req.query; // 'email' or 'sms'

    console.log(`📊 Click tracked: Lead ${leadId}, Source: ${source}`);

    if (!leadId || !source) {
      return res.status(400).json({ error: 'Missing leadId or source' });
    }

    // First, get current click_count
    const { data: leadData } = await landingSupabase
      .from('landing_leads')
      .select('click_count')
      .eq('id', leadId)
      .single();

    const currentClickCount = leadData?.click_count || 0;

    // Update click tracking in database
    const updateData: any = {
      click_count: currentClickCount + 1,
    };

    if (source === 'email') {
      updateData.email_clicked = true;
      updateData.email_clicked_at = new Date().toISOString();
    } else if (source === 'sms') {
      updateData.sms_clicked = true;
      updateData.sms_clicked_at = new Date().toISOString();
    }

    const { error } = await landingSupabase
      .from('landing_leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('❌ Error updating click tracking:', error);
      // Don't fail the redirect, just log
    } else {
      console.log(`✅ Click tracking updated: ${JSON.stringify(updateData)}`);
    }

    // 🎉 NEW: Track journey stage (expresscourse clicked from email/SMS)
    const { error: journeyError } = await landingSupabase
      .from('journey_stages')
      .insert({
        lead_id: leadId,
        stage: 'expresscourse_clicked',
        source: source === 'email' ? 'email_link' : 'sms_link',
        metadata: {
          utm_source: source,
          utm_campaign: 'proftest',
        }
      });

    if (journeyError) {
      console.warn('⚠️ Failed to track journey stage:', journeyError);
    } else {
      console.log('✅ Journey stage tracked: expresscourse_clicked');
    }

    // Redirect to ExpressCourse landing
    const redirectUrl = `https://onai.academy/integrator/expresscourse?utm_source=${source}&utm_campaign=proftest&lead_id=${leadId}`;
    return res.redirect(302, redirectUrl);

  } catch (error: any) {
    console.error('❌ Error tracking click:', error);
    // Redirect anyway, don't show error to user
    return res.redirect(302, 'https://onai.academy/integrator/expresscourse');
  }
});

// ============================================
// RESEND NOTIFICATIONS (INSTANT - NO SCHEDULER)
// ============================================
router.post('/resend/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    
    console.log(`🔄 INSTANT Resend request for lead: ${leadId}`);

    // 1. Fetch lead data
    const { data: lead, error: fetchError } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (fetchError || !lead) {
      console.error('❌ Lead not found:', fetchError);
      return res.status(404).json({ error: 'Lead not found' });
    }

    // 2. Check what needs to be sent
    const needsEmail = !lead.email_sent && lead.email;
    const needsSMS = !lead.sms_sent && lead.phone;

    if (!needsEmail && !needsSMS) {
      return res.status(200).json({ 
        message: 'All notifications already sent', 
        lead: {
          id: lead.id,
          email_sent: lead.email_sent,
          sms_sent: lead.sms_sent
        }
      });
    }

    console.log(`📧 INSTANT Sending: Email=${needsEmail}, SMS=${needsSMS}`);

    // 3. SEND IMMEDIATELY (bypass scheduler)
    let emailSuccess = false;
    let smsSuccess = false;

    // Send Email if needed
    if (needsEmail) {
      try {
        emailSuccess = await sendProftestEmailWithTracking(lead.name, lead.email, leadId);
        if (emailSuccess) {
          await landingSupabase
            .from('landing_leads')
            .update({ email_sent: true })
            .eq('id', leadId);
          console.log(`✅ Email sent to ${lead.email}`);
        }
      } catch (err: any) {
        console.error(`❌ Email failed: ${err.message}`);
      }
    }

    // Send SMS if needed
    if (needsSMS) {
      try {
        smsSuccess = await sendProftestResultSMS(lead.phone, leadId);
        if (smsSuccess) {
          await landingSupabase
            .from('landing_leads')
            .update({ sms_sent: true })
            .eq('id', leadId);
          console.log(`✅ SMS sent to ${lead.phone}`);
        }
      } catch (err: any) {
        console.error(`❌ SMS failed: ${err.message}`);
      }
    }

    // Update scheduled_notifications if exists
    await landingSupabase
      .from('scheduled_notifications')
      .update({ 
        status: (emailSuccess && smsSuccess) || (!needsEmail && smsSuccess) || (emailSuccess && !needsSMS) ? 'sent' : 'failed',
        sent_at: new Date().toISOString() 
      })
      .eq('lead_id', leadId)
      .eq('status', 'pending');

    console.log(`✅ INSTANT Resend completed for lead ${leadId}`);

    return res.status(200).json({
      success: true,
      message: 'Notifications sent instantly',
      sent: {
        email: emailSuccess || !needsEmail,
        sms: smsSuccess || !needsSMS,
      }
    });

  } catch (error: any) {
    console.error('❌ Error in instant resend:', error);
    return res.status(500).json({
      error: 'Failed to resend notifications',
      message: error.message,
    });
  }
});

// ============================================
// DELETE LEAD
// ============================================
router.delete('/delete/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    
    console.log(`🗑️ Delete request for lead: ${leadId}`);

    // 1. Delete from scheduled_notifications first (foreign key constraint)
    const { error: notifError } = await landingSupabase
      .from('scheduled_notifications')
      .delete()
      .eq('lead_id', leadId);

    if (notifError) {
      console.error('⚠️ Error deleting scheduled notifications:', notifError);
      // Continue anyway, maybe there were no notifications
    }

    // 2. Delete the lead
    const { error: leadError } = await landingSupabase
      .from('landing_leads')
      .delete()
      .eq('id', leadId);

    if (leadError) {
      console.error('❌ Error deleting lead:', leadError);
      return res.status(500).json({ 
        error: 'Failed to delete lead',
        message: leadError.message 
      });
    }

    console.log(`✅ Lead ${leadId} deleted successfully`);

    return res.status(200).json({
      success: true,
      message: 'Lead deleted successfully',
      leadId,
    });

  } catch (error: any) {
    console.error('❌ Error deleting lead:', error);
    return res.status(500).json({
      error: 'Failed to delete lead',
      message: error.message,
    });
  }
});

// ============================================
// 🔍 ADMIN DIAGNOSTICS - AmoCRM & Leads Check
// ============================================
router.get('/admin/diagnostics', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Starting AmoCRM diagnostics...');

    // 1. Get leads from landing_leads (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: dbLeads, error: dbError } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 2. Get leads from AmoCRM (last 24 hours)
    let amocrmLeads = [];
    try {
      if (AMOCRM_DOMAIN && AMOCRM_ACCESS_TOKEN) {
        const oneDayAgoTimestamp = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
        const response = await axios.get(
          `https://${AMOCRM_DOMAIN}/api/v4/leads`,
          {
            params: {
              'filter[pipeline_id]': AMOCRM_PIPELINE_ID,
              'filter[created_at][from]': oneDayAgoTimestamp,
              with: 'contacts',
              limit: 250
            },
            headers: {
              'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        amocrmLeads = response.data._embedded?.leads || [];
      }
    } catch (amocrmError: any) {
      console.error('❌ AmoCRM API error:', amocrmError.response?.data || amocrmError.message);
    }

    // 3. Find missing leads (in DB but not in AmoCRM)
    const dbLeadIds = new Set(dbLeads?.map(l => l.amocrm_lead_id?.toString()).filter(Boolean));
    const amocrmLeadIds = new Set(amocrmLeads.map((l: any) => l.id.toString()));
    
    const missingInAmoCRM = dbLeads?.filter(l => 
      l.amocrm_lead_id && !amocrmLeadIds.has(l.amocrm_lead_id.toString())
    ) || [];

    const leadsWithoutAmoCRMId = dbLeads?.filter(l => !l.amocrm_lead_id) || [];

    // 4. Prepare response
    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      period: 'Last 24 hours',
      database: {
        total: dbLeads?.length || 0,
        withAmoCRMId: dbLeads?.filter(l => l.amocrm_lead_id).length || 0,
        withoutAmoCRMId: leadsWithoutAmoCRMId.length,
        leads: dbLeads?.map(l => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          source: l.source,
          amocrm_lead_id: l.amocrm_lead_id,
          created_at: l.created_at
        }))
      },
      amocrm: {
        total: amocrmLeads.length,
        configured: !!(AMOCRM_DOMAIN && AMOCRM_ACCESS_TOKEN),
        pipelineId: AMOCRM_PIPELINE_ID,
        leads: amocrmLeads.map((l: any) => ({
          id: l.id,
          name: l.name,
          status_id: l.status_id,
          created_at: new Date(l.created_at * 1000).toISOString()
        }))
      },
      issues: {
        missingInAmoCRM: missingInAmoCRM.length,
        leadsWithoutAmoCRMId: leadsWithoutAmoCRMId.length,
        details: {
          missingLeads: missingInAmoCRM.map(l => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            amocrm_lead_id: l.amocrm_lead_id,
            created_at: l.created_at
          })),
          leadsNeedingSync: leadsWithoutAmoCRMId.map(l => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            created_at: l.created_at
          }))
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Diagnostics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Diagnostics failed',
      message: error.message
    });
  }
});

// ============================================
// 📤 MANUAL AMOCRM SYNC - Выгрузить в AmoCRM
// ============================================
router.post('/sync-to-amocrm/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    
    console.log(`📤 Manual AmoCRM sync request for lead: ${leadId}`);

    // 1. 🔥 BACKWARDS COMPATIBLE: Try to get lead with journey stages, fallback to direct fetch
    let lead: any;
    let journeyStages: any[] = [];
    
    // Try fetching from view first (if migration applied)
    const { data: leadWithJourney, error: viewError } = await landingSupabase
      .from('leads_with_journey')
      .select('*')
      .eq('id', leadId)
      .single();

    if (viewError) {
      console.warn('⚠️ leads_with_journey view not available, using fallback');
      
      // FALLBACK: Get lead from landing_leads table
      const { data: basicLead, error: fetchError } = await landingSupabase
        .from('landing_leads')
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (fetchError || !basicLead) {
        console.error('❌ Lead not found:', fetchError);
        return res.status(404).json({ error: 'Lead not found' });
      }
      
      lead = basicLead;
      journeyStages = []; // No journey stages if view doesn't exist
    } else {
      lead = leadWithJourney;
      journeyStages = Array.isArray(leadWithJourney.journey_stages) 
        ? leadWithJourney.journey_stages 
        : [];
    }

    // 2. Check if already in AmoCRM
    if (lead.amocrm_lead_id) {
      return res.status(200).json({ 
        success: true,
        message: `Лид уже в AmoCRM`,
        amocrm_lead_id: lead.amocrm_lead_id,
        alreadyExists: true
      });
    }

    // 3. 🔥 ENHANCED: Aggregate ALL journey data from all stages
    console.log(`🔍 Analyzing journey for lead ${leadId}:`, journeyStages.length, 'stages');
    
    // Merge UTM params from all stages (newer stages override older)
    let aggregatedUTM: any = lead.metadata?.utmParams || {};
    
    // Extract ProfTest answers from journey stages
    let proftestAnswers: any = lead.metadata?.proftestAnswers || lead.metadata?.answers || [];
    
    // Find payment method from journey stages (latest payment_* stage)
    let paymentMethod: 'kaspi' | 'card' | 'manager' | undefined = undefined;
    
    // Campaign slug (prioritize latest)
    let campaignSlug = lead.metadata?.campaignSlug || lead.source;
    
    // Parse journey stages to collect all data
    if (journeyStages.length > 0) {
      journeyStages.forEach((stage: any) => {
        console.log(`  📍 Stage: ${stage.stage}, Source: ${stage.source}`);
        
        // Merge UTM params from this stage
        if (stage.metadata?.utmParams) {
          aggregatedUTM = { ...aggregatedUTM, ...stage.metadata.utmParams };
        }
        
        // Extract ProfTest answers if found
        if (stage.metadata?.proftestAnswers && !proftestAnswers.length) {
          proftestAnswers = stage.metadata.proftestAnswers;
        }
        if (stage.metadata?.answers && !proftestAnswers.length) {
          proftestAnswers = stage.metadata.answers;
        }
        
        // Extract payment method from stage name or metadata
        if (stage.stage?.startsWith('payment_')) {
          const method = stage.stage.replace('payment_', '') as 'kaspi' | 'card' | 'manager';
          if (['kaspi', 'card', 'manager'].includes(method)) {
            paymentMethod = method;
          }
        }
        if (stage.metadata?.paymentMethod) {
          paymentMethod = stage.metadata.paymentMethod;
        }
      });
    }
    
    console.log('📊 Aggregated manual sync data:', {
      utmParamsCount: Object.keys(aggregatedUTM).length,
      utmParams: aggregatedUTM,
      proftestAnswersCount: Array.isArray(proftestAnswers) ? proftestAnswers.length : Object.keys(proftestAnswers || {}).length,
      paymentMethod,
      campaignSlug,
      journeyStagesCount: journeyStages.length,
    });
    
    const amocrmResult = await retryWithBackoff(
      () => createOrUpdateLead({
        name: lead.name,
        email: lead.email || undefined,
        phone: lead.phone,
        utmParams: aggregatedUTM,
        proftestAnswers,
        paymentMethod,
        campaignSlug,
      }),
      3, // 3 retries
      2000 // 2s initial delay
    );

    if (!amocrmResult) {
      throw new Error('AmoCRM sync failed after retries');
    }

    console.log(`✅ AmoCRM: Lead ${amocrmResult.action} (ID: ${amocrmResult.leadId})`);
    
    // 4. Update DB with AmoCRM ID
    const { error: updateError } = await landingSupabase
      .from('landing_leads')
      .update({ 
        amocrm_lead_id: amocrmResult.leadId.toString(),
        amocrm_synced: true 
      })
      .eq('id', leadId);
    
    if (updateError) {
      console.error('⚠️ Failed to update amocrm_lead_id in DB:', updateError);
    }

    return res.status(200).json({
      success: true,
      message: `Сделка создана в AmoCRM`,
      amocrm_lead_id: amocrmResult.leadId,
      action: amocrmResult.action,
      isNew: amocrmResult.isNew,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email
      }
    });

  } catch (error: any) {
    console.error('❌ Error syncing to AmoCRM:', error);
    return res.status(500).json({
      error: 'Failed to sync to AmoCRM',
      message: error.message,
    });
  }
});

/**
 * POST /api/landing/sync-all-to-amocrm
 * 🎯 Поэтапная синхронизация ВСЕХ landing_leads с AmoCRM
 * Отправляет лиды по одному, ждёт ответа перед отправкой следующего
 */
router.post('/sync-all-to-amocrm', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Starting batch sync of all landing_leads to AmoCRM...');

    // 1. Получаем ВСЕ лиды из БД (без amocrm_lead_id или с ошибками)
    const { data: leadsToSync, error: fetchError } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: true }); // От старых к новым

    if (fetchError) {
      throw new Error(`Failed to fetch leads: ${fetchError.message}`);
    }

    if (!leadsToSync || leadsToSync.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No leads to sync',
        total: 0,
        synced: 0,
        failed: 0
      });
    }

    console.log(`📊 Found ${leadsToSync.length} leads to process`);

    const results = {
      total: leadsToSync.length,
      synced: 0,
      skipped: 0,
      failed: 0,
      errors: [] as any[]
    };

    // 2. Синхронизируем каждый лид ПО ОЧЕРЕДИ
    for (const lead of leadsToSync) {
      try {
        // Пропускаем если уже есть amocrm_lead_id
        if (lead.amocrm_lead_id) {
          console.log(`⏭️  Skipping lead ${lead.id} - already has AmoCRM ID: ${lead.amocrm_lead_id}`);
          results.skipped++;
          continue;
        }

        console.log(`\n🔄 Syncing lead ${results.synced + 1}/${leadsToSync.length}: ${lead.name}`);

        // Создаём контакт в AmoCRM
        const contactId = await createAmoCRMContactSimple({
          name: lead.name,
          email: lead.email,
          phone: lead.phone
        });

        if (!contactId) {
          throw new Error('Failed to create contact in AmoCRM');
        }

        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 500));

        // Создаём сделку в AmoCRM
        const leadId = await createAmoCRMLeadSimple({
          name: `Профтест: ${lead.name}`,
          contactId,
          source: lead.source,
          pipelineId: parseInt(AMOCRM_PIPELINE_ID)
        });

        if (!leadId) {
          throw new Error('Failed to create lead in AmoCRM');
        }

        // Обновляем БД
        const { error: updateError } = await landingSupabase
          .from('landing_leads')
          .update({
            amocrm_lead_id: leadId.toString(),
            amocrm_synced: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', lead.id);

        if (updateError) {
          throw new Error(`Failed to update DB: ${updateError.message}`);
        }

        console.log(`✅ Synced lead ${lead.id} → AmoCRM Lead ID: ${leadId}`);
        results.synced++;

        // Задержка между лидами для избежания rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`❌ Failed to sync lead ${lead.id}:`, error.message);
        results.failed++;
        results.errors.push({
          leadId: lead.id,
          name: lead.name,
          error: error.message
        });
      }
    }

    console.log(`\n📊 Sync completed:`);
    console.log(`   ✅ Synced: ${results.synced}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   ❌ Failed: ${results.failed}`);

    return res.status(200).json({
      success: true,
      message: `Sync completed: ${results.synced} synced, ${results.skipped} skipped, ${results.failed} failed`,
      ...results
    });

  } catch (error: any) {
    console.error('❌ Error in batch sync:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync leads',
      message: error.message
    });
  }
});

/**
 * Упрощённые функции для создания контакта и сделки
 */
async function createAmoCRMContactSimple(data: { name: string; email: string | null; phone: string }): Promise<number | null> {
  try {
    const customFieldsValues: any[] = [
      { field_code: 'PHONE', values: [{ value: data.phone }] }
    ];

    if (data.email && data.email.trim()) {
      customFieldsValues.push({
        field_code: 'EMAIL',
        values: [{ value: data.email }]
      });
    }

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts`,
      [{
        name: data.name,
        custom_fields_values: customFieldsValues
      }],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data._embedded?.contacts?.[0]?.id || null;
  } catch (error: any) {
    console.error('❌ Error creating contact:', error.response?.data || error.message);
    throw error;
  }
}

async function createAmoCRMLeadSimple(data: { name: string; contactId: number; source: string; pipelineId: number }): Promise<number | null> {
  try {
    const leadData: any = {
      name: data.name,
      pipeline_id: data.pipelineId,
      _embedded: {
        contacts: [{ id: data.contactId }]
      }
    };

    // Добавляем цену если это expresscourse
    if (data.source === 'expresscourse') {
      leadData.price = 5000;
    }

    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`,
      [leadData],
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data._embedded?.leads?.[0]?.id || null;
  } catch (error: any) {
    console.error('❌ Error creating lead:', error.response?.data || error.message);
    throw error;
  }
}

export default router;
