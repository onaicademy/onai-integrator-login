/**
 * 🔥 СРОЧНЫЙ СКРИПТ - ОТПРАВКА В ТОПИК
 * 
 * Отправляет тестовое сообщение в конкретный топик группы Telegram
 * 
 * Топик: https://t.me/c/3443946081/7
 * Chat ID: -1003443946081
 * Thread ID: 7
 * 
 * Запуск: npx tsx test-topic-message.ts
 */

import * as dotenv from 'dotenv';
import { join } from 'path';

// Загружаем переменные окружения
dotenv.config({ path: join(process.cwd(), 'backend', 'env.env') });

const BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN || '';
const CHAT_ID = '-1003443946081'; // Из ссылки /c/3443946081
const THREAD_ID = 7; // Из ссылки /7

console.log('🚀 ОТПРАВКА ТЕСТОВОГО СООБЩЕНИЯ В ТОПИК\n');
console.log('📋 Конфигурация:');
console.log(`   Bot Token: ${BOT_TOKEN ? BOT_TOKEN.substring(0, 20) + '...' : '❌ НЕ НАЙДЕН'}`);
console.log(`   Chat ID: ${CHAT_ID}`);
console.log(`   Thread ID (Topic): ${THREAD_ID}\n`);

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_LEADS_BOT_TOKEN не найден!');
  console.error('   Проверь backend/env.env');
  process.exit(1);
}

async function sendToTopic() {
  try {
    // 1️⃣ Проверяем что бот существует
    console.log('🔍 Шаг 1: Проверка бота...');
    const meResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    );
    const meData = await meResponse.json();

    if (!meData.ok) {
      throw new Error(`Ошибка API: ${JSON.stringify(meData)}`);
    }

    console.log(`   ✅ Бот найден: @${meData.result.username}`);
    console.log(`   📝 ID: ${meData.result.id}`);
    console.log(`   🏷️  Имя: ${meData.result.first_name}`);
    console.log(`   📖 Can read all group messages: ${meData.result.can_read_all_group_messages || 'unknown'}\n`);

    // 2️⃣ Отправляем тестовое сообщение в топик
    console.log('📤 Шаг 2: Отправка сообщения в топик...');
    
    const message = 
      `🎯 *ТЕСТОВЫЙ ОТЧЕТ ПО ЛИДАМ*\n\n` +
      `📊 *Статистика за сегодня*\n\n` +
      `✅ *Новые лиды:* 3\n` +
      `👤 Иван Петров - +7 777 123 45 67\n` +
      `👤 Мария Сидорова - +7 777 987 65 43\n` +
      `👤 Алексей Смирнов - +7 777 555 44 33\n\n` +
      `💳 *Способы оплаты:*\n` +
      `   • Kaspi: 2 лида\n` +
      `   • Карта: 1 лид\n\n` +
      `📍 *Источник:* Express Course\n` +
      `⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
      `_Если вы видите это сообщение, бот работает! ✅_`;

    const sendResponse = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          message_thread_id: THREAD_ID, // ⚡ КЛЮЧЕВОЙ ПАРАМЕТР для топиков!
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const sendData = await sendResponse.json();

    if (!sendData.ok) {
      console.error('❌ Ошибка отправки:', JSON.stringify(sendData, null, 2));
      
      // Диагностика ошибок
      if (sendData.description?.includes('chat not found')) {
        console.error('\n⚠️  ПРОБЛЕМА: Чат не найден');
        console.error('   РЕШЕНИЕ:');
        console.error('   1. Убедись что бот добавлен в группу');
        console.error('   2. Убедись что бот НЕ удален из группы');
        console.error('   3. Дай боту права админа или разреши постить сообщения\n');
      } else if (sendData.description?.includes('bot was blocked')) {
        console.error('\n⚠️  ПРОБЛЕМА: Бот заблокирован');
        console.error('   РЕШЕНИЕ: Разблокируй бота в настройках группы\n');
      } else if (sendData.description?.includes('not enough rights')) {
        console.error('\n⚠️  ПРОБЛЕМА: Недостаточно прав');
        console.error('   РЕШЕНИЕ: Дай боту права админа или разреши постить в топики\n');
      } else if (sendData.description?.includes('thread not found')) {
        console.error('\n⚠️  ПРОБЛЕМА: Топик не найден');
        console.error('   РЕШЕНИЕ:');
        console.error('   1. Убедись что топик существует');
        console.error('   2. Проверь что Thread ID = 7 правильный');
        console.error('   3. Топик не был удален/архивирован\n');
      }
      
      process.exit(1);
    }

    console.log('   ✅ СООБЩЕНИЕ ОТПРАВЛЕНО УСПЕШНО! 🎉\n');
    console.log('📋 Детали:');
    console.log(`   Message ID: ${sendData.result.message_id}`);
    console.log(`   Chat ID: ${sendData.result.chat.id}`);
    console.log(`   Thread ID: ${sendData.result.message_thread_id || 'N/A'}`);
    console.log(`   Date: ${new Date(sendData.result.date * 1000).toLocaleString('ru-RU')}\n`);
    
    console.log('🔗 Проверь топик: https://t.me/c/3443946081/7\n');
    console.log('✅ ТЕСТ ПРОЙДЕН! Бот готов к работе!\n');

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 🚀 ЗАПУСК
sendToTopic();
