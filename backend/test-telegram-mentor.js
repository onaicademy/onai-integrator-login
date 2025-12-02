// AI-MENTOR BOT TEST - Мотивационное сообщение студенту
const https = require('https');

const BOT_TOKEN = '8380600260:AAGtuSG9GqFOmkyThhWqRzilHi3gKdKiOSo';
const CHAT_ID = 789638302; // Твой Telegram ID для теста

const motivationMessage = `🎯 Привет, Saint!

Заметил что ты активно изучаешь курс "Интегратор 2.0"! 

✨ Ты уже прошёл 67% материала - это отличный результат!

📚 Следующий урок: "Webhooks и автоматизация"
Это будет особенно интересно, ведь ты сможешь автоматизировать рутинные задачи!

💪 Продолжай в том же духе! Ты на правильном пути к мастерству!

—
🤖 AI-Mentor, onAI Academy`;

const data = JSON.stringify({
  chat_id: CHAT_ID,
  text: motivationMessage
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

console.log('Sending AI-Mentor message...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('✅ AI-Mentor message sent!');
      const response = JSON.parse(body);
      console.log('Message ID:', response.result.message_id);
    } else {
      console.log('❌ Error:', body);
    }
  });
});

req.on('error', (e) => console.error('Error:', e));
req.write(data);
req.end();

