import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const router = express.Router();

// ============================================
// SUPABASE CLIENT (Lazy Initialization)
// ✅ CRITICAL FIX: Use LANDING_SUPABASE for landing_leads table
// ============================================
let supabase: any = null;

function getSupabase() {
  if (!supabase) {
    const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
    const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';
    
    supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

// ============================================
// AMOCRM CONFIG
// ============================================
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || '';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';
const AMOCRM_PIPELINE_ID = process.env.AMOCRM_PIPELINE_ID || '10350882';

// ============================================
// TYPES
// ============================================
interface LeadTrackingData {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  source: string;
  amocrm_deal_id: string | null;
  amocrm_contact_id: string | null;
  amocrm_status: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  email_opened: boolean;
  email_opened_at: string | null;
  email_clicked: boolean;
  email_clicked_at: string | null;
  email_error: string | null;
  sms_sent: boolean;
  sms_sent_at: string | null;
  sms_delivered: boolean;
  sms_delivered_at: string | null;
  sms_error: string | null;
  // UTM параметры
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  // Отслеживание переходов
  landing_visited: boolean;
  landing_visited_at: string | null;
  landing_visits_count: number;
  email_link_clicked: boolean;
  email_link_clicked_at: string | null;
  sms_link_clicked: boolean;
  sms_link_clicked_at: string | null;
  traffic_source: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface AmoCRMDeal {
  id: number;
  name: string;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  updated_at: number;
  _embedded?: {
    contacts?: Array<{
      id: number;
      name: string;
    }>;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Получить все сделки из AmoCRM за последние 24 часа
 */
async function getRecentAmoCRMLeads(): Promise<AmoCRMDeal[]> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    console.warn('⚠️ AmoCRM not configured');
    return [];
  }

  try {
    // Получаем сделки за последние 24 часа
    const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
    
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/leads`,
      {
        params: {
          'filter[pipeline_id]': AMOCRM_PIPELINE_ID,
          'filter[created_at][from]': oneDayAgo,
          with: 'contacts',
          limit: 250
        },
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data._embedded?.leads || [];
  } catch (error: any) {
    console.error('❌ Error fetching AmoCRM leads:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Получить контакт из AmoCRM
 */
async function getAmoCRMContact(contactId: number): Promise<any> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    return null;
  }

  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error(`❌ Error fetching contact ${contactId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Получить название статуса сделки
 */
async function getStatusName(statusId: number): Promise<string> {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    return `Status #${statusId}`;
  }

  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}/api/v4/leads/pipelines/${AMOCRM_PIPELINE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const statuses = response.data._embedded?.statuses || [];
    const status = statuses.find((s: any) => s.id === statusId);
    return status?.name || `Status #${statusId}`;
  } catch (error: any) {
    console.error('❌ Error fetching status name:', error.response?.data || error.message);
    return `Status #${statusId}`;
  }
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/lead-tracking/leads
 * Получить все лиды с информацией о статусах отправки
 */
router.get('/leads', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching lead tracking data...');

    // 1. Получаем лиды из базы (landing_leads таблица)
    const { data: leadsFromDB, error: dbError } = await getSupabase()
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); // Увеличено с 100 до 500

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch leads from database'
      });
    }

    console.log(`✅ Found ${leadsFromDB?.length || 0} leads in database`);

    // 2. Получаем свежие данные из AmoCRM
    const amoCRMLeads = await getRecentAmoCRMLeads();
    console.log(`✅ Found ${amoCRMLeads.length} leads in AmoCRM`);

    // 3. Синхронизируем данные из AmoCRM в нашу базу
    for (const amoDeal of amoCRMLeads) {
      // Проверяем, есть ли уже эта сделка в базе
      const existingLead = leadsFromDB?.find(
        (l: LeadTrackingData) => l.amocrm_deal_id === amoDeal.id.toString()
      );

      if (!existingLead) {
        // Получаем контакт для этой сделки
        const contactId = amoDeal._embedded?.contacts?.[0]?.id;
        let email = null;
        let phone = null;

        if (contactId) {
          const contact = await getAmoCRMContact(contactId);
          if (contact) {
            // Извлекаем email и phone из кастомных полей
            const emailField = contact.custom_fields_values?.find(
              (f: any) => f.field_code === 'EMAIL'
            );
            const phoneField = contact.custom_fields_values?.find(
              (f: any) => f.field_code === 'PHONE'
            );

            email = emailField?.values?.[0]?.value || null;
            phone = phoneField?.values?.[0]?.value || null;
          }
        }

        // Получаем название статуса
        const statusName = await getStatusName(amoDeal.status_id);

        // Создаем новую запись в базе
        const { error: insertError } = await getSupabase()
          .from('landing_leads')
          .insert({
            full_name: amoDeal.name,
            email,
            phone,
            source: 'amocrm',
            amocrm_deal_id: amoDeal.id.toString(),
            amocrm_contact_id: contactId?.toString() || null,
            amocrm_status: statusName,
            metadata: {
              amocrm_created_at: amoDeal.created_at,
              amocrm_updated_at: amoDeal.updated_at
            }
          });

        if (insertError) {
          console.error('❌ Error inserting lead:', insertError);
        } else {
          console.log(`✅ Created new lead from AmoCRM: ${amoDeal.id}`);
        }
      } else {
        // Обновляем статус существующей сделки
        const statusName = await getStatusName(amoDeal.status_id);
        
        const { error: updateError } = await getSupabase()
          .from('landing_leads')
          .update({ amocrm_status: statusName })
          .eq('id', existingLead.id);

        if (updateError) {
          console.error('❌ Error updating lead:', updateError);
        }
      }
    }

    // 4. Получаем обновленные данные из базы (landing_leads таблица)
    const { data: updatedLeads, error: updatedError } = await getSupabase()
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500); // Увеличено с 100 до 500

    if (updatedError) {
      console.error('❌ Error fetching updated leads:', updatedError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch updated leads'
      });
    }

    // 5. Рассчитываем статистику
    const stats = {
      total_leads: updatedLeads?.length || 0,
      email_sent: updatedLeads?.filter((l: LeadTrackingData) => l.email_sent).length || 0,
      email_opened: updatedLeads?.filter((l: LeadTrackingData) => l.email_opened).length || 0,
      sms_sent: updatedLeads?.filter((l: LeadTrackingData) => l.sms_sent).length || 0,
      sms_delivered: updatedLeads?.filter((l: LeadTrackingData) => l.sms_delivered).length || 0,
      in_amocrm: updatedLeads?.filter((l: LeadTrackingData) => l.amocrm_deal_id).length || 0,
      // Новые метрики
      landing_visited: updatedLeads?.filter((l: LeadTrackingData) => l.landing_visited).length || 0,
      email_link_clicked: updatedLeads?.filter((l: LeadTrackingData) => l.email_link_clicked).length || 0,
      sms_link_clicked: updatedLeads?.filter((l: LeadTrackingData) => l.sms_link_clicked).length || 0,
      from_email: updatedLeads?.filter((l: LeadTrackingData) => l.traffic_source === 'email').length || 0,
      from_sms: updatedLeads?.filter((l: LeadTrackingData) => l.traffic_source === 'sms').length || 0
    };

    return res.status(200).json({
      success: true,
      stats,
      leads: updatedLeads || []
    });

  } catch (error: any) {
    console.error('❌ Error in /leads endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/lead-tracking/sync
 * Ручная синхронизация с AmoCRM
 */
router.post('/sync', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual sync with AmoCRM...');

    // Получаем все сделки из AmoCRM
    const amoCRMLeads = await getRecentAmoCRMLeads();

    if (amoCRMLeads.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No new leads found in AmoCRM',
        synced: 0
      });
    }

    let syncedCount = 0;

    for (const amoDeal of amoCRMLeads) {
      // Проверяем, есть ли уже эта сделка в базе
      const { data: existingLead } = await getSupabase()
        .from('landing_leads')
        .select('*')
        .eq('amocrm_lead_id', amoDeal.id.toString())
        .single();

      const contactId = amoDeal._embedded?.contacts?.[0]?.id;
      let email = null;
      let phone = null;

      if (contactId) {
        const contact = await getAmoCRMContact(contactId);
        if (contact) {
          const emailField = contact.custom_fields_values?.find(
            (f: any) => f.field_code === 'EMAIL'
          );
          const phoneField = contact.custom_fields_values?.find(
            (f: any) => f.field_code === 'PHONE'
          );

          email = emailField?.values?.[0]?.value || null;
          phone = phoneField?.values?.[0]?.value || null;
        }
      }

      const statusName = await getStatusName(amoDeal.status_id);

      if (!existingLead) {
        // Создаем новую запись
        const { error: insertError } = await getSupabase()
          .from('landing_leads')
          .insert({
            name: amoDeal.name,
            email,
            phone,
            source: 'amocrm',
            amocrm_deal_id: amoDeal.id.toString(),
            amocrm_contact_id: contactId?.toString() || null,
            amocrm_status: statusName,
            metadata: {
              amocrm_created_at: amoDeal.created_at,
              amocrm_updated_at: amoDeal.updated_at
            }
          });

        if (!insertError) {
          syncedCount++;
        }
      } else {
        // Обновляем существующую запись
        const { error: updateError } = await getSupabase()
          .from('landing_leads')
          .update({ amocrm_status: statusName })
          .eq('id', existingLead.id);

        if (!updateError) {
          syncedCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Synced ${syncedCount} leads from AmoCRM`,
      synced: syncedCount
    });

  } catch (error: any) {
    console.error('❌ Error in /sync endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/lead-tracking/update-email-status
 * Обновить статус отправки email
 */
router.post('/update-email-status', async (req: Request, res: Response) => {
  try {
    const { leadId, status, error } = req.body;

    if (!leadId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, status'
      });
    }

    const updateData: any = {
      email_sent: status === 'sent' || status === 'opened' || status === 'clicked',
      email_sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      email_opened: status === 'opened' || status === 'clicked',
      email_opened_at: status === 'opened' ? new Date().toISOString() : undefined,
      email_clicked: status === 'clicked',
      email_clicked_at: status === 'clicked' ? new Date().toISOString() : undefined,
      email_error: status === 'error' ? error : null
    };

    const { error: updateError } = await getSupabase()
      .from('landing_leads')
      .update(updateData)
      .eq('id', leadId);

    if (updateError) {
      console.error('❌ Error updating email status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update email status'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email status updated'
    });

  } catch (error: any) {
    console.error('❌ Error in /update-email-status endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/lead-tracking/update-sms-status
 * Обновить статус отправки SMS
 */
router.post('/update-sms-status', async (req: Request, res: Response) => {
  try {
    const { leadId, status, error } = req.body;

    if (!leadId || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, status'
      });
    }

    const updateData: any = {
      sms_sent: status === 'sent' || status === 'delivered',
      sms_sent_at: status === 'sent' ? new Date().toISOString() : undefined,
      sms_delivered: status === 'delivered',
      sms_delivered_at: status === 'delivered' ? new Date().toISOString() : undefined,
      sms_error: status === 'error' ? error : null
    };

    const { error: updateError } = await getSupabase()
      .from('landing_leads')
      .update(updateData)
      .eq('id', leadId);

    if (updateError) {
      console.error('❌ Error updating SMS status:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update SMS status'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'SMS status updated'
    });

  } catch (error: any) {
    console.error('❌ Error in /update-sms-status endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/lead-tracking/track-click
 * Отслеживание клика по ссылке (из Email или SMS)
 */
router.post('/track-click', async (req: Request, res: Response) => {
  try {
    const { email, phone, source, utm } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone required'
      });
    }

    // Находим лида по email или телефону
    let query = getSupabase().from('landing_leads').select('*');
    
    if (email) {
      query = query.eq('email', email);
    } else if (phone) {
      query = query.eq('phone', phone);
    }

    const { data: lead, error: findError } = await query.single();

    if (findError || !lead) {
      console.error('❌ Lead not found:', email || phone);
      return res.status(404).json({
        success: false,
        error: 'Lead not found'
      });
    }

    // Обновляем статус клика
    const updateData: any = {
      landing_visited: true,
      landing_visited_at: new Date().toISOString(),
      landing_visits_count: (lead.landing_visits_count || 0) + 1,
      traffic_source: source || 'direct'
    };

    if (source === 'email') {
      updateData.email_link_clicked = true;
      updateData.email_link_clicked_at = new Date().toISOString();
    } else if (source === 'sms') {
      updateData.sms_link_clicked = true;
      updateData.sms_link_clicked_at = new Date().toISOString();
    }

    // Добавляем UTM параметры если есть
    if (utm) {
      if (utm.source) updateData.utm_source = utm.source;
      if (utm.medium) updateData.utm_medium = utm.medium;
      if (utm.campaign) updateData.utm_campaign = utm.campaign;
      if (utm.content) updateData.utm_content = utm.content;
      if (utm.term) updateData.utm_term = utm.term;
    }

    const { error: updateError } = await getSupabase()
      .from('landing_leads')
      .update(updateData)
      .eq('id', lead.id);

    if (updateError) {
      console.error('❌ Error tracking click:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to track click'
      });
    }

    console.log(`✅ Click tracked: ${email || phone} from ${source}`);

    return res.status(200).json({
      success: true,
      message: 'Click tracked successfully'
    });

  } catch (error: any) {
    console.error('❌ Error in /track-click endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * GET /api/lead-tracking/stats
 * Получить детальную статистику по переходам
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data: leads, error } = await getSupabase()
      .from('landing_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const stats = {
      total: leads?.length || 0,
      email_sent: leads?.filter((l: any) => l.email_sent).length || 0,
      sms_sent: leads?.filter((l: any) => l.sms_sent).length || 0,
      landing_visited: leads?.filter((l: any) => l.landing_visited).length || 0,
      email_clicked: leads?.filter((l: any) => l.email_link_clicked).length || 0,
      sms_clicked: leads?.filter((l: any) => l.sms_link_clicked).length || 0,
      conversion_email: leads?.filter((l: any) => l.email_sent).length > 0
        ? ((leads?.filter((l: any) => l.email_link_clicked).length || 0) / (leads?.filter((l: any) => l.email_sent).length || 1) * 100).toFixed(2)
        : '0.00',
      conversion_sms: leads?.filter((l: any) => l.sms_sent).length > 0
        ? ((leads?.filter((l: any) => l.sms_link_clicked).length || 0) / (leads?.filter((l: any) => l.sms_sent).length || 1) * 100).toFixed(2)
        : '0.00'
    };

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('❌ Error in /stats endpoint:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;

