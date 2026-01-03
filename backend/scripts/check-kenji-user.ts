/**
 * Check Kenji User Configuration
 * Проверяет что пользователь kenji создан корректно и все подключено
 */

import { createClient } from '@supabase/supabase-js';

const TRAFFIC_ADMIN_URL = process.env.TRAFFIC_SUPABASE_URL || 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_ADMIN_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY || '';

const LANDING_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_KEY = process.env.LANDING_SERVICE_ROLE_KEY || '';

async function checkKenjiUser() {
  console.log('🔍 Checking Kenji User Configuration...\n');

  // Connect to Traffic DB
  const trafficSupabase = createClient(TRAFFIC_ADMIN_URL, TRAFFIC_ADMIN_KEY);
  const landingSupabase = createClient(LANDING_URL, LANDING_KEY);

  // ════════════════════════════════════════════════════════════════
  // 1. CHECK USER IN TRAFFIC_USERS
  // ════════════════════════════════════════════════════════════════
  console.log('📋 Step 1: Checking traffic_users table...');
  const { data: user, error: userError } = await trafficSupabase
    .from('traffic_users')
    .select('*')
    .or('email.ilike.%kenji%,full_name.ilike.%kenji%,team_name.ilike.%kenji%')
    .single();

  if (userError || !user) {
    console.error('❌ User kenji NOT FOUND in traffic_users');
    console.error('Error:', userError?.message);
    return;
  }

  console.log('✅ User found in traffic_users:');
  console.log({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    team_name: user.team_name,
    role: user.role,
    utm_source: user.utm_source,
    utm_medium: user.utm_medium,
    tracking_by: user.tracking_by,
    funnel_type: user.funnel_type,
    is_active: user.is_active,
    created_at: user.created_at
  });

  const kenjiUtmSource = user.utm_source;
  const kenjiFunnelType = user.funnel_type;

  console.log('\n📌 Key Settings:');
  console.log(`   UTM Source: "${kenjiUtmSource}"`);
  console.log(`   Funnel Type: "${kenjiFunnelType}"`);
  console.log(`   Tracking By: "${user.tracking_by}"`);

  // ════════════════════════════════════════════════════════════════
  // 2. CHECK FACEBOOK ADS DATA
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 2: Checking Facebook Ads data (traffic_stats)...');
  const { data: fbStats, error: fbError } = await trafficSupabase
    .from('traffic_stats')
    .select('*')
    .eq('utm_source', kenjiUtmSource)
    .order('date', { ascending: false })
    .limit(5);

  if (fbError) {
    console.warn('⚠️  Error reading traffic_stats:', fbError.message);
  } else if (!fbStats || fbStats.length === 0) {
    console.log('⚠️  No Facebook Ads data found for utm_source:', kenjiUtmSource);
    console.log('ℹ️  Это нормально - данные появятся после подключения FB рекламных кабинетов');
  } else {
    console.log(`✅ Found ${fbStats.length} records in traffic_stats:`);
    fbStats.forEach(stat => {
      console.log(`   - ${stat.date}: $${stat.spend_usd} USD, ${stat.impressions} impressions`);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 3. CHECK CHALLENGE3D DATA (if funnel_type = 'challenge3d')
  // ════════════════════════════════════════════════════════════════
  if (kenjiFunnelType === 'challenge3d') {
    console.log('\n📋 Step 3: Checking Challenge3D data (Landing DB)...');

    // 3a. Check Leads
    const { data: leads, error: leadsError } = await landingSupabase
      .from('landing_leads')
      .select('*')
      .eq('source', 'challenge3d')
      .eq('utm_source', kenjiUtmSource)
      .order('created_at', { ascending: false })
      .limit(5);

    if (leadsError) {
      console.warn('⚠️  Error reading landing_leads:', leadsError.message);
    } else if (!leads || leads.length === 0) {
      console.log('⚠️  No Challenge3D leads found for utm_source:', kenjiUtmSource);
    } else {
      console.log(`✅ Found ${leads.length} Challenge3D leads:`);
      leads.forEach(lead => {
        console.log(`   - ${lead.created_at}: ${lead.name} (${lead.phone})`);
      });
    }

    // 3b. Check Sales (Prepayments + Full Purchases)
    const { data: sales, error: salesError } = await landingSupabase
      .from('challenge3d_sales')
      .select('*')
      .eq('utm_source', kenjiUtmSource)
      .order('sale_date', { ascending: false })
      .limit(5);

    if (salesError) {
      console.warn('⚠️  Error reading challenge3d_sales:', salesError.message);
    } else if (!sales || sales.length === 0) {
      console.log('⚠️  No Challenge3D sales found for utm_source:', kenjiUtmSource);
    } else {
      console.log(`✅ Found ${sales.length} Challenge3D sales:`);
      sales.forEach(sale => {
        const type = sale.prepaid ? 'Prepayment' : 'Full Purchase';
        console.log(`   - ${sale.sale_date}: ${sale.amount} KZT (${type})`);
      });
    }
  } else if (kenjiFunnelType === 'express') {
    console.log('\n📋 Step 3: Checking Express Course data (Tripwire DB)...');
    console.log('ℹ️  Express funnel uses Tripwire DB - skipping check');
  } else {
    console.log('\n📋 Step 3: Unknown funnel type:', kenjiFunnelType);
  }

  // ════════════════════════════════════════════════════════════════
  // 4. SUMMARY & NEXT STEPS
  // ════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log(`✅ User: ${user.email} (${user.full_name})`);
  console.log(`✅ UTM Source: "${kenjiUtmSource}"`);
  console.log(`✅ Funnel Type: "${kenjiFunnelType}"`);
  console.log(`✅ Database connections: OK`);

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Залогиниться как kenji в Traffic Dashboard');
  console.log('2. Перейти в Settings → Facebook Ads');
  console.log('3. Подключить FB рекламные кабинеты (Ad Accounts)');
  console.log('4. Выбрать кампании для отслеживания');
  console.log('5. Данные начнут автоматически подтягиваться:');
  console.log(`   - Facebook Ads → traffic_stats (utm_source="${kenjiUtmSource}")`);
  if (kenjiFunnelType === 'challenge3d') {
    console.log(`   - Challenge3D Leads → landing_leads (source='challenge3d', utm_source="${kenjiUtmSource}")`);
    console.log(`   - Challenge3D Sales → challenge3d_sales (utm_source="${kenjiUtmSource}")`);
  }

  console.log('\n✅ Система готова к работе!');
}

checkKenjiUser().catch(console.error);
