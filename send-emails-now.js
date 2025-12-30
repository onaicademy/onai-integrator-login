/**
 * 📧 ОТПРАВКА EMAIL ЧЕРЕЗ BACKEND API
 * Использует существующий endpoint /api/tripwire/admin/mass-broadcast
 */

const https = require('https');

const MESSAGE = `Привет!

Хотим сообщить вам важную информацию. 

🔧 Что произошло:
В первые дни запуска платформа испытывала технические сложности из-за большого наплыва учеников. Мы рады такому интересу к курсу!

✅ Что сделано:
Наша команда оперативно устранила все технические проблемы. Сейчас платформа работает стабильно и все функции доступны.

🎓 Что дальше:
Вы можете с комфортом продолжать обучение:
- Смотреть видео-уроки
- Выполнять домашние задания
- Отслеживать свой прогресс

Если у вас возникнут какие-либо вопросы или сложности — пишите в поддержку, мы всегда на связи!

Приятного обучения! 🚀

---
Команда OnAI Academy`;

const SUBJECT = '✅ Технические работы завершены - Платформа работает стабильно';

// Получаем ADMIN_TOKEN из переменных окружения или аргументов
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.argv[2];

if (!ADMIN_TOKEN) {
  console.error('❌ ОШИБКА: Не указан ADMIN_TOKEN!');
  console.error('');
  console.error('📝 Использование:');
  console.error('  ADMIN_TOKEN="ваш_токен" node send-emails-now.js');
  console.error('  или');
  console.error('  node send-emails-now.js "ваш_токен"');
  console.error('');
  console.error('🔑 Получить токен:');
  console.error('  1. Зайди на https://expresscourse.onai.academy/admin');
  console.error('  2. F12 → Application → Local Storage → tripwire_supabase_token');
  console.error('  3. Скопируй значение');
  process.exit(1);
}

const data = JSON.stringify({
  channel: 'email',
  subject: SUBJECT,
  message: MESSAGE,
  testMode: false
});

const options = {
  hostname: 'api.onai.academy',
  port: 443,
  path: '/api/tripwire/admin/mass-broadcast',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${ADMIN_TOKEN}`
  }
};

console.log('📧 МАССОВАЯ РАССЫЛКА EMAIL');
console.log('═══════════════════════════════════════');
console.log('📨 Тема:', SUBJECT);
console.log('🔑 Токен:', ADMIN_TOKEN.substring(0, 20) + '...');
console.log('📤 API:', 'https://api.onai.academy/api/tripwire/admin/mass-broadcast');
console.log('═══════════════════════════════════════');
console.log('');
console.log('📧 Отправка...');
console.log('');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('═══════════════════════════════════════');
    console.log('📊 РЕЗУЛЬТАТ:');
    console.log('═══════════════════════════════════════');
    console.log('Status Code:', res.statusCode);
    console.log('');
    
    try {
      const result = JSON.parse(responseData);
      console.log(JSON.stringify(result, null, 2));
      console.log('');
      
      if (result.success) {
        console.log('✅ УСПЕХ! Email отправлены всем студентам!');
        console.log('');
        console.log('📧 Отправлено:', result.emailsSent || result.emailResults?.sent || 0);
        console.log('📧 Всего получателей:', result.totalRecipients || 0);
        
        if (result.excludedCount) {
          console.log('🚫 Исключено (админы/менеджеры):', result.excludedCount);
        }
      } else {
        console.log('❌ ОШИБКА!');
        console.log('Причина:', result.error || result.message || 'Unknown error');
      }
    } catch (e) {
      console.log('Response:', responseData);
    }
    
    console.log('═══════════════════════════════════════');
  });
});

req.on('error', (error) => {
  console.error('❌ Ошибка запроса:', error.message);
  process.exit(1);
});

req.write(data);
req.end();
