// @ts-nocheck
/**
 * ════════════════════════════════════════════════════════════════════════
 * 📚 AMOCRM CHALLENGE 3D WEBHOOK (3х дневник - FULL PAYMENT)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Endpoint: POST /api/amocrm/challenge3d-sale
 * Purpose: Принимает данные о ПОЛНЫХ продажах "3х дневник" из AmoCRM
 * Pipelines:
 *   - 9777626 (КЦ - Короткий Курс)
 *   - 9430994 (ОП - Основные Продукты)
 *   - 9977350 (Новая воронка предоплат - full payment stage)
 * Статусы: 142 (Успешно реализовано)
 *
 * ✅ Сохраняет в Traffic DB → challenge3d_sales с prepaid=false
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { getOriginalUTM, extractPhoneFromDeal } from '../utils/amocrm-utils.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 🔌 AMOCRM API CONFIGURATION
// ════════════════════════════════════════════════════════════════════════
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';

// Pipeline IDs для "3х дневник"
const CHALLENGE3D_PIPELINE_IDS = [
  9777626, // КЦ (Короткий Курс)
  9430994  // ОП (Основные Продукты)
];

// Status IDs
const STATUS_УСПЕШНО = 142; // Успешно реализовано
const STATUS_РЕАЛИЗОВАНО = 142; // То же самое (пользователь упомянул "Успешно" и "Реализовано")

// ════════════════════════════════════════════════════════════════════════
// 🛡️ DEDUPLICATION CACHE - Prevents webhook retry loop
// ════════════════════════════════════════════════════════════════════════
const webhookCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function cleanOldWebhooks() {
  const now = Date.now();
  for (const [key, timestamp] of webhookCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      webhookCache.delete(key);
    }
  }
}

setInterval(cleanOldWebhooks, 60000);

function generateWebhookId(data: any): string {
  const leadIds = data?.leads?.status?.map((l: any) => l.id).join(',') || 'unknown';
  const timestamp = Math.floor(Date.now() / (60 * 1000));
  return `challenge3d_${leadIds}_${timestamp}`;
}

function isDuplicate(webhookId: string): boolean {
  const exists = webhookCache.has(webhookId);
  if (!exists) {
    webhookCache.set(webhookId, Date.now());
  }
  return exists;
}

// ════════════════════════════════════════════════════════════════════════
// 🏷️ EXTRACT UTM DATA FROM CUSTOM FIELDS
// ════════════════════════════════════════════════════════════════════════
interface UTMData {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
  utm_referrer?: string;
  fbclid?: string;
}

const UTM_FIELD_IDS = {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
  UTM_CONTENT: 434725,
  UTM_TERM: 434733,
  UTM_REFERRER: 434735,
  FBCLID: 434761,
};

function extractUTMData(customFields: any[]): UTMData {
  const utm: UTMData = {};

  if (!customFields || !Array.isArray(customFields)) {
    return utm;
  }

  for (const field of customFields) {
    const value = field.values?.[0]?.value;

    if (!value) continue;

    switch (field.field_id) {
      case UTM_FIELD_IDS.UTM_SOURCE:
        utm.utm_source = value;
        break;
      case UTM_FIELD_IDS.UTM_MEDIUM:
        utm.utm_medium = value;
        break;
      case UTM_FIELD_IDS.UTM_CAMPAIGN:
        utm.utm_campaign = value;
        break;
      case UTM_FIELD_IDS.UTM_CONTENT:
        utm.utm_content = value;
        break;
      case UTM_FIELD_IDS.UTM_TERM:
        utm.utm_term = value;
        break;
      case UTM_FIELD_IDS.UTM_REFERRER:
        utm.utm_referrer = value;
        break;
      case UTM_FIELD_IDS.FBCLID:
        utm.fbclid = value;
        break;
    }
  }

  return utm;
}

// ════════════════════════════════════════════════════════════════════════
// 🎯 DETERMINE PRODUCT TYPE (Challenge3D vs Express)
// ════════════════════════════════════════════════════════════════════════
/**
 * Определяет тип продукта по utm_campaign и pipeline_id
 *
 * ПРОБЛЕМА: Если у таргетолога один utm_source (например kenjifb) используется
 * для разных продуктов, то нужно различать по utm_campaign или pipeline
 *
 * РЕШЕНИЕ:
 * 1. Проверяем pipeline_id (приоритет)
 * 2. Проверяем utm_campaign на ключевые слова
 */
function determineProductType(lead: any, utm: UTMData): 'challenge3d' | 'express' | 'unknown' {
  const campaign = (utm.utm_campaign || '').toLowerCase();
  const pipelineId = lead.pipeline_id;

  // Проверка по pipeline_id (самый надежный способ)
  if (CHALLENGE3D_PIPELINE_IDS.includes(pipelineId)) {
    return 'challenge3d';
  }

  if (pipelineId === 10350882) { // Express Course pipeline
    return 'express';
  }

  // Проверка по utm_campaign (если pipeline неизвестен или один source на разные продукты)
  if (campaign.includes('3d') ||
      campaign.includes('challenge') ||
      campaign.includes('трехдневник') ||
      campaign.includes('3дневник') ||
      campaign.includes('3х') ||
      campaign.includes('diary')) {
    return 'challenge3d';
  }

  if (campaign.includes('express') ||
      campaign.includes('экспресс') ||
      campaign.includes('5000') ||
      campaign.includes('5k')) {
    return 'express';
  }

  return 'unknown';
}

// ════════════════════════════════════════════════════════════════════════
// 🎯 DETERMINE TARGETOLOGIST FROM UTM
// ════════════════════════════════════════════════════════════════════════
function determineTargetologistFromUTM(utm: UTMData): string | null {
  const source = (utm.utm_source || '').toLowerCase();
  const medium = (utm.utm_medium || '').toLowerCase();
  const campaign = (utm.utm_campaign || '').toLowerCase();

  // Kenesary patterns (включая kenjifb)
  if (
    source.includes('kenesary') ||
    source.includes('kenji') ||
    source.includes('kenjifb') ||
    source.includes('tripwire') ||
    source.includes('nutcab') ||
    source.includes('kab3') ||
    source.includes('1day') ||
    source.includes('pb_agency')
  ) {
    return 'Kenesary';
  }

  // Arystan patterns (включая fbarystan)
  if (
    source.includes('arystan') ||
    source.includes('ar_') ||
    source.includes('ast_') ||
    source.includes('fbarystan') ||
    source.includes('rm almaty') ||
    source.includes('rm_almaty')
  ) {
    return 'Arystan';
  }

  // Muha patterns
  if (
    source.includes('onai') ||
    source.includes('on ai') ||
    source.includes('запуск') ||
    source.includes('muha') ||
    medium.includes('yourmarketolog')
  ) {
    return 'Muha';
  }

  // Traf4 patterns (включая alex_FB, alex_inst)
  if (
    source.includes('alex') ||
    source.includes('traf4') ||
    source.includes('proftest') ||
    campaign.includes('alex') ||
    campaign.includes('proftest')
  ) {
    return 'Traf4';
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════
// 🔍 DETERMINE IF PREPAID (Предоплата)
// ════════════════════════════════════════════════════════════════════════
function isPrepaid(lead: any): boolean {
  // Логика определения предоплаты
  // Можно определять по:
  // 1. Статусу сделки (если есть отдельные статусы для предоплат)
  // 2. Сумме (если предоплата меньше полной стоимости)
  // 3. Custom field (если есть поле "тип оплаты")

  // Пока используем простую логику: если сумма < полной стоимости
  const amount = lead.price || 0;

  // Предполагаем что полная стоимость > 10000 KZT
  // Предоплаты обычно 3000-5000 KZT
  if (amount > 0 && amount < 10000) {
    return true; // Скорее всего предоплата
  }

  return false; // Полная оплата
}

// ════════════════════════════════════════════════════════════════════════
// 📦 WEBHOOK ENDPOINT
// ════════════════════════════════════════════════════════════════════════
/**
 * POST /api/amocrm/challenge3d-sale
 *
 * Webhook для приема данных о продажах "3х дневник"
 *
 * ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK, даже при ошибках!
 * Иначе amoCRM будет делать retry → создаст webhook loop!
 */
router.post('/challenge3d-sale', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    console.log('[Challenge3D Webhook] 📥 Received webhook');
    console.log('[Challenge3D Webhook] Body:', JSON.stringify(req.body, null, 2));

    let data: any;

    if (typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[Challenge3D Webhook] ❌ JSON parse error:', parseError);
        return res.status(200).json({
          success: false,
          error: 'JSON parse error',
          message: 'Webhook received but data format is invalid. Returning 200 to prevent retry.',
        });
      }
    } else {
      data = req.body;
    }

    // ════════════════════════════════════════════════════════════════
    // 🛡️ STEP 1: Check for duplicate webhook
    // ════════════════════════════════════════════════════════════════
    const webhookId = generateWebhookId(data);

    if (isDuplicate(webhookId)) {
      const duration = Date.now() - startTime;
      console.warn(`[Challenge3D Webhook] ⚠️ DUPLICATE: ${webhookId} (${duration}ms)`);

      return res.status(200).json({
        success: true,
        message: 'Webhook already processed (duplicate)',
        webhookId,
        duration,
      });
    }

    console.log(`[Challenge3D Webhook] ✅ New webhook: ${webhookId}`);

    // Validate request
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      console.warn('[Challenge3D Webhook] ❌ Invalid request body (no leads)');

      return res.status(200).json({
        success: false,
        error: 'Invalid request body',
        message: 'No leads found in webhook data. Returning 200 to prevent retry.',
      });
    }

    let savedCount = 0;
    let skippedCount = 0;

    // Process each lead
    for (const lead of data.leads.status) {
      console.log(`[Challenge3D Webhook] 🔍 Processing lead ${lead.id}`);
      console.log(`[Challenge3D Webhook]    Pipeline: ${lead.pipeline_id}, Status: ${lead.status_id}`);

      // ════════════════════════════════════════════════════════════════
      // 🎯 STEP 1: Filter by pipeline and status
      // ════════════════════════════════════════════════════════════════
      const isPipelineMatch = CHALLENGE3D_PIPELINE_IDS.includes(lead.pipeline_id);
      const isStatusMatch = lead.status_id === STATUS_УСПЕШНО;

      if (!isPipelineMatch) {
        console.log(`[Challenge3D Webhook] ⏭️  Skip: Pipeline ${lead.pipeline_id} not in [${CHALLENGE3D_PIPELINE_IDS.join(',')}]`);
        skippedCount++;
        continue;
      }

      if (!isStatusMatch) {
        console.log(`[Challenge3D Webhook] ⏭️  Skip: Status ${lead.status_id} is not ${STATUS_УСПЕШНО}`);
        skippedCount++;
        continue;
      }

      // ════════════════════════════════════════════════════════════════
      // 🆕 STEP 2: Get Original UTM with phone-based attribution
      // ════════════════════════════════════════════════════════════════
      const attributionResult = await getOriginalUTM(lead, AMOCRM_ACCESS_TOKEN);

      console.log('[Challenge3D Webhook] 📊 Attribution:', {
        source: attributionResult.source,
        phone: attributionResult.phone,
        relatedDealId: attributionResult.relatedDealId,
      });

      // Extract current UTM for last-touch tracking
      const currentUtmData = extractUTMData(lead.custom_fields_values || []);
      console.log('[Challenge3D Webhook] 🏷️ Current UTM:', currentUtmData);

      // ════════════════════════════════════════════════════════════════
      // 🆕 STEP 2.5: Determine product type (Challenge3D vs Express)
      // ════════════════════════════════════════════════════════════════
      const productType = determineProductType(lead, currentUtmData);
      console.log('[Challenge3D Webhook] 📦 Product Type:', productType);

      // ВАЖНО: Пропускаем если это Express (не наш продукт)
      if (productType === 'express') {
        console.log('[Challenge3D Webhook] ⏭️  Skip: Product type is express (belongs to express webhook)');
        skippedCount++;
        continue;
      }

      if (productType === 'unknown') {
        console.warn('[Challenge3D Webhook] ⚠️  Unknown product type, but processing anyway (pipeline match)');
      }

      // ════════════════════════════════════════════════════════════════
      // 🆕 STEP 3: Extract deal data
      // ════════════════════════════════════════════════════════════════
      const phone = extractPhoneFromDeal(lead);
      const amount = lead.price || 0;
      const saleDate = lead.closed_at
        ? new Date(lead.closed_at * 1000).toISOString()
        : new Date().toISOString();
      const prepaid = isPrepaid(lead);

      console.log('[Challenge3D Webhook] 💰 Amount:', amount, 'KZT');
      console.log('[Challenge3D Webhook] 📅 Sale Date:', saleDate);
      console.log('[Challenge3D Webhook] 📞 Phone:', phone);
      console.log('[Challenge3D Webhook] 💳 Prepaid:', prepaid);

      // ════════════════════════════════════════════════════════════════
      // 🎯 STEP 4: Determine targetologist from ORIGINAL UTM
      // ════════════════════════════════════════════════════════════════
      const targetologist = determineTargetologistFromUTM(attributionResult.original);
      console.log('[Challenge3D Webhook] 🎯 Targetologist:', targetologist || 'Unknown');

      // ════════════════════════════════════════════════════════════════
      // 💾 STEP 5: Prepare sale data with BOTH original + current UTM
      // ════════════════════════════════════════════════════════════════
      const saleData = {
        deal_id: parseInt(lead.id.toString()),
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,

        // ✅ NEW SCHEMA (MIGRATION_017) - REQUIRED FOR AGGREGATION
        sale_amount: amount,
        sale_type: prepaid ? 'Prepayment' : 'Full Payment', // ✅ New field for aggregation
        lead_name: lead.name || null, // ✅ New field for aggregation
        lead_email: null,
        lead_phone: phone || attributionResult.phone || null,
        team_name: targetologist, // ✅ Team attribution for aggregation
        amocrm_lead_id: lead.id?.toString() || null,
        amocrm_contact_id: (lead._embedded?.contacts?.[0]?.id || null)?.toString(),

        // OLD SCHEMA (KEPT FOR COMPATIBILITY)
        amount: amount,
        currency: 'KZT',
        prepaid: prepaid,
        package_type: productType, // challenge3d | express | unknown

        // 🏷️ Current UTM (last touch)
        utm_source: currentUtmData.utm_source || null,
        utm_campaign: currentUtmData.utm_campaign || null,
        utm_medium: currentUtmData.utm_medium || null,
        utm_content: currentUtmData.utm_content || null,
        utm_term: currentUtmData.utm_term || null,
        utm_referrer: currentUtmData.utm_referrer || null,
        fbclid: currentUtmData.fbclid || null,

        // 👤 Customer data (old schema)
        customer_id: lead._embedded?.contacts?.[0]?.id || null,
        customer_name: lead.name || null,
        phone: phone || attributionResult.phone || null,
        email: null, // TODO: Извлечь email из контакта если нужно

        // 📅 Sale metadata
        sale_date: saleDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        raw_data: lead,

        // 🆕 Original UTM (first touch attribution)
        original_utm_source: attributionResult.original.utm_source || null,
        original_utm_campaign: attributionResult.original.utm_campaign || null,
        original_utm_medium: attributionResult.original.utm_medium || null,
        attribution_source: attributionResult.source,
        related_deal_id: attributionResult.relatedDealId || null,
      };

      console.log('[Challenge3D Webhook] 💾 Saving to challenge3d_sales...');

      // ✅ Save to Traffic DB - challenge3d_sales table
      try {
        const { data: savedData, error } = await trafficAdminSupabase
          .from('challenge3d_sales')
          .upsert(saleData, {
            onConflict: 'deal_id'
          })
          .select()
          .single();

        if (error) {
          console.error('[Challenge3D Webhook] ❌ Supabase Error:', error.message);
          console.error('[Challenge3D Webhook] Error details:', error);
        } else {
          console.log(`[Challenge3D Webhook] ✅ Sale saved: Lead ${lead.id} → ${targetologist}`);
          savedCount++;
        }
      } catch (saveError: any) {
        console.error('[Challenge3D Webhook] ❌ Save Exception:', saveError.message);
      }
    }

    const duration = Date.now() - startTime;

    // ⚠️ ВСЕГДА возвращаем 200 OK!
    return res.status(200).json({
      success: true,
      message: 'Challenge3D sales processed',
      leads_received: data.leads.status.length,
      leads_saved: savedCount,
      leads_skipped: skippedCount,
      duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error('[Challenge3D Webhook] ❌ Fatal error:', error);
    console.error('[Challenge3D Webhook] Stack:', error.stack);

    // ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK!
    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Webhook received but processing failed. Returning 200 to prevent retry.',
      duration,
    });
  }
});

/**
 * GET /api/amocrm/challenge3d-sale/health
 *
 * Health check для webhook
 */
router.get('/challenge3d-sale/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Challenge3D Sales Webhook',
    pipelines: CHALLENGE3D_PIPELINE_IDS,
    targetStatus: STATUS_УСПЕШНО,
    timestamp: new Date().toISOString(),
  });
});

export default router;
