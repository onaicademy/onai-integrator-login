// =====================================================
// TEST AI-ANALYST BOT - Отправка отчёта администратору
// =====================================================

const https = require('https');

const BOT_TOKEN = '8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4';
const ADMIN_CHAT_ID = 789638302;

// Тестовый отчёт (plain text без Markdown)
const report = `🤖 AI-Analyst Report

📊 Статистика платформы:
• Всего студентов: 12
• Активных за неделю: 8
• Завершено уроков: 45
• Средний прогресс: 67%

⚠️ Требуют внимания:
• Test Acc - новый студент, требуется мониторинг

✅ Лидеры недели:
• Saint - 850 XP заработано

Отчёт сгенерирован: ${new Date().toLocaleString('ru-RU')}`;

function sendTelegramMessage(chatId, text) {
  return new Promise((resolve, reject) => {
    console.log('📝 Text to send:', text);
    console.log('📝 Text length:', text.length);
    
    const data = JSON.stringify({
      chat_id: chatId,
      text: text
    });
    
    console.log('📦 JSON data:', data);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Сообщение отправлено!');
          console.log('Response:', JSON.parse(body));
          resolve(JSON.parse(body));
        } else {
          console.error('❌ Ошибка отправки:', res.statusCode);
          console.error('Response:', body);
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Network error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Запуск теста
console.log('🚀 Отправляем тестовый отчёт...');
console.log('Bot Token:', BOT_TOKEN.substring(0, 20) + '...');
console.log('Admin Chat ID:', ADMIN_CHAT_ID);
console.log('');

sendTelegramMessage(ADMIN_CHAT_ID, report)
  .then(() => {
    console.log('\n✅ УСПЕХ! Проверь Telegram!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  });

