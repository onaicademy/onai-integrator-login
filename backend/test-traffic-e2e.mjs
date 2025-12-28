/**
 * End-to-End Testing для Traffic Dashboard
 * Проверка всех API endpoints и функциональности
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const API_URL = 'https://api.onai.academy';
const TRAFFIC_URL = 'https://oetodaexnjcunklkdlkv.supabase.co';
const TRAFFIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0MTAxMTMsImV4cCI6MjA0ODk4NjExM30.ZVJSuoN1wQECrVVgwg1lQ-p4wvDjAjyqVRX8x-IujJc';

const supabase = createClient(TRAFFIC_URL, TRAFFIC_ANON_KEY);

// Test results storage
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function log(emoji, message) {
  console.log(`${emoji} ${message}`);
}

function logTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    log('✅', `PASS: ${name}`);
  } else {
    results.failed++;
    log('❌', `FAIL: ${name}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
  results.tests.push({ name, passed, details });
}

// ═══════════════════════════════════════════════════════════════
// TEST 1: Authentication API
// ═══════════════════════════════════════════════════════════════

async function testAuthAPI() {
  log('\n🔐', 'Testing Authentication API...\n');

  // Test 1.1: Login with valid credentials
  try {
    const response = await fetch(`${API_URL}/api/traffic-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@onai.academy',
        password: 'admin123'
      })
    });

    const data = await response.json();

    if (response.ok && data.success && data.token) {
      logTest('Login with valid credentials', true, `Token: ${data.token.substring(0, 20)}...`);
      // Save token for later tests
      global.authToken = data.token;
      global.testUser = data.user;
    } else {
      logTest('Login with valid credentials', false, `Status: ${response.status}, Response: ${JSON.stringify(data)}`);
    }
  } catch (error) {
    logTest('Login with valid credentials', false, `Error: ${error.message}`);
  }

  // Test 1.2: Login with invalid credentials (should fail)
  try {
    const response = await fetch(`${API_URL}/api/traffic-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@onai.academy',
        password: 'wrongpassword'
      })
    });

    const data = await response.json();

    if (!response.ok && data.error) {
      logTest('Login with invalid credentials (should fail)', true, `Error message: ${data.error}`);
    } else {
      logTest('Login with invalid credentials (should fail)', false, 'Should have failed but succeeded');
    }
  } catch (error) {
    logTest('Login with invalid credentials (should fail)', false, `Error: ${error.message}`);
  }

  // Test 1.3: Rate limiting (должен заблокировать после 5 попыток)
  log('\n🔒', 'Testing Rate Limiting (5 attempts)...');
  let rateLimited = false;
  for (let i = 1; i <= 6; i++) {
    try {
      const response = await fetch(`${API_URL}/api/traffic-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test${Date.now()}@test.com`,
          password: 'test123'
        })
      });

      if (response.status === 429) {
        rateLimited = true;
        logTest('Rate limiting blocks after 5 attempts', true, `Blocked on attempt ${i}`);
        break;
      }
    } catch (error) {
      // Ignore
    }
  }

  if (!rateLimited) {
    logTest('Rate limiting blocks after 5 attempts', false, 'Rate limiting did not trigger');
  }

  // Test 1.4: Email validation
  try {
    const response = await fetch(`${API_URL}/api/traffic-auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'test123'
      })
    });

    const data = await response.json();

    if (response.status === 400 && data.error) {
      logTest('Email validation rejects invalid email', true, `Error: ${data.error}`);
    } else {
      logTest('Email validation rejects invalid email', false, 'Invalid email was accepted');
    }
  } catch (error) {
    logTest('Email validation rejects invalid email', false, `Error: ${error.message}`);
  }

  // Test 1.5: Get current user
  if (global.authToken) {
    try {
      const response = await fetch(`${API_URL}/api/traffic-auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.authToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.user) {
        logTest('Get current user info', true, `User: ${data.user.email}, Role: ${data.user.role}`);
      } else {
        logTest('Get current user info', false, `Status: ${response.status}`);
      }
    } catch (error) {
      logTest('Get current user info', false, `Error: ${error.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 2: Database Tables Access
// ═══════════════════════════════════════════════════════════════

async function testDatabaseAccess() {
  log('\n📊', 'Testing Database Table Access...\n');

  const tables = [
    'traffic_users',
    'traffic_teams',
    'traffic_sessions',
    'utm_analytics',
    'team_weekly_plans',
    'team_weekly_kpi',
    'traffic_settings',
    'webhook_logs',
    'facebook_ad_accounts',
    'facebook_campaigns'
  ];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        logTest(`Table ${table} accessible`, true, `Rows: ${count || 'unknown'}`);
      } else {
        logTest(`Table ${table} accessible`, false, `Error: ${error.message}`);
      }
    } catch (error) {
      logTest(`Table ${table} accessible`, false, `Error: ${error.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 3: Dashboard Metrics
// ═══════════════════════════════════════════════════════════════

async function testDashboardMetrics() {
  log('\n📈', 'Testing Dashboard Metrics...\n');

  if (!global.testUser) {
    log('⚠️', 'Skipping dashboard metrics tests (not authenticated)');
    return;
  }

  // Test 3.1: Traffic Users Count
  try {
    const { count, error } = await supabase
      .from('traffic_users')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      logTest('Traffic users count', true, `Total users: ${count}`);
    } else {
      logTest('Traffic users count', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('Traffic users count', false, `Error: ${error.message}`);
  }

  // Test 3.2: Active Teams Count
  try {
    const { count, error } = await supabase
      .from('traffic_teams')
      .select('*', { count: 'exact', head: true });

    if (!error) {
      logTest('Active teams count', true, `Total teams: ${count}`);
    } else {
      logTest('Active teams count', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('Active teams count', false, `Error: ${error.message}`);
  }

  // Test 3.3: UTM Analytics Data
  try {
    const { data, error } = await supabase
      .from('utm_analytics')
      .select('*')
      .limit(10);

    if (!error) {
      logTest('UTM analytics data', true, `Records found: ${data?.length || 0}`);
    } else {
      logTest('UTM analytics data', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('UTM analytics data', false, `Error: ${error.message}`);
  }

  // Test 3.4: Weekly KPI Data
  try {
    const { data, error } = await supabase
      .from('team_weekly_kpi')
      .select('*')
      .limit(10);

    if (!error) {
      logTest('Weekly KPI data', true, `Records found: ${data?.length || 0}`);
    } else {
      logTest('Weekly KPI data', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('Weekly KPI data', false, `Error: ${error.message}`);
  }

  // Test 3.5: Facebook Ad Accounts
  try {
    const { data, error } = await supabase
      .from('facebook_ad_accounts')
      .select('*')
      .limit(10);

    if (!error) {
      logTest('Facebook ad accounts', true, `Accounts found: ${data?.length || 0}`);
    } else {
      logTest('Facebook ad accounts', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('Facebook ad accounts', false, `Error: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 4: Team Constructor
// ═══════════════════════════════════════════════════════════════

async function testTeamConstructor() {
  log('\n👥', 'Testing Team Constructor API...\n');

  // Test 4.1: Create new team
  try {
    const { data, error } = await supabase
      .from('traffic_teams')
      .insert([{
        name: `Test Team ${Date.now()}`,
        description: 'E2E Test Team',
        is_active: true
      }])
      .select()
      .single();

    if (!error && data) {
      logTest('Create new team', true, `Team ID: ${data.id}`);
      global.testTeamId = data.id;
    } else {
      logTest('Create new team', false, `Error: ${error?.message || 'No data returned'}`);
    }
  } catch (error) {
    logTest('Create new team', false, `Error: ${error.message}`);
  }

  // Test 4.2: Read team data
  if (global.testTeamId) {
    try {
      const { data, error } = await supabase
        .from('traffic_teams')
        .select('*')
        .eq('id', global.testTeamId)
        .single();

      if (!error && data) {
        logTest('Read team data', true, `Team name: ${data.name}`);
      } else {
        logTest('Read team data', false, `Error: ${error?.message}`);
      }
    } catch (error) {
      logTest('Read team data', false, `Error: ${error.message}`);
    }
  }

  // Test 4.3: Update team data
  if (global.testTeamId) {
    try {
      const { data, error } = await supabase
        .from('traffic_teams')
        .update({ description: 'Updated E2E Test Team' })
        .eq('id', global.testTeamId)
        .select()
        .single();

      if (!error && data) {
        logTest('Update team data', true, `Updated description: ${data.description}`);
      } else {
        logTest('Update team data', false, `Error: ${error?.message}`);
      }
    } catch (error) {
      logTest('Update team data', false, `Error: ${error.message}`);
    }
  }

  // Test 4.4: Delete test team (cleanup)
  if (global.testTeamId) {
    try {
      const { error } = await supabase
        .from('traffic_teams')
        .delete()
        .eq('id', global.testTeamId);

      if (!error) {
        logTest('Delete test team (cleanup)', true, `Team deleted: ${global.testTeamId}`);
      } else {
        logTest('Delete test team (cleanup)', false, `Error: ${error.message}`);
      }
    } catch (error) {
      logTest('Delete test team (cleanup)', false, `Error: ${error.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST 5: Settings API
// ═══════════════════════════════════════════════════════════════

async function testSettingsAPI() {
  log('\n⚙️', 'Testing Settings API...\n');

  // Test 5.1: Read traffic settings
  try {
    const { data, error } = await supabase
      .from('traffic_settings')
      .select('*')
      .limit(10);

    if (!error) {
      logTest('Read traffic settings', true, `Settings found: ${data?.length || 0}`);
    } else {
      logTest('Read traffic settings', false, `Error: ${error.message}`);
    }
  } catch (error) {
    logTest('Read traffic settings', false, `Error: ${error.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Main Test Runner
// ═══════════════════════════════════════════════════════════════

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 TRAFFIC DASHBOARD END-TO-END TESTING');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log(`🗄️ Database URL: ${TRAFFIC_URL}\n`);

  try {
    await testAuthAPI();
    await testDatabaseAccess();
    await testDashboardMetrics();
    await testTeamConstructor();
    await testSettingsAPI();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`✅ Passed: ${results.passed}/${results.total}`);
    console.log(`❌ Failed: ${results.failed}/${results.total}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

    if (results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! System is 100% operational!\n');
    } else {
      console.log('⚠️ Some tests failed. Review the output above.\n');
    }

    // Detailed breakdown
    console.log('Detailed Results:');
    results.tests.forEach((test, index) => {
      console.log(`${index + 1}. [${test.passed ? '✅' : '❌'}] ${test.name}`);
    });

  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
