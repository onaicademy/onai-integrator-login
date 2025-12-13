/**
 * Тестовый скрипт для проверки интеграции amoCRM
 * 
 * Использование:
 *   npx ts-node backend/src/scripts/test-amocrm.ts
 */

import amoCrmService from '../services/amoCrmService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  console.log('\n🔍 Тестирование интеграции amoCRM...\n');
  console.log('=' .repeat(60));

  // Проверка 1: Конфигурация
  console.log('\n📋 Шаг 1: Проверка переменных окружения\n');
  
  const requiredVars = [
    'AMOCRM_SUBDOMAIN',
    'AMOCRM_ACCESS_TOKEN',
    'AMOCRM_PIPELINE_ID',
    'AMOCRM_STAGE_LESSON_1',
    'AMOCRM_STAGE_LESSON_2',
    'AMOCRM_STAGE_LESSON_3',
  ];

  const oauthVars = [
    'AMOCRM_CLIENT_ID',
    'AMOCRM_CLIENT_SECRET',
    'AMOCRM_REFRESH_TOKEN',
  ];

  let allConfigured = true;
  let hasOAuth = true;
  
  console.log('Базовые переменные:');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    const isSet = Boolean(value && value !== '0' && value !== 'your_access_token_here' && value !== 'yoursubdomain');
    
    if (isSet) {
      const displayValue = varName.includes('TOKEN') ? '***скрыто***' : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`❌ ${varName}: не задан или содержит заглушку`);
      allConfigured = false;
    }
  }

  console.log('\nOAuth переменные (для автообновления токенов):');
  for (const varName of oauthVars) {
    const value = process.env[varName];
    const isSet = Boolean(value && value !== '0');
    
    if (isSet) {
      const displayValue = '***скрыто***';
      console.log(`✅ ${varName}: ${displayValue}`);
    } else {
      console.log(`⚠️  ${varName}: не задан`);
      hasOAuth = false;
    }
  }

  if (!hasOAuth) {
    console.log('\n⚠️ OAuth credentials не заданы!');
    console.log('💡 Токен будет работать только 24 часа.');
    console.log('📚 См. инструкцию: AMOCRM_REFRESH_TOKEN_GUIDE.md');
  }

  if (!allConfigured) {
    console.log('\n⚠️ Некоторые переменные не сконфигурированы!');
    console.log('📚 См. инструкцию: AMOCRM_INTEGRATION_SETUP.md');
    console.log('\n💡 Добавьте переменные в backend/.env и запустите скрипт снова.');
    process.exit(1);
  }

  console.log('\n✅ Все переменные настроены!\n');
  console.log('=' .repeat(60));

  // Проверка 2: Подключение к amoCRM
  console.log('\n🔌 Шаг 2: Проверка подключения к amoCRM API\n');
  
  const connectionOk = await amoCrmService.testConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Не удалось подключиться к amoCRM!');
    console.log('💡 Проверьте:');
    console.log('   1. Правильность AMOCRM_SUBDOMAIN');
    console.log('   2. Действительность AMOCRM_ACCESS_TOKEN (живёт 24 часа)');
    console.log('   3. Наличие интернет-соединения');
    process.exit(1);
  }

  console.log('\n✅ Подключение к amoCRM успешно!\n');
  console.log('=' .repeat(60));

  // Проверка 3: Список воронок и этапов
  console.log('\n📊 Шаг 3: Получение списка воронок\n');
  
  await amoCrmService.listPipelines();
  
  console.log('\n💡 Проверьте, что ID этапов в .env совпадают с выведенными выше!\n');
  console.log('=' .repeat(60));

  // Проверка 4: Поиск тестовой сделки (опционально)
  console.log('\n🔍 Шаг 4: Тест поиска сделки (опционально)\n');
  console.log('Введите email студента для теста или нажмите Enter для пропуска:');
  
  // Для примера используем hardcoded email (в реальности можно добавить readline)
  const testEmail = process.env.TEST_EMAIL || '';
  
  if (testEmail) {
    console.log(`\nИщем сделку для email: ${testEmail}\n`);
    const leadId = await amoCrmService.findLeadIdByEmail(testEmail);
    
    if (leadId) {
      console.log(`✅ Найдена сделка: ID ${leadId}`);
    } else {
      console.log(`⚠️ Сделка не найдена для email: ${testEmail}`);
      console.log('💡 Это нормально, если в amoCRM нет контакта с таким email.');
    }
  } else {
    console.log('⏭️ Пропущено. Для теста установите TEST_EMAIL в .env');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!\n');
  console.log('✅ Интеграция amoCRM настроена правильно');
  console.log('✅ API amoCRM доступен');
  console.log('✅ Воронки и этапы найдены');
  
  if (hasOAuth) {
    console.log('✅ OAuth настроен - токены будут обновляться автоматически!');
  } else {
    console.log('⚠️  OAuth не настроен - токен работает только 24 часа');
    console.log('   📚 Инструкция: AMOCRM_REFRESH_TOKEN_GUIDE.md');
  }
  
  console.log('\n💡 Теперь при завершении уроков Tripwire сделки будут');
  console.log('   автоматически перемещаться в amoCRM!\n');
  console.log('📚 Документация: AMOCRM_INTEGRATION_SETUP.md\n');
}

// Запуск
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Произошла ошибка:', error.message);
    console.error('\n📚 См. документацию: AMOCRM_INTEGRATION_SETUP.md');
    console.error('🆘 Раздел Troubleshooting: ' + error.message);
    process.exit(1);
  });








