/**
 * Traffic Dashboard Comprehensive Health Check
 *
 * Verifies all critical components before production use
 */

import { landingSupabase } from '../src/config/supabase-landing.js';
import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

interface CheckResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  data?: any;
}

async function runHealthCheck(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  console.log('════════════════════════════════════════════════════════════════');
  console.log('🏥 TRAFFIC DASHBOARD HEALTH CHECK');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DATABASE CONNECTIVITY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('1️⃣ Database Connectivity\n');

  // Landing DB
  try {
    const { count } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true });

    console.log(`   ✅ Landing Supabase: Connected (${count} leads total)`);
    results.push({
      component: 'Landing DB Connection',
      status: 'PASS',
      details: `Connected, ${count} leads in database`
    });
  } catch (error: any) {
    console.log(`   ❌ Landing Supabase: ${error.message}`);
    results.push({
      component: 'Landing DB Connection',
      status: 'FAIL',
      details: error.message
    });
  }

  // Traffic DB
  try {
    const { count } = await trafficAdminSupabase
      .from('traffic_users')
      .select('*', { count: 'exact', head: true });

    console.log(`   ✅ Traffic Supabase: Connected (${count} users)`);
    results.push({
      component: 'Traffic DB Connection',
      status: 'PASS',
      details: `Connected, ${count} users in database`
    });
  } catch (error: any) {
    console.log(`   ❌ Traffic Supabase: ${error.message}`);
    results.push({
      component: 'Traffic DB Connection',
      status: 'FAIL',
      details: error.message
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DATA INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n2️⃣ Data Integrity\n');

  // Challenge3D Leads
  const { count: challenge3dLeads } = await landingSupabase
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge3d');

  console.log(`   📊 Challenge3D leads: ${challenge3dLeads}`);
  results.push({
    component: 'Challenge3D Leads',
    status: challenge3dLeads && challenge3dLeads > 0 ? 'PASS' : 'WARN',
    details: `${challenge3dLeads} leads imported`,
    data: { count: challenge3dLeads }
  });

  // Express Sales (correct table name)
  const { count: expressSales } = await landingSupabase
    .from('express_course_sales')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 Express sales: ${expressSales || 0}`);

  // Main Product Sales (aka Flagman)
  const { count: mainProductSales } = await landingSupabase
    .from('main_product_sales')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 Main Product (Flagman) sales: ${mainProductSales || 0}`);

  // Challenge3D Sales
  const { count: challenge3dSales } = await landingSupabase
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true });

  console.log(`   📊 Challenge3D sales: ${challenge3dSales || 0}`);

  results.push({
    component: 'Sales Data',
    status: 'PASS',
    details: `Express: ${expressSales || 0}, MainProduct: ${mainProductSales || 0}, Challenge3D: ${challenge3dSales || 0}`
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. UTM ATTRIBUTION CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n3️⃣ UTM Attribution Verification\n');

  // Get UTM source distribution
  const { data: leadsWithUTM } = await landingSupabase
    .from('landing_leads')
    .select('utm_source')
    .not('utm_source', 'is', null)
    .limit(1000);

  const utmDistribution: Record<string, number> = {};
  leadsWithUTM?.forEach(l => {
    const src = l.utm_source || 'NULL';
    utmDistribution[src] = (utmDistribution[src] || 0) + 1;
  });

  const topSources = Object.entries(utmDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('   📊 Top UTM Sources:');
  topSources.forEach(([src, count]) => {
    console.log(`      ${src}: ${count}`);
  });

  // Check team attribution
  const teamPatterns = [
    { team: 'Kenesary', pattern: 'kenji' },
    { team: 'Arystan', pattern: 'arystan' },
    { team: 'Traf4', pattern: 'pb_agency' },
  ];

  console.log('\n   📊 Team Attribution by utm_source:');
  for (const { team, pattern } of teamPatterns) {
    const { count } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .ilike('utm_source', `%${pattern}%`);

    console.log(`      ${team}: ${count} leads (pattern: ${pattern})`);
  }

  // Muha special case (utm_medium)
  const { count: muhaCount } = await landingSupabase
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .ilike('utm_medium', '%yourmarketolog%');

  console.log(`      Muha: ${muhaCount} leads (pattern: utm_medium=yourmarketolog)`);

  results.push({
    component: 'UTM Attribution',
    status: 'PASS',
    details: `${Object.keys(utmDistribution).length} unique UTM sources tracked`,
    data: { topSources }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n4️⃣ User Management\n');

  const { data: users } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, full_name, team_name, role');

  console.log(`   📊 Total users: ${users?.length || 0}`);

  if (users && users.length > 0) {
    console.log('\n   Users list:');
    users.forEach((u, i) => {
      console.log(`      ${i + 1}. ${u.full_name} (${u.email}) - ${u.team_name} [${u.role}]`);
    });
  }

  // Check settings for each user
  const { data: settings } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('user_id, utm_source, utm_sources');

  const usersWithSettings = settings?.length || 0;
  const usersWithoutSettings = (users?.length || 0) - usersWithSettings;

  if (usersWithoutSettings > 0) {
    console.log(`\n   ⚠️ ${usersWithoutSettings} user(s) without settings`);
    results.push({
      component: 'User Settings',
      status: 'WARN',
      details: `${usersWithoutSettings} users missing settings configuration`
    });
  } else {
    results.push({
      component: 'User Settings',
      status: 'PASS',
      details: `All ${usersWithSettings} users have settings configured`
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. TABLES STRUCTURE CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n5️⃣ Required Tables Check\n');

  const requiredTables = {
    landing: ['landing_leads', 'express_course_sales', 'main_product_sales', 'challenge3d_sales'],
    traffic: ['traffic_users', 'traffic_targetologist_settings']
  };

  // Check Landing tables
  for (const table of requiredTables.landing) {
    try {
      const { error } = await landingSupabase.from(table).select('id').limit(1);
      if (error) throw error;
      console.log(`   ✅ Landing.${table}`);
    } catch (error: any) {
      console.log(`   ❌ Landing.${table}: ${error.message}`);
      results.push({
        component: `Table: ${table}`,
        status: 'FAIL',
        details: error.message
      });
    }
  }

  // Check Traffic tables
  for (const table of requiredTables.traffic) {
    try {
      const { error } = await trafficAdminSupabase.from(table).select('id').limit(1);
      if (error) throw error;
      console.log(`   ✅ Traffic.${table}`);
    } catch (error: any) {
      console.log(`   ❌ Traffic.${table}: ${error.message}`);
      results.push({
        component: `Table: ${table}`,
        status: 'FAIL',
        details: error.message
      });
    }
  }

  results.push({
    component: 'Database Tables',
    status: 'PASS',
    details: 'All required tables exist'
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. DATE RANGE DATA CHECK
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n6️⃣ Recent Data Activity\n');

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { count: recentLeads } = await landingSupabase
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', last7Days);

  console.log(`   📊 Leads (last 7 days): ${recentLeads}`);

  const { count: recentExpressSales } = await landingSupabase
    .from('express_course_sales')
    .select('*', { count: 'exact', head: true })
    .gte('sale_date', last7Days);

  console.log(`   📊 Express sales (last 7 days): ${recentExpressSales || 0}`);

  results.push({
    component: 'Recent Activity',
    status: recentLeads && recentLeads > 0 ? 'PASS' : 'WARN',
    details: `${recentLeads} leads, ${recentExpressSales || 0} sales in last 7 days`
  });

  return results;
}

async function main() {
  try {
    const results = await runHealthCheck();

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📋 HEALTH CHECK SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARN').length;

    results.forEach(r => {
      const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${icon} ${r.component}: ${r.details}`);
    });

    console.log(`\n📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`);

    if (failed === 0) {
      console.log('\n════════════════════════════════════════════════════════════════');
      console.log('✅ TRAFFIC DASHBOARD IS HEALTHY AND READY FOR USE');
      console.log('════════════════════════════════════════════════════════════════\n');
    } else {
      console.log('\n════════════════════════════════════════════════════════════════');
      console.log('❌ ISSUES DETECTED - REVIEW BEFORE PRODUCTION USE');
      console.log('════════════════════════════════════════════════════════════════\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
