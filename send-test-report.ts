/**
 * 🎯 ОТПРАВКА ТЕСТОВОГО ОТЧЕТА В ТОПИК "ОТЧЕТЫ"
 * 
 * Бот: @targetcheckingonai_bot
 * Топик: https://t.me/c/3443946081/7
 * 
 * Запуск: npx tsx send-test-report.ts
 */

const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I'; // @targetcheckingonai_bot

console.log('🎯 ОТПРАВКА ТЕСТОВОГО ОТЧЕТА\n');

async function sendTestReport() {
  try {
    // Сначала получим Chat ID из последних обновлений
    console.log('🔍 Получаю Chat ID из обновлений...');
    
    const updatesRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    );
    const updatesData = await updatesRes.json();
    
    if (!updatesData.ok || updatesData.result.length === 0) {
      console.error('❌ Нет обновлений. Бот не получал сообщений.');
      console.log('\n💡 Зайди в топик и напиши /start, потом запусти снова');
      process.exit(1);
    }
    
    // Ищем последнее сообщение из топика
    const topicMsg = updatesData.result
      .reverse()
      .find((u: any) => u.message?.message_thread_id);
    
    if (!topicMsg) {
      console.error('❌ Не найдено сообщений из топика');
      console.log('\n💡 Зайди в топик "Отчеты" и напиши /start');
      process.exit(1);
    }
    
    const chatId = topicMsg.message.chat.id;
    const threadId = topicMsg.message.message_thread_id;
    
    console.log(`✅ Chat ID: ${chatId}`);
    console.log(`✅ Thread ID: ${threadId}\n`);
    
    // Отправляем краткий отчет
    console.log('📤 Отправляю тестовый отчет...\n');
    
    const report = 
      `📊 *КРАТКИЙ ТЕСТОВЫЙ ОТЧЕТ ПО ЛИДАМ*\n\n` +
      `⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
      `✅ *Новые лиды за сегодня:* 3\n\n` +
      `👤 *Лид #1*\n` +
      `   Имя: Иван Петров\n` +
      `   Телефон: +7 777 123 45 67\n` +
      `   Email: ivan@example.com\n` +
      `   💳 Kaspi банк\n\n` +
      `👤 *Лид #2*\n` +
      `   Имя: Мария Сидорова\n` +
      `   Телефон: +7 777 987 65 43\n` +
      `   Email: maria@example.com\n` +
      `   💰 Банковская карта\n\n` +
      `👤 *Лид #3*\n` +
      `   Имя: Алексей Смирнов\n` +
      `   Телефон: +7 777 555 44 33\n` +
      `   Email: alex@example.com\n` +
      `   💬 Чат с менеджером\n\n` +
      `📍 *Источник:* Express Course\n\n` +
      `_Это тестовое сообщение ✅_`;
    
    const sendRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_thread_id: threadId,
          text: report,
          parse_mode: 'Markdown',
        }),
      }
    );
    
    const sendData = await sendRes.json();
    
    if (!sendData.ok) {
      console.error('❌ Ошибка отправки:', JSON.stringify(sendData, null, 2));
      process.exit(1);
    }
    
    console.log('✅ ОТЧЕТ ОТПРАВЛЕН УСПЕШНО! 🎉\n');
    console.log(`📝 Message ID: ${sendData.result.message_id}`);
    console.log(`💬 Chat ID: ${sendData.result.chat.id}`);
    console.log(`🔗 Thread ID: ${sendData.result.message_thread_id}\n`);
    console.log('🔗 Проверь топик: https://t.me/c/3443946081/7\n');
    
    // Проверка @leadonai_express_bot
    console.log('=' .repeat(50));
    console.log('\n🔍 ПРОВЕРКА @leadonai_express_bot...\n');
    
    const LEADS_BOT_TOKEN = '8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ';
    
    const leadsRes = await fetch(
      `https://api.telegram.org/bot${LEADS_BOT_TOKEN}/getMe`
    );
    const leadsData = await leadsRes.json();
    
    if (leadsData.ok) {
      console.log(`✅ @${leadsData.result.username} - РАБОТАЕТ НОРМАЛЬНО!`);
      console.log(`   ID: ${leadsData.result.id}`);
      console.log(`   Имя: ${leadsData.result.first_name}`);
      console.log('\n✅ Бот для лидов НЕ сломан! Все ОК!\n');
    } else {
      console.error('❌ Проблема с @leadonai_express_bot');
    }
    
    console.log('=' .repeat(50));
    console.log('\n🎉 ВСЕ ГОТОВО!\n');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

sendTestReport();

