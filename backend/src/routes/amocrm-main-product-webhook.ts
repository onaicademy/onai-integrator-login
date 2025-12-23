/**
 * ════════════════════════════════════════════════════════════════════════
 * 🏆 AMOCRM MAIN PRODUCT WEBHOOK (Integrator Flagman - 490K KZT)
 * ════════════════════════════════════════════════════════════════════════
 * 
 * Endpoint: POST /webhook/amocrm/traffic
 * Purpose: Принимает данные о продажах основного продукта из AmoCRM
 * Pipeline: https://onaiagencykz.amocrm.ru/settings/pipeline/leads/10350882
 * 
 * Сохраняет в Landing DB → main_product_sales
 */

import { Router, Request, Response } from 'express';
import { landingSupabase } from '../config/supabase-landing.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════
// 🛡️ DEDUPLICATION CACHE
// ════════════════════════════════════════════════════════════════════════
const webhookCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function generateWebhookId(data: any): string {
  const leadIds = data?.leads?.status?.map((l: any) => l.id).join(',') || 'unknown';
  const timestamp = Math.floor(Date.now() / (60 * 1000)); // Round to minute
  return `main_${leadIds}_${timestamp}`;
}

function isDuplicate(webhookId: string): boolean {
  const exists = webhookCache.has(webhookId);
  if (!exists) {
    webhookCache.set(webhookId, Date.now());
  }
  return exists;
}

// Clean old webhooks every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of webhookCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      webhookCache.delete(key);
    }
  }
}, 60000);

// ════════════════════════════════════════════════════════════════════════
// 📥 WEBHOOK ENDPOINT
// ════════════════════════════════════════════════════════════════════════
/**
 * POST /webhook/amocrm/traffic
 * 
 * Принимает вебхук от AmoCRM с данными о продаже основного продукта
 * ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK, чтобы предотвратить retry loop
 */
router.post('/traffic', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    console.log('[AmoCRM Main Product Webhook] 📥 Received webhook');
    console.log('[AmoCRM Main Product Webhook] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[AmoCRM Main Product Webhook] Body type:', typeof req.body);
    console.log('[AmoCRM Main Product Webhook] Body:', JSON.stringify(req.body, null, 2));
    
    // ════════════════════════════════════════════════════════════════
    // PARSE REQUEST BODY
    // ════════════════════════════════════════════════════════════════
    let data = req.body;
    
    if (typeof req.body === 'string') {
      try {
        data = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[AmoCRM Main Product Webhook] ❌ JSON parse error:', parseError);
        return res.status(200).json({
          success: false,
          error: 'JSON parse error',
          message: 'Webhook received but data format is invalid. Returning 200 to prevent retry.',
        });
      }
    }
    
    // ════════════════════════════════════════════════════════════════
    // CHECK FOR DUPLICATE
    // ════════════════════════════════════════════════════════════════
    const webhookId = generateWebhookId(data);
    
    if (isDuplicate(webhookId)) {
      const duration = Date.now() - startTime;
      console.warn(`[AmoCRM Main Product Webhook] ⚠️ DUPLICATE: ${webhookId} (${duration}ms)`);
      
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed (duplicate)',
        webhookId,
        duration,
      });
    }
    
    console.log(`[AmoCRM Main Product Webhook] ✅ New webhook: ${webhookId}`);
    
    // ════════════════════════════════════════════════════════════════
    // VALIDATE REQUEST
    // ════════════════════════════════════════════════════════════════
    if (!data.leads || !data.leads.status || data.leads.status.length === 0) {
      console.warn('[AmoCRM Main Product Webhook] ❌ Invalid request body (no leads)');
      
      return res.status(200).json({
        success: false,
        error: 'Invalid request body',
        message: 'No leads found in webhook data. Returning 200 to prevent retry.',
      });
    }
    
    // ════════════════════════════════════════════════════════════════
    // PROCESS LEADS
    // ════════════════════════════════════════════════════════════════
    const leads = data.leads.status;
    let savedCount = 0;
    
    for (const lead of leads) {
      try {
        console.log(`[AmoCRM Main Product Webhook] Processing lead ${lead.id}...`);
        
        // Extract UTM tags from custom fields
        const customFields = lead.custom_fields_values || [];
        const utmSource = customFields.find((f: any) => f.field_code === 'UTM_SOURCE')?.values?.[0]?.value;
        const utmCampaign = customFields.find((f: any) => f.field_code === 'UTM_CAMPAIGN')?.values?.[0]?.value;
        const utmMedium = customFields.find((f: any) => f.field_code === 'UTM_MEDIUM')?.values?.[0]?.value;
        const utmContent = customFields.find((f: any) => f.field_code === 'UTM_CONTENT')?.values?.[0]?.value;
        const utmTerm = customFields.find((f: any) => f.field_code === 'UTM_TERM')?.values?.[0]?.value;
        
        // Extract contact info
        const phone = customFields.find((f: any) => f.field_code === 'PHONE')?.values?.[0]?.value;
        const email = customFields.find((f: any) => f.field_code === 'EMAIL')?.values?.[0]?.value;
        
        // Prepare data for insertion
        const saleData = {
          deal_id: lead.id,
          pipeline_id: lead.pipeline_id,
          status_id: lead.status_id,
          amount: lead.price || 490000, // Default to 490K if not provided
          currency: 'KZT',
          utm_source: utmSource,
          utm_campaign: utmCampaign,
          utm_medium: utmMedium,
          utm_content: utmContent,
          utm_term: utmTerm,
          phone: phone,
          email: email,
          customer_name: lead.name || null,
          customer_id: lead.contact_id || null,
          sale_date: lead.updated_at ? new Date(lead.updated_at * 1000).toISOString() : new Date().toISOString(),
          webhook_received_at: new Date().toISOString(),
          raw_data: lead,
        };
        
        console.log(`[AmoCRM Main Product Webhook] Saving lead ${lead.id} with UTM: ${utmSource}`);
        
        // ════════════════════════════════════════════════════════════
        // SAVE TO DATABASE
        // ════════════════════════════════════════════════════════════
        const { data: insertedData, error: insertError } = await landingSupabase
          .from('main_product_sales')
          .upsert(saleData, {
            onConflict: 'deal_id',
            ignoreDuplicates: false, // Update if exists
          })
          .select();
        
        if (insertError) {
          console.error(`[AmoCRM Main Product Webhook] ❌ Database error for lead ${lead.id}:`, insertError);
          // Continue processing other leads
          continue;
        }
        
        console.log(`[AmoCRM Main Product Webhook] ✅ Lead ${lead.id} saved successfully`);
        console.log(`[AmoCRM Main Product Webhook] 💰 Amount: ${saleData.amount} KZT, UTM: ${utmSource}`);
        
        savedCount++;
        
      } catch (leadError: any) {
        console.error(`[AmoCRM Main Product Webhook] ❌ Error processing lead ${lead.id}:`, leadError);
        // Continue with next lead
      }
    }
    
    const duration = Date.now() - startTime;
    
    console.log(`[AmoCRM Main Product Webhook] ✅ Processed ${savedCount}/${leads.length} leads in ${duration}ms`);
    
    // ⚠️ ВСЕГДА возвращаем 200 OK!
    return res.status(200).json({
      success: true,
      message: 'Main product sales processed',
      leads_processed: leads.length,
      leads_saved: savedCount,
      duration,
    });
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[AmoCRM Main Product Webhook] ❌ Fatal error:', error);
    console.error('[AmoCRM Main Product Webhook] Stack:', error.stack);
    
    // ⚠️ КРИТИЧНО: ВСЕГДА возвращаем 200 OK, даже при фатальных ошибках!
    return res.status(200).json({
      success: false,
      error: error.message,
      message: 'Webhook received but processing failed. Returning 200 to prevent retry.',
      duration,
    });
  }
});

export default router;

