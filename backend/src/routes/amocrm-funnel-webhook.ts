/**
 * AmoCRM → Funnel Webhook
 * 
 * Webhook для приема данных о продажах из AmoCRM
 * Этап: "Успешно реализована" (490,000 KZT основной продукт)
 * 
 * Webhook URL: https://onai.academy/api/amocrm/funnel-sale
 * 
 * Интеграция:
 * 1. Принимает данные о сделке из AmoCRM
 * 2. Извлекает UTM метки из сделки
 * 3. Определяет таргетолога по UTM
 * 4. Обновляет метрики воронки
 * 5. Сохраняет в Supabase
 */

import { Router, Request, Response } from 'express';
import express from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

const router = Router();

// ✅ ВАЖНО: AmoCRM отправляет данные в формате application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: true }));
router.use(express.json()); // На всякий случай поддерживаем и JSON

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
 */
router.post('/funnel-sale', async (req: Request, res: Response) => {
  try {
    console.log('[AmoCRM Funnel Webhook] 📥 Received webhook');
    console.log('[AmoCRM Funnel Webhook] Content-Type:', req.headers['content-type']);
    console.log('[AmoCRM Funnel Webhook] Raw body:', JSON.stringify(req.body, null, 2));

    let data: AmoCRMFunnelSale;

    // AmoCRM может отправлять данные в разных форматах
    if (typeof req.body === 'string') {
      // Если пришла строка, парсим как JSON
      data = JSON.parse(req.body);
    } else if (req.body.leads) {
      // Уже распарсенный объект
      data = req.body;
    } else {
      // Попытка найти leads в urlencoded формате
      console.log('[AmoCRM Funnel Webhook] ⚠️ Unexpected format, trying to parse...');
      data = req.body;
    }

    // Validate request
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      console.warn('[AmoCRM Funnel Webhook] ❌ Invalid request body');
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
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
        amocrm_lead_id: lead.id,
        status_id: lead.status_id,
        pipeline_id: lead.pipeline_id,
        targetologist: targetologist || 'Unknown',
        utm_source: utmData.utm_source || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_medium: utmData.utm_medium || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null,
        product: 'main_490k', // Main product
        amount: 490000, // KZT
        funnel_stage: 'main', // Этап воронки
      };

      console.log('[AmoCRM Funnel Webhook] 💾 Saving to DB:', JSON.stringify(saleData, null, 2));

      // Save to Supabase (PostgREST schema cache теперь обновлён!)
      try {
        const { data: savedData, error } = await trafficAdminSupabase
          .from('funnel_sales')
          .upsert(saleData, {
            onConflict: 'amocrm_lead_id'
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

    return res.json({
      success: true,
      message: 'Funnel sale processed',
      leads_processed: data.leads.status.length,
      leads_saved: savedCount
    });

  } catch (error: any) {
    console.error('[AmoCRM Funnel Webhook] ❌ Fatal error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
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
