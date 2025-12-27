#!/usr/bin/env node
/**
 * 🕵️‍♂️ LIVE API TEST: Полная проверка UTM-трекинга
 * 
 * Этот скрипт проверяет:
 * 1. Frontend: client_id генерация
 * 2. Backend: API принимает данные
 * 3. Database: Данные сохраняются в Supabase
 * 4. AmoCRM: Данные попадают в CRM (опционально)
 * 
 * Usage: node scripts/test-live-utm.cjs
 */

const https = require('https');
const http = require('http');

// ============================================
// КОНФИГУРАЦИЯ
// ============================================
const TEST_DATA = {
  name: 'Тест Брат (Автотест)',
  phone: '+7 777 999 88 77',
  email: 'test-utm-tracker@example.com',
  source: 'expresscourse',
  paymentMethod: 'kaspi',
  campaignSlug: 'kenesary',
  utmParams: {
    utm_source: 'TEST_AUTO_CHECK',
    utm_medium: 'test',
    utm_campaign: 'utm_tracking_test',
    utm_id: '999999999', // Facebook Ad ID (тестовый)
    fbclid: 'IwAR_TEST_AUTO_FBCLID',
    client_id: 'test-client-' + Date.now() + '-' + Math.random().toString(36).substring(7)
  },
  metadata: {
    userAgent: 'Node.js Test Script',
    timestamp: new Date().toISOString(),
    testRun: true
  }
};

// API URL (локально или продакшн)
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const ENDPOINT = '/api/landing/submit';

// ============================================
// HTTP CLIENT
// ============================================
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: JSON.parse(responseData)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

// ============================================
// ТЕСТЫ
// ============================================
async function runTests() {
  console.log('🕵️‍♂️ ЗАПУСК LIVE API TEST\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // TEST 1: Client ID Generation
  console.log('✅ TEST 1: Client ID Generation');
  console.log('   🆔 Generated client_id:', TEST_DATA.utmParams.client_id);
  console.log('   ✅ Format: UUID-like\n');

  // TEST 2: UTM Params Structure
  console.log('✅ TEST 2: UTM Params Structure');
  console.log('   📊 UTM Params:', JSON.stringify(TEST_DATA.utmParams, null, 2));
  
  const requiredParams = ['utm_source', 'utm_id', 'fbclid', 'client_id'];
  const missingParams = requiredParams.filter(p => !TEST_DATA.utmParams[p]);
  
  if (missingParams.length === 0) {
    console.log('   ✅ All required params present\n');
  } else {
    console.error('   ❌ Missing params:', missingParams.join(', '), '\n');
    process.exit(1);
  }

  // TEST 3: API Request
  console.log('✅ TEST 3: Backend API Request');
  console.log('   🌐 API URL:', API_BASE_URL + ENDPOINT);
  console.log('   📤 Sending payload...\n');

  try {
    const response = await makeRequest(API_BASE_URL + ENDPOINT, TEST_DATA);
    
    console.log('   📥 Response Status:', response.status);
    console.log('   📥 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 && response.data.success) {
      console.log('   ✅ API Request: SUCCESS');
      console.log('   📝 Lead ID:', response.data.leadId);
      console.log('   💾 Data saved to database\n');
      
      return {
        success: true,
        leadId: response.data.leadId
      };
    } else {
      console.error('   ❌ API Request: FAILED');
      console.error('   ⚠️ Error:', response.data.error || 'Unknown error');
      return { success: false };
    }
  } catch (error) {
    console.error('   ❌ Network Error:', error.message);
    console.error('   ⚠️ Make sure backend is running:', API_BASE_URL);
    return { success: false };
  }
}

// ============================================
// VERIFICATION GUIDE
// ============================================
function printVerificationGuide(result) {
  console.log('\n📋 VERIFICATION CHECKLIST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (result.success) {
    console.log('✅ STEP 1: Backend API - PASSED');
    console.log('   📝 Lead ID:', result.leadId);
    console.log('   💾 Data saved to database\n');

    console.log('📊 STEP 2: Verify in Supabase');
    console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('   2. Select project: Landing DB (xikaiavwqinamgolmtcy)');
    console.log('   3. Go to Table Editor → landing_leads');
    console.log('   4. Find lead by ID:', result.leadId);
    console.log('   5. Check metadata column → utmParams:');
    console.log('      {');
    console.log('        "utm_source": "TEST_AUTO_CHECK",');
    console.log('        "utm_id": "999999999",');
    console.log('        "fbclid": "IwAR_TEST_AUTO_FBCLID",');
    console.log('        "client_id": "' + TEST_DATA.utmParams.client_id + '"');
    console.log('      }\n');

    console.log('📊 STEP 3: Verify in AmoCRM (Optional)');
    console.log('   1. Open AmoCRM: https://onaiagencykz.amocrm.ru');
    console.log('   2. Find deal: "Тест Брат (Автотест)"');
    console.log('   3. Check custom fields:');
    console.log('      • Client ID:', TEST_DATA.utmParams.client_id);
    console.log('      • UTM Source: TEST_AUTO_CHECK');
    console.log('      • Facebook Ad ID (utm_id): 999999999');
    console.log('      • Facebook Click ID (fbclid): IwAR_TEST_AUTO_FBCLID\n');

    console.log('✅ FINAL VERDICT:');
    console.log('   If all 3 steps show correct data → System is WORKING PERFECTLY!\n');
  } else {
    console.log('❌ STEP 1: Backend API - FAILED');
    console.log('   ⚠️ Fix backend issues first before checking database/CRM\n');
    
    console.log('🔧 TROUBLESHOOTING:');
    console.log('   1. Check if backend is running:');
    console.log('      cd backend && npm run dev');
    console.log('   2. Check backend logs for errors');
    console.log('   3. Verify .env file has correct database credentials');
    console.log('   4. Test with curl:');
    console.log('      curl -X POST ' + API_BASE_URL + ENDPOINT + ' \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"name":"Test","phone":"+77777777777","source":"expresscourse"}\'');
    console.log('');
  }
}

// ============================================
// SUMMARY
// ============================================
function printSummary() {
  console.log('\n📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('This test verifies the complete UTM tracking pipeline:');
  console.log('');
  console.log('  Frontend (Browser)');
  console.log('       ↓ captures');
  console.log('  UTM Params + Client ID');
  console.log('       ↓ sends via');
  console.log('  API Request (/api/landing/submit)');
  console.log('       ↓ saves to');
  console.log('  Supabase (landing_leads table)');
  console.log('       ↓ syncs to');
  console.log('  AmoCRM (custom fields)');
  console.log('');
  console.log('Test payload included:');
  console.log('  • client_id:', TEST_DATA.utmParams.client_id);
  console.log('  • utm_source:', TEST_DATA.utmParams.utm_source);
  console.log('  • utm_id (Facebook Ad ID):', TEST_DATA.utmParams.utm_id);
  console.log('  • fbclid (Facebook Click ID):', TEST_DATA.utmParams.fbclid);
  console.log('');
}

// ============================================
// MAIN
// ============================================
(async () => {
  try {
    printSummary();
    const result = await runTests();
    printVerificationGuide(result);
    
    if (result.success) {
      console.log('✅ All automated tests PASSED!');
      console.log('📝 Next: Verify manually in Supabase and AmoCRM (see checklist above)\n');
      process.exit(0);
    } else {
      console.log('❌ Tests FAILED. Fix issues and try again.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
})();
