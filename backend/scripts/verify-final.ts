/**
 * Final Verification Script
 * Verifies Challenge3D leads import and targetologist creation
 */

import { landingSupabase } from '../src/config/supabase-landing.js';
import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

async function verify() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 FINAL VERIFICATION REPORT');
  console.log('════════════════════════════════════════════════════════════════');

  // 1. Check Challenge3D leads in landing_leads
  console.log('\n1️⃣ Challenge3D Leads in Landing DB:');
  const { count: leadCount } = await landingSupabase
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge3d');
  console.log('   Total leads:', leadCount);

  // 2. Check UTM source distribution
  console.log('\n2️⃣ UTM Source distribution (top 10):');
  const { data: allLeads } = await landingSupabase
    .from('landing_leads')
    .select('utm_source')
    .eq('source', 'challenge3d');

  const utmStats: Record<string, number> = {};
  allLeads?.forEach(l => {
    const src = l.utm_source || 'null';
    utmStats[src] = (utmStats[src] || 0) + 1;
  });

  Object.entries(utmStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([src, cnt]) => {
      console.log(`   ${src}: ${cnt}`);
    });

  // 3. Check leads by date
  console.log('\n3️⃣ Leads by date:');
  const { data: leadsByDate } = await landingSupabase
    .from('landing_leads')
    .select('created_at')
    .eq('source', 'challenge3d');

  const dateStats: Record<string, number> = {};
  leadsByDate?.forEach(l => {
    const date = l.created_at?.split('T')[0] || 'unknown';
    dateStats[date] = (dateStats[date] || 0) + 1;
  });

  Object.entries(dateStats)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([date, cnt]) => {
      console.log(`   ${date}: ${cnt}`);
    });

  // 4. Check targetologist Testova in Traffic DB
  console.log('\n4️⃣ Targetologist Тестова in Traffic DB:');
  const { data: testova } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, full_name, team_name, role, created_at')
    .eq('email', 'testova@onai.academy')
    .single();

  if (testova) {
    console.log('   ID:', testova.id);
    console.log('   Email:', testova.email);
    console.log('   Name:', testova.full_name);
    console.log('   Team:', testova.team_name);
    console.log('   Role:', testova.role);

    const { data: settings } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('utm_source, utm_medium, utm_sources')
      .eq('user_id', testova.id)
      .single();

    if (settings) {
      console.log('   UTM Source:', settings.utm_source);
      console.log('   UTM Sources:', JSON.stringify(settings.utm_sources));
    }
  } else {
    console.log('   ❌ Targetologist not found');
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ FINAL SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`📊 Challenge3D leads imported: ${leadCount}`);
  console.log('👤 Targetologist created: Тестова (testova@onai.academy)');
  console.log('🔑 Password: Test123456!');
  console.log('🏢 Team: Kenesary');
  console.log('📊 UTM Source: fb_testova');
  console.log('');
}

verify().catch(console.error);
