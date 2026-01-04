/**
 * ════════════════════════════════════════════════════════════════════════
 * 🔍 TRAFFIC DASHBOARD DATA DIAGNOSTICS
 * ════════════════════════════════════════════════════════════════════════
 *
 * Диагностика отсутствия данных в админ-панели:
 * - Затраты не показываются
 * - Лиды = 0
 * - Продажи = 0
 * - ROAS = 0
 */

import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/env.env' });

async function diagnosisTrafficData() {
  console.log('═'.repeat(80));
  console.log('🔍 TRAFFIC DASHBOARD DATA DIAGNOSTICS');
  console.log('═'.repeat(80));
  console.log('');

  const results: any = {
    timestamp: new Date().toISOString(),
    issues: [],
    recommendations: []
  };

  // ════════════════════════════════════════════════════════════════════════
  // 1. CHECK USERS & TEAMS
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 1: Checking users and teams...');

  const { data: users, error: usersError } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, full_name, team_name, role, is_active')
    .eq('is_active', true);

  if (usersError) {
    console.error('❌ Error fetching users:', usersError.message);
    results.issues.push('Cannot fetch traffic_users table');
  } else {
    console.log(`✅ Users: ${users?.length || 0}`);
    console.log(`   - Targetologists: ${users?.filter(u => u.role === 'targetologist').length}`);
    console.log(`   - Admins: ${users?.filter(u => u.role === 'admin').length}`);

    users?.forEach(u => {
      console.log(`   - ${u.full_name} (${u.role}): team=${u.team_name || 'N/A'}`);
    });

    results.users_count = users?.length || 0;
    results.targetologists_count = users?.filter(u => u.role === 'targetologist').length || 0;
  }

  const { data: teams, error: teamsError } = await trafficAdminSupabase
    .from('traffic_teams')
    .select('*');

  if (teamsError) {
    console.error('❌ Error fetching teams:', teamsError.message);
  } else {
    console.log(`✅ Teams: ${teams?.length || 0}`);
    teams?.forEach(t => {
      console.log(`   - ${t.name}: active=${t.is_active}`);
    });
    results.teams_count = teams?.length || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 2. CHECK UTM SOURCES
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 2: Checking UTM sources configuration...');

  const { data: utmSources, error: utmError } = await trafficAdminSupabase
    .from('traffic_user_utm_sources')
    .select('*')
    .eq('is_active', true);

  if (utmError) {
    console.error('❌ Error fetching UTM sources:', utmError.message);
    results.issues.push('Cannot fetch traffic_user_utm_sources');
  } else {
    console.log(`✅ UTM Sources configured: ${utmSources?.length || 0}`);

    if (!utmSources || utmSources.length === 0) {
      console.log('⚠️  NO UTM SOURCES CONFIGURED!');
      results.issues.push('No UTM sources configured - leads cannot be attributed to targetologists');
      results.recommendations.push('Run: INSERT INTO traffic_user_utm_sources (user_id, utm_source, funnel_type) VALUES ...');
    } else {
      utmSources.forEach(s => {
        console.log(`   - ${s.utm_source} → user_id: ${s.user_id.slice(0, 8)}... (${s.funnel_type})`);
      });
    }

    results.utm_sources_count = utmSources?.length || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 3. CHECK AD ACCOUNT BINDINGS
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 3: Checking ad account bindings...');

  const { data: adAccounts, error: adError } = await trafficAdminSupabase
    .from('traffic_ad_account_bindings')
    .select('*')
    .eq('is_active', true);

  if (adError) {
    console.error('❌ Error fetching ad accounts:', adError.message);
  } else {
    console.log(`✅ Ad Accounts bound: ${adAccounts?.length || 0}`);

    if (!adAccounts || adAccounts.length === 0) {
      console.log('⚠️  NO AD ACCOUNTS BOUND!');
      results.issues.push('No Facebook Ad accounts bound to teams');
      results.recommendations.push('Use POST /api/traffic-admin/ad-account-bindings to bind ad accounts');
    } else {
      adAccounts.forEach(a => {
        console.log(`   - ${a.ad_account_id} → ${a.team_name} (${a.ad_platform})`);
      });
    }

    results.ad_accounts_count = adAccounts?.length || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 4. CHECK LEADS DATA
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 4: Checking leads data...');

  const { data: leads, error: leadsError } = await trafficAdminSupabase
    .from('traffic_leads')
    .select('id, created_at, utm_source, utm_campaign, funnel_type, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (leadsError) {
    console.error('❌ Error fetching leads:', leadsError.message);
    results.issues.push('Cannot fetch traffic_leads table');
  } else {
    console.log(`✅ Total leads (latest 10): ${leads?.length || 0}`);

    if (!leads || leads.length === 0) {
      console.log('⚠️  NO LEADS IN DATABASE!');
      results.issues.push('No leads in traffic_leads table');
      results.recommendations.push('Check webhook integration with Facebook/AmoCRM');
    } else {
      leads.forEach(l => {
        console.log(`   - ${l.id.slice(0, 8)}... created: ${l.created_at}, utm: ${l.utm_source || 'N/A'}, status: ${l.status}`);
      });
    }

    // Count all leads
    const { count } = await trafficAdminSupabase
      .from('traffic_leads')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total leads in DB: ${count || 0}`);
    results.leads_count = count || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 5. CHECK SALES DATA
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 5: Checking sales data...');

  // Express sales
  const { data: expressSales, error: expressError } = await trafficAdminSupabase
    .from('traffic_sales')
    .select('id, amount, utm_source, sale_date')
    .order('sale_date', { ascending: false })
    .limit(10);

  if (expressError) {
    console.error('❌ Error fetching express sales:', expressError.message);
  } else {
    console.log(`✅ Express sales (latest 10): ${expressSales?.length || 0}`);

    if (!expressSales || expressSales.length === 0) {
      console.log('⚠️  NO EXPRESS SALES!');
      results.issues.push('No sales in traffic_sales table');
    } else {
      expressSales.forEach(s => {
        console.log(`   - ${s.id.slice(0, 8)}... amount: ${s.amount}, utm: ${s.utm_source || 'N/A'}, date: ${s.sale_date}`);
      });
    }

    const { count: expressCount } = await trafficAdminSupabase
      .from('traffic_sales')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total express sales: ${expressCount || 0}`);
    results.express_sales_count = expressCount || 0;
  }

  // Challenge3D sales
  const { data: challenge3dSales, error: c3dError } = await trafficAdminSupabase
    .from('challenge3d_sales')
    .select('id, amount, utm_source, sale_date, prepaid')
    .order('sale_date', { ascending: false })
    .limit(10);

  if (c3dError) {
    console.error('❌ Error fetching challenge3d sales:', c3dError.message);
  } else {
    console.log(`✅ Challenge3D sales (latest 10): ${challenge3dSales?.length || 0}`);

    if (!challenge3dSales || challenge3dSales.length === 0) {
      console.log('⚠️  NO CHALLENGE3D SALES!');
      results.issues.push('No sales in challenge3d_sales table');
    } else {
      challenge3dSales.forEach(s => {
        console.log(`   - ${s.id.slice(0, 8)}... amount: ${s.amount}, prepaid: ${s.prepaid}, utm: ${s.utm_source || 'N/A'}`);
      });
    }

    const { count: c3dCount } = await trafficAdminSupabase
      .from('challenge3d_sales')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total challenge3d sales: ${c3dCount || 0}`);
    results.challenge3d_sales_count = c3dCount || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 6. CHECK AD SPEND DATA
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 6: Checking ad spend data...');

  const { data: adSpend, error: spendError } = await trafficAdminSupabase
    .from('facebook_ad_spend')
    .select('*')
    .order('date', { ascending: false })
    .limit(10);

  if (spendError) {
    console.error('❌ Error fetching ad spend:', spendError.message);

    if (spendError.message.includes('does not exist')) {
      console.log('⚠️  TABLE facebook_ad_spend DOES NOT EXIST!');
      results.issues.push('Table facebook_ad_spend does not exist - ad spend cannot be tracked');
      results.recommendations.push('Create table facebook_ad_spend for storing Facebook Ads spend data');
    }
  } else {
    console.log(`✅ Ad Spend records (latest 10): ${adSpend?.length || 0}`);

    if (!adSpend || adSpend.length === 0) {
      console.log('⚠️  NO AD SPEND DATA!');
      results.issues.push('No ad spend data in facebook_ad_spend table');
      results.recommendations.push('Check Facebook Ads API integration - is spend being imported?');
    } else {
      adSpend.forEach(s => {
        console.log(`   - Date: ${s.date}, spend: $${s.spend || 0}, account: ${s.ad_account_id || 'N/A'}`);
      });
    }

    const { count: spendCount } = await trafficAdminSupabase
      .from('facebook_ad_spend')
      .select('*', { count: 'exact', head: true });

    console.log(`   Total spend records: ${spendCount || 0}`);
    results.ad_spend_records = spendCount || 0;
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // 7. CHECK VIEWS
  // ════════════════════════════════════════════════════════════════════════
  console.log('📋 Step 7: Checking analytics views...');

  const { data: allSalesView, error: viewError } = await trafficAdminSupabase
    .from('all_sales_tracking')
    .select('*')
    .limit(5);

  if (viewError) {
    console.error('❌ all_sales_tracking view error:', viewError.message);
    results.issues.push('View all_sales_tracking has errors');
  } else {
    console.log(`✅ all_sales_tracking view works: ${allSalesView?.length || 0} records`);
    results.all_sales_view_count = allSalesView?.length || 0;
  }

  const { data: topSources, error: topSourcesError } = await trafficAdminSupabase
    .from('top_utm_sources')
    .select('*')
    .limit(5);

  if (topSourcesError) {
    console.error('❌ top_utm_sources view error:', topSourcesError.message);
  } else {
    console.log(`✅ top_utm_sources view works: ${topSources?.length || 0} records`);
  }

  console.log('');

  // ════════════════════════════════════════════════════════════════════════
  // SUMMARY & RECOMMENDATIONS
  // ════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📊 DIAGNOSIS SUMMARY');
  console.log('═'.repeat(80));
  console.log('');

  console.log('Data Status:');
  console.log(`  Users: ${results.users_count || 0}`);
  console.log(`  Targetologists: ${results.targetologists_count || 0}`);
  console.log(`  Teams: ${results.teams_count || 0}`);
  console.log(`  UTM Sources: ${results.utm_sources_count || 0}`);
  console.log(`  Ad Accounts: ${results.ad_accounts_count || 0}`);
  console.log(`  Leads: ${results.leads_count || 0}`);
  console.log(`  Express Sales: ${results.express_sales_count || 0}`);
  console.log(`  Challenge3D Sales: ${results.challenge3d_sales_count || 0}`);
  console.log(`  Ad Spend Records: ${results.ad_spend_records || 0}`);
  console.log('');

  if (results.issues.length > 0) {
    console.log('🔴 ISSUES FOUND:');
    results.issues.forEach((issue: string, i: number) => {
      console.log(`  ${i + 1}. ${issue}`);
    });
    console.log('');
  }

  if (results.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:');
    results.recommendations.forEach((rec: string, i: number) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log('');
  }

  // Root cause analysis
  console.log('🎯 ROOT CAUSE ANALYSIS:');
  if (results.leads_count === 0) {
    console.log('  ❌ PRIMARY ISSUE: No leads in database');
    console.log('     → Check webhook integration (Facebook Leads, AmoCRM)');
    console.log('     → Verify webhook endpoints are accessible');
    console.log('     → Check webhook logs for errors');
  }

  if (results.ad_spend_records === 0 || results.ad_spend_records === undefined) {
    console.log('  ❌ PRIMARY ISSUE: No ad spend data');
    console.log('     → Facebook Ads API integration not working');
    console.log('     → Create facebook_ad_spend table if missing');
    console.log('     → Implement Facebook Ads API sync service');
  }

  if (results.utm_sources_count === 0) {
    console.log('  ❌ CRITICAL ISSUE: No UTM sources configured');
    console.log('     → Leads cannot be attributed to targetologists');
    console.log('     → Add UTM sources in traffic_user_utm_sources table');
  }

  console.log('');
  console.log('═'.repeat(80));
}

diagnosisTrafficData().catch(console.error);
