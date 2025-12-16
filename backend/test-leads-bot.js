/**
 * Тест Telegram Leads Bot - проверка что бот запускается и работает
 */

require('dotenv').config({ path: './env.env' });
const TelegramBot = require('node-telegram-bot-api');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🤖 ТЕСТ TELEGRAM LEADS BOT');
console.log('═══════════════════════════════════════════════════════════════\n');

// Проверяем токен
const LEADS_BOT_TOKEN = process.env.TELEGRAM_LEADS_BOT_TOKEN;
const NODE_ENV = process.env.NODE_ENV || 'development';
const BACKEND_URL = process.env.BACKEND_URL;

console.log('📋 Конфигурация:');
console.log('   NODE_ENV:', NODE_ENV);
console.log('   BACKEND_URL:', BACKEND_URL || 'не установлен');
console.log('   TELEGRAM_LEADS_BOT_TOKEN:', LEADS_BOT_TOKEN ? `${LEADS_BOT_TOKEN.substring(0, 20)}...` : 'НЕ НАЙДЕН');
console.log('');

if (!LEADS_BOT_TOKEN) {
  console.error('❌ TELEGRAM_LEADS_BOT_TOKEN не найден в env.env!');
  console.error('   Проверь что файл backend/env.env содержит:');
  console.error('   TELEGRAM_LEADS_BOT_TOKEN=8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ');
  process.exit(1);
}

console.log('✅ Токен найден! Запускаю бота...\n');

// Создаем бота в polling режиме (для теста)
const bot = new TelegramBot(LEADS_BOT_TOKEN, { 
  polling: {
    params: {
      allowed_updates: ['message', 'my_chat_member']
    }
  }
});

console.log('🚀 Бот запущен в POLLING режиме (тестовый)');
console.log('');

// Получаем информацию о боте
bot.getMe().then((botInfo) => {
  console.log('✅ Бот подключен успешно!');
  console.log('   Username:', '@' + botInfo.username);
  console.log('   Bot ID:', botInfo.id);
  console.log('   Name:', botInfo.first_name);
  console.log('');
  console.log('📝 Инструкция:');
  console.log('   1. Добавь бота @' + botInfo.username + ' в свою группу');
  console.log('   2. Сделай бота администратором');
  console.log('   3. Отправь в группу: 2134');
  console.log('   4. Бот должен ответить подтверждением');
  console.log('');
  console.log('💡 Бот будет слушать сообщения...');
  console.log('   Отправь "2134" в группе чтобы проверить!');
  console.log('');
  console.log('⏸️  Нажми Ctrl+C чтобы остановить тест');
  console.log('');
}).catch((error) => {
  console.error('❌ Ошибка подключения к Telegram API:');
  console.error('   ', error.message);
  console.error('');
  console.error('💡 Возможные причины:');
  console.error('   1. Неправильный токен бота');
  console.error('   2. Нет интернет-соединения');
  console.error('   3. Telegram API недоступен');
  process.exit(1);
});

// Обработчик сообщений
bot.on('message', (msg) => {
  console.log(`📨 Получено сообщение от ${msg.from?.first_name || 'Unknown'}:`);
  console.log(`   Chat ID: ${msg.chat.id}`);
  console.log(`   Chat type: ${msg.chat.type}`);
  console.log(`   Text: ${msg.text}`);
  console.log('');

  // Проверяем код активации
  if (msg.text && msg.text.trim() === '2134') {
    console.log('🔥 КОД АКТИВАЦИИ ОБНАРУЖЕН!');
    console.log('   Группа:', msg.chat.title || 'Без названия');
    console.log('   Chat ID:', msg.chat.id);
    console.log('');

    // Отправляем подтверждение
    bot.sendMessage(
      msg.chat.id,
      '✅ <b>ТЕСТОВЫЙ РЕЖИМ - БОТ РАБОТАЕТ!</b>\n\n' +
      `📍 <b>Chat ID:</b> <code>${msg.chat.id}</code>\n` +
      `🏷️ <b>Группа:</b> ${msg.chat.title || 'Без названия'}\n\n` +
      'Код активации распознан! Бот работает корректно! 🚀\n\n' +
      '<i>Теперь запусти backend и попробуй снова</i>',
      { parse_mode: 'HTML' }
    ).then(() => {
      console.log('✅ Тестовое сообщение отправлено в группу!');
      console.log('');
      console.log('🎉 ТЕСТ ПРОЙДЕН! Бот работает!');
      console.log('   Теперь запусти backend: npm run dev');
      console.log('');
    }).catch((err) => {
      console.error('❌ Ошибка отправки сообщения:', err.message);
    });
  }
});

// Обработчик добавления в группу
bot.on('my_chat_member', (update) => {
  const chat = update.chat;
  const newStatus = update.new_chat_member.status;
  const oldStatus = update.old_chat_member.status;

  console.log(`🔄 Изменение статуса бота в группе "${chat.title || 'Unknown'}"`);
  console.log(`   Chat ID: ${chat.id}`);
  console.log(`   Статус: ${oldStatus} → ${newStatus}`);
  console.log('');

  if (newStatus === 'administrator') {
    console.log('✅ Бот добавлен как администратор!');
    console.log('   Теперь отправь код "2134" в группе');
    console.log('');

    bot.sendMessage(
      chat.id,
      '👋 <b>Привет! Я тестовый режим бота!</b>\n\n' +
      'Отправь код <code>2134</code> чтобы проверить что я работаю! 🚀',
      { parse_mode: 'HTML' }
    ).catch((err) => {
      console.error('❌ Не могу отправить сообщение:', err.message);
    });
  }
});

// Обработчик ошибок
bot.on('polling_error', (error) => {
  console.error('⚠️  Polling error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Остановка бота...');
  bot.stopPolling();
  setTimeout(() => {
    console.log('✅ Бот остановлен');
    process.exit(0);
  }, 1000);
});
