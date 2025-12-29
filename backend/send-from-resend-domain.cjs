#!/usr/bin/env node

/**
 * 📧 ОТПРАВКА С ТЕСТОВОГО ДОМЕНА RESEND
 * Использует onboarding@resend.dev (верифицированный домен Resend)
 */

require('dotenv').config({ path: './env.env' });
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

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

// ⚠️ ИСПОЛЬЗУЕМ ТЕСТОВЫЙ ДОМЕН RESEND (100% доставка)
const FROM_EMAIL = 'onboarding@resend.dev';

const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

async function sendEmails() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📧 ОТПРАВКА EMAIL С ТЕСТОВОГО ДОМЕНА RESEND');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  ВНИМАНИЕ: Используется onboarding@resend.dev');
  console.log('   Это тестовый домен Resend - письма точно дойдут!');
  console.log('');

  if (!process.env.TRIPWIRE_SUPABASE_URL || !process.env.TRIPWIRE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials не найдены');
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден');
    process.exit(1);
  }

  console.log('✅ Credentials загружены');
  console.log('');

  // Подключаемся к Supabase
  const supabase = createClient(
    process.env.TRIPWIRE_SUPABASE_URL,
    process.env.TRIPWIRE_SERVICE_ROLE_KEY
  );

  console.log('📊 Получаю список студентов...');
  
  const { data: students, error } = await supabase
    .from('tripwire_users')
    .select('email, full_name')
    .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`)
    .not('email', 'like', '%test%');

  if (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }

  console.log(`✅ Найдено: ${students.length} студентов`);
  console.log('');
  console.log(`📤 FROM: ${FROM_EMAIL}`);
  console.log(`📨 SUBJECT: ${SUBJECT}`);
  console.log('');
  console.log('📧 Начинаю отправку...');
  console.log('');

  const resend = new Resend(process.env.RESEND_API_KEY);

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const student of students) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: student.email,
        subject: SUBJECT,
        text: MESSAGE,
        html: EMAIL_HTML,
        reply_to: 'support@onai.academy'
      });

      console.log(`✅ [${sent + 1}/${students.length}] ${student.email} (ID: ${result.data?.id})`);
      sent++;

      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ [${sent + failed + 1}/${students.length}] ${student.email}: ${error.message}`);
      failed++;
      errors.push({ email: student.email, error: error.message });
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 ИТОГИ:');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Успешно: ${sent}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📧 Всего: ${students.length}`);
  console.log(`📤 FROM: ${FROM_EMAIL}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (errors.length > 0) {
    console.log('');
    console.log('❌ ОШИБКИ:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.email}: ${err.error}`);
    });
  }

  console.log('');
  if (sent === students.length) {
    console.log('🎉 ВСЕ ПИСЬМА ОТПРАВЛЕНЫ!');
    console.log('');
    console.log('⚠️  ВАЖНО: Письма отправлены с onboarding@resend.dev');
    console.log('   Они точно дойдут, но от имени Resend, а не OnAI Academy');
    console.log('');
    console.log('💡 Чтобы отправлять от onai.academy:');
    console.log('   1. Зайди в Resend → Domains');
    console.log('   2. Верифицируй домен onai.academy');
    console.log('   3. Добавь DNS записи (DKIM, SPF)');
    console.log('   4. После верификации используй notifications@onai.academy');
  }
  console.log('');
}

sendEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
  });
