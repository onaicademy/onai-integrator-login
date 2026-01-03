/**
 * 🔄 IMPORT HISTORICAL SALES FROM AMOCRM
 *
 * Импортирует все исторические продажи из AmoCRM Express Course воронки
 * в таблицу all_sales_tracking для корректного отображения в Traffic Dashboard.
 *
 * Воронка: Express Course (ID: 10350882)
 * Статус успеха: "Успешно реализовано" (ID: 142)
 *
 * Функционал:
 * 1. Извлекает все закрытые сделки из AmoCRM API
 * 2. Извлекает UTM метки из custom fields
 * 3. Определяет таргетолога по utm_source
 * 4. Автоматически определяет funnel_type по utm_campaign
 * 5. Группирует по датам для аналитики
 * 6. Сохраняет в all_sales_tracking с дедупликацией
 *
 * Usage:
 *   npx tsx backend/scripts/import-amocrm-historical-sales.ts
 *   npx tsx backend/scripts/import-amocrm-historical-sales.ts --from=2024-01-01 --to=2024-12-31
 *   npx tsx backend/scripts/import-amocrm-historical-sales.ts --days=90
 */

import axios from 'axios';
import { landingSupabase } from '../src/config/supabase-landing.js';
import { AMOCRM_CONFIG } from '../src/config/amocrm-config.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

// ════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_BASE_URL = `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4`;

const EXPRESS_PIPELINE_ID = AMOCRM_CONFIG.PIPELINE_ID; // 10350882
const SUCCESS_STATUS_ID = AMOCRM_CONFIG.STAGES.УСПЕШНО_РЕАЛИЗОВАНО; // 142

// UTM Custom Fields IDs
const UTM_FIELDS = {
  utm_source: AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_SOURCE,
  utm_medium: AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_MEDIUM,
  utm_campaign: AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_CAMPAIGN,
  utm_content: AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_CONTENT,
  utm_term: AMOCRM_CONFIG.CUSTOM_FIELDS.UTM_TERM,
};

// ════════════════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════════════════

interface AmoCRMLead {
  id: number;
  name: string;
  price: number;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  updated_at: number;
  closed_at: number;
  custom_fields_values?: Array<{
    field_id: number;
    field_name: string;
    values: Array<{ value: string }>;
  }>;
}

interface SaleRecord {
  sale_id: number;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  sale_price: number;
  sale_date: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  funnel_type: 'express' | 'challenge3d' | 'intensive1d' | null;
  targetologist_id: string | null;
  auto_detected: boolean;
  detection_method: string | null;
  amocrm_lead_id: number;
  amocrm_pipeline_id: number;
  amocrm_status_id: number;
}

interface ImportStats {
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_skipped: number;
  by_targetologist: Record<string, { count: number; revenue: number }>;
  by_funnel: Record<string, { count: number; revenue: number }>;
  by_date: Record<string, { count: number; revenue: number }>;
  errors: Array<{ lead_id: number; error: string }>;
}

// ════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Extract UTM parameters from AmoCRM lead custom fields
 */
function extractUTMFromLead(lead: AmoCRMLead): {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
} {
  const customFields = lead.custom_fields_values || [];
  const utm: Record<string, string | null> = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };

  for (const field of customFields) {
    const fieldId = field.field_id;
    const value = field.values?.[0]?.value || null;

    if (fieldId === UTM_FIELDS.utm_source) utm.utm_source = value;
    else if (fieldId === UTM_FIELDS.utm_medium) utm.utm_medium = value;
    else if (fieldId === UTM_FIELDS.utm_campaign) utm.utm_campaign = value;
    else if (fieldId === UTM_FIELDS.utm_content) utm.utm_content = value;
    else if (fieldId === UTM_FIELDS.utm_term) utm.utm_term = value;
  }

  return utm as any;
}

/**
 * Detect funnel type from utm_campaign
 */
function detectFunnelType(utmCampaign: string | null): {
  funnel_type: 'express' | 'challenge3d' | 'intensive1d' | null;
  auto_detected: boolean;
  detection_method: string | null;
} {
  if (!utmCampaign) {
    return { funnel_type: 'express', auto_detected: false, detection_method: 'default' };
  }

  const campaign = utmCampaign.toLowerCase();

  if (campaign.includes('express') || campaign.includes('экспресс')) {
    return { funnel_type: 'express', auto_detected: true, detection_method: 'utm_campaign_keyword' };
  }

  if (campaign.includes('challenge') || campaign.includes('трехдневник') || campaign.includes('3d')) {
    return { funnel_type: 'challenge3d', auto_detected: true, detection_method: 'utm_campaign_keyword' };
  }

  if (campaign.includes('intensive') || campaign.includes('однодневник') || campaign.includes('1d')) {
    return { funnel_type: 'intensive1d', auto_detected: true, detection_method: 'utm_campaign_keyword' };
  }

  // Default to express for Express Course pipeline
  return { funnel_type: 'express', auto_detected: false, detection_method: 'pipeline_default' };
}

/**
 * Identify targetologist from utm_source
 */
function identifyTargetologist(utmSource: string | null): string | null {
  if (!utmSource) return null;

  const source = utmSource.toLowerCase();

  // Kenesary
  if (source.includes('kenji') || source === 'kenjifb') return 'kenesary';

  // Arystan
  if (source.includes('arystan') || source === 'fbarystan') return 'arystan';

  // TF4 / Alex
  if (source.includes('alex') || source === 'alex_fb' || source === 'alex_inst') return 'tf4';

  // Muha
  if (source.includes('facebook') || source.includes('yourmarketolog')) return 'muha';

  return null;
}

/**
 * Convert lead to sale record
 */
function convertLeadToSaleRecord(lead: AmoCRMLead): SaleRecord {
  const utm = extractUTMFromLead(lead);
  const funnelDetection = detectFunnelType(utm.utm_campaign);
  const targetologist = identifyTargetologist(utm.utm_source);

  const saleDate = lead.closed_at
    ? new Date(lead.closed_at * 1000).toISOString().split('T')[0]
    : new Date(lead.updated_at * 1000).toISOString().split('T')[0];

  return {
    sale_id: lead.id,
    contact_name: lead.name,
    contact_email: null,
    contact_phone: null,
    sale_price: lead.price || 0,
    sale_date: saleDate,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    funnel_type: funnelDetection.funnel_type,
    targetologist_id: targetologist,
    auto_detected: funnelDetection.auto_detected,
    detection_method: funnelDetection.detection_method,
    amocrm_lead_id: lead.id,
    amocrm_pipeline_id: lead.pipeline_id,
    amocrm_status_id: lead.status_id,
  };
}

// ════════════════════════════════════════════════════════════════════════
// AMOCRM API FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Fetch all successful sales from AmoCRM Express Course pipeline
 */
async function fetchAllExpressSales(dateFrom?: Date, dateTo?: Date): Promise<AmoCRMLead[]> {
  if (!AMOCRM_ACCESS_TOKEN) {
    throw new Error('❌ AMOCRM_ACCESS_TOKEN not set in environment');
  }

  console.log('\n🔄 Fetching Express Course sales from AmoCRM...');
  console.log(`   Pipeline: ${EXPRESS_PIPELINE_ID} (Express Course)`);
  console.log(`   Status: ${SUCCESS_STATUS_ID} (Успешно реализовано)`);

  if (dateFrom || dateTo) {
    console.log(`   Date range: ${dateFrom?.toISOString().split('T')[0] || 'all'} → ${dateTo?.toISOString().split('T')[0] || 'now'}`);
  }

  const allLeads: AmoCRMLead[] = [];
  let page = 1;
  const limit = 250;
  let hasMore = true;

  while (hasMore) {
    try {
      const params: any = {
        filter: {
          pipeline_id: [EXPRESS_PIPELINE_ID],
          statuses: [{ pipeline_id: EXPRESS_PIPELINE_ID, status_id: SUCCESS_STATUS_ID }],
        },
        page,
        limit,
      };

      // Add date filters if provided
      if (dateFrom) {
        params.filter.closed_at = params.filter.closed_at || {};
        params.filter.closed_at.from = Math.floor(dateFrom.getTime() / 1000);
      }
      if (dateTo) {
        params.filter.closed_at = params.filter.closed_at || {};
        params.filter.closed_at.to = Math.floor(dateTo.getTime() / 1000);
      }

      console.log(`   📄 Fetching page ${page}...`);

      const response = await axios.get(`${AMOCRM_BASE_URL}/leads`, {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        params,
        timeout: 60000,
      });

      const leads = response.data._embedded?.leads || [];

      if (leads.length === 0) {
        hasMore = false;
        break;
      }

      allLeads.push(...leads);
      console.log(`   ✅ Page ${page}: ${leads.length} leads fetched (total: ${allLeads.length})`);

      // Check if there are more pages
      if (leads.length < limit) {
        hasMore = false;
      } else {
        page++;
      }

      // Rate limiting - wait 500ms between requests
      await new Promise(resolve => setTimeout(resolve, 500));

      // Safety limit
      if (page > 100) {
        console.warn('   ⚠️  Reached page limit (100), stopping');
        hasMore = false;
      }

    } catch (error: any) {
      console.error(`   ❌ Error fetching page ${page}:`, error.message);

      if (error.response?.status === 429) {
        console.log('   ⏳ Rate limited, waiting 60s...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }

      if (error.response?.status === 401) {
        throw new Error('❌ AmoCRM authentication failed. Check AMOCRM_ACCESS_TOKEN');
      }

      hasMore = false;
    }
  }

  console.log(`\n✅ Total fetched: ${allLeads.length} sales from AmoCRM\n`);
  return allLeads;
}

// ════════════════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Insert or update sale in all_sales_tracking
 */
async function upsertSale(sale: SaleRecord): Promise<'inserted' | 'updated' | 'skipped'> {
  try {
    // Check if sale already exists
    const { data: existing, error: checkError } = await landingSupabase
      .from('all_sales_tracking')
      .select('id, sale_price, utm_source')
      .eq('sale_id', sale.sale_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // Update if UTM data changed or price changed
      const needsUpdate =
        existing.sale_price !== sale.sale_price ||
        existing.utm_source !== sale.utm_source;

      if (needsUpdate) {
        const { error: updateError } = await landingSupabase
          .from('all_sales_tracking')
          .update({
            contact_name: sale.contact_name,
            sale_price: sale.sale_price,
            sale_date: sale.sale_date,
            utm_source: sale.utm_source,
            utm_medium: sale.utm_medium,
            utm_campaign: sale.utm_campaign,
            utm_content: sale.utm_content,
            utm_term: sale.utm_term,
            funnel_type: sale.funnel_type,
            targetologist_id: sale.targetologist_id,
            auto_detected: sale.auto_detected,
            detection_method: sale.detection_method,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        return 'updated';
      }

      return 'skipped';
    }

    // Insert new sale
    const { error: insertError } = await landingSupabase
      .from('all_sales_tracking')
      .insert({
        sale_id: sale.sale_id,
        contact_name: sale.contact_name,
        contact_email: sale.contact_email,
        contact_phone: sale.contact_phone,
        sale_price: sale.sale_price,
        sale_date: sale.sale_date,
        utm_source: sale.utm_source,
        utm_medium: sale.utm_medium,
        utm_campaign: sale.utm_campaign,
        utm_content: sale.utm_content,
        utm_term: sale.utm_term,
        funnel_type: sale.funnel_type,
        targetologist_id: sale.targetologist_id,
        auto_detected: sale.auto_detected,
        detection_method: sale.detection_method,
        amocrm_lead_id: sale.amocrm_lead_id,
        amocrm_pipeline_id: sale.amocrm_pipeline_id,
        amocrm_status_id: sale.amocrm_status_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
    return 'inserted';

  } catch (error: any) {
    console.error(`   ❌ Error upserting sale ${sale.sale_id}:`, error.message);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════
// MAIN IMPORT FUNCTION
// ════════════════════════════════════════════════════════════════════════

async function importHistoricalSales(dateFrom?: Date, dateTo?: Date): Promise<ImportStats> {
  const stats: ImportStats = {
    total_fetched: 0,
    total_inserted: 0,
    total_updated: 0,
    total_skipped: 0,
    by_targetologist: {},
    by_funnel: {},
    by_date: {},
    errors: [],
  };

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 AMOCRM HISTORICAL SALES IMPORT');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch all sales from AmoCRM
  const leads = await fetchAllExpressSales(dateFrom, dateTo);
  stats.total_fetched = leads.length;

  if (leads.length === 0) {
    console.log('⚠️  No sales found in AmoCRM for the specified period\n');
    return stats;
  }

  // Step 2: Convert and import to database
  console.log('💾 Importing sales to database...\n');

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    try {
      const sale = convertLeadToSaleRecord(lead);
      const result = await upsertSale(sale);

      if (result === 'inserted') {
        stats.total_inserted++;
        console.log(`   ✅ [${i + 1}/${leads.length}] Inserted: ${sale.contact_name} - ${sale.sale_price} KZT`);
      } else if (result === 'updated') {
        stats.total_updated++;
        console.log(`   🔄 [${i + 1}/${leads.length}] Updated: ${sale.contact_name} - ${sale.sale_price} KZT`);
      } else {
        stats.total_skipped++;
      }

      // Update stats by targetologist
      const targetologist = sale.targetologist_id || 'unknown';
      if (!stats.by_targetologist[targetologist]) {
        stats.by_targetologist[targetologist] = { count: 0, revenue: 0 };
      }
      stats.by_targetologist[targetologist].count++;
      stats.by_targetologist[targetologist].revenue += sale.sale_price;

      // Update stats by funnel
      const funnel = sale.funnel_type || 'unknown';
      if (!stats.by_funnel[funnel]) {
        stats.by_funnel[funnel] = { count: 0, revenue: 0 };
      }
      stats.by_funnel[funnel].count++;
      stats.by_funnel[funnel].revenue += sale.sale_price;

      // Update stats by date
      if (!stats.by_date[sale.sale_date]) {
        stats.by_date[sale.sale_date] = { count: 0, revenue: 0 };
      }
      stats.by_date[sale.sale_date].count++;
      stats.by_date[sale.sale_date].revenue += sale.sale_price;

    } catch (error: any) {
      stats.errors.push({
        lead_id: lead.id,
        error: error.message,
      });
      console.error(`   ❌ [${i + 1}/${leads.length}] Failed: Lead ${lead.id} - ${error.message}`);
    }

    // Rate limiting for database
    if (i > 0 && i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return stats;
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    let dateFrom: Date | undefined;
    let dateTo: Date | undefined;

    for (const arg of args) {
      if (arg.startsWith('--from=')) {
        dateFrom = new Date(arg.split('=')[1]);
      } else if (arg.startsWith('--to=')) {
        dateTo = new Date(arg.split('=')[1]);
      } else if (arg.startsWith('--days=')) {
        const days = parseInt(arg.split('=')[1]);
        dateTo = new Date();
        dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
      }
    }

    // Run import
    const stats = await importHistoricalSales(dateFrom, dateTo);

    // Print summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 IMPORT SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`✅ Total fetched from AmoCRM:  ${stats.total_fetched}`);
    console.log(`✅ Total inserted:             ${stats.total_inserted}`);
    console.log(`🔄 Total updated:              ${stats.total_updated}`);
    console.log(`⏭️  Total skipped (no changes): ${stats.total_skipped}`);
    console.log(`❌ Total errors:               ${stats.errors.length}`);

    console.log('\n📊 BY TARGETOLOGIST:\n');
    Object.entries(stats.by_targetologist)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .forEach(([targetologist, data]) => {
        console.log(`   ${targetologist.padEnd(15)} → ${data.count} sales, ${data.revenue.toLocaleString('ru-RU')} KZT`);
      });

    console.log('\n🎯 BY FUNNEL:\n');
    Object.entries(stats.by_funnel)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .forEach(([funnel, data]) => {
        console.log(`   ${funnel.padEnd(15)} → ${data.count} sales, ${data.revenue.toLocaleString('ru-RU')} KZT`);
      });

    console.log('\n📅 BY DATE (Last 10 days):\n');
    Object.entries(stats.by_date)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10)
      .forEach(([date, data]) => {
        console.log(`   ${date} → ${data.count} sales, ${data.revenue.toLocaleString('ru-RU')} KZT`);
      });

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      stats.errors.forEach(error => {
        console.log(`   Lead ${error.lead_id}: ${error.error}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('✅ IMPORT COMPLETE');
    console.log('════════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
