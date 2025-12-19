/**
 * 🎯 ПРЯМАЯ ОТПРАВКА ОТЧЕТА В ТОПИК
 * 
 * Используем Chat ID из ссылки: https://t.me/c/3443946081/7
 * Chat ID: -1003443946081 (добавляем -100)
 * Thread ID: 7
 */

const BOT_TOKEN = '8560431175:AAF_ZYiQqPAVruJoqASd-HQ0uXohRZd6h9I'; // @targetcheckingonai_bot
const CHAT_ID = -1003443946081; // Из ссылки /c/3443946081
const THREAD_ID = 7; // Из ссылки /7

console.log('🎯 ОТПРАВКА ТЕСТОВОГО ОТЧЕТА\n');
console.log(`   Chat ID: ${CHAT_ID}`);
console.log(`   Thread ID: ${THREAD_ID}\n`);

async function sendReport() {
  try {
    // 1. Проверяем бот
    console.log('🔍 Проверка @targetcheckingonai_bot...');
    const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const meData = await meRes.json();
    
    if (!meData.ok) {
      throw new Error('Бот не найден');
    }
    
    console.log(`✅ Бот: @${meData.result.username}\n`);
    
    // 2. Отправляем отчет
    console.log('📤 Отправляю отчет...\n');
    
    const report = 
      `📊 *ТЕСТОВЫЙ ОТЧЕТ ПО ЛИДАМ*\n\n` +
      `⏰ ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n` +
      `✅ *Новые заявки: 3*\n\n` +
      `👤 Иван Петров - +7 777 123 45 67 - 💳 Kaspi\n` +
      `👤 Мария Сидорова - +7 777 987 65 43 - 💰 Карта\n` +
      `👤 Алексей Смирнов - +7 777 555 44 33 - 💬 Менеджер\n\n` +
      `📍 *Источник:* Express Course\n\n` +
      `_Тестовое сообщение ✅_`;
    
    const sendRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          message_thread_id: THREAD_ID,
          text: report,
          parse_mode: 'Markdown',
        }),
      }
    );
    
    const sendData = await sendRes.json();
    
    if (!sendData.ok) {
      console.error('❌ Ошибка:', JSON.stringify(sendData, null, 2));
      
      if (sendData.description?.includes('chat not found')) {
        console.log('\n⚠️  Бот не в группе или Chat ID неверный');
        console.log('   Проверь что бот добавлен в группу');
      }
      
      process.exit(1);
    }
    
    console.log('✅ ОТЧЕТ ОТПРАВЛЕН! 🎉\n');
    console.log(`   Message ID: ${sendData.result.message_id}`);
    console.log(`   Chat: ${sendData.result.chat.title || 'N/A'}`);
    console.log(`   Thread ID: ${sendData.result.message_thread_id}\n`);
    
    // 3. Проверяем @leadonai_express_bot
    console.log('=' .repeat(50));
    console.log('\n🔍 Проверка @leadonai_express_bot...\n');
    
    const LEADS_TOKEN = '8275130868:AAGiH466WmyoUQUKN4VfwI3nM1qZAmlUJOQ';
    const leadsRes = await fetch(`https://api.telegram.org/bot${LEADS_TOKEN}/getMe`);
    const leadsData = await leadsRes.json();
    
    if (leadsData.ok) {
      console.log(`✅ @${leadsData.result.username} - РАБОТАЕТ!`);
      console.log(`   Бот для лидов НЕ сломан!\n`);
    }
    
    console.log('=' .repeat(50));
    console.log('\n🎉 ВСЕ ГОТОВО!\n');
    
  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

sendReport();

