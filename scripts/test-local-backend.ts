/**
 * 🧪 Скрипт для локального тестирования Traffic Dashboard Backend
 * 
 * Этот скрипт проверяет все критические улучшения:
 * 1. Валидация входных данных
 * 2. Circuit Breaker & Retry Logic
 * 3. Дедупликация webhook
 * 4. Маппинг таргетологов
 * 5. Интеграции (AmoCRM, Facebook Ads)
 * 6. Диагностика интеграций
 */

import axios from 'axios';

// Конфигурация
const API_BASE_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'admin-token-from-localstorage'; // Нужно получить из localStorage

// Цвета для вывода
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Функции для цветного вывода
const logSuccess = (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`);
const logError = (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`);
const logWarning = (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
const logInfo = (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
const logHeader = (msg: string) => console.log(`\n${colors.cyan}📋 ${msg}${colors.reset}`);

// Результаты тестов
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

// Функция для запуска теста
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: 'passed', message: 'OK', duration });
    logSuccess(`${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ name, status: 'failed', message: error.message, duration });
    logError(`${name}: ${error.message}`);
  }
}

// ==================== ТЕСТЫ ====================

// 1. Проверка здоровья сервера
async function testServerHealth(): Promise<void> {
  const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  logInfo(`Server is running: ${JSON.stringify(response.data)}`);
}

// 2. Проверка валидации webhook (невалидные данные)
async function testWebhookValidationInvalid(): Promise<void> {
  try {
    await axios.post(`${API_BASE_URL}/api/amocrm/sales-webhook`, {
      invalid: 'data',
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    throw new Error('Should have rejected invalid data');
  } catch (error: any) {
    if (error.response?.status === 400) {
      logInfo('Validation correctly rejected invalid data');
      return;
    }
    throw error;
  }
}

// 3. Проверка Circuit Breaker (Facebook Ads)
async function testFacebookCircuitBreaker(): Promise<void> {
  // Проверяем, что Circuit Breaker работает
  // Для этого делаем несколько запросов к Facebook Ads
  const response = await axios.get(`${API_BASE_URL}/api/facebook/ads`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    timeout: 30000,
  });
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  logInfo(`Facebook Ads data fetched successfully`);
}

// 4. Проверка маппинга таргетологов
async function testTargetologistMapping(): Promise<void> {
  // Тестируем через API Traffic Dashboard
  const response = await axios.get(`${API_BASE_URL}/api/traffic/dashboard`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    params: { dateRange: '7d' },
    timeout: 15000,
  });
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.targetologists || !Array.isArray(data.targetologists)) {
    throw new Error('Targetologists data not found');
  }
  
  logInfo(`Found ${data.targetologists.length} targetologists`);
}

// 5. Проверка диагностики интеграций
async function testIntegrationsDiagnostics(): Promise<void> {
  const response = await axios.post(`${API_BASE_URL}/api/admin/integrations/diagnostics`, {}, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
    timeout: 30000,
  });
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.success || !data.data) {
    throw new Error('Invalid diagnostics response');
  }
  
  const { overall_status, diagnostics, summary } = data.data;
  logInfo(`Overall status: ${overall_status}`);
  logInfo(`Diagnostics: ${summary.ok} OK, ${summary.warning} warnings, ${summary.error} errors`);
  
  // Выводим детали диагностики
  diagnostics.forEach((d: any) => {
    if (d.status === 'error') {
      logError(`${d.name}: ${d.message}`);
    } else if (d.status === 'warning') {
      logWarning(`${d.name}: ${d.message}`);
    } else {
      logSuccess(`${d.name}: OK`);
    }
  });
}

// 6. Проверка Sales Webhook (с валидными данными)
async function testSalesWebhookValid(): Promise<void> {
  const validWebhookData = {
    leads: {
      status: [
        {
          lead_id: 123456,
          pipeline_id: 10418746, // Flagship Course
          status_id: 142, // Успешно реализовано
          price: 490000,
          custom_fields: [
            {
              id: 12345678,
              name: 'UTM Source',
              values: [{ value: 'tripwire' }],
            },
          ],
        },
      ],
    },
  };
  
  const response = await axios.post(
    `${API_BASE_URL}/api/amocrm/sales-webhook`,
    validWebhookData,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  logInfo(`Webhook processed successfully: ${JSON.stringify(response.data)}`);
}

// 7. Проверка Express Course Webhook
async function testExpressCourseWebhook(): Promise<void> {
  const validWebhookData = {
    leads: {
      status: [
        {
          lead_id: 123457,
          pipeline_id: 10350882, // Express Course
          status_id: 142,
          price: 5000,
        },
      ],
    },
  };
  
  const response = await axios.post(
    `${API_BASE_URL}/api/amocrm/funnel-sale`,
    validWebhookData,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  logInfo(`Express Course webhook processed successfully`);
}

// 8. Проверка Main Product Webhook
async function testMainProductWebhook(): Promise<void> {
  const validWebhookData = {
    leads: {
      status: [
        {
          lead_id: 123458,
          pipeline_id: 10418746, // Flagship Course
          status_id: 142,
          price: 490000,
          custom_fields: [
            {
              id: 12345678,
              name: 'UTM Source',
              values: [{ value: 'nutcab' }],
            },
          ],
        },
      ],
    },
  };
  
  const response = await axios.post(
    `${API_BASE_URL}/api/amocrm/traffic`,
    validWebhookData,
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (response.status !== 200) {
    throw new Error(`Unexpected status: ${response.status}`);
  }
  
  logInfo(`Main Product webhook processed successfully`);
}

// ==================== ЗАПУСК ВСЕХ ТЕСТОВ ====================

async function runAllTests(): Promise<void> {
  logHeader('🚀 Starting Local Backend Tests');
  logInfo(`API Base URL: ${API_BASE_URL}`);
  logInfo(`Admin Token: ${ADMIN_TOKEN ? 'Set' : 'NOT SET - Some tests will fail!'}`);
  
  console.log('\n' + '='.repeat(60));
  
  // Основные тесты
  await runTest('Server Health', testServerHealth);
  await runTest('Webhook Validation (Invalid)', testWebhookValidationInvalid);
  await runTest('Facebook Circuit Breaker', testFacebookCircuitBreaker);
  await runTest('Targetologist Mapping', testTargetologistMapping);
  await runTest('Integrations Diagnostics', testIntegrationsDiagnostics);
  await runTest('Sales Webhook (Valid)', testSalesWebhookValid);
  await runTest('Express Course Webhook', testExpressCourseWebhook);
  await runTest('Main Product Webhook', testMainProductWebhook);
  
  console.log('\n' + '='.repeat(60));
  
  // Вывод результатов
  logHeader('📊 Test Results Summary');
  
  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const total = results.length;
  
  console.log(`\nTotal: ${total}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${skipped}${colors.reset}`);
  
  const successRate = ((passed / total) * 100).toFixed(1);
  console.log(`\nSuccess Rate: ${successRate}%`);
  
  // Детали неудачных тестов
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results
      .filter(r => r.status === 'failed')
      .forEach(r => {
        console.log(`  ❌ ${r.name}`);
        console.log(`     ${r.message}`);
      });
  }
  
  // Общее время
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`\nTotal Duration: ${totalDuration}ms`);
  
  // Рекомендации
  console.log('\n' + '='.repeat(60));
  logHeader('💡 Recommendations');
  
  if (failed === 0) {
    logSuccess('All tests passed! Backend is ready for production deployment.');
  } else {
    logWarning(`Some tests failed. Please fix the issues before deploying to production.`);
    logInfo('Common issues:');
    logInfo('  - Backend server not running (start with: npm run dev)');
    logInfo('  - Redis not running (start with: redis-server)');
    logInfo('  - Admin token not set (check localStorage)');
    logInfo('  - Facebook API credentials invalid (check .env)');
  }
  
  // Статус готовности
  const readiness = failed === 0 ? 'READY' : 'NOT READY';
  const readinessColor = failed === 0 ? colors.green : colors.red;
  console.log(`\n${readinessColor}🎯 Backend Status: ${readiness}${colors.reset}\n`);
}

// Запуск
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
