/**
 * ════════════════════════════════════════════════════════════════════════
 * 🔍 COMPREHENSIVE SALES & LEADS DIAGNOSTIC
 * ════════════════════════════════════════════════════════════════════════
 *
 * Проверяет все базы данных на наличие лидов и продаж:
 * - Traffic DB (oetodaexnjcunklkdlkv) - целевая база
 * - Landing DB (xikaiavwqinamgolmtcy) - старая база лидов
 * - Main Platform DB (arqhkacellqbhjhbebfh) - основная платформа
 */

import { createClient } from '@supabase/supabase-js';

// ════════════════════════════════════════════════════════════════════════
// 🔧 DATABASE CLIENTS
// ════════════════════════════════════════════════════════════════════════

// Traffic Dashboard DB (Target - consolidated)
const trafficDB = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Landing DB (Old leads database)
const landingDB = createClient(
  process.env.LANDING_SUPABASE_URL!,
  process.env.LANDING_SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Main Platform DB (Tripwire)
const mainDB = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ════════════════════════════════════════════════════════════════════════
// 🔍 DIAGNOSTIC FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

async function checkTrafficDB() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🎯 TRAFFIC DB (Consolidated Target Database)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check traffic_leads
  const { data: leads, error: leadsError, count: leadsCount } = await trafficDB
    .from('traffic_leads')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  if (leadsError) {
    console.error('❌ traffic_leads ERROR:', leadsError.message);
  } else {
    console.log(`✅ traffic_leads: ${leadsCount} total leads`);
    if (leads && leads.length > 0) {
      console.log('   Latest 5 leads:');
      leads.forEach((lead: any) => {
        console.log(`   - ${lead.id} | ${lead.name} | ${lead.phone} | ${lead.source} | ${lead.funnel_type || 'N/A'} | ${lead.created_at}`);
      });
    }
  }

  // Check traffic_sales (Express course)
  const { data: expressSales, error: expressError, count: expressCount } = await trafficDB
    .from('traffic_sales')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  if (expressError) {
    console.error('❌ traffic_sales ERROR:', expressError.message);
  } else {
    console.log(`\n✅ traffic_sales (Express): ${expressCount} sales`);
    if (expressSales && expressSales.length > 0) {
      console.log('   Latest 5 sales:');
      expressSales.forEach((sale: any) => {
        console.log(`   - Deal ${sale.deal_id} | ${sale.amount} ${sale.currency} | ${sale.customer_name} | ${sale.utm_source || 'N/A'} | ${sale.sale_date}`);
      });
    }
  }

  // Check challenge3d_sales
  const { data: challenge3dSales, error: challenge3dError, count: challenge3dCount } = await trafficDB
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  if (challenge3dError) {
    console.error('❌ challenge3d_sales ERROR:', challenge3dError.message);
  } else {
    console.log(`\n✅ challenge3d_sales: ${challenge3dCount} sales`);

    // Count prepayments vs full payments
    const { count: prepaidCount } = await trafficDB
      .from('challenge3d_sales')
      .select('*', { count: 'exact', head: true })
      .eq('prepaid', true);

    const { count: fullPaymentCount } = await trafficDB
      .from('challenge3d_sales')
      .select('*', { count: 'exact', head: true })
      .eq('prepaid', false);

    console.log(`   - Prepayments (prepaid=true): ${prepaidCount || 0}`);
    console.log(`   - Full payments (prepaid=false): ${fullPaymentCount || 0}`);

    if (challenge3dSales && challenge3dSales.length > 0) {
      console.log('   Latest 5 sales:');
      challenge3dSales.forEach((sale: any) => {
        const type = sale.prepaid ? '💰 PREPAY' : '✅ FULL';
        console.log(`   - ${type} | Deal ${sale.deal_id} | ${sale.amount} ${sale.currency} | ${sale.customer_name} | ${sale.utm_source || 'N/A'} | ${sale.sale_date}`);
      });
    }
  }

  // Get counts for return value
  const { count: finalPrepaidCount } = await trafficDB
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true })
    .eq('prepaid', true);

  const { count: finalFullPaymentCount } = await trafficDB
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true })
    .eq('prepaid', false);

  return {
    leads: leadsCount || 0,
    expressSales: expressCount || 0,
    challenge3dSales: challenge3dCount || 0,
    prepayments: finalPrepaidCount || 0,
    fullPayments: finalFullPaymentCount || 0,
  };
}

async function checkLandingDB() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 LANDING DB (Old Leads Database)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check landing_leads
  const { data: leads, error: leadsError, count: leadsCount } = await landingDB
    .from('landing_leads')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  // Count by source (declare outside to use in return)
  const { count: challengeCount } = await landingDB
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge3d');

  const { count: expressCount } = await landingDB
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'expresscourse');

  if (leadsError) {
    console.error('❌ landing_leads ERROR:', leadsError.message);
  } else {
    console.log(`✅ landing_leads: ${leadsCount} total leads`);
    console.log(`   - challenge3d: ${challengeCount}`);
    console.log(`   - expresscourse: ${expressCount}`);
    console.log(`   - other: ${(leadsCount || 0) - (challengeCount || 0) - (expressCount || 0)}`);

    if (leads && leads.length > 0) {
      console.log('   Latest 5 leads:');
      leads.forEach((lead: any) => {
        console.log(`   - ${lead.id} | ${lead.name} | ${lead.phone} | ${lead.source} | ${lead.created_at}`);
      });
    }
  }

  // Check if there are sales tables in Landing DB
  const { data: expressSales, error: expressError } = await landingDB
    .from('express_course_sales')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  if (!expressError) {
    console.log(`\n⚠️  express_course_sales found in Landing DB!`);
    console.log(`   This data should be migrated to Traffic DB.`);
  }

  const { data: challenge3dSales, error: challenge3dError } = await landingDB
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  if (!challenge3dError) {
    console.log(`\n⚠️  challenge3d_sales found in Landing DB!`);
    console.log(`   This data should be migrated to Traffic DB.`);
  }

  return {
    leads: leadsCount || 0,
    challengeLeads: challengeCount || 0,
    expressLeads: expressCount || 0,
  };
}

async function checkMainPlatformDB() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🏢 MAIN PLATFORM DB (Tripwire)');
  console.log('═══════════════════════════════════════════════════════\n');

  // Check if there are any sales-related tables
  const tablesToCheck = [
    'express_course_sales',
    'challenge3d_sales',
    'sales',
    'orders',
    'purchases',
  ];

  for (const table of tablesToCheck) {
    const { data, error, count } = await mainDB
      .from(table)
      .select('*', { count: 'exact', head: true })
      .limit(1);

    if (!error) {
      console.log(`✅ ${table}: ${count} records found`);
      if (count && count > 0) {
        console.log(`   ⚠️  This data should be migrated to Traffic DB!`);
      }
    }
  }
}

async function checkWebhookEndpoints() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🔌 WEBHOOK HEALTH CHECK');
  console.log('═══════════════════════════════════════════════════════\n');

  const endpoints = [
    'http://localhost:3000/api/amocrm/challenge3d-lead/health',
    'http://localhost:3000/api/amocrm/challenge3d-prepayment/health',
    'http://localhost:3000/api/amocrm/challenge3d/health',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${endpoint}`);
        console.log(`   ${JSON.stringify(data, null, 2)}`);
      } else {
        console.log(`❌ ${endpoint} - HTTP ${response.status}`);
      }
    } catch (err: any) {
      console.log(`⚠️  ${endpoint} - ${err.message}`);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════
// 🚀 MAIN DIAGNOSTIC
// ════════════════════════════════════════════════════════════════════════

async function runDiagnostic() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔍 COMPREHENSIVE SALES & LEADS DIAGNOSTIC                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    const trafficStats = await checkTrafficDB();
    const landingStats = await checkLandingDB();
    await checkMainPlatformDB();
    await checkWebhookEndpoints();

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('Traffic DB (Target):');
    console.log(`  - Leads: ${trafficStats.leads}`);
    console.log(`  - Express Sales: ${trafficStats.expressSales}`);
    console.log(`  - Challenge3D Sales: ${trafficStats.challenge3dSales}`);
    console.log(`    - Prepayments: ${trafficStats.prepayments}`);
    console.log(`    - Full Payments: ${trafficStats.fullPayments}`);

    console.log('\nLanding DB (Old):');
    console.log(`  - Total Leads: ${landingStats.leads}`);
    console.log(`  - Challenge3D: ${landingStats.challengeLeads}`);
    console.log(`  - Express: ${landingStats.expressLeads}`);

    // Recommendations
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (trafficStats.leads === 0 && landingStats.leads > 0) {
      console.log('⚠️  CRITICAL: Traffic DB has 0 leads but Landing DB has data!');
      console.log('   → Run lead migration script immediately');
    }

    if (trafficStats.expressSales === 0 || trafficStats.challenge3dSales === 0) {
      console.log('⚠️  WARNING: Sales data appears to be missing in Traffic DB');
      console.log('   → Check if sales webhooks are configured correctly');
      console.log('   → Consider migrating historical sales data');
    }

    if (trafficStats.leads > 0 && (trafficStats.expressSales === 0 && trafficStats.challenge3dSales === 0)) {
      console.log('✅ Leads are present but no sales recorded yet');
      console.log('   → This is normal if no sales have occurred');
      console.log('   → Verify webhook configuration in AmoCRM');
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error: any) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error.message);
    process.exit(1);
  }
}

runDiagnostic();
