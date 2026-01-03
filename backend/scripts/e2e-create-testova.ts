/**
 * E2E Test: Create Targetologist "Testova"
 *
 * Tests the full flow:
 * 1. Create user in traffic_users
 * 2. Create settings in traffic_targetologist_settings
 * 3. Verify all data in database
 */

import { trafficAdminSupabase } from '../src/config/supabase-traffic.js';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

interface TestResult {
  step: string;
  status: 'PASS' | 'FAIL';
  details: string;
  data?: any;
}

async function runE2ETest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🧪 E2E TEST: Create Targetologist "Testova"');
  console.log('════════════════════════════════════════════════════════════════\n');

  const testUser = {
    email: 'testova@onai.academy',
    fullName: 'Тестова',
    team: 'Kenesary', // Must be one of: Kenesary, Arystan, Traf4, Muha
    password: 'Test123456!',
    role: 'targetologist',
    utm_source: 'fb_testova',
    utm_medium: 'cpc'
  };

  let userId: string | null = null;

  // ════════════════════════════════════════════════════════════════
  // STEP 1: Check if user already exists (cleanup if needed)
  // ════════════════════════════════════════════════════════════════
  console.log('📋 STEP 1: Check if user already exists...');

  try {
    const { data: existing } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id')
      .eq('email', testUser.email)
      .single();

    if (existing) {
      console.log('   ⚠️  User already exists, deleting for clean test...');

      // Delete settings first (foreign key)
      await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .delete()
        .eq('user_id', existing.id);

      // Delete user
      await trafficAdminSupabase
        .from('traffic_users')
        .delete()
        .eq('id', existing.id);

      console.log('   ✅ Cleanup completed');
    }

    results.push({
      step: 'Pre-check cleanup',
      status: 'PASS',
      details: existing ? 'Cleaned up existing user' : 'No existing user found'
    });
  } catch (error: any) {
    results.push({
      step: 'Pre-check cleanup',
      status: 'PASS', // Not finding user is OK
      details: 'No cleanup needed'
    });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 2: Create user in traffic_users
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 2: Create user in traffic_users...');

  try {
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    const { data: newUser, error } = await trafficAdminSupabase
      .from('traffic_users')
      .insert({
        email: testUser.email,
        full_name: testUser.fullName,
        team_name: testUser.team,
        password_hash: hashedPassword,
        role: testUser.role
      })
      .select()
      .single();

    if (error) throw error;

    userId = newUser.id;

    console.log(`   ✅ User created: ${newUser.email} (ID: ${newUser.id})`);
    console.log(`   📊 Team: ${newUser.team_name}`);
    console.log(`   📊 Role: ${newUser.role}`);

    results.push({
      step: 'Create traffic_users',
      status: 'PASS',
      details: `User created with ID: ${newUser.id}`,
      data: {
        id: newUser.id,
        email: newUser.email,
        utm_source: newUser.utm_source,
        funnel_type: newUser.funnel_type
      }
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({
      step: 'Create traffic_users',
      status: 'FAIL',
      details: error.message
    });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 3: Create settings in traffic_targetologist_settings
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 3: Create settings in traffic_targetologist_settings...');

  try {
    const { data: settings, error } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .insert({
        user_id: userId,
        fb_ad_accounts: [],
        tracked_campaigns: [],
        utm_source: testUser.utm_source,
        utm_medium: testUser.utm_medium,
        utm_sources: [testUser.utm_source], // Array of tracked UTM sources
        utm_templates: {
          utm_source: testUser.utm_source,
          utm_medium: testUser.utm_medium,
          utm_campaign: '{campaign_name}',
          utm_content: '{ad_set_name}',
          utm_term: '{ad_name}'
        },
        report_frequency: 'daily'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`   ✅ Settings created`);
    console.log(`   📊 UTM Source: ${settings.utm_source}`);
    console.log(`   📊 UTM Medium: ${settings.utm_medium}`);
    console.log(`   📊 UTM Sources: ${JSON.stringify(settings.utm_sources)}`);

    results.push({
      step: 'Create traffic_targetologist_settings',
      status: 'PASS',
      details: 'Settings created successfully',
      data: {
        utm_source: settings.utm_source,
        utm_medium: settings.utm_medium,
        utm_sources: settings.utm_sources
      }
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({
      step: 'Create traffic_targetologist_settings',
      status: 'FAIL',
      details: error.message
    });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 4: Verify user in database
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 4: Verify user in database...');

  try {
    const { data: verifyUser, error } = await trafficAdminSupabase
      .from('traffic_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const checks = [
      { field: 'email', expected: testUser.email, actual: verifyUser.email },
      { field: 'full_name', expected: testUser.fullName, actual: verifyUser.full_name },
      { field: 'team_name', expected: testUser.team, actual: verifyUser.team_name },
      { field: 'role', expected: testUser.role, actual: verifyUser.role },
    ];

    let allPassed = true;
    for (const check of checks) {
      const passed = check.expected === check.actual;
      console.log(`   ${passed ? '✅' : '❌'} ${check.field}: ${check.actual}`);
      if (!passed) allPassed = false;
    }

    results.push({
      step: 'Verify traffic_users',
      status: allPassed ? 'PASS' : 'FAIL',
      details: allPassed ? 'All fields match' : 'Some fields mismatch',
      data: verifyUser
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({
      step: 'Verify traffic_users',
      status: 'FAIL',
      details: error.message
    });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 5: Verify settings in database
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 5: Verify settings in database...');

  try {
    const { data: verifySettings, error } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    const checks = [
      { field: 'utm_source', expected: testUser.utm_source, actual: verifySettings.utm_source },
      { field: 'utm_medium', expected: testUser.utm_medium, actual: verifySettings.utm_medium },
    ];

    let allPassed = true;
    for (const check of checks) {
      const passed = check.expected === check.actual;
      console.log(`   ${passed ? '✅' : '❌'} ${check.field}: ${check.actual}`);
      if (!passed) allPassed = false;
    }

    results.push({
      step: 'Verify traffic_targetologist_settings',
      status: allPassed ? 'PASS' : 'FAIL',
      details: allPassed ? 'All fields match' : 'Some fields mismatch',
      data: verifySettings
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({
      step: 'Verify traffic_targetologist_settings',
      status: 'FAIL',
      details: error.message
    });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 6: Test login with created credentials
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 6: Test password verification...');

  try {
    const { data: loginUser } = await trafficAdminSupabase
      .from('traffic_users')
      .select('password_hash')
      .eq('email', testUser.email)
      .single();

    if (loginUser) {
      const isValid = await bcrypt.compare(testUser.password, loginUser.password_hash);
      console.log(`   ${isValid ? '✅' : '❌'} Password verification: ${isValid ? 'PASSED' : 'FAILED'}`);

      results.push({
        step: 'Password verification',
        status: isValid ? 'PASS' : 'FAIL',
        details: isValid ? 'Password matches' : 'Password does not match'
      });
    }
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({
      step: 'Password verification',
      status: 'FAIL',
      details: error.message
    });
  }

  return results;
}

async function main() {
  try {
    const results = await runE2ETest();

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 E2E TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
      console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.step}: ${r.details}`);
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!\n');
      console.log('✅ Targetologist "Тестова" successfully created in Traffic Dashboard');
      console.log('   📧 Email: testova@onai.academy');
      console.log('   🔑 Password: Test123456!');
      console.log('   🏢 Team: Kenesary');
      console.log('   📊 UTM Source: fb_testova');
      console.log('   📊 UTM Medium: cpc');
    } else {
      console.log('\n❌ SOME TESTS FAILED\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
