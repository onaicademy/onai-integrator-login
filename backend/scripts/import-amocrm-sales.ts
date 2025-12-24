/**
 * Import Sales from AmoCRM Pipelines
 * 
 * This script fetches successful deals from:
 * 1. Express Course pipeline (10350882) - 90 deals, ~1,209,520₸
 * 2. Integrator Flagman pipeline (10418746) - 1 deal, 490,000₸
 * 
 * And imports them into Landing DB tables:
 * - express_course_sales
 * - main_product_sales
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple env file locations
const envPaths = [
  join(__dirname, '..', 'env.env'),       // Production: backend/env.env
  join(__dirname, '..', '.env'),          // Local: backend/.env
  join(__dirname, '..', '..', '.env'),    // Root: .env
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath });
}

// Configuration
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL;
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY;

// Pipeline IDs
const PIPELINES = {
  EXPRESS_COURSE: 10350882,      // Express Course (5000₸)
  EXPRESS_COURSE_SALES: 10418434, // Express Course (Продажи) - separate sales pipeline
  INTEGRATOR_FLAGMAN: 10418746,  // Integrator Flagman (490,000₸)
};

// Status IDs
const STATUS_SUCCESS = 142; // Успешно реализовано

// Custom field IDs for UTM
const CUSTOM_FIELDS = {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
};

// Initialize Supabase client
const landingSupabase = createClient(
  LANDING_SUPABASE_URL!,
  LANDING_SUPABASE_SERVICE_KEY!
);

// Rate limiter for AmoCRM API
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface AmoCRMLead {
  id: number;
  name: string;
  price: number;
  status_id: number;
  pipeline_id: number;
  created_at: number;
  closed_at?: number;
  custom_fields_values?: Array<{
    field_id: number;
    values: Array<{ value: string }>;
  }>;
  _embedded?: {
    contacts?: Array<{
      id: number;
      is_main: boolean;
    }>;
  };
}

interface Contact {
  id: number;
  name: string;
  custom_fields_values?: Array<{
    field_code: string;
    values: Array<{ value: string }>;
  }>;
}

interface SaleRecord {
  deal_id: number;
  pipeline_id: number;
  status_id: number;
  customer_name: string;
  email?: string;
  phone?: string;
  amount: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  sale_date: string;
}

/**
 * Fetch all leads from a pipeline with specific status
 */
async function fetchLeadsFromPipeline(pipelineId: number, statusId: number): Promise<AmoCRMLead[]> {
  console.log(`\n📥 Fetching leads from pipeline ${pipelineId} with status ${statusId}...`);
  
  if (!AMOCRM_TOKEN) {
    throw new Error('AMOCRM_ACCESS_TOKEN is not set');
  }
  
  const allLeads: AmoCRMLead[] = [];
  let page = 1;
  const limit = 250; // Max allowed by AmoCRM
  
  while (true) {
    console.log(`   Fetching page ${page}...`);
    
    await delay(2000); // Rate limiting
    
    try {
      const response = await axios.get(
        `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`,
        {
          headers: {
            'Authorization': `Bearer ${AMOCRM_TOKEN}`,
            'Content-Type': 'application/json',
          },
          params: {
            'filter[pipeline_id]': pipelineId,
            'filter[statuses][0][pipeline_id]': pipelineId,
            'filter[statuses][0][status_id]': statusId,
            'limit': limit,
            'page': page,
            'with': 'contacts',
          },
          timeout: 60000,
        }
      );
      
      const leads = response.data._embedded?.leads || [];
      console.log(`   ✓ Got ${leads.length} leads on page ${page}`);
      
      allLeads.push(...leads);
      
      if (leads.length < limit) {
        break; // Last page
      }
      
      page++;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.log('   ⏳ Rate limited, waiting 60s...');
        await delay(60000);
        continue;
      }
      throw error;
    }
  }
  
  console.log(`   ✓ Total leads fetched: ${allLeads.length}`);
  return allLeads;
}

/**
 * Get contact details by ID
 */
async function getContactDetails(contactId: number): Promise<Contact | null> {
  if (!AMOCRM_TOKEN) return null;
  
  await delay(2000);
  
  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/contacts/${contactId}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    return response.data;
  } catch (error: any) {
    console.log(`   ⚠️ Could not get contact ${contactId}: ${error.message}`);
    return null;
  }
}

/**
 * Extract custom field value by ID
 */
function getCustomFieldValue(lead: AmoCRMLead, fieldId: number): string | undefined {
  const field = lead.custom_fields_values?.find(f => f.field_id === fieldId);
  return field?.values?.[0]?.value;
}

/**
 * Extract email/phone from contact
 */
function extractContactInfo(contact: Contact): { email?: string; phone?: string } {
  const email = contact.custom_fields_values?.find(f => f.field_code === 'EMAIL')?.values?.[0]?.value;
  const phone = contact.custom_fields_values?.find(f => f.field_code === 'PHONE')?.values?.[0]?.value;
  return { email, phone };
}

/**
 * Convert AmoCRM lead to sale record
 */
async function leadToSaleRecord(lead: AmoCRMLead, pipelineId: number): Promise<SaleRecord> {
  let email: string | undefined;
  let phone: string | undefined;
  
  // Get contact info
  const mainContact = lead._embedded?.contacts?.find(c => c.is_main) || lead._embedded?.contacts?.[0];
  if (mainContact) {
    const contactDetails = await getContactDetails(mainContact.id);
    if (contactDetails) {
      const info = extractContactInfo(contactDetails);
      email = info.email;
      phone = info.phone;
    }
  }
  
  // Get sale date
  const saleDate = lead.closed_at 
    ? new Date(lead.closed_at * 1000).toISOString()
    : new Date(lead.created_at * 1000).toISOString();
  
  return {
    deal_id: lead.id,
    pipeline_id: pipelineId,
    status_id: lead.status_id,
    customer_name: lead.name,
    email,
    phone,
    amount: lead.price || 0,
    utm_source: getCustomFieldValue(lead, CUSTOM_FIELDS.UTM_SOURCE),
    utm_medium: getCustomFieldValue(lead, CUSTOM_FIELDS.UTM_MEDIUM),
    utm_campaign: getCustomFieldValue(lead, CUSTOM_FIELDS.UTM_CAMPAIGN),
    sale_date: saleDate,
  };
}

/**
 * Import Express Course sales to Landing DB
 */
async function importExpressCourseSales(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📦 IMPORTING EXPRESS COURSE SALES');
  console.log('═══════════════════════════════════════════════════════');
  
  // Fetch from main Express Course pipeline
  const leads = await fetchLeadsFromPipeline(PIPELINES.EXPRESS_COURSE, STATUS_SUCCESS);
  
  console.log(`\n📊 Processing ${leads.length} leads...`);
  
  let imported = 0;
  let skipped = 0;
  let totalRevenue = 0;
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    console.log(`   [${i + 1}/${leads.length}] ${lead.name} - ${lead.price}₸`);
    
    // Check if already exists
    const { data: existing } = await landingSupabase
      .from('express_course_sales')
      .select('id')
      .eq('deal_id', lead.id)
      .single();
    
    if (existing) {
      console.log(`   ⏭️ Already exists, skipping`);
      skipped++;
      continue;
    }
    
    // Convert to sale record
    const saleRecord = await leadToSaleRecord(lead, PIPELINES.EXPRESS_COURSE);
    totalRevenue += saleRecord.amount;
    
    // Insert into database
    const { error } = await landingSupabase
      .from('express_course_sales')
      .insert({
        deal_id: saleRecord.deal_id,
        pipeline_id: saleRecord.pipeline_id,
        status_id: saleRecord.status_id,
        customer_name: saleRecord.customer_name,
        email: saleRecord.email,
        phone: saleRecord.phone,
        amount: saleRecord.amount,
        utm_source: saleRecord.utm_source,
        utm_medium: saleRecord.utm_medium,
        utm_campaign: saleRecord.utm_campaign,
        sale_date: saleRecord.sale_date,
      });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✓ Imported`);
      imported++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ EXPRESS COURSE IMPORT COMPLETE`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Total Revenue: ${totalRevenue.toLocaleString()}₸`);
  console.log('═══════════════════════════════════════════════════════');
}

/**
 * Import Integrator Flagman sales to Landing DB
 */
async function importFlagmanSales(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚀 IMPORTING INTEGRATOR FLAGMAN SALES');
  console.log('═══════════════════════════════════════════════════════');
  
  const leads = await fetchLeadsFromPipeline(PIPELINES.INTEGRATOR_FLAGMAN, STATUS_SUCCESS);
  
  console.log(`\n📊 Processing ${leads.length} leads...`);
  
  let imported = 0;
  let skipped = 0;
  let totalRevenue = 0;
  
  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i];
    console.log(`   [${i + 1}/${leads.length}] ${lead.name} - ${lead.price}₸`);
    
    // Check if already exists
    const { data: existing } = await landingSupabase
      .from('main_product_sales')
      .select('id')
      .eq('deal_id', lead.id)
      .single();
    
    if (existing) {
      console.log(`   ⏭️ Already exists, skipping`);
      skipped++;
      continue;
    }
    
    // Convert to sale record
    const saleRecord = await leadToSaleRecord(lead, PIPELINES.INTEGRATOR_FLAGMAN);
    totalRevenue += saleRecord.amount;
    
    // Insert into database
    const { error } = await landingSupabase
      .from('main_product_sales')
      .insert({
        deal_id: saleRecord.deal_id,
        pipeline_id: saleRecord.pipeline_id,
        status_id: saleRecord.status_id,
        customer_name: saleRecord.customer_name,
        email: saleRecord.email,
        phone: saleRecord.phone,
        amount: saleRecord.amount,
        utm_source: saleRecord.utm_source,
        utm_medium: saleRecord.utm_medium,
        utm_campaign: saleRecord.utm_campaign,
        sale_date: saleRecord.sale_date,
      });
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✓ Imported`);
      imported++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`✅ INTEGRATOR FLAGMAN IMPORT COMPLETE`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Total Revenue: ${totalRevenue.toLocaleString()}₸`);
  console.log('═══════════════════════════════════════════════════════');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     AMOCRM SALES IMPORT TO LANDING DB                 ║');
  console.log('║     ExpressCourse: Pipeline 10350882                  ║');
  console.log('║     Flagman: Pipeline 10418746                        ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  // Validate environment
  if (!AMOCRM_TOKEN) {
    console.error('❌ AMOCRM_ACCESS_TOKEN is not set!');
    process.exit(1);
  }
  
  if (!LANDING_SUPABASE_URL || !LANDING_SUPABASE_SERVICE_KEY) {
    console.error('❌ LANDING_SUPABASE_URL or LANDING_SUPABASE_SERVICE_KEY is not set!');
    process.exit(1);
  }
  
  console.log('✓ Environment validated');
  console.log(`  AmoCRM Domain: ${AMOCRM_DOMAIN}`);
  console.log(`  Landing DB: ${LANDING_SUPABASE_URL?.substring(0, 30)}...`);
  
  try {
    // Import Express Course sales
    await importExpressCourseSales();
    
    // Import Flagman sales
    await importFlagmanSales();
    
    console.log('\n🎉 ALL IMPORTS COMPLETE!');
    
  } catch (error: any) {
    console.error('\n❌ IMPORT FAILED:', error.message);
    process.exit(1);
  }
}

// Run
main();
