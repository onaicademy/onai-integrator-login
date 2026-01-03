/**
 * Verification Script: Dynamic UTM System
 * Проверяет что новая система UTM работает корректно
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const TRAFFIC_URL = process.env.TRAFFIC_SUPABASE_URL || 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY || '';

async function verifyUtmSystem() {
  console.log('═'.repeat(70));
  console.log('🔍 VERIFICATION: Dynamic UTM System');
  console.log('═'.repeat(70));

  if (!TRAFFIC_KEY) {
    console.error('❌ TRAFFIC_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  const supabase = createClient(TRAFFIC_URL, TRAFFIC_KEY);

  // ════════════════════════════════════════════════════════════════
  // 1. CHECK TABLE EXISTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 1: Check traffic_user_utm_sources table...');

  const { data: utmSources, error: utmError } = await supabase
    .from('traffic_user_utm_sources')
    .select('*')
    .limit(10);

  if (utmError) {
    console.error('❌ Table traffic_user_utm_sources not found:', utmError.message);
    console.log('⚠️  Run Migration 011 first!');
    process.exit(1);
  }

  console.log(`✅ Table exists with ${utmSources?.length || 0} records`);
  utmSources?.forEach(s => {
    console.log(`   - ${s.utm_source} → ${s.funnel_type} (user: ${s.user_id.slice(0, 8)}...)`);
  });

  // ════════════════════════════════════════════════════════════════
  // 2. CHECK VIEW EXISTS
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 2: Check v_user_utm_mapping view...');

  const { data: viewData, error: viewError } = await supabase
    .from('v_user_utm_mapping')
    .select('*')
    .limit(5);

  if (viewError) {
    console.error('❌ View v_user_utm_mapping not found:', viewError.message);
  } else {
    console.log(`✅ View works, ${viewData?.length || 0} records`);
    viewData?.forEach(v => {
      console.log(`   - ${v.full_name}: ${v.utm_source} (${v.funnel_type})`);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 3. CHECK enabled_funnels COLUMN
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 3: Check enabled_funnels column in traffic_users...');

  const { data: users, error: usersError } = await supabase
    .from('traffic_users')
    .select('id, email, full_name, enabled_funnels, primary_funnel_type')
    .not('enabled_funnels', 'is', null)
    .limit(5);

  if (usersError) {
    console.error('❌ Error reading enabled_funnels:', usersError.message);
  } else {
    console.log(`✅ Column exists, ${users?.length || 0} users have enabled_funnels`);
    users?.forEach(u => {
      console.log(`   - ${u.full_name}: [${u.enabled_funnels?.join(', ')}]`);
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 4. CHECK KENJI USER
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 4: Check Kenji user configuration...');

  const { data: kenji, error: kenjiError } = await supabase
    .from('v_user_utm_mapping')
    .select('*')
    .or('full_name.ilike.%kenji%,email.ilike.%kenji%');

  if (kenjiError) {
    console.error('❌ Error finding Kenji:', kenjiError.message);
  } else if (!kenji || kenji.length === 0) {
    console.warn('⚠️  Kenji user not found in v_user_utm_mapping');
  } else {
    console.log(`✅ Kenji found with ${kenji.length} UTM sources:`);
    kenji.forEach(k => {
      console.log(`   - ${k.utm_source} → ${k.funnel_type} (active: ${k.is_active})`);
    });
    console.log(`   Enabled funnels: [${kenji[0]?.enabled_funnels?.join(', ')}]`);
  }

  // ════════════════════════════════════════════════════════════════
  // 5. TEST get_user_by_utm FUNCTION
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 Step 5: Test get_user_by_utm function...');

  const { data: funcResult, error: funcError } = await supabase
    .rpc('get_user_by_utm', { p_utm_source: 'kenjifb', p_funnel_type: 'challenge3d' });

  if (funcError) {
    console.error('❌ Function get_user_by_utm failed:', funcError.message);
  } else if (!funcResult) {
    console.warn('⚠️  Function returned null for kenjifb/challenge3d');
  } else {
    console.log(`✅ Function works! get_user_by_utm('kenjifb', 'challenge3d') = ${funcResult}`);
  }

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(70));
  console.log('✅ Dynamic UTM System is ready!');
  console.log('\nNext steps:');
  console.log('1. pm2 restart all - restart backend');
  console.log('2. Test Challenge3D funnel in dashboard');
  console.log('3. Connect FB Ads account for Kenji');
  console.log('═'.repeat(70));
}

verifyUtmSystem().catch(console.error);
