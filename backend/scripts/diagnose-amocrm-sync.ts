/**
 * AmoCRM Data Sync Diagnostic Script
 * Checks integration logs, sales data, and sync status
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const landingDb = createClient(
  process.env.LANDING_SUPABASE_URL || '',
  process.env.LANDING_SUPABASE_SERVICE_KEY || ''
);

async function diagnoseSyncStatus() {
  console.log('🔍 === AmoCRM DATA SYNC DIAGNOSTIC ===\n');

  // 1. Check integration logs
  console.log('📋 CHECKING INTEGRATION LOGS...\n');
  const { data: logs, error: logsError } = await landingDb
    .from('integration_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logsError) {
    console.log('❌ Error fetching integration_logs:', logsError.message);
  } else {
    console.log(`✅ Total recent logs: ${logs?.length || 0}`);

    if (logs && logs.length > 0) {
      // Count by status
      const statusCount: Record<string, number> = {};
      logs.forEach(log => {
        statusCount[log.status] = (statusCount[log.status] || 0) + 1;
      });

      console.log('\nStatus breakdown:');
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      console.log('\nLatest 5 logs:');
      logs.slice(0, 5).forEach((log, i) => {
        console.log(`${i + 1}. [${log.integration_type}] ${log.operation_type}`);
        console.log(`   Status: ${log.status} | Time: ${log.created_at}`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
      });

      // Find failed syncs
      const failedLogs = logs.filter((l: any) => l.status === 'error' || l.status === 'failed');
      if (failedLogs.length > 0) {
        console.log(`\n⚠️  Found ${failedLogs.length} failed sync operations`);
      }
    }
  }

  // 2. Check all_sales_tracking table
  console.log('\n💰 CHECKING ALL_SALES_TRACKING...\n');
  const { data: sales, error: salesError } = await landingDb
    .from('all_sales_tracking')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (salesError) {
    console.log('❌ Error fetching sales:', salesError.message);
  } else {
    console.log(`✅ Total recent sales: ${sales?.length || 0}`);

    if (sales && sales.length > 0) {
      console.log('\nLatest 3 sales:');
      sales.slice(0, 3).forEach((sale: any, i: number) => {
        console.log(`${i + 1}. ${sale.contact_name || 'N/A'} - $${sale.sale_price || 0}`);
        console.log(`   Date: ${sale.sale_date || sale.created_at}`);
        console.log(`   UTM: ${sale.utm_source || 'none'} / ${sale.utm_campaign || 'none'}`);
      });

      // Count by source
      const sourceCount: Record<string, number> = {};
      sales.forEach((sale: any) => {
        const source = sale.utm_source || 'no-utm';
        sourceCount[source] = (sourceCount[source] || 0) + 1;
      });

      console.log('\nSales by UTM source:');
      Object.entries(sourceCount).forEach(([source, count]) => {
        console.log(`  ${source}: ${count}`);
      });
    }
  }

  // 3. Check amocrm_sales table
  console.log('\n🔄 CHECKING AMOCRM_SALES TABLE...\n');
  const { data: amoCrmSales, error: amoCrmError } = await landingDb
    .from('amocrm_sales')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (amoCrmError) {
    console.log('❌ Error fetching amoCRM sales:', amoCrmError.message);
  } else {
    console.log(`✅ Total recent amoCRM sales: ${amoCrmSales?.length || 0}`);

    if (amoCrmSales && amoCrmSales.length > 0) {
      console.log('\nLatest 3 amoCRM sales:');
      amoCrmSales.slice(0, 3).forEach((sale: any, i: number) => {
        console.log(`${i + 1}. ${sale.contact_name || 'N/A'} - ${sale.sale_price || 0} KZT`);
        console.log(`   Sale ID: ${sale.sale_id} | Date: ${sale.sale_date}`);
      });
    }
  }

  // 4. Compare counts
  console.log('\n📊 DATA COMPARISON...\n');
  const allSalesCount = sales?.length || 0;
  const amoCrmCount = amoCrmSales?.length || 0;

  console.log(`all_sales_tracking (last 10): ${allSalesCount}`);
  console.log(`amocrm_sales (last 10): ${amoCrmCount}`);

  if (allSalesCount === 0 && amoCrmCount === 0) {
    console.log('\n⚠️  WARNING: No sales data found in either table!');
  }

  // 5. Check for recent activity (last 24 hours)
  console.log('\n⏰ CHECKING RECENT ACTIVITY (Last 24 hours)...\n');
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentLogs, error: recentError } = await landingDb
    .from('integration_logs')
    .select('*')
    .gte('created_at', yesterday);

  if (!recentError) {
    console.log(`✅ Integration logs in last 24h: ${recentLogs?.length || 0}`);
  }

  const { data: recentSales, error: recentSalesError } = await landingDb
    .from('all_sales_tracking')
    .select('*')
    .gte('created_at', yesterday);

  if (!recentSalesError) {
    console.log(`✅ New sales in last 24h: ${recentSales?.length || 0}`);
  }

  console.log('\n✅ === DIAGNOSTIC COMPLETE ===\n');
}

diagnoseSyncStatus().catch(console.error);
