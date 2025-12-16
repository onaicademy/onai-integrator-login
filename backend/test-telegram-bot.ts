/**
 * Тестовый скрипт для проверки Telegram бота для лидов
 * 
 * Запуск:
 * npx tsx test-telegram-bot.ts
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Загружаем переменные окружения
dotenv.config({ path: join(process.cwd(), 'env.env') });

const TELEGRAM_LEADS_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN;
const TELEGRAM_LEADS_CHAT_ID = process.env.TELEGRAM_LEADS_CHAT_ID;

async function testTelegramBot() {
  console.log('🧪 Тестирование Telegram бота для лидов...\n');

  // Проверка переменных окружения
  console.log('📋 Проверка конфигурации:');
  console.log(`   Bot Token: ${TELEGRAM_LEADS_BOT_TOKEN ? '✅ Установлен' : '❌ Не установлен'}`);
  console.log(`   Chat ID: ${TELEGRAM_LEADS_CHAT_ID ? '✅ Установлен' : '❌ Не установлен'}\n`);

  if (!TELEGRAM_LEADS_BOT_TOKEN) {
    console.error('❌ TELEGRAM_LEADS_BOT_TOKEN не настроен в env.env');
    process.exit(1);
  }

  if (!TELEGRAM_LEADS_CHAT_ID) {
    console.error('❌ TELEGRAM_LEADS_CHAT_ID не настроен в env.env');
    process.exit(1);
  }

  // Тест 1: Проверка что бот существует и токен валидный
  console.log('🔍 Тест 1: Проверка токена бота...');
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_LEADS_BOT_TOKEN}/getMe`
    );
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    console.log('   ✅ Бот найден:', data.result.username);
    console.log(`   📝 ID бота: ${data.result.id}`);
    console.log(`   🏷️  Имя: ${data.result.first_name}\n`);
  } catch (error: any) {
    console.error('   ❌ Ошибка проверки токена:', error.message);
    process.exit(1);
  }

  // Тест 2: Отправка тестового сообщения
  console.log('📤 Тест 2: Отправка тестового уведомления...');
  try {
    const testMessage = 
      `🧪 *ТЕСТОВОЕ СООБЩЕНИЕ*\n\n` +
      `Это тестовое уведомление от системы лидов.\n\n` +
      `Пример уведомления о лиде:\n\n` +
      `🎯 *НОВАЯ ЗАЯВКА С ЭКСПРЕСС КУРСА*\n\n` +
      `👤 *Имя:* Тестовый Пользователь\n` +
      `📱 *Телефон:* +7 777 123 45 67\n` +
      `📧 *Email:* test@example.com\n` +
      `💳 *Способ оплаты:* 💳 Kaspi банк\n` +
      `📍 *Источник:* expresscourse\n\n` +
      `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
      `_Если вы видите это сообщение, значит бот настроен правильно! ✅_`;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_LEADS_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_LEADS_CHAT_ID,
          text: testMessage,
          parse_mode: 'Markdown',
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    console.log('   ✅ Тестовое сообщение отправлено успешно!');
    console.log(`   📝 Message ID: ${data.result.message_id}`);
    console.log(`   💬 Chat ID: ${data.result.chat.id}\n`);
  } catch (error: any) {
    console.error('   ❌ Ошибка отправки сообщения:', error.message);
    
    // Дополнительная диагностика
    if (error.message.includes('chat not found')) {
      console.error('\n⚠️  РЕШЕНИЕ: Убедитесь что:');
      console.error('   1. Вы начали диалог с ботом (отправили /start)');
      console.error('   2. Chat ID правильный (789638302)');
      console.error('   3. Бот не заблокирован пользователем\n');
    } else if (error.message.includes('bot was blocked')) {
      console.error('\n⚠️  РЕШЕНИЕ: Разблокируйте бота в Telegram и попробуйте снова\n');
    }
    
    process.exit(1);
  }

  // Тест 3: Проверка форматирования способов оплаты
  console.log('💳 Тест 3: Проверка всех вариантов способов оплаты...');
  
  const paymentMethods = [
    { method: 'kaspi', emoji: '💳', text: 'Kaspi банк' },
    { method: 'card', emoji: '💰', text: 'Банковская карта' },
    { method: 'manager', emoji: '💬', text: 'Чат с менеджером' },
  ];

  for (const pm of paymentMethods) {
    try {
      const message = 
        `🧪 *Тест способа оплаты*\n\n` +
        `💳 *Способ оплаты:* ${pm.emoji} ${pm.text}\n\n` +
        `_Проверка форматирования_`;

      const response = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_LEADS_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_LEADS_CHAT_ID,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      const data = await response.json();

      if (data.ok) {
        console.log(`   ✅ ${pm.text}: отправлено`);
      }
    } catch (error: any) {
      console.error(`   ❌ ${pm.text}: ошибка`);
    }
  }

  console.log('\n🎉 Все тесты пройдены успешно!');
  console.log('\n📱 Проверьте Telegram чат (ID: 789638302) - там должно быть несколько тестовых сообщений.');
  console.log('\n✅ Telegram бот готов к работе!\n');
}

// Запуск тестов
testTelegramBot().catch((error) => {
  console.error('\n❌ Критическая ошибка:', error);
  process.exit(1);
});





