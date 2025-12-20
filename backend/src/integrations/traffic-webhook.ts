// backend/src/integrations/traffic-webhook.ts
// 🎯 DEDICATED Traffic Dashboard Webhook Handler
// URL: https://api.onai.academy/webhook/amocrm/traffic

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { sendToAllChats } from '../services/telegramBot.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// DATABASE CLIENT
// ═══════════════════════════════════════════════════════════════

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || process.env.TRIPWIRE_SUPABASE_ANON_KEY || ''
);

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VAMUS_RM_PIPELINE_ID = 10418746;
const SUCCESS_STATUS_ID = 142; // "Успешно реализовано"

// 🎯 Маппинг UTM кампаний на таргетологов
const TARGETOLOGIST_MAPPING: Record<string, string[]> = {
  'Kenesary': ['tripwire', 'nutcab', 'kenesary', 'kenji'],
  'Arystan': ['arystan'],
  'Muha': ['on ai', 'onai', 'запуск', 'yourmarketolog', 'muha'],
  'Traf4': ['alex', 'traf4', 'proftest', 'pb_agency'],
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Определить таргетолога по UTM меткам
 */
function determineTargetologist(utmCampaign: string | null, utmSource: string | null): string {
  if (!utmCampaign && !utmSource) {
    return 'Unknown';
  }

  const campaignLower = (utmCampaign || '').toLowerCase();
  const sourceLower = (utmSource || '').toLowerCase();

  for (const [targetologist, patterns] of Object.entries(TARGETOLOGIST_MAPPING)) {
    for (const pattern of patterns) {
      if (campaignLower.includes(pattern.toLowerCase()) || sourceLower.includes(pattern.toLowerCase())) {
        return targetologist;
      }
    }
  }

  return 'Unknown';
}

/**
 * Получить эмодзи для таргетолога
 */
function getTargetologistEmoji(targetologist: string): string {
  const emojis: Record<string, string> = {
    'Kenesary': '👑',
    'Arystan': '🦁',
    'Muha': '🚀',
    'Traf4': '⚡',
    'Unknown': '❓',
  };
  return emojis[targetologist] || '🎯';
}

/**
 * Форматировать сумму в тенге
 */
function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).replace('KZT', '₸').trim();
}

/**
 * Извлечь UTM метки из deal
 */
function extractUTMFromDeal(deal: any): {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  utm_id?: string | null;
} {
  const utmData: any = {};

  // Method 1: From custom_fields_values (AmoCRM v4 API)
  if (deal.custom_fields_values && Array.isArray(deal.custom_fields_values)) {
    for (const field of deal.custom_fields_values) {
      const fieldName = field.field_name?.toLowerCase() || '';
      const value = field.values?.[0]?.value;

      if (!value) continue;

      if (fieldName.includes('utm_source') || fieldName.includes('источник')) {
        utmData.utm_source = value;
      } else if (fieldName.includes('utm_medium') || fieldName.includes('канал')) {
        utmData.utm_medium = value;
      } else if (fieldName.includes('utm_campaign') || fieldName.includes('кампания')) {
        utmData.utm_campaign = value;
      } else if (fieldName.includes('utm_content') || fieldName.includes('контент')) {
        utmData.utm_content = value;
      } else if (fieldName.includes('utm_term') || fieldName.includes('ключ')) {
        utmData.utm_term = value;
      } else if (fieldName.includes('utm_id')) {
        utmData.utm_id = value;
      }
    }
  }

  // Method 2: From custom_fields (older API)
  if (deal.custom_fields && Array.isArray(deal.custom_fields)) {
    for (const field of deal.custom_fields) {
      const fieldName = field.name?.toLowerCase() || field.code?.toLowerCase() || '';
      const value = field.values?.[0]?.value || field.value;

      if (!value) continue;

      if (!utmData.utm_source && (fieldName.includes('utm_source') || fieldName === 'utm_source')) {
        utmData.utm_source = value;
      }
      if (!utmData.utm_medium && (fieldName.includes('utm_medium') || fieldName === 'utm_medium')) {
        utmData.utm_medium = value;
      }
      if (!utmData.utm_campaign && (fieldName.includes('utm_campaign') || fieldName === 'utm_campaign')) {
        utmData.utm_campaign = value;
      }
    }
  }

  // Method 3: Direct fields
  if (!utmData.utm_source && deal.utm_source) utmData.utm_source = deal.utm_source;
  if (!utmData.utm_medium && deal.utm_medium) utmData.utm_medium = deal.utm_medium;
  if (!utmData.utm_campaign && deal.utm_campaign) utmData.utm_campaign = deal.utm_campaign;
  if (!utmData.utm_content && deal.utm_content) utmData.utm_content = deal.utm_content;
  if (!utmData.utm_term && deal.utm_term) utmData.utm_term = deal.utm_term;

  return utmData;
}

/**
 * Логировать webhook
 */
async function logWebhook(payload: {
  lead_id: number;
  deal_data: any;
  utm_source?: string | null;
  utm_campaign?: string | null;
  pipeline_id?: number | null;
  processing_status: 'success' | 'error';
  error_message?: string | null;
  targetologist: string;
}): Promise<void> {
  try {
    await tripwireSupabase.from('webhook_logs').insert({
      received_at: new Date().toISOString(),
      source: 'amocrm_traffic',
      pipeline_id: payload.pipeline_id,
      lead_id: payload.lead_id,
      deal_data: payload.deal_data,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
      routing_decision: 'traffic', // Always traffic for this endpoint
      processing_status: payload.processing_status,
      error_message: payload.error_message,
      processed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Failed to log webhook:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /webhook/amocrm/traffic
 * Dedicated webhook for Traffic Dashboard ONLY
 */
router.post('/traffic', async (req: Request, res: Response) => {
  try {
    console.log('🎯 [Traffic Webhook] Incoming request from AmoCRM');
    console.log('📋 [Traffic Webhook] Payload:', JSON.stringify(req.body, null, 2));

    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      console.log('⚠️ [Traffic Webhook] No leads in payload');
      return res.status(200).json({ success: true, message: 'No leads to process' });
    }

    const results = {
      total: 0,
      processed: 0,
      errors: 0,
      skipped: 0,
    };

    for (const lead of leads) {
      try {
        const deals = lead.deals || lead.update || [lead];

        for (const deal of deals) {
          results.total++;

          // 1. Проверить pipeline и status
          const pipelineId = deal.pipeline_id || lead.pipeline_id;
          const statusId = deal.status_id || deal.pipeline?.status_id;

          // Фильтр: только VAMUS RM pipeline
          if (pipelineId && pipelineId !== VAMUS_RM_PIPELINE_ID) {
            console.log(`⏭️ [Traffic Webhook] Skipping deal ${deal.id} - wrong pipeline ${pipelineId}`);
            results.skipped++;
            continue;
          }

          // Фильтр: только статус "Успешно реализовано"
          if (statusId !== SUCCESS_STATUS_ID) {
            console.log(`⏭️ [Traffic Webhook] Skipping deal ${deal.id} - status ${statusId} != ${SUCCESS_STATUS_ID}`);
            results.skipped++;
            continue;
          }

          // 2. Извлечь UTM данные
          const utmData = extractUTMFromDeal(deal);
          console.log(`📊 [Traffic Webhook] UTM data for deal ${deal.id}:`, utmData);

          // 3. Определить таргетолога
          const targetologist = determineTargetologist(utmData.utm_campaign, utmData.utm_source);
          console.log(`🎯 [Traffic Webhook] Targetologist: ${targetologist}`);

          // 4. Извлечь данные о продаже
          const leadId = deal.id;
          const dealValue = deal.price || 0;
          const dealName = deal.name || lead.name || 'Unnamed Deal';
          const contactName = lead.contact?.name || deal.contact_name || lead.name;
          const contactPhone = lead.contact?.phone || deal.contact_phone;
          const contactEmail = lead.contact?.email || deal.contact_email;

          // 5. Сохранить в sales_notifications (старая таблица)
          const { error: salesError } = await tripwireSupabase
            .from('sales_notifications')
            .insert({
              lead_id: leadId,
              lead_name: dealName || 'Без названия',
              contact_name: contactName || 'Без имени',
              contact_phone: contactPhone || null,
              sale_amount: dealValue,
              product_name: 'Main Product (VAMUS RM)',
              targetologist,
              utm_source: utmData.utm_source,
              utm_medium: utmData.utm_medium,
              utm_campaign: utmData.utm_campaign,
              utm_content: utmData.utm_content,
              utm_term: utmData.utm_term,
              sale_date: new Date().toISOString(),
              pipeline_id: pipelineId || VAMUS_RM_PIPELINE_ID,
              status_id: statusId || null,
              responsible_user_id: deal.responsible_user_id || null,
              notification_status: 'pending',
            });

          if (salesError) {
            console.error('❌ [Traffic Webhook] Error saving to sales_notifications:', salesError.message);
            results.errors++;
            await logWebhook({
              lead_id: leadId,
              deal_data: deal,
              utm_source: utmData.utm_source,
              utm_campaign: utmData.utm_campaign,
              pipeline_id: pipelineId,
              processing_status: 'error',
              error_message: salesError.message,
              targetologist,
            });
            continue;
          }

          // 6. Сохранить в all_sales_tracking (новая таблица)
          const { error: trackingError } = await tripwireSupabase
            .from('all_sales_tracking')
            .insert({
              lead_id: leadId,
              lead_name: dealName || null,
              contact_name: contactName || null,
              contact_phone: contactPhone || null,
              contact_email: contactEmail || null,
              sale_amount: dealValue,
              product_name: 'Main Product (VAMUS RM)',
              currency: 'KZT',
              utm_source: utmData.utm_source,
              utm_medium: utmData.utm_medium,
              utm_campaign: utmData.utm_campaign,
              utm_content: utmData.utm_content,
              utm_term: utmData.utm_term,
              utm_id: utmData.utm_id,
              pipeline_id: pipelineId || VAMUS_RM_PIPELINE_ID,
              status_id: statusId || null,
              responsible_user_id: deal.responsible_user_id || null,
              responsible_user_name: deal.responsible_user_name || null,
              targetologist,
              sale_date: new Date().toISOString(),
              webhook_received_at: new Date().toISOString(),
              raw_webhook_data: deal,
            });

          if (trackingError) {
            console.error('❌ [Traffic Webhook] Error saving to all_sales_tracking:', trackingError.message);
          }

          // 7. Отправить Telegram уведомление
          try {
            const emoji = getTargetologistEmoji(targetologist);
            const amount = formatTenge(dealValue);

            const message = `
🎉 *НОВАЯ ПРОДАЖА!*

${emoji} *Таргетолог:* ${targetologist}
👤 *Клиент:* ${contactName || 'Без имени'}
💰 *Сумма:* ${amount}
📦 *Продукт:* Main Product (VAMUS RM)
🏷️ *Кампания:* ${utmData.utm_campaign || 'N/A'}

*${targetologist}, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ!* 🔥
`.trim();

            await sendToAllChats(message);
            console.log('✅ [Traffic Webhook] Telegram notification sent');

            // Обновить статус уведомления
            await tripwireSupabase
              .from('sales_notifications')
              .update({
                notification_status: 'sent',
                notified_at: new Date().toISOString(),
              })
              .eq('lead_id', leadId);

          } catch (telegramError: any) {
            console.error('❌ [Traffic Webhook] Telegram error:', telegramError.message);
          }

          // 8. Логировать успех
          await logWebhook({
            lead_id: leadId,
            deal_data: deal,
            utm_source: utmData.utm_source,
            utm_campaign: utmData.utm_campaign,
            pipeline_id: pipelineId,
            processing_status: 'success',
            error_message: null,
            targetologist,
          });

          results.processed++;
          console.log(`✅ [Traffic Webhook] Sale processed for ${targetologist} (Lead #${leadId})`);
        }

      } catch (leadError: any) {
        console.error(`❌ [Traffic Webhook] Error processing lead:`, leadError.message);
        results.errors++;
      }
    }

    console.log(`📊 [Traffic Webhook] Processing complete:`, results);

    res.json({
      success: true,
      results,
      endpoint: 'traffic',
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [Traffic Webhook] Fatal error:', error);

    // Always return 200 to AmoCRM to prevent retries
    res.status(200).json({
      success: false,
      error: error.message,
      endpoint: 'traffic',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /webhook/amocrm/traffic/test
 * Test endpoint
 */
router.get('/traffic/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Traffic Dashboard webhook endpoint is active',
    endpoint: '/webhook/amocrm/traffic',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    pipeline: VAMUS_RM_PIPELINE_ID,
    targetologists: Object.keys(TARGETOLOGIST_MAPPING),
  });
});

export default router;
