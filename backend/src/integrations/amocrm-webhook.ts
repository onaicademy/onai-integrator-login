// backend/src/integrations/amocrm-webhook.ts
// 🔔 AmoCRM Webhook Handler for Referral System

import { Router, Request, Response } from 'express';
import referralService from '../services/referral.service.js';

const router = Router();

// Status ID for "Успешно реализовано" in AmoCRM
// This may vary depending on your AmoCRM pipeline configuration
const SUCCESS_STATUS_ID = 142;

/**
 * POST /webhook/amocrm/referral
 * AmoCRM webhook для обработки событий по сделкам (REFERRAL SYSTEM)
 * Срабатывает когда deal переходит в статус "Успешно реализовано"
 */
router.post('/referral', async (req: Request, res: Response) => {
  try {
    console.log('🔔 [Referral Webhook] Incoming request from AmoCRM');
    console.log('📋 [Referral Webhook] Content-Type:', req.headers['content-type']);
    console.log('📋 [Referral Webhook] Raw Body Type:', typeof req.body);
    console.log('📋 [Referral Webhook] Payload:', JSON.stringify(req.body, null, 2));

    // ✅ CRITICAL: AmoCRM может отправлять данные как в req.body.leads, так и напрямую в req.body
    let leads = req.body?.leads || req.body?.['leads[status][0]'] || [];
    
    // ✅ HOTFIX: Если данные приходят в URL-encoded формате с нестандартными ключами
    if (!leads || (Array.isArray(leads) && leads.length === 0)) {
      // Проверяем все ключи req.body на наличие "leads"
      const bodyKeys = Object.keys(req.body || {});
      console.log('📋 [Referral Webhook] Body Keys:', bodyKeys);
      
      // Пытаемся найти ключи типа "leads[status][0][id]"
      const leadsData: any = {};
      for (const key of bodyKeys) {
        if (key.startsWith('leads[')) {
          const match = key.match(/leads\[(\w+)\]\[(\d+)\]\[(\w+)\]/);
          if (match) {
            const [, status, index, field] = match;
            if (!leadsData[index]) leadsData[index] = {};
            leadsData[index][field] = req.body[key];
          }
        }
      }
      
      // Конвертируем объект в массив
      leads = Object.values(leadsData);
      console.log('🔄 [Referral Webhook] Parsed leads from URL-encoded:', leads);
    }

    if (!leads || (Array.isArray(leads) && leads.length === 0)) {
      console.log('⚠️ [Referral Webhook] No leads in payload after all parsing attempts');
      return res.status(200).json({ success: true, message: 'No leads to process' });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const lead of leads) {
      try {
        // Get deals from lead
        const deals = lead.deals || lead.update || [lead];
        
        for (const deal of deals) {
          // Check if deal is in success status
          const statusId = deal.status_id || deal.pipeline?.status_id;
          
          if (statusId !== SUCCESS_STATUS_ID) {
            console.log(`⏭️ [Referral Webhook] Skipping deal ${deal.id} - status ${statusId} != ${SUCCESS_STATUS_ID}`);
            continue;
          }

          // Extract UTM source from custom fields
          let utmSource: string | null = null;
          
          // Method 1: From custom_fields array
          if (deal.custom_fields && Array.isArray(deal.custom_fields)) {
            const utmField = deal.custom_fields.find(
              (f: any) => f.code === 'utm_source' || f.name === 'utm_source' || f.id === 'utm_source'
            );
            utmSource = utmField?.values?.[0]?.value || utmField?.value;
          }
          
          // Method 2: From tags or notes (if UTM was saved there)
          if (!utmSource && deal.tags) {
            const refTag = deal.tags.find((t: any) => t.name?.startsWith('ref_'));
            utmSource = refTag?.name;
          }

          // Method 3: From additional fields
          if (!utmSource && deal.utm_source) {
            utmSource = deal.utm_source;
          }

          if (!utmSource) {
            console.log(`⚠️ [Referral Webhook] No UTM source for deal ${deal.id}`);
            continue;
          }

          // Check if UTM is a referral link
          if (!utmSource.startsWith('ref_')) {
            console.log(`⏭️ [Referral Webhook] UTM ${utmSource} is not a referral link`);
            continue;
          }

          // Get deal amount (AmoCRM stores in kopeks/cents)
          const dealValue = (deal.sum || deal.price || 0) / 100;

          if (dealValue <= 0) {
            console.log(`⚠️ [Referral Webhook] Deal ${deal.id} has zero value`);
            continue;
          }

          // Get customer info
          const customerEmail = lead.email || deal.customer_email || 'unknown@amocrm.com';
          const customerName = lead.name || deal.name || 'AmoCRM Customer';

          console.log(`📝 [Referral Webhook] Processing deal:`, {
            deal_id: deal.id,
            utm_source: utmSource,
            value: dealValue,
            customer: customerEmail,
          });

          // Record conversion
          await referralService.recordConversion(
            utmSource,
            deal.id.toString(),
            customerEmail,
            customerName,
            dealValue
          );

          processedCount++;
          console.log(`✅ [Referral Webhook] Conversion recorded for deal ${deal.id}`);
        }
      } catch (leadError: any) {
        console.error(`❌ [Referral Webhook] Error processing lead:`, leadError.message);
        errorCount++;
      }
    }

    console.log(`📊 [Referral Webhook] Summary: ${processedCount} processed, ${errorCount} errors`);

    res.json({
      success: true,
      processed: processedCount,
      errors: errorCount,
    });
  } catch (error: any) {
    console.error('❌ [Referral Webhook] Fatal error:', error);
    
    // Always return 200 to AmoCRM to prevent retries
    res.status(200).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /webhook/amocrm/referral/test
 * Test endpoint to verify webhook is accessible
 */
router.get('/referral/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Referral webhook endpoint is active',
    endpoint: '/webhook/amocrm/referral',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
