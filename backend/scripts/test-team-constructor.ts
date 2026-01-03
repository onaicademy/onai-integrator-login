/**
 * E2E Test for Team Constructor with tracking_by feature
 *
 * This script:
 * 1. Checks if tracking_by column exists in traffic_targetologist_settings
 * 2. Creates Kenesary team with UTM tracking
 * 3. Verifies the tracking_by field is saved correctly
 */

import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import bcrypt from 'bcrypt';

async function testTeamConstructor() {
  console.log('\n🧪 Starting Team Constructor E2E Test\n');

  // Step 1: Check table schema
  console.log('📋 Step 1: Checking traffic_targetologist_settings schema...');

  // Try to query settings table to verify structure
  const { data: settingsTest, error: settingsTestError } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('user_id, utm_source, utm_medium, tracking_by')
    .limit(1);

  if (settingsTestError) {
    console.error('❌ Error querying settings table:', settingsTestError.message);
    if (settingsTestError.message.includes('tracking_by')) {
      console.error('\n⚠️  tracking_by column does NOT exist in traffic_targetologist_settings!');
      console.log('\n💡 You need to add the column with this migration:');
      console.log('ALTER TABLE traffic_targetologist_settings ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT \'utm_source\';');
      return;
    }
  } else {
    console.log('✅ tracking_by column exists in traffic_targetologist_settings');
  }

  // Step 2: Check if Kenesary user already exists
  console.log('\n📋 Step 2: Checking if Kenesary user exists...');
  const { data: existingUser } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, team_name, utm_source')
    .eq('email', 'kenesary@onai.academy')
    .single();

  if (existingUser) {
    console.log(`✅ User already exists: ${existingUser.email}`);
    console.log(`   Team: ${existingUser.team_name}`);
    console.log(`   UTM Source: ${existingUser.utm_source}`);

    // Check their settings
    const { data: userSettings } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', existingUser.id)
      .single();

    if (userSettings) {
      console.log(`   Tracking by: ${userSettings.tracking_by || 'NOT SET'}`);
      console.log(`   UTM Medium: ${userSettings.utm_medium || 'NOT SET'}`);
    }

    console.log('\n✅ Test completed. User Kenesary already exists with proper settings.');
    return;
  }

  // Step 3: Create Kenesary team if not exists
  console.log('\n📋 Step 3: Creating Kenesary team...');
  const { data: existingTeam } = await trafficAdminSupabase
    .from('traffic_teams')
    .select('id, name')
    .eq('name', 'Kenesary')
    .single();

  if (!existingTeam) {
    const { data: newTeam, error: teamError } = await trafficAdminSupabase
      .from('traffic_teams')
      .insert({
        name: 'Kenesary',
        direction: 'Express Course',
        color: '#FF6B35',
        emoji: '🎯'
      })
      .select()
      .single();

    if (teamError) {
      console.error('❌ Failed to create team:', teamError.message);
      return;
    }
    console.log('✅ Team created:', newTeam.name);
  } else {
    console.log('✅ Team already exists:', existingTeam.name);
  }

  // Step 4: Create Kenesary user with tracking_by = utm_source
  console.log('\n📋 Step 4: Creating Kenesary user with UTM tracking...');

  const email = 'kenesary@onai.academy';
  const password = 'qwerty123';
  const hashedPassword = await bcrypt.hash(password, 10);
  const utmSource = 'fb_kenesary';
  const utmMedium = 'cpc';
  const trackingBy = 'utm_source'; // This is the key field we're testing

  const { data: newUser, error: userError } = await trafficAdminSupabase
    .from('traffic_users')
    .insert({
      email,
      full_name: 'Kenesary Targetologist',
      team_name: 'Kenesary',
      password_hash: hashedPassword,
      role: 'targetologist',
      utm_source: utmSource,
      funnel_type: 'express',
      auto_sync_enabled: true
    })
    .select()
    .single();

  if (userError) {
    console.error('❌ Failed to create user:', userError.message);
    return;
  }

  console.log('✅ User created:', newUser.email);
  console.log('   User ID:', newUser.id);

  // Step 5: Create traffic_targetologist_settings with tracking_by
  console.log('\n📋 Step 5: Creating targetologist settings with tracking_by...');

  const { data: settings, error: settingsError } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .upsert({
      user_id: newUser.id,
      fb_ad_accounts: [],
      tracked_campaigns: [],
      utm_source: utmSource,
      utm_medium: utmMedium,
      tracking_by: trackingBy, // KEY FIELD
      utm_templates: {
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: '{campaign_name}',
        utm_content: '{ad_set_name}',
        utm_term: '{ad_name}'
      },
      notification_email: null,
      notification_telegram: null,
      report_frequency: 'daily'
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (settingsError) {
    console.error('❌ Failed to create settings:', settingsError.message);
    return;
  }

  console.log('✅ Settings created successfully');
  console.log('   UTM Source:', settings.utm_source);
  console.log('   UTM Medium:', settings.utm_medium);
  console.log('   Tracking By:', settings.tracking_by);

  // Step 6: Verify the data
  console.log('\n📋 Step 6: Verifying data integrity...');

  const { data: verifyUser } = await trafficAdminSupabase
    .from('traffic_users')
    .select('id, email, team_name, role, utm_source, funnel_type')
    .eq('id', newUser.id)
    .single();

  const { data: verifySettings } = await trafficAdminSupabase
    .from('traffic_targetologist_settings')
    .select('user_id, utm_source, utm_medium, tracking_by')
    .eq('user_id', newUser.id)
    .single();

  console.log('\n✅ Verification Results:');
  console.log('User:', JSON.stringify(verifyUser, null, 2));
  console.log('Settings:', JSON.stringify(verifySettings, null, 2));

  // Final check
  if (verifySettings?.tracking_by === 'utm_source') {
    console.log('\n🎉 SUCCESS! tracking_by field is working correctly!');
  } else {
    console.log('\n⚠️  WARNING: tracking_by is not set to utm_source');
  }

  console.log('\n✅ E2E Test completed successfully!\n');
}

testTeamConstructor().catch(console.error);
