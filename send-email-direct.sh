#!/bin/bash

# 📧 ПРЯМАЯ ОТПРАВКА EMAIL ЧЕРЕЗ BACKEND
# Использует backend на production для отправки через Resend

echo "═══════════════════════════════════════"
echo "📧 ОТПРАВКА EMAIL ЧЕРЕЗ RESEND"
echo "═══════════════════════════════════════"
echo ""

# Проверяем что есть доступ к серверу
if ! ssh -o ConnectTimeout=5 root@onai.academy "echo 'Connected'" 2>/dev/null; then
  echo "❌ Не могу подключиться к серверу onai.academy"
  echo "Проверь SSH доступ"
  exit 1
fi

echo "✅ Подключение к серверу успешно"
echo ""

# Создаём временный скрипт на сервере
echo "📝 Создаю скрипт отправки на сервере..."

ssh root@onai.academy << 'REMOTE_SCRIPT'
cd /var/www/onai-integrator-login-main

# Создаём Node.js скрипт для отправки
cat > /tmp/send-emails.js << 'NODESCRIPT'
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SUPABASE_SERVICE_KEY = process.env.TRIPWIRE_SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

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

const EMAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; }
    .header { background: linear-gradient(135deg, #00FF88 0%, #00cc88 100%); 
              color: white; padding: 30px 20px; border-radius: 8px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .status { background: #f9f9f9; padding: 20px; border-left: 4px solid #00FF88; 
              margin: 20px 0; border-radius: 4px; }
    .status strong { color: #00FF88; display: block; margin-bottom: 8px; }
    .footer { text-align: center; color: #666; margin-top: 40px; padding-top: 20px; 
              border-top: 1px solid #eee; font-size: 14px; }
    .button { display: inline-block; background: #00FF88; color: white !important; 
              padding: 14px 32px; text-decoration: none; border-radius: 6px; 
              margin: 20px 0; font-weight: 600; }
    ul { margin: 10px 0; padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Технические работы завершены</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 16px;">Привет!</p>
      
      <p>Хотим сообщить вам важную информацию.</p>
      
      <div class="status">
        <strong>🔧 Что произошло:</strong>
        В первые дни запуска платформа испытывала технические сложности из-за большого наплыва учеников. Мы рады такому интересу к курсу!
      </div>
      
      <div class="status">
        <strong>✅ Что сделано:</strong>
        Наша команда оперативно устранила все технические проблемы. Сейчас платформа работает стабильно и все функции доступны.
      </div>
      
      <div class="status">
        <strong>🎓 Что дальше:</strong>
        Вы можете с комфортом продолжать обучение:
        <ul>
          <li>Смотреть видео-уроки</li>
          <li>Выполнять домашние задания</li>
          <li>Отслеживать свой прогресс</li>
        </ul>
      </div>
      
      <p>Если у вас возникнут какие-либо вопросы или сложности — пишите в поддержку, мы всегда на связи!</p>
      
      <center>
        <a href="https://expresscourse.onai.academy" class="button">Продолжить обучение</a>
      </center>
      
      <p style="margin-top: 30px; font-size: 16px;">Приятного обучения! 🚀</p>
    </div>
    
    <div class="footer">
      Команда OnAI Academy<br>
      <a href="https://onai.academy" style="color: #00FF88;">onai.academy</a>
    </div>
  </div>
</body>
</html>`;

const SUBJECT = '✅ Технические работы завершены - Платформа работает стабильно';
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

async function sendEmails() {
  console.log('📧 Начинаю отправку email...');
  console.log('');

  // Подключаемся к БД
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SUPABASE_SERVICE_KEY);
  
  // Получаем список студентов
  const { data: students, error } = await supabase
    .from('tripwire_users')
    .select('email, full_name')
    .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`)
    .not('email', 'like', '%test%');

  if (error) {
    console.error('❌ Ошибка получения студентов:', error);
    process.exit(1);
  }

  console.log(`✅ Найдено студентов: ${students.length}`);
  console.log('');

  // Инициализируем Resend
  const resend = new Resend(RESEND_API_KEY);

  let sent = 0;
  let failed = 0;
  const errors = [];

  // Отправляем письма
  for (const student of students) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: student.email,
        subject: SUBJECT,
        text: MESSAGE,
        html: EMAIL_HTML,
      });

      console.log(`✅ [${sent + 1}/${students.length}] ${student.email}`);
      sent++;

      // Задержка 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ [${sent + failed + 1}/${students.length}] ${student.email}: ${error.message}`);
      failed++;
      errors.push({ email: student.email, error: error.message });
    }
  }

  // Итоги
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('📊 ИТОГИ:');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Успешно: ${sent}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📧 Всего: ${students.length}`);
  console.log('═══════════════════════════════════════');

  if (errors.length > 0) {
    console.log('');
    console.log('❌ ОШИБКИ:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.email}: ${err.error}`);
    });
  }
}

sendEmails()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
NODESCRIPT

echo "✅ Скрипт создан"
echo ""
echo "📧 Запускаю отправку..."
echo ""

# Загружаем переменные окружения и запускаем
cd /var/www/onai-integrator-login-main/backend
source /root/.bashrc 2>/dev/null || true
export $(cat .env | grep -v '^#' | xargs)

# Запускаем с Node.js
node /tmp/send-emails.js

# Удаляем временный файл
rm /tmp/send-emails.js

echo ""
echo "🎉 Готово!"
REMOTE_SCRIPT

echo ""
echo "═══════════════════════════════════════"
echo "✅ ОТПРАВКА ЗАВЕРШЕНА!"
echo "═══════════════════════════════════════"
