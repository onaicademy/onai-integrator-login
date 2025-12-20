#!/usr/bin/env node
/**
 * 🧪 SMOKE TESTS - onAI Academy
 * Внешние тесты для проверки критических сценариев
 * 
 * Запуск:
 *   npm run smoke-test           # Production
 *   npm run smoke-test:local     # Local
 * 
 * Или напрямую:
 *   npx ts-node backend/tests/smoke-tests.ts
 */

const BASE_URL = process.env.API_URL || 'https://api.onai.academy';
const TIMEOUT_MS = 10000;

interface TestResult {
  name: string;
  scenario: string;
  passed: boolean;
  duration_ms: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function runTest(
  name: string,
  scenario: string,
  testFn: () => Promise<{ passed: boolean; details?: any }>
): Promise<void> {
  const start = Date.now();
  
  try {
    const { passed, details } = await testFn();
    results.push({
      name,
      scenario,
      passed,
      duration_ms: Date.now() - start,
      details,
    });
  } catch (error: any) {
    results.push({
      name,
      scenario,
      passed: false,
      duration_ms: Date.now() - start,
      error: error.message,
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// 🧪 TEST CASES - 5 КРИТИЧЕСКИХ СЦЕНАРИЕВ
// ═══════════════════════════════════════════════════════════════

/**
 * 1️⃣ АВТОРИЗАЦИЯ - API доступен, health OK
 */
async function testAuth(): Promise<{ passed: boolean; details?: any }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/health`);
  const data = await response.json();
  
  return {
    passed: response.ok && data.status === 'ok',
    details: { status: data.status, uptime: data.uptime },
  };
}

/**
 * 2️⃣ TRIPWIRE (обучение) - Tripwire API доступен
 */
async function testTripwire(): Promise<{ passed: boolean; details?: any }> {
  // Test tripwire lessons endpoint (public)
  const response = await fetchWithTimeout(`${BASE_URL}/api/tripwire/lessons/module/1`);
  
  // 401/403 = auth required (OK, endpoint works)
  // 200 = data returned (OK)
  // 500+ = server error (FAIL)
  const passed = response.status < 500;
  
  return {
    passed,
    details: { status: response.status },
  };
}

/**
 * 3️⃣ REFERRAL - Referral API доступен
 */
async function testReferral(): Promise<{ passed: boolean; details?: any }> {
  // Test referral stats endpoint
  const response = await fetchWithTimeout(`${BASE_URL}/api/referral/stats/test`);
  
  // 401/404 = OK (endpoint exists)
  // 500+ = FAIL
  const passed = response.status < 500;
  
  return {
    passed,
    details: { status: response.status },
  };
}

/**
 * 4️⃣ AmoCRM WEBHOOK - Webhook endpoint отвечает
 */
async function testAmoCRMWebhook(): Promise<{ passed: boolean; details?: any }> {
  // Test webhook test endpoint (GET)
  const response = await fetchWithTimeout(`${BASE_URL}/webhook/amocrm/test`);
  
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  
  return {
    passed: response.ok && data?.success === true,
    details: { status: response.status, message: data?.message },
  };
}

/**
 * 5️⃣ LANDING - Landing leads API доступен
 */
async function testLanding(): Promise<{ passed: boolean; details?: any }> {
  // Test landing endpoint
  const response = await fetchWithTimeout(`${BASE_URL}/api/landing/proftest/health`, {
    method: 'GET',
  });
  
  // Any non-500 response = OK
  const passed = response.status < 500;
  
  return {
    passed,
    details: { status: response.status },
  };
}

/**
 * 🔗 BONUS: Extended Health Check
 */
async function testExtendedHealth(): Promise<{ passed: boolean; details?: any }> {
  const response = await fetchWithTimeout(`${BASE_URL}/api/monitoring/health`);
  
  if (!response.ok && response.status !== 503) {
    return { passed: false, details: { status: response.status } };
  }
  
  const data = await response.json();
  
  return {
    passed: data.overall !== 'critical',
    details: { 
      overall: data.overall, 
      checks: data.checks,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// 🚀 MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🧪 SMOKE TESTS - onAI Academy                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Target: ${BASE_URL.padEnd(48)}║`);
  console.log(`║  Time:   ${new Date().toISOString().padEnd(48)}║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Run all tests
  console.log('Running tests...\n');
  
  await runTest('API Health', '1. Авторизация/Доступы', testAuth);
  await runTest('Tripwire API', '2. Обучение студентов', testTripwire);
  await runTest('Referral API', '3. Реферальная система', testReferral);
  await runTest('AmoCRM Webhook', '4. Продажи (webhook)', testAmoCRMWebhook);
  await runTest('Landing API', '5. Заявки (proftest/express)', testLanding);
  await runTest('Extended Health', 'BONUS: Расширенный health', testExtendedHealth);

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                       📊 RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? 'PASS' : 'FAIL';
    
    console.log(`${icon} [${status}] ${result.name} (${result.duration_ms}ms)`);
    console.log(`   Scenario: ${result.scenario}`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${JSON.stringify(result.details)}`);
    }
    console.log('');
    
    if (result.passed) passed++;
    else failed++;
  }

  // Summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  SUMMARY: ${passed}/${results.length} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Exit code for CI/CD
  if (failed > 0) {
    console.log('❌ Some tests failed! Check the errors above.\n');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests passed!\n');
    process.exit(0);
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
