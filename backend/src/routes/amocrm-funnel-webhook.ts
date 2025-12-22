/**
 * AmoCRM → Funnel Webhook
 * 
 * Webhook для приема данных о продажах из AmoCRM
 * Этап: "Успешно реализована" (490,000 KZT основной продукт)
 * 
 * Webhook URL: http://api.onai.academy/api/amocrm/funnel-sale
 * 
 * Интеграция:
 * 1. Принимает данные о сделке из AmoCRM
 * 2. Извлекает UTM метки из сделки
 * 3. Определяет таргетолога по UTM
 * 4. Обновляет метрики воронки
 * 5. Сохраняет в Supabase
 */

import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import trafficPgPool from '../config/traffic-pg-direct.js';

const router = Router();

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
 * Body (от AmoCRM):
 * {
 *   "leads": {
 *     "status": [{
 *       "id": 123456,
 *       "status_id": 142, // Успешно реализована
 *       "pipeline_id": 1,
 *       "custom_fields": [
 *         { "id": 123, "name": "UTM Source", "values": [{"value": "fb_kenesary"}] },
 *         { "id": 124, "name": "UTM Campaign", "values": [{"value": "nutrients_test"}] },
 *         // ...
 *       ]
 *     }]
 *   }
 * }
 */
router.post('/funnel-sale', async (req: Request, res: Response) => {
  try {
    console.log('[AmoCRM Funnel Webhook] Received sale data');
    console.log('[AmoCRM Funnel Webhook] Body:', JSON.stringify(req.body, null, 2));

    const data: AmoCRMFunnelSale = req.body;

    // Validate request
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      console.warn('[AmoCRM Funnel Webhook] Invalid request body');
      return res.status(400).json({
        success: false,
        error: 'Invalid request body'
      });
    }

    // Process each lead
    for (const lead of data.leads.status) {
      console.log(`[AmoCRM Funnel Webhook] Processing lead ${lead.id}`);

      // Extract UTM data from custom fields
      const utmData = extractUTMData(lead.custom_fields || []);
      console.log('[AmoCRM Funnel Webhook] UTM Data:', utmData);

      // Determine targetologist based on UTM
      const targetologist = determineTargetologistFromUTM(utmData);
      console.log('[AmoCRM Funnel Webhook] Targetologist:', targetologist);

      // Save sale to Supabase
      const saleData = {
        amocrm_lead_id: lead.id,
        status_id: lead.status_id,
        pipeline_id: lead.pipeline_id,
        targetologist: targetologist || 'Unknown',
        utm_source: utmData.utm_source,
        utm_campaign: utmData.utm_campaign,
        utm_medium: utmData.utm_medium,
        utm_content: utmData.utm_content,
        utm_term: utmData.utm_term,
        product: 'main_490k', // Main product
        amount: 490000, // KZT
        funnel_stage: 'main', // Этап воронки
        created_at: new Date().toISOString()
      };

      // Save to funnel_sales table using direct PG connection
      // WORKAROUND: PostgREST schema cache не обновился после миграции
      console.log('[AmoCRM Funnel Webhook] Attempting to save to funnel_sales:', JSON.stringify(saleData, null, 2));
      
      try {
        const query = `
          INSERT INTO funnel_sales (
            amocrm_lead_id, status_id, pipeline_id, targetologist,
            utm_source, utm_campaign, utm_medium, utm_content, utm_term,
            product, amount, funnel_stage, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (amocrm_lead_id) DO UPDATE SET
            status_id = EXCLUDED.status_id,
            targetologist = EXCLUDED.targetologist,
            updated_at = NOW()
          RETURNING *
        `;
        
        const values = [
          saleData.amocrm_lead_id,
          saleData.status_id,
          saleData.pipeline_id,
          saleData.targetologist,
          saleData.utm_source,
          saleData.utm_campaign,
          saleData.utm_medium,
          saleData.utm_content,
          saleData.utm_term,
          saleData.product,
          saleData.amount,
          saleData.funnel_stage,
          saleData.created_at
        ];
        
        const result = await trafficPgPool.query(query, values);
        
        console.log(`[AmoCRM Funnel Webhook] ✅ Sale saved to DB: Lead ${lead.id} → ${targetologist}`);
        console.log('[AmoCRM Funnel Webhook] Saved data:', JSON.stringify(result.rows[0], null, 2));
        
      } catch (pgError: any) {
        console.error('[AmoCRM Funnel Webhook] ❌ PG Error saving sale:', pgError.message);
        console.error('[AmoCRM Funnel Webhook] Error stack:', pgError.stack);
      }
    }

    return res.json({
      success: true,
      message: 'Funnel sale processed',
      leads_processed: data.leads.status.length
    });

  } catch (error: any) {
    console.error('[AmoCRM Funnel Webhook] Error:', error);
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

  const utmFieldNames = {
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
