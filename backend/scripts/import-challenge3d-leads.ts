/**
 * 🔄 IMPORT CHALLENGE3D LEADS FROM AMOCRM
 *
 * Импортирует ВСЕ лиды (заявки) из AmoCRM Challenge3D воронок
 * в таблицу landing_leads для корректного отображения в Traffic Dashboard.
 *
 * Воронки:
 *   - 9777626 (КЦ - Короткий Курс)
 *   - 9430994 (ОП - Основные Продукты)
 *
 * Статусы: ВСЕ (не только 142)
 *
 * Usage:
 *   npx tsx backend/scripts/import-challenge3d-leads.ts
 *   npx tsx backend/scripts/import-challenge3d-leads.ts --from=2025-12-30 --to=2026-01-02
 */

import axios from 'axios';
import { landingSupabase } from '../src/config/supabase-landing.js';
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

// UTM Custom Fields IDs
const UTM_FIELDS = {
  utm_source: 434731,
  utm_medium: 434727,
  utm_campaign: 434729,
  utm_content: 434725,
  utm_term: 434733,
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

interface ImportStats {
  total_fetched: number;
  total_inserted: number;
  total_updated: number;
  total_skipped: number;
  by_pipeline: Record<number, number>;
  by_targetologist: Record<string, number>;
  by_date: Record<string, number>;
  errors: Array<{ lead_id: number; error: string }>;
}

// ════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

function extractUTMFromLead(lead: AmoCRMLead): Record<string, string | null> {
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

  return utm;
}

function extractContactInfo(lead: AmoCRMLead): { phone: string | null; email: string | null; name: string | null } {
  const contacts = lead._embedded?.contacts || [];

  if (contacts.length === 0) {
    return { phone: null, email: null, name: lead.name || null };
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

  return { phone, email, name: contact.name || lead.name || null };
}

function determineTargetologist(utm: Record<string, string | null>): string | null {
  const source = (utm.utm_source || '').toLowerCase();
  const medium = (utm.utm_medium || '').toLowerCase();
  const campaign = (utm.utm_campaign || '').toLowerCase();

  // Kenesary patterns
  if (source.includes('kenesary') || source.includes('kenji') || source.includes('kenjifb') ||
      source.includes('tripwire') || source.includes('nutcab')) {
    return 'Kenesary';
  }

  // Arystan patterns
  if (source.includes('arystan') || source.includes('fbarystan') || source.includes('ar_')) {
    return 'Arystan';
  }

  // Muha patterns
  if (source.includes('muha') || source.includes('yourmarketolog') || medium.includes('yourmarketolog')) {
    return 'Muha';
  }

  // Traf4 patterns
  if (source.includes('alex') || source.includes('traf4') || campaign.includes('alex')) {
    return 'Traf4';
  }

  return null;
}

// ════════════════════════════════════════════════════════════════════════
// AMOCRM API FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

async function fetchAllLeads(dateFrom?: Date, dateTo?: Date): Promise<AmoCRMLead[]> {
  if (!AMOCRM_ACCESS_TOKEN) {
    throw new Error('❌ AMOCRM_ACCESS_TOKEN not set in environment');
  }

  console.log('\n🔄 Fetching Challenge3D leads from AmoCRM...');
  console.log(`   Pipelines: ${CHALLENGE3D_PIPELINE_IDS.join(', ')} (КЦ, ОП)`);
  console.log(`   Statuses: ALL (все статусы)`);

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
          'filter[pipeline_id]': pipelineId,
          with: 'contacts',
          page,
          limit,
        };

        // Add date filters if provided (using created_at for leads)
        if (dateFrom) {
          params['filter[created_at][from]'] = Math.floor(dateFrom.getTime() / 1000);
        }
        if (dateTo) {
          // Add 1 day to include the end date fully
          const endDate = new Date(dateTo);
          endDate.setDate(endDate.getDate() + 1);
          params['filter[created_at][to]'] = Math.floor(endDate.getTime() / 1000);
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
        console.log(`      ✅ Page ${page}: ${leads.length} leads (total: ${allLeads.length})`);

        if (leads.length < limit) {
          hasMore = false;
        } else {
          page++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

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

  console.log(`\n✅ Total fetched: ${allLeads.length} leads from AmoCRM\n`);
  return allLeads;
}

// ════════════════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

async function upsertLead(lead: AmoCRMLead): Promise<'inserted' | 'updated' | 'skipped'> {
  const utm = extractUTMFromLead(lead);
  const { phone, email, name } = extractContactInfo(lead);
  const targetologist = determineTargetologist(utm);

  const createdAt = lead.created_at
    ? new Date(lead.created_at * 1000).toISOString()
    : new Date().toISOString();

  const leadData = {
    email: email || `lead_${lead.id}@amocrm.import`,
    name: name || lead.name || 'Unknown',
    phone: phone || '',
    source: 'challenge3d',
    amocrm_lead_id: lead.id.toString(),
    amocrm_synced: true,
    utm_source: utm.utm_source,
    utm_campaign: utm.utm_campaign,
    utm_medium: utm.utm_medium,
    utm_content: utm.utm_content,
    utm_term: utm.utm_term,
    metadata: {
      pipeline_id: lead.pipeline_id,
      status_id: lead.status_id,
      targetologist: targetologist,
      price: lead.price || 0,
      imported_at: new Date().toISOString(),
    },
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  };

  try {
    // Check if lead already exists
    const { data: existing, error: checkError } = await landingSupabase
      .from('landing_leads')
      .select('id, amocrm_lead_id')
      .eq('amocrm_lead_id', lead.id.toString())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // Update existing
      const { error: updateError } = await landingSupabase
        .from('landing_leads')
        .update({
          name: leadData.name,
          phone: leadData.phone,
          utm_source: leadData.utm_source,
          utm_campaign: leadData.utm_campaign,
          utm_medium: leadData.utm_medium,
          utm_content: leadData.utm_content,
          utm_term: leadData.utm_term,
          metadata: leadData.metadata,
          updated_at: leadData.updated_at,
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      return 'updated';
    }

    // Insert new
    const { error: insertError } = await landingSupabase
      .from('landing_leads')
      .insert(leadData);

    if (insertError) throw insertError;
    return 'inserted';

  } catch (error: any) {
    console.error(`   ❌ Error upserting lead ${lead.id}:`, error.message);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════════
// MAIN IMPORT FUNCTION
// ════════════════════════════════════════════════════════════════════════

async function importLeads(dateFrom?: Date, dateTo?: Date): Promise<ImportStats> {
  const stats: ImportStats = {
    total_fetched: 0,
    total_inserted: 0,
    total_updated: 0,
    total_skipped: 0,
    by_pipeline: {},
    by_targetologist: {},
    by_date: {},
    errors: [],
  };

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 CHALLENGE3D LEADS IMPORT');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Step 1: Fetch all leads from AmoCRM
  const leads = await fetchAllLeads(dateFrom, dateTo);
  stats.total_fetched = leads.length;

  if (leads.length === 0) {
    console.log('⚠️  No leads found in AmoCRM for the specified period\n');
    return stats;
  }

  // Step 2: Import to database
  console.log('💾 Importing leads to database...\n');

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];

    try {
      const result = await upsertLead(lead);
      const utm = extractUTMFromLead(lead);
      const targetologist = determineTargetologist(utm) || 'unknown';

      if (result === 'inserted') {
        stats.total_inserted++;
        console.log(`   ✅ [${i + 1}/${leads.length}] Inserted: ${lead.name} (${targetologist})`);
      } else if (result === 'updated') {
        stats.total_updated++;
        console.log(`   🔄 [${i + 1}/${leads.length}] Updated: ${lead.name}`);
      } else {
        stats.total_skipped++;
      }

      // Update stats by pipeline
      stats.by_pipeline[lead.pipeline_id] = (stats.by_pipeline[lead.pipeline_id] || 0) + 1;

      // Update stats by targetologist
      stats.by_targetologist[targetologist] = (stats.by_targetologist[targetologist] || 0) + 1;

      // Update stats by date
      const dateKey = new Date(lead.created_at * 1000).toISOString().split('T')[0];
      stats.by_date[dateKey] = (stats.by_date[dateKey] || 0) + 1;

    } catch (error: any) {
      stats.errors.push({
        lead_id: lead.id,
        error: error.message,
      });
      console.error(`   ❌ [${i + 1}/${leads.length}] Failed: Lead ${lead.id} - ${error.message}`);
    }

    // Rate limiting for database
    if (i > 0 && i % 50 === 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return stats;
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════

async function main() {
  try {
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
    const stats = await importLeads(dateFrom, dateTo);

    // Print summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 IMPORT SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log(`✅ Total fetched from AmoCRM:  ${stats.total_fetched}`);
    console.log(`✅ Total inserted:             ${stats.total_inserted}`);
    console.log(`🔄 Total updated:              ${stats.total_updated}`);
    console.log(`⏭️  Total skipped:              ${stats.total_skipped}`);
    console.log(`❌ Total errors:               ${stats.errors.length}`);

    console.log('\n📋 BY PIPELINE:\n');
    Object.entries(stats.by_pipeline)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pipeline, count]) => {
        const pipelineName = pipeline === '9777626' ? 'КЦ' : pipeline === '9430994' ? 'ОП' : 'Unknown';
        console.log(`   ${pipeline} (${pipelineName})`.padEnd(25) + ` → ${count} leads`);
      });

    console.log('\n📊 BY TARGETOLOGIST:\n');
    Object.entries(stats.by_targetologist)
      .sort(([, a], [, b]) => b - a)
      .forEach(([targetologist, count]) => {
        console.log(`   ${targetologist.padEnd(15)} → ${count} leads`);
      });

    console.log('\n📅 BY DATE:\n');
    Object.entries(stats.by_date)
      .sort(([a], [b]) => b.localeCompare(a))
      .forEach(([date, count]) => {
        console.log(`   ${date} → ${count} leads`);
      });

    if (stats.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      stats.errors.slice(0, 10).forEach(error => {
        console.log(`   Lead ${error.lead_id}: ${error.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`   ... and ${stats.errors.length - 10} more errors`);
      }
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
