#!/usr/bin/env npx tsx
/**
 * 🎯 AMOCRM SALES VERIFICATION SCRIPT
 * 
 * "The Truth Test" - Compare real AmoCRM data vs our Database
 * 
 * Queries AmoCRM API directly to count REAL sales and compares with local database:
 * - Express Course: Pipelines 10350882 & 10418434, Status 142
 * - Flagman Course: Pipeline 10418746, Status 142
 * 
 * Usage:
 *   npx tsx scripts/verify-amocrm-totals.ts
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || process.env.VITE_LANDING_SUPABASE_URL;
const LANDING_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || process.env.LANDING_SERVICE_KEY;

// Pipeline & Status Configuration
const PIPELINES = {
  EXPRESS_COURSE: 10350882,
  EXPRESS_COURSE_SALES: 10418434,
  INTEGRATOR_FLAGMAN: 10418746,
};

const STATUS_SUCCESS = 142; // Успешно реализовано

interface AmoCRMSalesCount {
  pipelineId: number;
  pipelineName: string;
  statusId: number;
  count: number;
  totalRevenue: number;
  leads: Array<{
    id: number;
    name: string;
    price: number;
    closed_at?: number;
  }>;
}

interface DatabaseSalesCount {
  source: string;
  count: number;
  totalRevenue: number;
  dateRange: {
    from: string;
    to: string;
  };
}

async function fetchAmoCRMSales(pipelineId: number, pipelineName: string): Promise<AmoCRMSalesCount> {
  console.log(`\n📥 Fetching sales from AmoCRM: ${pipelineName} (${pipelineId})...`);

  if (!AMOCRM_ACCESS_TOKEN) {
    throw new Error('AMOCRM_ACCESS_TOKEN not found');
  }

  const allLeads: any[] = [];
  let page = 1;
  const limit = 250;

  try {
    while (true) {
      const response = await axios.get(
        `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads`,
        {
          headers: {
            'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          params: {
            'filter[pipeline_id]': pipelineId,
            'filter[statuses][0][pipeline_id]': pipelineId,
            'filter[statuses][0][status_id]': STATUS_SUCCESS,
            'limit': limit,
            'page': page,
          },
          timeout: 60000,
        }
      );

      const leads = response.data._embedded?.leads || [];
      console.log(`   Page ${page}: ${leads.length} leads`);

      allLeads.push(...leads);

      if (leads.length < limit) break;
      page++;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const totalRevenue = allLeads.reduce((sum, lead) => sum + (lead.price || 0), 0);

    console.log(`   ✅ Total: ${allLeads.length} leads, Revenue: ${totalRevenue.toLocaleString()} KZT`);

    return {
      pipelineId,
      pipelineName,
      statusId: STATUS_SUCCESS,
      count: allLeads.length,
      totalRevenue,
      leads: allLeads.map(l => ({
        id: l.id,
        name: l.name,
        price: l.price || 0,
        closed_at: l.closed_at,
      })),
    };
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.response?.statusText || error.message}`);
    return {
      pipelineId,
      pipelineName,
      statusId: STATUS_SUCCESS,
      count: 0,
      totalRevenue: 0,
      leads: [],
    };
  }
}

async function fetchDatabaseSales(daysBack: number = 30): Promise<{
  express: DatabaseSalesCount;
  flagman: DatabaseSalesCount;
}> {
  console.log(`\n📊 Fetching sales from Database (last ${daysBack} days)...`);

  if (!LANDING_SUPABASE_URL || !LANDING_SERVICE_KEY) {
    throw new Error('Landing DB credentials not found');
  }

  const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SERVICE_KEY);
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);
  const dateTo = new Date();

  // Check express_course_sales table (actual AmoCRM imports)
  const { data: expressData, error: expressError } = await supabase
    .from('express_course_sales')
    .select('amount, sale_date')
    .gte('sale_date', dateFrom.toISOString())
    .lte('sale_date', dateTo.toISOString());

  if (expressError) {
    console.error(`   ❌ Error fetching from express_course_sales: ${expressError.message}`);
  }

  const expressCount = expressData?.length || 0;
  const expressRevenue = expressData?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
  
  // Check main_product_sales table (Flagman sales)
  const { data: flagmanData, error: flagmanError } = await supabase
    .from('main_product_sales')
    .select('amount, sale_date')
    .gte('sale_date', dateFrom.toISOString())
    .lte('sale_date', dateTo.toISOString());

  if (flagmanError) {
    console.error(`   ❌ Error fetching from main_product_sales: ${flagmanError.message}`);
  }

  const flagmanCount = flagmanData?.length || 0;
  const flagmanRevenue = flagmanData?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;

  console.log(`   Express: ${expressCount} sales, Revenue: ${expressRevenue.toLocaleString()} KZT`);
  console.log(`   Flagman: ${flagmanCount} sales, Revenue: ${flagmanRevenue.toLocaleString()} KZT`);

  return {
    express: {
      source: 'express_course_sales',
      count: expressCount,
      totalRevenue: expressRevenue,
      dateRange: {
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0],
      },
    },
    flagman: {
      source: 'main_product_sales',
      count: flagmanCount,
      totalRevenue: flagmanRevenue,
      dateRange: {
        from: dateFrom.toISOString().split('T')[0],
        to: dateTo.toISOString().split('T')[0],
      },
    },
  };
}

async function main() {
  console.log('🎯 AMOCRM SALES VERIFICATION - "The Truth Test"');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Comparing AmoCRM API (Source of Truth) vs Database\n');

  try {
    // 1. Fetch from AmoCRM
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 1: Query AmoCRM API Directly');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const expressMain = await fetchAmoCRMSales(PIPELINES.EXPRESS_COURSE, 'Express Course');
    const expressSales = await fetchAmoCRMSales(PIPELINES.EXPRESS_COURSE_SALES, 'Express Course (Sales)');
    const flagman = await fetchAmoCRMSales(PIPELINES.INTEGRATOR_FLAGMAN, 'Integrator Flagman');

    const totalExpressCount = expressMain.count + expressSales.count;
    const totalExpressRevenue = expressMain.totalRevenue + expressSales.totalRevenue;

    // 2. Fetch from Database
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('STEP 2: Query Local Database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const dbSales = await fetchDatabaseSales(30);

    // 3. Comparison Report
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 COMPARISON REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('EXPRESS COURSE:');
    console.log('━'.repeat(60));
    console.log(`AmoCRM Actual:        ${totalExpressCount} sales`);
    console.log(`  - Pipeline 10350882: ${expressMain.count} sales`);
    console.log(`  - Pipeline 10418434: ${expressSales.count} sales`);
    console.log(`  - Total Revenue:     ${totalExpressRevenue.toLocaleString()} KZT`);
    console.log('');
    console.log(`Database (Last 30d):  ${dbSales.express.count} sales`);
    console.log(`  - Revenue:           ${dbSales.express.totalRevenue.toLocaleString()} KZT`);
    console.log(`  - Date Range:        ${dbSales.express.dateRange.from} to ${dbSales.express.dateRange.to}`);
    console.log('');

    const expressDiff = totalExpressCount - dbSales.express.count;
    const expressStatus = expressDiff === 0 ? '✅' : expressDiff > 0 ? '⚠️' : '❌';
    console.log(`${expressStatus} Difference: ${expressDiff > 0 ? '+' : ''}${expressDiff} sales`);
    
    if (expressDiff !== 0) {
      console.log(`   ${Math.abs(expressDiff)} sales are ${expressDiff > 0 ? 'MISSING' : 'EXTRA'} in database`);
    }

    console.log('\n');
    console.log('FLAGMAN COURSE:');
    console.log('━'.repeat(60));
    console.log(`AmoCRM Actual:        ${flagman.count} sales`);
    console.log(`  - Revenue:           ${flagman.totalRevenue.toLocaleString()} KZT`);
    console.log('');
    console.log(`Database (Last 30d):  ${dbSales.flagman.count} sales`);
    console.log(`  - Revenue:           ${dbSales.flagman.totalRevenue.toLocaleString()} KZT`);
    console.log(`  - Date Range:        ${dbSales.flagman.dateRange.from} to ${dbSales.flagman.dateRange.to}`);
    console.log('');

    const flagmanDiff = flagman.count - dbSales.flagman.count;
    const flagmanStatus = flagmanDiff === 0 ? '✅' : flagmanDiff > 0 ? '⚠️' : '❌';
    console.log(`${flagmanStatus} Difference: ${flagmanDiff > 0 ? '+' : ''}${flagmanDiff} sales`);
    
    if (flagmanDiff !== 0) {
      console.log(`   ${Math.abs(flagmanDiff)} sales are ${flagmanDiff > 0 ? 'MISSING' : 'EXTRA'} in database`);
    }

    // 4. Final Verdict
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎯 FINAL VERDICT');
    console.log('═══════════════════════════════════════════════════════\n');

    const allPerfect = expressDiff === 0 && flagmanDiff === 0;

    if (allPerfect) {
      console.log('✅ DATA INTEGRITY: PERFECT');
      console.log('   All sales are synchronized between AmoCRM and Database.');
      console.log('   System is ready for scaling to other targetologists.\n');
    } else {
      console.log('⚠️ DATA INTEGRITY: DISCREPANCY DETECTED');
      console.log('   Sales count mismatch between AmoCRM and Database.');
      console.log('   Action Required:');
      
      if (expressDiff > 0 || flagmanDiff > 0) {
        console.log('   1. Check webhook configuration in AmoCRM');
        console.log('   2. Verify backend endpoint is receiving webhooks');
        console.log('   3. Run sync script to backfill missing sales\n');
      }
      
      if (expressDiff < 0 || flagmanDiff < 0) {
        console.log('   1. Check for duplicate entries in database');
        console.log('   2. Verify deduplication logic in webhook handler\n');
      }
    }

    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(allPerfect ? 0 : 1);

  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();
