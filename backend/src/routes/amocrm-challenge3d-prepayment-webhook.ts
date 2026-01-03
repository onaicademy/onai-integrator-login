// @ts-nocheck
/**
 * ════════════════════════════════════════════════════════════════════════
 * 💳 AMOCRM CHALLENGE 3D PREPAYMENT WEBHOOK
 * ════════════════════════════════════════════════════════════════════════
 *
 * Endpoint: POST /api/amocrm/challenge3d-prepayment
 * Purpose: Принимает данные о предоплатах "3х дневник" из AmoCRM
 * Pipeline: 9430994 (ОП - Основные Продукты)
 * Статус: Любой статус предоплаты (настраивается в AmoCRM webhook)
 *
 * Сохраняет в Landing DB → challenge3d_sales с prepaid=true
 */

import { Router, Request, Response } from 'express';
import { landingSupabase } from '../config/supabase-landing.js';
import { getOriginalUTM, extractPhoneFromDeal } from '../utils/amocrm-utils.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 🔌 CONFIGURATION
// ════════════════════════════════════════════════════════════════════════
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN || '';
const PREPAYMENT_PIPELINE_ID = 9430994; // ОП - Основные Продукты

// ════════════════════════════════════════════════════════════════════════
// 🛡️ DEDUPLICATION
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
  return `challenge3d_prepayment_${leadIds}_${timestamp}`;
}

function isDuplicate(webhookId: string): boolean {
  const exists = webhookCache.has(webhookId);
  if (!exists) {
    webhookCache.set(webhookId, Date.now());
  }
  return exists;
}

// ════════════════════════════════════════════════════════════════════════
// 🏷️ EXTRACT UTM DATA
// ════════════════════════════════════════════════════════════════════════
const UTM_FIELD_IDS = {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
  UTM_CONTENT: 434725,
  UTM_TERM: 434733,
  UTM_REFERRER: 434735,
  FBCLID: 434761,
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
// 📦 WEBHOOK ENDPOINT - PREPAYMENTS
// ════════════════════════════════════════════════════════════════════════
/**
 * POST /api/amocrm/challenge3d-prepayment
 *
 * Webhook для приема предоплат из Pipeline 9430994
 * Сохраняет в challenge3d_sales с prepaid=true
 */
router.post('/challenge3d-prepayment', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    console.log('[Challenge3D Prepayment] 📥 Received webhook');

    let data: any;

    // Parse JSON если пришло как строка
    if (typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[Challenge3D Prepayment] ❌ JSON parse error');
        return res.status(200).json({
          success: false,
          error: 'JSON parse error',
        });
      }
    } else {
      data = req.body;
    }

    // Deduplication check
    const webhookId = generateWebhookId(data);
    if (isDuplicate(webhookId)) {
      const duration = Date.now() - startTime;
      console.warn(`[Challenge3D Prepayment] ⚠️ DUPLICATE: ${webhookId}`);
      return res.status(200).json({
        success: true,
        message: 'Duplicate webhook',
        webhookId,
        duration,
      });
    }

    // Validate webhook structure
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      return res.status(200).json({
        success: false,
        error: 'No leads found in webhook',
      });
    }

    let savedCount = 0;
    let skippedCount = 0;

    for (const lead of data.leads.status) {
      console.log(`[Challenge3D Prepayment] 🔍 Processing lead ${lead.id}`);

      // Filter by pipeline - only Pipeline 9430994
      if (lead.pipeline_id !== PREPAYMENT_PIPELINE_ID) {
        console.log(`[Challenge3D Prepayment] ⏭️  Skip: Pipeline ${lead.pipeline_id} != ${PREPAYMENT_PIPELINE_ID}`);
        skippedCount++;
        continue;
      }

      // Extract phone number
      const phone = extractPhoneFromDeal(lead);
      if (!phone) {
        console.warn(`[Challenge3D Prepayment] ⚠️  No phone found for lead ${lead.id}`);
      }

      // Extract prepayment amount
      const amount = lead.price || 0;

      // Extract sale date (when deal moved to prepayment status)
      const saleDate = lead.closed_at
        ? new Date(lead.closed_at * 1000).toISOString()
        : new Date().toISOString();

      // Get original UTM (with phone-based attribution)
      const attributionResult = await getOriginalUTM(lead, AMOCRM_ACCESS_TOKEN);

      // Extract current UTM from deal
      const currentUtmData = extractUTMData(lead.custom_fields_values || []);

      // Prepare prepayment data
      const prepaymentData = {
        deal_id: parseInt(lead.id.toString()),
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        amount: amount,
        currency: 'KZT',
        package_type: null,
        prepaid: true, // ✅ Маркер предоплаты

        // UTM Attribution (current deal UTM)
        utm_source: currentUtmData.utm_source || null,
        utm_campaign: currentUtmData.utm_campaign || null,
        utm_medium: currentUtmData.utm_medium || null,
        utm_content: currentUtmData.utm_content || null,
        utm_term: currentUtmData.utm_term || null,
        utm_referrer: currentUtmData.utm_referrer || null,
        fbclid: currentUtmData.fbclid || null,

        // Customer data
        customer_id: lead.contact_id || null,
        customer_name: lead.name || null,
        phone: phone || null,
        email: null,

        // Original UTM (phone-based attribution)
        original_utm_source: attributionResult.original.utm_source || null,
        original_utm_campaign: attributionResult.original.utm_campaign || null,
        original_utm_medium: attributionResult.original.utm_medium || null,
        attribution_source: attributionResult.source,
        related_deal_id: attributionResult.dealId || null,

        // Timestamps
        sale_date: saleDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),

        // Raw data
        raw_data: lead,
      };

      // Save to challenge3d_sales (upsert - если сделка уже существует, обновить)
      try {
        const { error } = await landingSupabase
          .from('challenge3d_sales')
          .upsert(prepaymentData, {
            onConflict: 'deal_id',
          });

        if (error) {
          console.error('[Challenge3D Prepayment] ❌ Supabase Error:', error.message);
        } else {
          console.log(`[Challenge3D Prepayment] ✅ Saved: Deal ${lead.id} | ${amount} KZT | ${phone || 'No phone'}`);
          savedCount++;
        }
      } catch (saveError: any) {
        console.error('[Challenge3D Prepayment] ❌ Exception:', saveError.message);
      }
    }

    const duration = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: 'Challenge3D prepayments processed',
      leads_received: data.leads.status.length,
      leads_saved: savedCount,
      leads_skipped: skippedCount,
      duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('[Challenge3D Prepayment] ❌ Fatal error:', error);

    return res.status(200).json({
      success: false,
      error: error.message,
      duration,
    });
  }
});

/**
 * GET /api/amocrm/challenge3d-prepayment/health
 */
router.get('/challenge3d-prepayment/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Challenge3D Prepayment Webhook',
    pipeline: PREPAYMENT_PIPELINE_ID,
    acceptsPrepayments: true,
    timestamp: new Date().toISOString(),
  });
});

export default router;
