import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic';
import { AMOCRM_CONFIG } from '../config/amocrm-config';

const router = Router();

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_TIMEOUT = 30000; // 30 секунд

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AMOCRM_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: options.signal || controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

interface AmoCRMLead {
  id: number;
  name: string;
  status_id: number;
  created_at: number;
  updated_at: number;
  _embedded?: {
    contacts?: Array<{
      id: number;
      name?: string;
      custom_fields_values?: Array<{
        field_code: string;
        values: Array<{ value: string }>;
      }>;
    }>;
  };
}

/**
 * Получить лиды из AmoCRM (ограниченное количество для оптимизации)
 */
async function fetchRecentAmoCRMLeads(maxLeads = 500): Promise<AmoCRMLead[]> {
  if (!AMOCRM_TOKEN) {
    throw new Error('AmoCRM not configured');
  }

  try {
    const allLeads: AmoCRMLead[] = [];
    let page = 1;
    const limit = 250; // Max per page
    const maxPages = Math.ceil(maxLeads / limit);

    console.log(`🔄 Fetching up to ${maxLeads} recent leads from AmoCRM...`);

    while (page <= maxPages) {
      console.log(`  📥 Page ${page}/${maxPages}...`);
      
      const response = await fetchWithTimeout(
        `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads?filter[pipeline_id]=${AMOCRM_CONFIG.PIPELINE_ID}&with=contacts&limit=${limit}&page=${page}&order[created_at]=desc`,
        {
          headers: {
            Authorization: `Bearer ${AMOCRM_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`❌ AmoCRM API error: ${response.status}`);
        break;
      }

      const data: any = await response.json();
      const leads = data._embedded?.leads || [];

      if (leads.length === 0) break;

      allLeads.push(...leads);

      // Если получили меньше limit, значит это последняя страница
      if (leads.length < limit) break;

      page++;
      
      // Небольшая пауза между запросами чтобы не нагружать AmoCRM API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Fetched ${allLeads.length} leads from AmoCRM`);
    return allLeads;
  } catch (error: any) {
    console.error('❌ Error fetching AmoCRM leads:', error.message);
    throw error;
  }
}

/**
 * Получить email/phone контакта из AmoCRM lead
 */
function getContactInfo(lead: AmoCRMLead): { email?: string; phone?: string } {
  const contacts = lead._embedded?.contacts || [];
  if (contacts.length === 0) return {};

  const contact = contacts[0];
  const customFields = contact.custom_fields_values || [];

  let email: string | undefined;
  let phone: string | undefined;

  for (const field of customFields) {
    if (field.field_code === 'EMAIL' && field.values.length > 0) {
      email = field.values[0].value;
    }
    if (field.field_code === 'PHONE' && field.values.length > 0) {
      phone = field.values[0].value;
    }
  }

  return { email, phone };
}

/**
 * POST /api/admin/landing/sync-amocrm
 * Синхронизация лидов из landing_leads с AmoCRM
 */
router.post('/sync-amocrm', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting AmoCRM sync...');

    // 1. Получить последние лиды из AmoCRM (ограничено 500 для оптимизации)
    const amocrmLeads = await fetchRecentAmoCRMLeads(500);

    // 2. Получить все лиды из landing_leads (LANDING DB)
    const { data: landingLeads, error: dbError } = await trafficAdminSupabase
      .from('traffic_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`📊 Database has ${landingLeads?.length || 0} leads`);

    // 3. Создать map AmoCRM leads по email/phone
    const amocrmMap = new Map<string, AmoCRMLead>();
    
    for (const lead of amocrmLeads) {
      const { email, phone } = getContactInfo(lead);
      
      // Индексируем по email
      if (email) {
        const key = email.toLowerCase().trim();
        amocrmMap.set(key, lead);
      }
      
      // Индексируем по phone (нормализуем)
      if (phone) {
        const normalizedPhone = phone.replace(/\D/g, ''); // Убираем все не-цифры
        amocrmMap.set(normalizedPhone, lead);
      }
    }

    // 4. Сопоставить landing_leads с AmoCRM
    const results = {
      total_landing_leads: landingLeads?.length || 0,
      total_amocrm_leads: amocrmLeads.length,
      
      synced: [] as any[], // Лиды которые уже синхронизированы
      not_synced: [] as any[], // Лиды которые НЕ синхронизированы с AmoCRM
      
      email_sent: 0, // Кол-во отправленных email
      email_failed: 0, // Кол-во failed email
      sms_sent: 0, // Кол-во отправленных SMS
      sms_failed: 0, // Кол-во failed SMS
    };

    for (const lead of landingLeads || []) {
      // Проверяем статусы отправки
      if (lead.email_sent) results.email_sent++;
      if (lead.email_error) results.email_failed++;
      if (lead.sms_sent) results.sms_sent++;
      if (lead.sms_error) results.sms_failed++;

      // Ищем в AmoCRM
      let amocrmLead: AmoCRMLead | undefined;

      // Поиск по email
      if (lead.email) {
        const emailKey = lead.email.toLowerCase().trim();
        amocrmLead = amocrmMap.get(emailKey);
      }

      // Поиск по phone (если не нашли по email)
      if (!amocrmLead && lead.phone) {
        const phoneKey = lead.phone.replace(/\D/g, '');
        amocrmLead = amocrmMap.get(phoneKey);
      }

      // Статус синхронизации
      const syncStatus = {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        created_at: lead.created_at,
        
        // AmoCRM статус
        in_amocrm: !!amocrmLead,
        amocrm_lead_id: amocrmLead?.id || lead.amocrm_lead_id,
        amocrm_synced: lead.amocrm_synced,
        
        // Статусы отправки
        email_sent: lead.email_sent,
        email_sent_at: lead.email_sent_at,
        email_error: lead.email_error,
        
        sms_sent: lead.sms_sent,
        sms_sent_at: lead.sms_sent_at,
        sms_error: lead.sms_error,
        
        // Дополнительная информация
        email_opened: !!lead.email_opened_at,
        email_clicked: lead.email_clicked,
        sms_clicked: lead.sms_clicked,
      };

      if (amocrmLead) {
        results.synced.push(syncStatus);
        
        // Обновляем amocrm_lead_id если его нет
        if (!lead.amocrm_lead_id || lead.amocrm_lead_id !== amocrmLead.id.toString()) {
          await trafficAdminSupabase
            .from('traffic_leads')
            .update({
              amocrm_lead_id: amocrmLead.id.toString(),
              amocrm_synced: true,
            })
            .eq('id', lead.id);
        }
      } else {
        results.not_synced.push(syncStatus);
      }
    }

    console.log('✅ Sync completed:', {
      synced: results.synced.length,
      not_synced: results.not_synced.length,
      email_sent: results.email_sent,
      sms_sent: results.sms_sent,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync with AmoCRM',
    });
  }
});

export default router;

