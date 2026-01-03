/**
 * Check Production State
 * Verifies what was already deployed to production
 */

import { landingSupabase } from '../src/config/supabase-landing.js';
import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

async function checkProductionState() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📊 CHECKING PRODUCTION STATE');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ════════════════════════════════════════════════════════════════
  // 1. Check Landing DB (Production)
  // ════════════════════════════════════════════════════════════════
  console.log('1️⃣ Landing DB (Production) - LeadLand:');
  console.log('   URL:', process.env.LANDING_SUPABASE_URL?.substring(0, 30) + '...\n');

  // Check challenge3d_sales table
  const { data: salesCheck, error: salesError } = await landingSupabase
    .from('challenge3d_sales')
    .select('id')
    .limit(1);

  if (!salesError) {
    console.log('   ✅ challenge3d_sales table EXISTS');

    const { count: salesCount } = await landingSupabase
      .from('challenge3d_sales')
      .select('*', { count: 'exact', head: true });

    console.log(`      Records: ${salesCount}`);
  } else {
    console.log('   ❌ challenge3d_sales table NOT FOUND');
    console.log(`      Error: ${salesError.message}`);
  }

  // Check landing_leads with challenge3d source
  const { count: leadsCount, error: leadsError } = await landingSupabase
    .from('landing_leads')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'challenge3d');

  if (!leadsError) {
    console.log(`   ✅ landing_leads.source='challenge3d' count: ${leadsCount}`);
  } else {
    console.log('   ❌ landing_leads query failed');
    console.log(`      Error: ${leadsError.message}`);
  }

  // Check for UNIQUE constraint test
  console.log('\n   Testing UNIQUE constraint on amocrm_lead_id...');
  const { data: sampleLead } = await landingSupabase
    .from('landing_leads')
    .select('amocrm_lead_id')
    .eq('source', 'challenge3d')
    .limit(1)
    .single();

  if (sampleLead?.amocrm_lead_id) {
    // Try to insert duplicate
    const { error: dupError } = await landingSupabase
      .from('landing_leads')
      .insert({
        amocrm_lead_id: sampleLead.amocrm_lead_id,
        source: 'test',
        created_at: new Date().toISOString()
      });

    if (dupError?.message.includes('duplicate') || dupError?.code === '23505') {
      console.log('   ✅ UNIQUE constraint on amocrm_lead_id is ACTIVE');
    } else {
      console.log('   ⚠️ UNIQUE constraint test inconclusive');
    }
  }

  // ════════════════════════════════════════════════════════════════
  // 2. Check Traffic DB (Production)
  // ════════════════════════════════════════════════════════════════
  console.log('\n2️⃣ Traffic Dashboard DB (Production):');
  console.log('   URL:', process.env.TRAFFIC_SUPABASE_URL?.substring(0, 30) + '...\n');

  // Check for user "Тестова"
  const { data: testova } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, full_name, team_name, role, created_at')
    .eq('email', 'testova@onai.academy')
    .single();

  if (testova) {
    console.log('   ✅ User "Тестова" EXISTS');
    console.log(`      ID: ${testova.id}`);
    console.log(`      Name: ${testova.full_name}`);
    console.log(`      Team: ${testova.team_name}`);
    console.log(`      Role: ${testova.role}`);

    // Check settings
    const { data: settings } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('utm_source, utm_medium, utm_sources')
      .eq('user_id', testova.id)
      .single();

    if (settings) {
      console.log(`      UTM Source: ${settings.utm_source}`);
      console.log(`      UTM Sources: ${JSON.stringify(settings.utm_sources)}`);
    }
  } else {
    console.log('   ❌ User "Тестова" NOT FOUND');
  }

  // ════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════\n');

  const deployedItems = [];
  const pendingItems = [];

  if (!salesError) {
    deployedItems.push('✅ SQL Migration: challenge3d_sales table');
  } else {
    pendingItems.push('❌ SQL Migration: challenge3d_sales table NOT CREATED');
  }

  if (leadsCount && leadsCount > 0) {
    deployedItems.push(`✅ Data Import: ${leadsCount} Challenge3D leads`);
  } else {
    pendingItems.push('❌ Data Import: No Challenge3D leads found');
  }

  if (testova) {
    deployedItems.push('✅ User Creation: Тестова profile exists');
  } else {
    pendingItems.push('❌ User Creation: Тестова profile NOT FOUND');
  }

  if (deployedItems.length > 0) {
    console.log('DEPLOYED TO PRODUCTION:');
    deployedItems.forEach(item => console.log(`  ${item}`));
  }

  if (pendingItems.length > 0) {
    console.log('\nNOT YET DEPLOYED:');
    pendingItems.forEach(item => console.log(`  ${item}`));
  }

  console.log('\n');
}

checkProductionState().catch(console.error);
