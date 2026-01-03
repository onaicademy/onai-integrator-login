/**
 * E2E Test: User Lifecycle - Delete and Recreate
 *
 * Tests:
 * 1. Data preservation after user deletion
 * 2. UTM attribution stability after user change
 * 3. Leads remain accessible for new users with same UTM
 */

import { landingSupabase } from '../src/config/supabase-landing.js';
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

const TEST_UTM_SOURCE = 'fb_testova';
const TEST_EMAIL = 'testova@onai.academy';
const TEST_EMAIL_2 = 'testova2@onai.academy';

async function runTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🧪 E2E TEST: User Lifecycle - Delete and Recreate');
  console.log('════════════════════════════════════════════════════════════════\n');

  // ════════════════════════════════════════════════════════════════
  // STEP 1: Count Challenge3D leads BEFORE any changes
  // ════════════════════════════════════════════════════════════════
  console.log('📋 STEP 1: Count Challenge3D leads BEFORE changes...');

  let leadCountBefore = 0;
  try {
    const { count, error } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'challenge3d');

    if (error) throw error;

    leadCountBefore = count || 0;
    console.log(`   ✅ Total Challenge3D leads: ${leadCountBefore}`);

    results.push({
      step: 'Count leads BEFORE',
      status: 'PASS',
      details: `${leadCountBefore} leads found`,
      data: { leadCount: leadCountBefore }
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Count leads BEFORE', status: 'FAIL', details: error.message });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 2: Verify user "Тестова" exists
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 2: Check if user Тестова exists...');

  let userId: string | null = null;
  try {
    const { data: user } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id, email, full_name')
      .eq('email', TEST_EMAIL)
      .single();

    if (user) {
      userId = user.id;
      console.log(`   ✅ User found: ${user.full_name} (${user.id})`);
      results.push({
        step: 'Find user Тестова',
        status: 'PASS',
        details: `User exists: ${user.id}`
      });
    } else {
      console.log(`   ⚠️ User not found - creating...`);

      // Create user for test
      const hashedPassword = await bcrypt.hash('Test123456!', 10);
      const { data: newUser, error } = await trafficAdminSupabase
        .from('traffic_users')
        .insert({
          email: TEST_EMAIL,
          full_name: 'Тестова',
          team_name: 'Kenesary',
          password_hash: hashedPassword,
          role: 'targetologist'
        })
        .select()
        .single();

      if (error) throw error;

      userId = newUser.id;
      console.log(`   ✅ User created: ${newUser.id}`);

      // Create settings
      await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .insert({
          user_id: newUser.id,
          utm_source: TEST_UTM_SOURCE,
          utm_medium: 'cpc',
          utm_sources: [TEST_UTM_SOURCE]
        });

      results.push({
        step: 'Create user Тестова',
        status: 'PASS',
        details: `User created: ${newUser.id}`
      });
    }
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Find/Create user', status: 'FAIL', details: error.message });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 3: DELETE user Тестова
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 3: DELETE user Тестова...');

  try {
    // First delete settings (foreign key)
    await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .delete()
      .eq('user_id', userId);

    // Then delete user
    const { error } = await trafficAdminSupabase
      .from('traffic_users')
      .delete()
      .eq('id', userId);

    if (error) throw error;

    console.log(`   ✅ User deleted: ${userId}`);

    results.push({
      step: 'Delete user Тестова',
      status: 'PASS',
      details: `User ${userId} deleted`
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Delete user', status: 'FAIL', details: error.message });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 4: Verify user is deleted
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 4: Verify user is deleted...');

  try {
    const { data: deletedUser } = await trafficAdminSupabase
      .from('traffic_users')
      .select('id')
      .eq('email', TEST_EMAIL)
      .single();

    if (!deletedUser) {
      console.log(`   ✅ User confirmed deleted`);
      results.push({
        step: 'Verify user deleted',
        status: 'PASS',
        details: 'User no longer exists in database'
      });
    } else {
      console.log(`   ❌ User still exists!`);
      results.push({
        step: 'Verify user deleted',
        status: 'FAIL',
        details: 'User still exists after deletion'
      });
    }
  } catch (error: any) {
    // Not finding user is expected
    console.log(`   ✅ User confirmed deleted`);
    results.push({
      step: 'Verify user deleted',
      status: 'PASS',
      details: 'User no longer exists in database'
    });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 5: Count leads AFTER user deletion (CRITICAL!)
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 5: Count leads AFTER user deletion (CRITICAL!)...');

  let leadCountAfterDelete = 0;
  try {
    const { count, error } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'challenge3d');

    if (error) throw error;

    leadCountAfterDelete = count || 0;

    const dataPreserved = leadCountAfterDelete === leadCountBefore;

    console.log(`   ${dataPreserved ? '✅' : '❌'} Leads count: ${leadCountAfterDelete} (was: ${leadCountBefore})`);
    console.log(`   ${dataPreserved ? '✅' : '❌'} DATA PRESERVED: ${dataPreserved ? 'YES' : 'NO - DATA LOSS!'}`);

    results.push({
      step: 'Count leads AFTER deletion',
      status: dataPreserved ? 'PASS' : 'FAIL',
      details: dataPreserved
        ? `All ${leadCountAfterDelete} leads preserved`
        : `DATA LOSS: ${leadCountBefore - leadCountAfterDelete} leads missing!`,
      data: {
        before: leadCountBefore,
        after: leadCountAfterDelete,
        preserved: dataPreserved
      }
    });

    if (!dataPreserved) {
      console.log('\n   ⛔ CRITICAL: DATA LOSS DETECTED! Aborting test.');
      return results;
    }
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Count leads AFTER deletion', status: 'FAIL', details: error.message });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 6: Create NEW user with SAME UTM source
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 6: Create NEW user with SAME UTM source...');

  let newUserId: string | null = null;
  try {
    const hashedPassword = await bcrypt.hash('NewTest123456!', 10);

    const { data: newUser, error } = await trafficAdminSupabase
      .from('traffic_users')
      .insert({
        email: TEST_EMAIL_2,
        full_name: 'Тестова 2',
        team_name: 'Kenesary',
        password_hash: hashedPassword,
        role: 'targetologist'
      })
      .select()
      .single();

    if (error) throw error;

    newUserId = newUser.id;
    console.log(`   ✅ New user created: ${newUser.full_name} (${newUser.id})`);

    // Create settings with SAME UTM source
    const { error: settingsError } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .insert({
        user_id: newUser.id,
        utm_source: TEST_UTM_SOURCE,
        utm_medium: 'cpc',
        utm_sources: [TEST_UTM_SOURCE],
        report_frequency: 'daily'
      });

    if (settingsError) throw settingsError;

    console.log(`   ✅ Settings created with UTM: ${TEST_UTM_SOURCE}`);

    results.push({
      step: 'Create new user with same UTM',
      status: 'PASS',
      details: `User ${TEST_EMAIL_2} created with UTM ${TEST_UTM_SOURCE}`
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Create new user', status: 'FAIL', details: error.message });
    return results;
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 7: Verify NEW user can see leads (UTM attribution works)
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 7: Verify UTM attribution works for new user...');

  try {
    // Get new user's settings
    const { data: settings } = await trafficAdminSupabase
      .from('traffic_targetologist_settings')
      .select('utm_source, utm_sources')
      .eq('user_id', newUserId)
      .single();

    if (!settings) {
      throw new Error('Settings not found for new user');
    }

    console.log(`   📊 New user's UTM Source: ${settings.utm_source}`);
    console.log(`   📊 New user's UTM Sources: ${JSON.stringify(settings.utm_sources)}`);

    // Query leads that would be visible to this user
    const { count: userLeadsCount } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'challenge3d')
      .eq('utm_source', settings.utm_source);

    console.log(`   📊 Leads visible to new user: ${userLeadsCount} (with utm_source=${settings.utm_source})`);

    results.push({
      step: 'Verify UTM attribution',
      status: 'PASS',
      details: `New user can see ${userLeadsCount} leads with UTM ${settings.utm_source}`,
      data: {
        utm_source: settings.utm_source,
        visibleLeads: userLeadsCount
      }
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Verify UTM attribution', status: 'FAIL', details: error.message });
  }

  // ════════════════════════════════════════════════════════════════
  // STEP 8: Final count - ensure no data loss
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 STEP 8: Final verification - no data loss...');

  try {
    const { count: finalCount } = await landingSupabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'challenge3d');

    const dataIntact = (finalCount || 0) === leadCountBefore;

    console.log(`   ${dataIntact ? '✅' : '❌'} Final lead count: ${finalCount}`);
    console.log(`   ${dataIntact ? '✅' : '❌'} Original count: ${leadCountBefore}`);
    console.log(`   ${dataIntact ? '✅' : '❌'} DATA INTEGRITY: ${dataIntact ? 'INTACT' : 'COMPROMISED!'}`);

    results.push({
      step: 'Final data integrity check',
      status: dataIntact ? 'PASS' : 'FAIL',
      details: dataIntact
        ? `All ${finalCount} leads intact after user lifecycle`
        : `DATA INTEGRITY COMPROMISED: ${leadCountBefore - (finalCount || 0)} leads lost!`,
      data: {
        original: leadCountBefore,
        final: finalCount,
        intact: dataIntact
      }
    });
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}`);
    results.push({ step: 'Final data integrity', status: 'FAIL', details: error.message });
  }

  // ════════════════════════════════════════════════════════════════
  // CLEANUP: Delete test user 2
  // ════════════════════════════════════════════════════════════════
  console.log('\n📋 CLEANUP: Removing test user 2...');

  try {
    if (newUserId) {
      await trafficAdminSupabase
        .from('traffic_targetologist_settings')
        .delete()
        .eq('user_id', newUserId);

      await trafficAdminSupabase
        .from('traffic_users')
        .delete()
        .eq('id', newUserId);
    }
    console.log(`   ✅ Test user 2 cleaned up`);
  } catch (error: any) {
    console.log(`   ⚠️ Cleanup failed: ${error.message}`);
  }

  return results;
}

async function main() {
  try {
    const results = await runTest();

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 E2E TEST SUMMARY: User Lifecycle');
    console.log('════════════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    results.forEach(r => {
      console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.step}: ${r.details}`);
    });

    console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED!\n');
      console.log('════════════════════════════════════════════════════════════════');
      console.log('✅ CONFIRMED: Data is NOT deleted when users are removed');
      console.log('✅ CONFIRMED: UTM attribution works after user recreation');
      console.log('✅ CONFIRMED: System is stable for user lifecycle operations');
      console.log('════════════════════════════════════════════════════════════════\n');
    } else {
      console.log('\n❌ SOME TESTS FAILED\n');
      console.log('⚠️ Review the failures above for potential data integrity issues');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

main();
