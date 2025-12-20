/**
 * 🧪 ТЕСТ WHAPI ИНТЕГРАЦИИ
 * Проверка работы WhatsApp рассылки
 */

import * as dotenv from 'dotenv';
import { join } from 'path';
import { sendWhatsAppMessage, checkWhapiStatus } from './src/services/whapiService';

dotenv.config({ path: join(__dirname, 'env.env') });

console.log('\n🧪 ====== ТЕСТ WHAPI ИНТЕГРАЦИИ ======\n');

async function testWhapi() {
  try {
    // 1️⃣ Проверка переменных окружения
    console.log('1️⃣ Проверка переменных окружения...');
    const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
    const WHAPI_API_URL = process.env.WHAPI_API_URL;
    
    if (!WHAPI_TOKEN) {
      console.error('❌ WHAPI_TOKEN не найден в env.env');
      process.exit(1);
    }
    
    console.log(`✅ WHAPI_API_URL: ${WHAPI_API_URL}`);
    console.log(`✅ WHAPI_TOKEN: ${WHAPI_TOKEN.substring(0, 10)}...`);
    
    // 2️⃣ Проверка доступности API
    console.log('\n2️⃣ Проверка доступности Whapi API...');
    const isAvailable = await checkWhapiStatus();
    
    if (!isAvailable) {
      console.error('❌ Whapi API недоступен');
      console.log('\n💡 Проверь:');
      console.log('   1. Токен валиден?');
      console.log('   2. Канал активен на https://panel.whapi.cloud?');
      console.log('   3. Интернет подключение работает?');
      process.exit(1);
    }
    
    console.log('✅ Whapi API доступен');
    
    // 3️⃣ Тестовая отправка (ОПЦИОНАЛЬНО)
    console.log('\n3️⃣ Тестовая отправка...');
    console.log('⚠️  Для тестовой отправки раскомментируй код ниже');
    console.log('    и укажи свой номер телефона\n');
    
    /*
    // РАСКОММЕНТИРУЙ ДЛЯ ТЕСТА:
    
    const testPhone = '+77001234567'; // 👈 УКАЖИ СВОЙ НОМЕР
    const testMessage = `Привет! 👋
Это тестовое сообщение от Tripwire.
Если получил это - значит всё работает! 🚀`;
    
    console.log(`📱 Отправка на ${testPhone}...`);
    
    const result = await sendWhatsAppMessage({
      phone: testPhone,
      message: testMessage,
    });
    
    if (result.sent) {
      console.log('✅ Тестовое сообщение отправлено!');
      console.log(`   Message ID: ${result.id}`);
    } else {
      console.error('❌ Ошибка отправки:', result.error);
    }
    */
    
    // 4️⃣ Итоги
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГИ ТЕСТА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Переменные окружения: OK');
    console.log('✅ Whapi API доступен: OK');
    console.log('⚠️  Тестовая отправка: ПРОПУЩЕНА (раскомментируй код)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('🎉 Система готова к работе!');
    console.log('\n📋 Следующие шаги:');
    console.log('   1. Зайди в админку: /tripwire/admin/mass-broadcast');
    console.log('   2. Нажми "Синхронизировать"');
    console.log('   3. Составь сообщение (см. WHATSAPP_MESSAGE_TEMPLATES.md)');
    console.log('   4. Отправь рассылку!\n');
    
  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testWhapi();


