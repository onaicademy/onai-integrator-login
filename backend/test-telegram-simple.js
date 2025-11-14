// Простейший тест Telegram Bot
const https = require('https');

const BOT_TOKEN = '8400927507:AAF1w1H8lyE2vonPY-Z61vBybBT8dkN-Ip4';
const CHAT_ID = 789638302;

const report = `🤖 AI-Analyst Report

📊 Статистика платформы:
• Всего студентов: 12
• Активных за неделю: 8
• Завершено уроков: 45
• Средний прогресс: 67%

⚠️ Требуют внимания:
• Test Acc - новый студент

✅ Лидеры недели:
• Saint - 850 XP

Отчёт сгенерирован: ${new Date().toLocaleString('ru-RU')}`;

const data = JSON.stringify({
  chat_id: CHAT_ID,
  text: report
});

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${BOT_TOKEN}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

console.log('Sending:', data);

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();

