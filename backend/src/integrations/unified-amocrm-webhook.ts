// backend/src/integrations/unified-amocrm-webhook.ts
// 🎯 UNIFIED AmoCRM Webhook Handler - Routes to Referral System OR Traffic Dashboard

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import referralService from '../services/referral.service.js';
import { sendToAllChats } from '../services/telegramBot.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// DATABASE CLIENTS
// ═══════════════════════════════════════════════════════════════

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || ''
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
 * Определить куда роутить webhook: referral, traffic, both, unknown
 */
function determineWebhookTarget(utmData: {
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_medium?: string | null;
}): 'referral' | 'traffic' | 'both' | 'unknown' {
  const utmSource = utmData.utm_source?.toLowerCase() || '';
  const utmCampaign = utmData.utm_campaign?.toLowerCase() || '';

  // 1. Если UTM source начинается с ref_ → REFERRAL ONLY
  if (utmSource.startsWith('ref_')) {
    return 'referral';
  }

  // 2. Если UTM campaign/source содержит паттерн таргетолога → TRAFFIC ONLY
  const targetologist = determineTargetologist(utmData.utm_campaign, utmData.utm_source);
  if (targetologist !== 'Unknown') {
    return 'traffic';
  }

  // 3. Если есть UTM данные, но не попало ни в одну категорию → UNKNOWN (логируем)
  if (utmSource || utmCampaign) {
    return 'unknown';
  }

  // 4. Если вообще нет UTM данных → BOTH (на всякий случай)
  return 'both';
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

  // Method 3: From tags (fallback for referral links)
  if (!utmData.utm_source && deal.tags && Array.isArray(deal.tags)) {
    const refTag = deal.tags.find((t: any) => t.name?.startsWith('ref_'));
    if (refTag) {
      utmData.utm_source = refTag.name;
    }
  }

  // Method 4: Direct fields (если AmoCRM отправляет напрямую)
  if (!utmData.utm_source && deal.utm_source) utmData.utm_source = deal.utm_source;
  if (!utmData.utm_medium && deal.utm_medium) utmData.utm_medium = deal.utm_medium;
  if (!utmData.utm_campaign && deal.utm_campaign) utmData.utm_campaign = deal.utm_campaign;
  if (!utmData.utm_content && deal.utm_content) utmData.utm_content = deal.utm_content;
  if (!utmData.utm_term && deal.utm_term) utmData.utm_term = deal.utm_term;

  return utmData;
}

/**
 * Логировать webhook в таблицу webhook_logs
 */
async function logWebhook(payload: {
  lead_id: number;
  deal_data: any;
  utm_source?: string | null;
  utm_campaign?: string | null;
  pipeline_id?: number | null;
  routing_decision: string;
  processing_status: 'success' | 'error' | 'partial';
  error_message?: string | null;
}): Promise<void> {
  try {
    await tripwireSupabase.from('webhook_logs').insert({
      received_at: new Date().toISOString(),
      source: 'amocrm',
      pipeline_id: payload.pipeline_id,
      lead_id: payload.lead_id,
      deal_data: payload.deal_data,
      utm_source: payload.utm_source,
      utm_campaign: payload.utm_campaign,
      routing_decision: payload.routing_decision,
      processing_status: payload.processing_status,
      error_message: payload.error_message,
      processed_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Failed to log webhook:', error.message);
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Обработать продажу для Referral System
 */
async function processReferralSale(dealData: {
  lead_id: number;
  deal_name: string;
  deal_value: number;
  utm_source: string;
  customer_email?: string;
  customer_name?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔗 [Referral] Processing sale for ${dealData.utm_source}`);

    await referralService.recordConversion(
      dealData.utm_source,
      dealData.lead_id.toString(),
      dealData.customer_email || 'unknown@amocrm.com',
      dealData.customer_name || 'AmoCRM Customer',
      dealData.deal_value
    );

    console.log(`✅ [Referral] Conversion recorded for deal ${dealData.lead_id}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Referral] Error processing sale:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Обработать продажу для Traffic Dashboard
 */
async function processTrafficSale(dealData: {
  lead_id: number;
  lead_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  sale_amount: number;
  product_name?: string;
  pipeline_id?: number;
  status_id?: number;
  responsible_user_id?: number;
  responsible_user_name?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  utm_id?: string | null;
  targetologist: string;
  raw_webhook_data: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🎯 [Traffic] Processing sale for ${dealData.targetologist}`);

    // 1. Сохранить в sales_notifications (старая таблица)
    const { error: salesError } = await tripwireSupabase
      .from('sales_notifications')
      .insert({
        lead_id: dealData.lead_id,
        lead_name: dealData.lead_name || 'Без названия',
        contact_name: dealData.contact_name || 'Без имени',
        contact_phone: dealData.contact_phone || null,
        sale_amount: dealData.sale_amount,
        product_name: dealData.product_name || 'Main Product',
        targetologist: dealData.targetologist,
        utm_source: dealData.utm_source,
        utm_medium: dealData.utm_medium,
        utm_campaign: dealData.utm_campaign,
        utm_content: dealData.utm_content,
        utm_term: dealData.utm_term,
        sale_date: new Date().toISOString(),
        pipeline_id: dealData.pipeline_id || null,
        status_id: dealData.status_id || null,
        responsible_user_id: dealData.responsible_user_id || null,
        notification_status: 'pending',
      });

    if (salesError) {
      console.error('❌ [Traffic] Error saving to sales_notifications:', salesError.message);
    }

    // 2. Сохранить в all_sales_tracking (новая таблица для аналитики)
    const { error: trackingError } = await tripwireSupabase
      .from('all_sales_tracking')
      .insert({
        lead_id: dealData.lead_id,
        lead_name: dealData.lead_name || null,
        contact_name: dealData.contact_name || null,
        contact_phone: dealData.contact_phone || null,
        contact_email: dealData.contact_email || null,
        sale_amount: dealData.sale_amount,
        product_name: dealData.product_name || null,
        currency: 'KZT',
        utm_source: dealData.utm_source,
        utm_medium: dealData.utm_medium,
        utm_campaign: dealData.utm_campaign,
        utm_content: dealData.utm_content,
        utm_term: dealData.utm_term,
        utm_id: dealData.utm_id,
        pipeline_id: dealData.pipeline_id || VAMUS_RM_PIPELINE_ID,
        status_id: dealData.status_id || null,
        responsible_user_id: dealData.responsible_user_id || null,
        responsible_user_name: dealData.responsible_user_name || null,
        targetologist: dealData.targetologist,
        sale_date: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        raw_webhook_data: dealData.raw_webhook_data,
      });

    if (trackingError) {
      console.error('❌ [Traffic] Error saving to all_sales_tracking:', trackingError.message);
    }

    // 3. Отправить Telegram уведомление
    try {
      const emoji = getTargetologistEmoji(dealData.targetologist);
      const amount = formatTenge(dealData.sale_amount);

      const message = `
🎉 *НОВАЯ ПРОДАЖА!*

${emoji} *Таргетолог:* ${dealData.targetologist}
👤 *Клиент:* ${dealData.contact_name || 'Без имени'}
💰 *Сумма:* ${amount}
📦 *Продукт:* ${dealData.product_name || 'Main Product'}
🏷️ *Кампания:* ${dealData.utm_campaign || 'N/A'}

*${dealData.targetologist}, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ!* 🔥
`.trim();

      await sendToAllChats(message);
      console.log('✅ [Traffic] Telegram notification sent');

      // Обновить статус уведомления
      await tripwireSupabase
        .from('sales_notifications')
        .update({
          notification_status: 'sent',
          notified_at: new Date().toISOString(),
        })
        .eq('lead_id', dealData.lead_id);

    } catch (telegramError: any) {
      console.error('❌ [Traffic] Error sending Telegram notification:', telegramError.message);
    }

    console.log(`✅ [Traffic] Sale processed for ${dealData.targetologist}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ [Traffic] Error processing sale:`, error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * POST /webhook/amocrm
 * UNIFIED Webhook Handler - Routes to Referral OR Traffic based on UTM
 */
router.post('/amocrm', async (req: Request, res: Response) => {
  try {
    console.log('📥 [Unified Webhook] Incoming request from AmoCRM');
    console.log('📋 [Unified Webhook] Payload:', JSON.stringify(req.body, null, 2));

    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      console.log('⚠️ [Unified Webhook] No leads in payload');
      return res.status(200).json({ success: true, message: 'No leads to process' });
    }

    const results = {
      total: 0,
      referral: { processed: 0, errors: 0 },
      traffic: { processed: 0, errors: 0 },
      unknown: { processed: 0 },
      skipped: 0,
    };

    for (const lead of leads) {
      try {
        // Get deals from lead (AmoCRM может отправлять по-разному)
        const deals = lead.deals || lead.update || [lead];

        for (const deal of deals) {
          results.total++;

          // 1. Проверить pipeline и status
          const pipelineId = deal.pipeline_id || lead.pipeline_id;
          const statusId = deal.status_id || deal.pipeline?.status_id;

          // Фильтр: только VAMUS RM pipeline
          if (pipelineId && pipelineId !== VAMUS_RM_PIPELINE_ID) {
            console.log(`⏭️ [Unified Webhook] Skipping deal ${deal.id} - wrong pipeline ${pipelineId}`);
            results.skipped++;
            continue;
          }

          // Фильтр: только статус "Успешно реализовано"
          if (statusId !== SUCCESS_STATUS_ID) {
            console.log(`⏭️ [Unified Webhook] Skipping deal ${deal.id} - status ${statusId} != ${SUCCESS_STATUS_ID}`);
            results.skipped++;
            continue;
          }

          // 2. Извлечь UTM данные
          const utmData = extractUTMFromDeal(deal);
          console.log(`📊 [Unified Webhook] UTM data for deal ${deal.id}:`, utmData);

          // 3. Определить routing
          const routingDecision = determineWebhookTarget(utmData);
          console.log(`🎯 [Unified Webhook] Routing decision: ${routingDecision}`);

          // 4. Извлечь общие данные
          const leadId = deal.id;
          const dealValue = deal.price || 0;
          const dealName = deal.name || lead.name || 'Unnamed Deal';

          // Получить контактные данные
          const contactName = lead.contact?.name || deal.contact_name || lead.name;
          const contactPhone = lead.contact?.phone || deal.contact_phone;
          const contactEmail = lead.contact?.email || deal.contact_email;

          // 5. Процессинг по routing decision
          let processingStatus: 'success' | 'error' | 'partial' = 'success';
          let errorMessage: string | null = null;

          if (routingDecision === 'referral') {
            // REFERRAL ONLY
            const result = await processReferralSale({
              lead_id: leadId,
              deal_name: dealName,
              deal_value: dealValue,
              utm_source: utmData.utm_source!,
              customer_email: contactEmail,
              customer_name: contactName,
            });

            if (result.success) {
              results.referral.processed++;
            } else {
              results.referral.errors++;
              processingStatus = 'error';
              errorMessage = result.error || null;
            }

          } else if (routingDecision === 'traffic') {
            // TRAFFIC ONLY
            const targetologist = determineTargetologist(utmData.utm_campaign, utmData.utm_source);

            const result = await processTrafficSale({
              lead_id: leadId,
              lead_name: dealName,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              sale_amount: dealValue,
              product_name: 'Main Product (VAMUS RM)',
              pipeline_id: pipelineId,
              status_id: statusId,
              responsible_user_id: deal.responsible_user_id,
              responsible_user_name: deal.responsible_user_name,
              utm_source: utmData.utm_source,
              utm_medium: utmData.utm_medium,
              utm_campaign: utmData.utm_campaign,
              utm_content: utmData.utm_content,
              utm_term: utmData.utm_term,
              utm_id: utmData.utm_id,
              targetologist,
              raw_webhook_data: deal,
            });

            if (result.success) {
              results.traffic.processed++;
            } else {
              results.traffic.errors++;
              processingStatus = 'error';
              errorMessage = result.error || null;
            }

          } else if (routingDecision === 'both') {
            // Process BOTH (fallback для неопределенных случаев)
            console.log(`⚠️ [Unified Webhook] Processing BOTH for deal ${leadId}`);

            const referralResult = await processReferralSale({
              lead_id: leadId,
              deal_name: dealName,
              deal_value: dealValue,
              utm_source: utmData.utm_source || `deal_${leadId}`,
              customer_email: contactEmail,
              customer_name: contactName,
            });

            const targetologist = determineTargetologist(utmData.utm_campaign, utmData.utm_source);
            const trafficResult = await processTrafficSale({
              lead_id: leadId,
              lead_name: dealName,
              contact_name: contactName,
              contact_phone: contactPhone,
              contact_email: contactEmail,
              sale_amount: dealValue,
              product_name: 'Main Product (VAMUS RM)',
              pipeline_id: pipelineId,
              status_id: statusId,
              utm_source: utmData.utm_source,
              utm_medium: utmData.utm_medium,
              utm_campaign: utmData.utm_campaign,
              utm_content: utmData.utm_content,
              utm_term: utmData.utm_term,
              utm_id: utmData.utm_id,
              targetologist,
              raw_webhook_data: deal,
            });

            if (referralResult.success) results.referral.processed++;
            else results.referral.errors++;

            if (trafficResult.success) results.traffic.processed++;
            else results.traffic.errors++;

            processingStatus = (referralResult.success || trafficResult.success) ? 'partial' : 'error';

          } else {
            // UNKNOWN - только логируем
            console.log(`❓ [Unified Webhook] Unknown UTM pattern for deal ${leadId}`);
            results.unknown.processed++;
            processingStatus = 'success'; // Не ошибка, просто неизвестно
          }

          // 6. Логировать в webhook_logs
          await logWebhook({
            lead_id: leadId,
            deal_data: deal,
            utm_source: utmData.utm_source,
            utm_campaign: utmData.utm_campaign,
            pipeline_id: pipelineId,
            routing_decision: routingDecision,
            processing_status: processingStatus,
            error_message: errorMessage,
          });
        }

      } catch (leadError: any) {
        console.error(`❌ [Unified Webhook] Error processing lead:`, leadError.message);
        results.traffic.errors++; // Default to traffic errors
      }
    }

    console.log(`📊 [Unified Webhook] Processing complete:`, results);

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('❌ [Unified Webhook] Fatal error:', error);

    // Always return 200 to AmoCRM to prevent retries
    res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /webhook/amocrm/test
 * Test endpoint to verify webhook is accessible
 */
router.get('/amocrm/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Unified AmoCRM webhook endpoint is active',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    supported_routes: ['referral', 'traffic', 'both', 'unknown'],
  });
});

export default router;
