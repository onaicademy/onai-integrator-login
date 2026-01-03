/**
 * 🔄 IMPORT HISTORICAL CHALLENGE3D SALES FROM AMOCRM
 *
 * Импортирует все исторические продажи из AmoCRM Challenge3D воронок
 * в таблицу challenge3d_sales для корректного отображения в Traffic Dashboard.
 *
 * Воронки:
 *   - 9777626 (КЦ - Короткий Курс)
 *   - 9430994 (ОП - Основные Продукты)
 * Статус успеха: "Успешно реализовано" (ID: 142)
 *
 * Функционал:
 * 1. Извлекает все закрытые сделки из AmoCRM API
 * 2. Извлекает UTM метки из custom fields
 * 3. Определяет таргетолога по utm_source
 * 4. Проверяет product_type (challenge3d vs express)
 * 5. Определяет prepaid vs full payment по сумме
 * 6. Phone-based attribution для original UTM
 * 7. Сохраняет в challenge3d_sales с дедупликацией
 *
 * Usage:
 *   npx tsx backend/scripts/import-challenge3d-historical.ts
 *   npx tsx backend/scripts/import-challenge3d-historical.ts --from=2024-12-29 --to=2024-12-31
 *   npx tsx backend/scripts/import-challenge3d-historical.ts --days=90
 */

import axios from 'axios';
import { landingSupabase } from '../src/config/supabase-landing.js';
import { AMOCRM_CONFIG } from '../src/config/amocrm-config.js';
import { getOriginalUTM } from '../src/utils/amocrm-utils.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

// ════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_BASE_URL = `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4`;

// Challenge3D Pipeline IDs
const CHALLENGE3D_PIPELINE_IDS = [9777626, 9430994]; // КЦ и ОП
const SUCCESS_STATUS_ID = 142; // Успешно реализовано

// Express Pipeline ID (to exclude)
const EXPRESS_PIPELINE_ID = 10350882;

// UTM Custom Fields IDs
const UTM_FIELDS = {
  utm_source: 434731,
  utm_medium: 434727,
  utm_campaign: 434729,
  utm_content: 434725,
  utm_term: 434733,
  utm_referrer: 434735,
  fbclid: 434761,
};

// Prepaid threshold (KZT)
const PREPAID_THRESHOLD = 10000;

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
  _embedded?: {
    contacts?: Array<{
      id: number;
      name: string;
      custom_fields_values?: Array<{
        field_id: number;
        field_name: string;
        values: Array<{ value: string }>;
      }>;
    }>;
  };
}

interface UTMData {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_referrer: string | null;
  fbclid: string | null;
}

interface Challenge3DSaleRecord {
  deal_id: number;
  pipeline_id: number;
  status_id: number;
  amount: number;
  currency: string;
  package_type: string | null;
  prepaid: boolean;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_referrer: string | null;
  fbclid: string | null;
  customer_id: number | null;
  customer_name: string | null;
  phone: string | null;
  email: string | null;
  original_utm_source: string | null;
  original_utm_campaign: string | null;
  original_utm_medium: string | null;
  attribution_source: string | null;
  related_deal_id: number | null;
  sale_date: string;
  product_type: string;
  targetologist: string | null;
  raw_data: any;
}

interface ImportStats {
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_skipped: number;
  total_express_excluded: number;
  by_pipeline: Record<number, { count: number; revenue: number }>;
  by_targetologist: Record<string, { count: number; revenue: number }>;
  by_prepaid: { prepaid: number; full: number; prepaid_revenue: number; full_revenue: number };
  by_date: Record<string, { count: number; revenue: number }>;
  errors: Array<{ lead_id: number; error: string }>;
}

// ════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Extract UTM parameters from AmoCRM lead custom fields
 */
function extractUTMFromLead(lead: AmoCRMLead): UTMData {
  const customFields = lead.custom_fields_values || [];
  const utm: UTMData = {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    utm_referrer: null,
    fbclid: null,
  };

  for (const field of customFields) {
    const fieldId = field.field_id;
    const value = field.values?.[0]?.value || null;

    if (fieldId === UTM_FIELDS.utm_source) utm.utm_source = value;
    else if (fieldId === UTM_FIELDS.utm_medium) utm.utm_medium = value;
    else if (fieldId === UTM_FIELDS.utm_campaign) utm.utm_campaign = value;
    else if (fieldId === UTM_FIELDS.utm_content) utm.utm_content = value;
    else if (fieldId === UTM_FIELDS.utm_term) utm.utm_term = value;
    else if (fieldId === UTM_FIELDS.utm_referrer) utm.utm_referrer = value;
    else if (fieldId === UTM_FIELDS.fbclid) utm.fbclid = value;
  }

  return utm;
}

/**
 * Extract phone and email from contact
 */
function extractContactInfo(lead: AmoCRMLead): { phone: string | null; email: string | null } {
  const contacts = lead._embedded?.contacts || [];

  if (contacts.length === 0) {
    return { phone: null, email: null };
  }

  const contact = contacts[0];
  const customFields = contact.custom_fields_values || [];

  let phone: string | null = null;
  let email: string | null = null;

  for (const field of customFields) {
    if (field.field_name === 'Телефон' && !phone) {
      phone = field.values?.[0]?.value || null;
    } else if (field.field_name === 'Email' && !email) {
      email = field.values?.[0]?.value || null;
    }
  }

  return { phone, email };
}

/**
 * Determine product type from pipeline and utm_campaign
 */
function determineProductType(lead: AmoCRMLead, utm: UTMData): 'challenge3d' | 'express' | 'unknown' {
  const campaign = (utm.utm_campaign || '').toLowerCase();
  const pipelineId = lead.pipeline_id;

  // Check pipeline first (most reliable)
  if (CHALLENGE3D_PIPELINE_IDS.includes(pipelineId)) {
    return 'challenge3d';
  }

  if (pipelineId === EXPRESS_PIPELINE_ID) {
    return 'express';
  }

  // Check utm_campaign for keywords
  if (
    campaign.includes('3d') ||
    campaign.includes('challenge') ||
    campaign.includes('трехдневник') ||
    campaign.includes('3дневник') ||
    campaign.includes('3х') ||
    campaign.includes('diary')
  ) {
    return 'challenge3d';
  }

  if (
    campaign.includes('express') ||
    campaign.includes('экспресс') ||
    campaign.includes('5000') ||
    campaign.includes('5k')
  ) {
    return 'express';
  }

  return 'unknown';
}

/**
 * Identify targetologist from utm_source
 */
function determineTargetologist(utm: UTMData): string | null {
  const source = (utm.utm_source || '').toLowerCase();
  const medium = (utm.utm_medium || '').toLowerCase();
  const campaign = (utm.utm_campaign || '').toLowerCase();

  // Kenesary patterns
  if (
    source.includes('kenesary') ||
    source.includes('kenji') ||
    source.includes('kenjifb') ||
    source.includes('tripwire') ||
    source.includes('nutcab') ||
    medium.includes('kenesary') ||
    campaign.includes('kenesary')
  ) {
    return 'Kenesary';
  }

  // Arystan patterns
  if (
    source.includes('arystan') ||
    source.includes('fbarystan') ||
    source.includes('ar_') ||
    medium.includes('arystan') ||
    campaign.includes('arystan')
  ) {
    return 'Arystan';
  }

  // Muha patterns
  if (
    source.includes('muha') ||
    source.includes('facebook') ||
    source.includes('yourmarketolog') ||
    medium.includes('muha')
  ) {
    return 'Muha';
  }

  // TF4 / Alex patterns
  if (
    source.includes('alex') ||
    source.includes('tf4') ||
    source.includes('traf4') ||
    medium.includes('alex')
  ) {
    return 'Traf4';
  }

  return null;
}

/**
 * Determine if sale is prepaid or full payment
 */
function isPrepaid(amount: number): boolean {
  return amount < PREPAID_THRESHOLD;
}

/**
 * Convert lead to Challenge3D sale record
 */
async function convertLeadToSaleRecord(lead: AmoCRMLead): Promise<Challenge3DSaleRecord | null> {
  const utm = extractUTMFromLead(lead);
  const productType = determineProductType(lead, utm);

  // Skip Express Course leads
  if (productType === 'express') {
    return null;
  }

  const { phone, email } = extractContactInfo(lead);
  const targetologist = determineTargetologist(utm);
  const prepaid = isPrepaid(lead.price || 0);

  const saleDate = lead.closed_at
    ? new Date(lead.closed_at * 1000).toISOString()
    : new Date(lead.updated_at * 1000).toISOString();

  const customerId = lead._embedded?.contacts?.[0]?.id || null;
  const customerName = lead._embedded?.contacts?.[0]?.name || lead.name || null;

  // Get original UTM via phone-based attribution
  let originalUTM: UTMData = { ...utm };
  let attributionSource = 'current_deal';
  let relatedDealId: number | null = null;

  if (AMOCRM_ACCESS_TOKEN) {
    try {
      // Pass the full lead object and access token
      const originalData = await getOriginalUTM(lead as any, AMOCRM_ACCESS_TOKEN);
      if (originalData) {
        originalUTM = {
          utm_source: originalData.original.utm_source || utm.utm_source,
          utm_campaign: originalData.original.utm_campaign || utm.utm_campaign,
          utm_medium: originalData.original.utm_medium || utm.utm_medium,
          utm_content: originalData.original.utm_content || utm.utm_content,
          utm_term: originalData.original.utm_term || utm.utm_term,
          utm_referrer: originalData.original.utm_referrer || utm.utm_referrer,
          fbclid: originalData.original.fbclid || utm.fbclid,
        };
        attributionSource = originalData.source;
        relatedDealId = originalData.relatedDealId || null;
      }
    } catch (error: any) {
      console.warn(`   ⚠️  Could not fetch original UTM for lead ${lead.id}:`, error.message);
    }
  }

  return {
    deal_id: lead.id,
    pipeline_id: lead.pipeline_id,
    status_id: lead.status_id,
    amount: lead.price || 0,
    currency: 'KZT',
    package_type: prepaid ? 'prepaid' : 'full',
    prepaid,
    utm_source: utm.utm_source,
    utm_campaign: utm.utm_campaign,
    utm_medium: utm.utm_medium,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    utm_referrer: utm.utm_referrer,
    fbclid: utm.fbclid,
    customer_id: customerId,
    customer_name: customerName,
    phone,
    email,
    original_utm_source: originalUTM.utm_source,
    original_utm_campaign: originalUTM.utm_campaign,
    original_utm_medium: originalUTM.utm_medium,
    attribution_source: attributionSource,
    related_deal_id: relatedDealId,
    sale_date: saleDate,
    product_type: productType,
    targetologist,
    raw_data: lead,
  };
}

// ════════════════════════════════════════════════════════════════════════
// AMOCRM API FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Fetch all successful sales from AmoCRM Challenge3D pipelines
 */
async function fetchAllChallenge3DSales(dateFrom?: Date, dateTo?: Date): Promise<AmoCRMLead[]> {
  if (!AMOCRM_ACCESS_TOKEN) {
    throw new Error('❌ AMOCRM_ACCESS_TOKEN not set in environment');
  }

  console.log('\n🔄 Fetching Challenge3D sales from AmoCRM...');
  console.log(`   Pipelines: ${CHALLENGE3D_PIPELINE_IDS.join(', ')} (КЦ, ОП)`);
  console.log(`   Status: ${SUCCESS_STATUS_ID} (Успешно реализовано)`);

  if (dateFrom || dateTo) {
    console.log(`   Date range: ${dateFrom?.toISOString().split('T')[0] || 'all'} → ${dateTo?.toISOString().split('T')[0] || 'now'}`);
  }

  const allLeads: AmoCRMLead[] = [];

  // Fetch from each pipeline
  for (const pipelineId of CHALLENGE3D_PIPELINE_IDS) {
    console.log(`\n   📋 Fetching from pipeline ${pipelineId}...`);

    let page = 1;
    const limit = 250;
    let hasMore = true;

    while (hasMore) {
      try {
        const params: any = {
          filter: {
            pipeline_id: pipelineId,
            statuses: [{ pipeline_id: pipelineId, status_id: SUCCESS_STATUS_ID }],
          },
          with: 'contacts',
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

        console.log(`      📄 Page ${page}...`);

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
        console.log(`      ✅ Page ${page}: ${leads.length} leads (pipeline total: ${allLeads.length})`);

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
          console.warn('      ⚠️  Reached page limit (100), stopping');
          hasMore = false;
        }

      } catch (error: any) {
        console.error(`      ❌ Error fetching page ${page}:`, error.message);

        if (error.response?.status === 429) {
          console.log('      ⏳ Rate limited, waiting 60s...');
          await new Promise(resolve => setTimeout(resolve, 60000));
          continue;
        }

        if (error.response?.status === 401) {
          throw new Error('❌ AmoCRM authentication failed. Check AMOCRM_ACCESS_TOKEN');
        }

        hasMore = false;
      }
    }
  }

  console.log(`\n✅ Total fetched: ${allLeads.length} sales from AmoCRM\n`);
  return allLeads;
}

// ════════════════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Insert or update sale in challenge3d_sales
 */
async function upsertSale(sale: Challenge3DSaleRecord): Promise<'inserted' | 'updated' | 'skipped'> {
  try {
    // Check if sale already exists
    const { data: existing, error: checkError } = await landingSupabase
      .from('challenge3d_sales')
      .select('id, amount, utm_source')
      .eq('deal_id', sale.deal_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // Update if amount changed or UTM changed
      const needsUpdate =
        existing.amount !== sale.amount ||
        existing.utm_source !== sale.utm_source;

      if (needsUpdate) {
        const { error: updateError } = await landingSupabase
          .from('challenge3d_sales')
          .update({
            pipeline_id: sale.pipeline_id,
            status_id: sale.status_id,
            amount: sale.amount,
            currency: sale.currency,
            package_type: sale.package_type,
            prepaid: sale.prepaid,
            utm_source: sale.utm_source,
            utm_campaign: sale.utm_campaign,
            utm_medium: sale.utm_medium,
            utm_content: sale.utm_content,
            utm_term: sale.utm_term,
            utm_referrer: sale.utm_referrer,
            fbclid: sale.fbclid,
            customer_id: sale.customer_id,
            customer_name: sale.customer_name,
            phone: sale.phone,
            email: sale.email,
            original_utm_source: sale.original_utm_source,
            original_utm_campaign: sale.original_utm_campaign,
            original_utm_medium: sale.original_utm_medium,
            attribution_source: sale.attribution_source,
            related_deal_id: sale.related_deal_id,
            sale_date: sale.sale_date,
            raw_data: sale.raw_data,
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
      .from('challenge3d_sales')
      .insert({
        deal_id: sale.deal_id,
        pipeline_id: sale.pipeline_id,
        status_id: sale.status_id,
        amount: sale.amount,
        currency: sale.currency,
        package_type: sale.package_type,
        prepaid: sale.prepaid,
        utm_source: sale.utm_source,
        utm_campaign: sale.utm_campaign,
        utm_medium: sale.utm_medium,
        utm_content: sale.utm_content,
        utm_term: sale.utm_term,
        utm_referrer: sale.utm_referrer,
        fbclid: sale.fbclid,
        customer_id: sale.customer_id,
        customer_name: sale.customer_name,
        phone: sale.phone,
        email: sale.email,
        original_utm_source: sale.original_utm_source,
        original_utm_campaign: sale.original_utm_campaign,
        original_utm_medium: sale.original_utm_medium,
        attribution_source: sale.attribution_source,
        related_deal_id: sale.related_deal_id,
        sale_date: sale.sale_date,
        raw_data: sale.raw_data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString(),
      });

    if (insertError) throw insertError;
    return 'inserted';

  } catch (error: any) {
    console.error(`   ❌ Error upserting sale ${sale.deal_id}:`, error.message);
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
    total_express_excluded: 0,
    by_pipeline: {},
    by_targetologist: {},
    by_prepaid: { prepaid: 0, full: 0, prepaid_revenue: 0, full_revenue: 0 },
    by_date: {},
    errors: [],
  };

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 CHALLENGE3D HISTORICAL SALES IMPORT');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch all sales from AmoCRM
  const leads = await fetchAllChallenge3DSales(dateFrom, dateTo);
  stats.total_fetched = leads.length;

  if (leads.length === 0) {
    console.log('⚠️  No sales found in AmoCRM for the specified period\n');
    return stats;
  }

  // Step 2: Convert and import to database
  console.log('💾 Converting and importing sales to database...\n');

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    try {
      const sale = await convertLeadToSaleRecord(lead);

      // Skip Express Course leads
      if (sale === null) {
        stats.total_express_excluded++;
        continue;
      }

      const result = await upsertSale(sale);

      if (result === 'inserted') {
        stats.total_inserted++;
        console.log(`   ✅ [${i + 1}/${leads.length}] Inserted: ${sale.customer_name} - ${sale.amount} KZT (${sale.prepaid ? 'prepaid' : 'full'})`);
      } else if (result === 'updated') {
        stats.total_updated++;
        console.log(`   🔄 [${i + 1}/${leads.length}] Updated: ${sale.customer_name} - ${sale.amount} KZT`);
      } else {
        stats.total_skipped++;
      }

      // Update stats by pipeline
      if (!stats.by_pipeline[sale.pipeline_id]) {
        stats.by_pipeline[sale.pipeline_id] = { count: 0, revenue: 0 };
      }
      stats.by_pipeline[sale.pipeline_id].count++;
      stats.by_pipeline[sale.pipeline_id].revenue += sale.amount;

      // Update stats by targetologist
      const targetologist = sale.targetologist || 'unknown';
      if (!stats.by_targetologist[targetologist]) {
        stats.by_targetologist[targetologist] = { count: 0, revenue: 0 };
      }
      stats.by_targetologist[targetologist].count++;
      stats.by_targetologist[targetologist].revenue += sale.amount;

      // Update stats by prepaid
      if (sale.prepaid) {
        stats.by_prepaid.prepaid++;
        stats.by_prepaid.prepaid_revenue += sale.amount;
      } else {
        stats.by_prepaid.full++;
        stats.by_prepaid.full_revenue += sale.amount;
      }

      // Update stats by date
      const dateKey = sale.sale_date.split('T')[0];
      if (!stats.by_date[dateKey]) {
        stats.by_date[dateKey] = { count: 0, revenue: 0 };
      }
      stats.by_date[dateKey].count++;
      stats.by_date[dateKey].revenue += sale.amount;

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

    // Default: from 2024-12-29 if no args provided
    if (args.length === 0) {
      dateFrom = new Date('2024-12-29');
      console.log('ℹ️  Using default date range: from 2024-12-29');
    }

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
    console.log(`🚫 Express excluded:           ${stats.total_express_excluded}`);
    console.log(`❌ Total errors:               ${stats.errors.length}`);

    console.log('\n📋 BY PIPELINE:\n');
    Object.entries(stats.by_pipeline)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .forEach(([pipeline, data]) => {
        const pipelineName = pipeline === '9777626' ? 'КЦ' : pipeline === '9430994' ? 'ОП' : 'Unknown';
        console.log(`   ${pipeline} (${pipelineName})`.padEnd(25) + ` → ${data.count} sales, ${data.revenue.toLocaleString('ru-RU')} KZT`);
      });

    console.log('\n📊 BY TARGETOLOGIST:\n');
    Object.entries(stats.by_targetologist)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .forEach(([targetologist, data]) => {
        console.log(`   ${targetologist.padEnd(15)} → ${data.count} sales, ${data.revenue.toLocaleString('ru-RU')} KZT`);
      });

    console.log('\n💰 BY PAYMENT TYPE:\n');
    console.log(`   Prepaid:     ${stats.by_prepaid.prepaid} sales, ${stats.by_prepaid.prepaid_revenue.toLocaleString('ru-RU')} KZT`);
    console.log(`   Full:        ${stats.by_prepaid.full} sales, ${stats.by_prepaid.full_revenue.toLocaleString('ru-RU')} KZT`);

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
