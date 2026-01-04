// @ts-nocheck
/**
 * ════════════════════════════════════════════════════════════════════════
 * 📚 AMOCRM CHALLENGE 3D LEADS WEBHOOK (ВСЕ ЗАЯВКИ)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Endpoint: POST /api/amocrm/challenge3d-lead
 * Purpose: Принимает ВСЕ заявки из воронок "3х дневник" (не только продажи)
 * Pipelines:
 *   - 9777626 (КЦ - Короткий Курс)
 *   - 9430994 (ОП - Основные Продукты)
 * Статусы: ВСЕ (не только 142)
 *
 * ✅ Сохраняет в Traffic DB → traffic_leads (consolidated database)
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { getOriginalUTM, extractPhoneFromDeal } from '../utils/amocrm-utils.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 🔌 CONFIGURATION
// ════════════════════════════════════════════════════════════════════════
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';

const CHALLENGE3D_PIPELINE_IDS = [
  9777626, // КЦ (Короткий Курс)
  9430994  // ОП (Основные Продукты)
];

// ════════════════════════════════════════════════════════════════════════
// 🛡️ DEDUPLICATION
// ════════════════════════════════════════════════════════════════════════
const webhookCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000;

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
  return `challenge3d_lead_${leadIds}_${timestamp}`;
}

function isDuplicate(webhookId: string): boolean {
  const exists = webhookCache.has(webhookId);
  if (!exists) {
    webhookCache.set(webhookId, Date.now());
  }
  return exists;
}

// ════════════════════════════════════════════════════════════════════════
// 🏷️ EXTRACT UTM
// ════════════════════════════════════════════════════════════════════════
const UTM_FIELD_IDS = {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
  UTM_CONTENT: 434725,
  UTM_TERM: 434733,
};

function extractUTMData(customFields: any[]) {
  const utm: any = {};
  if (!customFields || !Array.isArray(customFields)) return utm;

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
    }
  }

  return utm;
}

// ════════════════════════════════════════════════════════════════════════
// 🎯 DETERMINE PRODUCT TYPE (Challenge3D vs Express vs Other)
// ════════════════════════════════════════════════════════════════════════
function determineProductType(lead: any, utm: any): 'challenge3d' | 'express' | 'unknown' {
  const campaign = (utm.utm_campaign || '').toLowerCase();
  const pipelineId = lead.pipeline_id;

  // Проверка по pipeline_id
  if (CHALLENGE3D_PIPELINE_IDS.includes(pipelineId)) {
    return 'challenge3d';
  }

  if (pipelineId === 10350882) {
    return 'express';
  }

  // Проверка по utm_campaign (если один utm_source используется для разных продуктов)
  if (campaign.includes('3d') ||
      campaign.includes('challenge') ||
      campaign.includes('трехдневник') ||
      campaign.includes('3дневник') ||
      campaign.includes('3х')) {
    return 'challenge3d';
  }

  if (campaign.includes('express') ||
      campaign.includes('экспресс') ||
      campaign.includes('5000') ||
      campaign.includes('5k')) {
    return 'express';
  }

  // Fallback: если не определено, используем pipeline_id
  return 'unknown';
}

// ════════════════════════════════════════════════════════════════════════
// 🎯 DETERMINE TARGETOLOGIST
// ════════════════════════════════════════════════════════════════════════
function determineTargetologistFromUTM(utm: any): string | null {
  const source = (utm.utm_source || '').toLowerCase();
  const medium = (utm.utm_medium || '').toLowerCase();
  const campaign = (utm.utm_campaign || '').toLowerCase();

  if (
    source.includes('kenesary') ||
    source.includes('kenji') ||
    source.includes('kenjifb') ||
    source.includes('tripwire') ||
    source.includes('nutcab')
  ) {
    return 'Kenesary';
  }

  if (
    source.includes('arystan') ||
    source.includes('ar_') ||
    source.includes('fbarystan')
  ) {
    return 'Arystan';
  }

  if (
    source.includes('onai') ||
    source.includes('on ai') ||
    source.includes('muha') ||
    medium.includes('yourmarketolog')
  ) {
    return 'Muha';
  }

  if (
    source.includes('alex') ||
    source.includes('traf4') ||
    campaign.includes('alex')
  ) {
    return 'Traf4';
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════
// 📦 WEBHOOK ENDPOINT - ВСЕ ЗАЯВКИ
// ════════════════════════════════════════════════════════════════════════
/**
 * POST /api/amocrm/challenge3d-lead
 *
 * Webhook для приема ВСЕХ заявок из воронок 3х дневник
 * (не только продажи, но и все статусы)
 */
router.post('/challenge3d-lead', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    console.log('[Challenge3D Leads] 📥 Received webhook');

    let data: any;

    if (typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[Challenge3D Leads] ❌ JSON parse error');
        return res.status(200).json({
          success: false,
          error: 'JSON parse error',
        });
      }
    } else {
      data = req.body;
    }

    // Deduplication
    const webhookId = generateWebhookId(data);
    if (isDuplicate(webhookId)) {
      const duration = Date.now() - startTime;
      console.warn(`[Challenge3D Leads] ⚠️ DUPLICATE: ${webhookId}`);
      return res.status(200).json({
        success: true,
        message: 'Duplicate webhook',
        webhookId,
        duration,
      });
    }

    // Validate
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No leads found',
      });
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const lead of data.leads.status) {
      console.log(`[Challenge3D Leads] 🔍 Processing lead ${lead.id}`);

      // Filter by pipeline
      const isPipelineMatch = CHALLENGE3D_PIPELINE_IDS.includes(lead.pipeline_id);

      if (!isPipelineMatch) {
        console.log(`[Challenge3D Leads] ⏭️  Skip: Pipeline ${lead.pipeline_id} not in [${CHALLENGE3D_PIPELINE_IDS.join(',')}]`);
        skippedCount++;
        continue;
      }

      // Extract UTM
      const attributionResult = await getOriginalUTM(lead, AMOCRM_ACCESS_TOKEN);
      const currentUtmData = extractUTMData(lead.custom_fields_values || []);

      // Determine product type
      const productType = determineProductType(lead, currentUtmData);
      console.log(`[Challenge3D Leads] 📦 Product Type: ${productType}`);

      // Skip if not challenge3d (безопасность - не записываем express заявки сюда)
      if (productType === 'express') {
        console.log(`[Challenge3D Leads] ⏭️  Skip: Product type is express (belongs to different webhook)`);
        skippedCount++;
        continue;
      }

      if (productType === 'unknown') {
        console.warn(`[Challenge3D Leads] ⚠️  Unknown product type for lead ${lead.id}`);
        // Продолжаем, но логируем
      }

      const phone = extractPhoneFromDeal(lead);
      const targetologist = determineTargetologistFromUTM(attributionResult.original);

      // Prepare lead data
      const leadData = {
        deal_id: parseInt(lead.id.toString()),
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        product_type: productType,

        // UTM
        utm_source: currentUtmData.utm_source || null,
        utm_campaign: currentUtmData.utm_campaign || null,
        utm_medium: currentUtmData.utm_medium || null,
        utm_content: currentUtmData.utm_content || null,
        utm_term: currentUtmData.utm_term || null,

        // Customer
        customer_name: lead.name || null,
        phone: phone || attributionResult.phone || null,
        email: null,

        // Attribution
        targetologist: targetologist,
        original_utm_source: attributionResult.original.utm_source || null,
        original_utm_campaign: attributionResult.original.utm_campaign || null,
        attribution_source: attributionResult.source,

        // Timestamps
        created_at: lead.created_at ? new Date(lead.created_at * 1000).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),

        raw_data: lead,
      };

      // ✅ Save to Traffic DB (consolidated)
      try {
        const { error } = await trafficAdminSupabase
          .from('traffic_leads')
          .upsert({
            email: leadData.email || `lead_${leadData.deal_id}@unknown.com`,
            name: leadData.customer_name || 'Unknown',
            phone: leadData.phone || '',
            source: 'challenge3d',
            funnel_type: leadData.product_type,
            amocrm_lead_id: leadData.deal_id,
            amocrm_synced: true,
            utm_source: leadData.utm_source,
            utm_campaign: leadData.utm_campaign,
            utm_medium: leadData.utm_medium,
            utm_content: leadData.utm_content,
            utm_term: leadData.utm_term,
            metadata: {
              pipeline_id: leadData.pipeline_id,
              status_id: leadData.status_id,
              targetologist: leadData.targetologist,
              original_utm: {
                source: leadData.original_utm_source,
                campaign: leadData.original_utm_campaign,
              },
              attribution_source: leadData.attribution_source,
            },
          }, {
            onConflict: 'amocrm_lead_id',
          });

        if (error) {
          console.error('[Challenge3D Leads] ❌ Supabase Error:', error.message);
        } else {
          console.log(`[Challenge3D Leads] ✅ Lead saved: ${lead.id} → ${targetologist} (${productType})`);
          savedCount++;
        }
      } catch (saveError: any) {
        console.error('[Challenge3D Leads] ❌ Exception:', saveError.message);
      }
    }

    const duration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Challenge3D leads processed',
      leads_received: data.leads.status.length,
      leads_saved: savedCount,
      leads_skipped: skippedCount,
      duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Challenge3D Leads] ❌ Fatal error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      duration,
    });
  }
});

/**
 * GET /api/amocrm/challenge3d-lead/health
 */
router.get('/challenge3d-lead/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Challenge3D Leads Webhook (ALL statuses)',
    pipelines: CHALLENGE3D_PIPELINE_IDS,
    acceptsAllStatuses: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
