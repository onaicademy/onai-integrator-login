/**
 * Скрипт для тестирования отправки отчетов AI-наставника и AI-аналитики
 * 
 * Использование:
 * node backend/test-ai-reports.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

// ВАЖНО: Замени на свой токен админа после логина
const ADMIN_TOKEN = process.env.TEST_ADMIN_TOKEN || 'ВАШ_ADMIN_JWT_TOKEN_ЗДЕСЬ';

async function testAIMentorDailyReport() {
  console.log('\n🧪 ТЕСТ: AI-наставник - Ежедневный отчет');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/ai-mentor/trigger/daily-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Успех!', data);
    } else {
      console.error('❌ Ошибка:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

async function testAIAnalyticsDailyReport() {
  console.log('\n🧪 ТЕСТ: AI-аналитика - Ежедневный отчет');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/ai-analytics/trigger/daily`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Успех!', data);
    } else {
      console.error('❌ Ошибка:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

async function testAIMentorStatus() {
  console.log('\n🧪 ТЕСТ: AI-наставник - Статус');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/ai-mentor/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Статус:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Ошибка:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

async function testAIAnalyticsStatus() {
  console.log('\n🧪 ТЕСТ: AI-аналитика - Статус');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${API_URL}/api/ai-analytics/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Статус:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Ошибка:', data);
    }
  } catch (error) {
    console.error('❌ Ошибка запроса:', error.message);
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 ТЕСТИРОВАНИЕ AI-НАСТАВНИКА И AI-АНАЛИТИКИ');
  console.log('='.repeat(60));

  console.log('\n📍 API URL:', API_URL);
  console.log('🔑 Токен настроен:', ADMIN_TOKEN !== 'ВАШ_ADMIN_JWT_TOKEN_ЗДЕСЬ' ? 'ДА' : 'НЕТ');
  console.log('📞 Telegram Bot Token:', process.env.TELEGRAM_ADMIN_BOT_TOKEN ? 'ДА' : 'НЕТ');
  console.log('📞 Telegram Admin Chat ID:', process.env.TELEGRAM_ADMIN_CHAT_ID || 'НЕ НАСТРОЕН');

  if (ADMIN_TOKEN === 'ВАШ_ADMIN_JWT_TOKEN_ЗДЕСЬ') {
    console.log('\n⚠️  ВНИМАНИЕ: Замени TEST_ADMIN_TOKEN в .env или в скрипте на реальный JWT токен админа!');
    console.log('📝 Инструкция:');
    console.log('   1. Залогинься в админ-панель');
    console.log('   2. Открой DevTools → Application → Local Storage');
    console.log('   3. Скопируй значение ключа: sb-arqhkacellqbhjhbebfh-auth-token');
    console.log('   4. Добавь в backend/.env: TEST_ADMIN_TOKEN=твой_токен');
    console.log('   5. Запусти скрипт снова');
    return;
  }

  // Запускаем тесты
  await testAIMentorStatus();
  await testAIAnalyticsStatus();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 ЗАПУСК РУЧНОЙ ГЕНЕРАЦИИ ОТЧЕТОВ');
  console.log('='.repeat(60));
  console.log('\n⏳ Подожди 10-15 секунд после запуска для получения отчетов в Telegram...\n');

  await testAIMentorDailyReport();
  await testAIAnalyticsDailyReport();

  console.log('\n' + '='.repeat(60));
  console.log('✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  console.log('='.repeat(60));
  console.log('\n📱 Проверь Telegram чат (ID: ' + process.env.TELEGRAM_ADMIN_CHAT_ID + ')');
  console.log('   Ты должен получить 2 отчета:');
  console.log('   1. Ежедневный отчет AI-наставника');
  console.log('   2. Ежедневный отчет AI-аналитики');
  console.log('\n');
}

// Запуск
runAllTests().catch(err => {
  console.error('\n❌ Критическая ошибка:', err);
  process.exit(1);
});


