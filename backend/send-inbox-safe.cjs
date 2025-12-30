#!/usr/bin/env node

/**
 * 📧 ОТПРАВКА EMAIL С МАКСИМАЛЬНОЙ DELIVERABILITY
 * - Без эмодзи в теме (Gmail/Outlook фильтры)
 * - С Unsubscribe header (обязательно для массовых рассылок)
 * - С правильным Reply-To
 * - Более нейтральное содержание
 */

require('dotenv').config({ path: './env.env' });
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// ✅ БЕЗ ЭМОДЗИ - Gmail/Outlook не любят эмодзи в Subject
const SUBJECT = 'Обновление платформы OnAI Academy - Все работает стабильно';

const MESSAGE = `Здравствуйте!

Уведомляем вас о важном обновлении.

Что произошло:
В первые дни запуска платформа испытывала технические сложности из-за большого количества новых учеников. Мы благодарны за ваш интерес к курсу!

Что сделано:
Наша команда оперативно устранила все технические проблемы. Сейчас платформа работает стабильно и все функции полностью доступны.

Вы можете продолжать обучение:
- Просмотр видео-уроков
- Выполнение домашних заданий
- Отслеживание прогресса

При возникновении вопросов обращайтесь в службу поддержки - мы всегда на связи.

Успешного обучения!

---
С уважением,
Команда OnAI Academy
https://onai.academy

Чтобы отписаться от рассылки, напишите на support@onai.academy`;

// ✅ ПРОФЕССИОНАЛЬНЫЙ HTML БЕЗ ГРАДИЕНТОВ (меньше шансов попасть в спам)
const EMAIL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6; 
      color: #333; 
      background: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 20px auto; 
      padding: 0;
      background: white;
      border: 1px solid #ddd;
    }
    .header { 
      background: #00cc88;
      color: white; 
      padding: 30px 20px;
      text-align: center;
      border-bottom: 4px solid #00a36e;
    }
    .header h1 { 
      margin: 0; 
      font-size: 24px;
      font-weight: 600;
    }
    .content { 
      padding: 40px 30px;
      background: white;
    }
    .content p {
      margin: 16px 0;
      font-size: 16px;
    }
    .section { 
      background: #f9f9f9; 
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #00cc88;
    }
    .section-title {
      font-weight: 600;
      color: #00a36e;
      margin: 0 0 12px 0;
      font-size: 17px;
    }
    .list {
      margin: 12px 0;
      padding-left: 0;
      list-style: none;
    }
    .list li {
      margin: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    .list li:before {
      content: "•";
      position: absolute;
      left: 8px;
      color: #00cc88;
      font-weight: bold;
    }
    .button { 
      display: inline-block;
      background: #00cc88;
      color: white !important;
      padding: 14px 32px;
      text-decoration: none;
      border-radius: 4px;
      margin: 24px 0;
      font-weight: 600;
      text-align: center;
    }
    .button:hover {
      background: #00a36e;
    }
    .footer { 
      text-align: center;
      color: #666;
      margin-top: 40px;
      padding: 30px 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      background: #fafafa;
    }
    .footer a {
      color: #00cc88;
      text-decoration: none;
    }
    .unsubscribe {
      margin-top: 20px;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Обновление платформы OnAI Academy</h1>
    </div>
    
    <div class="content">
      <p>Здравствуйте!</p>
      
      <p>Уведомляем вас о важном обновлении.</p>
      
      <div class="section">
        <div class="section-title">Что произошло:</div>
        <p>В первые дни запуска платформа испытывала технические сложности из-за большого количества новых учеников. Мы благодарны за ваш интерес к курсу!</p>
      </div>
      
      <div class="section">
        <div class="section-title">Что сделано:</div>
        <p>Наша команда оперативно устранила все технические проблемы. Сейчас платформа работает стабильно и все функции полностью доступны.</p>
      </div>
      
      <div class="section">
        <div class="section-title">Вы можете продолжать обучение:</div>
        <ul class="list">
          <li>Просмотр видео-уроков</li>
          <li>Выполнение домашних заданий</li>
          <li>Отслеживание прогресса</li>
        </ul>
      </div>
      
      <p>При возникновении вопросов обращайтесь в службу поддержки - мы всегда на связи.</p>
      
      <center>
        <a href="https://expresscourse.onai.academy" class="button">Продолжить обучение</a>
      </center>
      
      <p style="margin-top: 30px;">Успешного обучения!</p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;">
        <strong>Команда OnAI Academy</strong>
      </p>
      <p style="margin: 0 0 10px 0;">
        <a href="https://onai.academy">onai.academy</a>
      </p>
      <p style="margin: 0 0 10px 0;">
        <a href="mailto:support@onai.academy">support@onai.academy</a>
      </p>
      <div class="unsubscribe">
        <p>Чтобы отписаться от рассылки, напишите на support@onai.academy</p>
      </div>
    </div>
  </div>
</body>
</html>`;

// ✅ ИСПОЛЬЗУЕМ ВЕРИФИЦИРОВАННЫЙ ДОМЕН onai.academy
const FROM_EMAIL = 'OnAI Academy <notifications@onai.academy>';
const REPLY_TO = 'support@onai.academy';

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
  console.log('📧 ОТПРАВКА С МАКСИМАЛЬНОЙ DELIVERABILITY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('✅ Использую verified домен: notifications@onai.academy');
  console.log('✅ Тема БЕЗ эмодзи (Gmail/Outlook friendly)');
  console.log('✅ Unsubscribe ссылка добавлена');
  console.log('✅ Reply-To: support@onai.academy');
  console.log('');

  if (!process.env.TRIPWIRE_SUPABASE_URL || !process.env.TRIPWIRE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase credentials не найдены');
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден');
    process.exit(1);
  }

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
        reply_to: REPLY_TO,
        headers: {
          'X-Entity-Ref-ID': `student-${student.email}`,
          'List-Unsubscribe': `<mailto:support@onai.academy?subject=Unsubscribe>`,
        }
      });

      console.log(`✅ [${sent + 1}/${students.length}] ${student.email}`);
      sent++;

      await new Promise(resolve => setTimeout(resolve, 200));
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
  console.log(`📧 REPLY-TO: ${REPLY_TO}`);
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
    console.log('✅ Улучшения для INBOX доставки:');
    console.log('   - Тема без эмодзи');
    console.log('   - Unsubscribe header');
    console.log('   - Профессиональный HTML');
    console.log('   - Verified domain (onai.academy)');
    console.log('   - Reply-To настроен');
    console.log('');
    console.log('🔍 Проверь INBOX (не СПАМ) через 1-2 минуты!');
  }
  console.log('');
}

sendEmails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
  });
