// @ts-nocheck
/**
 * ════════════════════════════════════════════════════════════════════════
 * 📚 AMOCRM EXPRESS COURSE WEBHOOK (5,000 KZT)
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Endpoint: POST /api/amocrm/funnel-sale
 * Purpose: Принимает данные о продажах экспресс-курса из AmoCRM
 * Pipeline: https://onaiagencykz.amocrm.ru/settings/pipeline/leads/10350882
 * 
 * Сохраняет в Landing DB → express_course_sales
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { landingSupabase } from '../config/supabase-landing.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 🛡️ DEDUPLICATION CACHE - Prevents webhook retry loop
// ════════════════════════════════════════════════════════════════════════
const webhookCache = new Map<string, number>(); // Map<webhookId, timestamp>
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function cleanOldWebhooks() {
  const now = Date.now();
  for (const [key, timestamp] of webhookCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      webhookCache.delete(key);
    }
  }
}

// Clean old webhooks every minute
setInterval(cleanOldWebhooks, 60000);

function generateWebhookId(data: any): string {
  // Generate idempotency key from webhook data
  const leadIds = data?.leads?.status?.map((l: any) => l.id).join(',') || 'unknown';
  const timestamp = Math.floor(Date.now() / (60 * 1000)); // Round to minute
  return `${leadIds}_${timestamp}`;
}

function isDuplicate(webhookId: string): boolean {
  const exists = webhookCache.has(webhookId);
  if (!exists) {
    webhookCache.set(webhookId, Date.now());
  }
  return exists;
}

// ✅ Body parsers уже настроены в server.ts ПЕРЕД этим роутером
// НЕ нужно добавлять их здесь

interface AmoCRMFunnelSale {
  leads: {
    status: Array<{
      id: number;
      status_id: number;
      pipeline_id: number;
      old_status_id: number;
      custom_fields?: Array<{
        id: number;
        name: string;
        values: Array<{
          value: string;
        }>;
      }>;
    }>;
  };
}

/**
 * POST /api/amocrm/funnel-sale
 * 
 * Webhook для приема данных о продажах "Успешно реализована"
 * 
 * ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK, даже при ошибках!
 * Иначе amoCRM будет делать retry → создаст webhook loop → rate limit!
 */
router.post('/funnel-sale', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('[AmoCRM Funnel Webhook] 📥 Received webhook');
    console.log('[AmoCRM Funnel Webhook] Content-Type:', req.headers['content-type']);
    console.log('[AmoCRM Funnel Webhook] Raw body:', JSON.stringify(req.body, null, 2));

    let data: AmoCRMFunnelSale;

    // AmoCRM может отправлять данные в разных форматах
    if (typeof req.body === 'string') {
      // Если пришла строка, парсим как JSON
      try {
        data = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[AmoCRM Funnel Webhook] ❌ JSON parse error:', parseError);
        // ⚠️ ВСЕГДА возвращаем 200 OK!
        return res.status(200).json({
          success: false,
          error: 'JSON parse error',
          message: 'Webhook received but data format is invalid. Returning 200 to prevent retry.',
        });
      }
    } else if (req.body.leads) {
      // Уже распарсенный объект
      data = req.body;
    } else {
      // Попытка найти leads в urlencoded формате
      console.log('[AmoCRM Funnel Webhook] ⚠️ Unexpected format, trying to parse...');
      data = req.body;
    }

    // ════════════════════════════════════════════════════════════════
    // 🛡️ STEP 1: Check for duplicate webhook (idempotency)
    // ════════════════════════════════════════════════════════════════
    const webhookId = generateWebhookId(data);
    
    if (isDuplicate(webhookId)) {
      const duration = Date.now() - startTime;
      console.warn(`[AmoCRM Funnel Webhook] ⚠️ DUPLICATE webhook detected: ${webhookId} (${duration}ms)`);
      console.warn('[AmoCRM Funnel Webhook] Returning 200 OK to prevent retry loop');
      
      // ⚠️ ВСЕГДА возвращаем 200 OK даже для дубликатов!
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed (duplicate)',
        webhookId,
        duration,
      });
    }
    
    console.log(`[AmoCRM Funnel Webhook] ✅ New webhook: ${webhookId}`);

    // Validate request
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      console.warn('[AmoCRM Funnel Webhook] ❌ Invalid request body (no leads)');
      
      // ⚠️ ВСЕГДА возвращаем 200 OK!
      return res.status(200).json({
        success: false,
        error: 'Invalid request body',
        message: 'No leads found in webhook data. Returning 200 to prevent retry.',
      });
    }

    let savedCount = 0;

    // Process each lead
    for (const lead of data.leads.status) {
      console.log(`[AmoCRM Funnel Webhook] 🔍 Processing lead ${lead.id}`);

      // Extract UTM data from custom fields
      const utmData = extractUTMData(lead.custom_fields || []);
      console.log('[AmoCRM Funnel Webhook] 🏷️ UTM Data:', utmData);

      // Determine targetologist based on UTM
      const targetologist = determineTargetologistFromUTM(utmData);
      console.log('[AmoCRM Funnel Webhook] 🎯 Targetologist:', targetologist || 'Unknown');

      // Prepare sale data
      const saleData = {
        deal_id: parseInt(lead.id.toString()),
        pipeline_id: lead.pipeline_id,
        status_id: lead.status_id,
        amount: 490000, // Main product = 490K KZT
        utm_source: utmData.utm_source || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_medium: utmData.utm_medium || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null,
        sale_date: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
        raw_data: JSON.stringify(lead),
      };

      console.log('[AmoCRM Funnel Webhook] 💾 Saving to DB:', JSON.stringify(saleData, null, 2));

      // Save to Supabase (Landing DB - main_product_sales table)
      try {
        const { data: savedData, error } = await landingSupabase
          .from('main_product_sales')
          .upsert(saleData, {
            onConflict: 'deal_id'
          })
          .select()
          .single();

        if (error) {
          console.error('[AmoCRM Funnel Webhook] ❌ Supabase Error:', error.message);
          console.error('[AmoCRM Funnel Webhook] Error details:', JSON.stringify(error, null, 2));
        } else {
          console.log(`[AmoCRM Funnel Webhook] ✅ Sale saved: Lead ${lead.id} → ${targetologist}`);
          console.log('[AmoCRM Funnel Webhook] Saved data:', JSON.stringify(savedData, null, 2));
          savedCount++;
        }
      } catch (saveError: any) {
        console.error('[AmoCRM Funnel Webhook] ❌ Exception:', saveError.message);
      }
    }

    const duration = Date.now() - startTime;
    
    // ⚠️ ВСЕГДА возвращаем 200 OK!
    return res.status(200).json({
      success: true,
      message: 'Funnel sale processed',
      leads_processed: data.leads.status.length,
      leads_saved: savedCount,
      duration,
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[AmoCRM Funnel Webhook] ❌ Fatal error:', error);
    console.error('[AmoCRM Funnel Webhook] Stack:', error.stack);
    
    // ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK, даже при фатальных ошибках!
    // Это предотвращает webhook retry loop
    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Webhook received but processing failed. Returning 200 to prevent retry.',
      duration,
    });
  }
});

/**
 * GET /api/amocrm/funnel-sale/health
 * 
 * Health check для webhook
 */
router.get('/funnel-sale/health', async (req: Request, res: Response) => {
  return res.json({
    success: true,
    status: 'healthy',
    service: 'amocrm-funnel-webhook',
    timestamp: new Date().toISOString()
  });
});

/**
 * Helper: Get custom field value by field code or name
 */
function getCustomFieldValue(customFields: any[], fieldCode: string): string | null {
  const field = customFields.find((f: any) => 
    f.field_code === fieldCode || 
    f.name?.toLowerCase() === fieldCode.toLowerCase()
  );
  
  return field?.values?.[0]?.value || null;
}

/**
 * Helper: Extract UTM data from AmoCRM custom fields
 */
function extractUTMData(customFields: any[]): {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
} {
  const utmData: any = {};

  const utmFieldNames: Record<string, string> = {
    'UTM Source': 'utm_source',
    'utm_source': 'utm_source',
    'UTM Campaign': 'utm_campaign',
    'utm_campaign': 'utm_campaign',
    'UTM Medium': 'utm_medium',
    'utm_medium': 'utm_medium',
    'UTM Content': 'utm_content',
    'utm_content': 'utm_content',
    'UTM Term': 'utm_term',
    'utm_term': 'utm_term',
  };

  for (const field of customFields) {
    const fieldName = field.name;
    const utmKey = utmFieldNames[fieldName];

    if (utmKey && field.values && field.values.length > 0) {
      utmData[utmKey] = field.values[0].value;
    }
  }

  return utmData;
}

/**
 * Helper: Determine targetologist from UTM data
 * Uses same logic as targetologist-detector.ts
 */
function determineTargetologistFromUTM(utmData: {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_content?: string;
  utm_term?: string;
}): string | null {
  const TARGETOLOGIST_PATTERNS: Record<string, string[]> = {
    'Kenesary': [
      'nutrients', 'nutcab', 'kenesary', 'tripwire', 'kab3', '1day', 
      'pb_agency', 'kenji', 'kenes'
    ],
    'Arystan': [
      'arystan', 'ar_', 'ast_', 'rm almaty', 'rm_almaty'
    ],
    'Muha': [
      'onai', 'on ai', 'запуск', 'muha', 'yourmarketolog', 
      'maqtakyz', 'residence', 'yourteam', 'tima'
    ],
    'Traf4': [
      'alex', 'traf4', 'proftest', 'pb_agency', 'smmmcwin', '3-1'
    ],
  };

  const utmCampaign = (utmData.utm_campaign || '').toLowerCase();
  const utmSource = (utmData.utm_source || '').toLowerCase();
  const utmContent = (utmData.utm_content || '').toLowerCase();
  const combined = `${utmCampaign}_${utmSource}_${utmContent}`;

  for (const [targetologist, patterns] of Object.entries(TARGETOLOGIST_PATTERNS)) {
    for (const pattern of patterns) {
      if (combined.includes(pattern.toLowerCase())) {
        console.log(`[UTM Match] Found pattern "${pattern}" → ${targetologist}`);
        return targetologist;
      }
    }
  }

  console.log('[UTM Match] No pattern matched');
  return null;
}

export default router;
