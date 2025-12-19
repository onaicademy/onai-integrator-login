#!/usr/bin/env node

/**
 * 🔍 ТЕСТОВАЯ ОТПРАВКА EMAIL ДЛЯ ПРОВЕРКИ ДОСТАВКИ
 */

require('dotenv').config({ path: './env.env' });
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
        <a href="https://onai.academy/integrator" class="button">Продолжить обучение</a>
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

// ТЕСТОВЫЕ АДРЕСА (твои email для проверки)
const TEST_EMAILS = [
  'digital.mcwin@gmail.com',
  'onai.agency.kz@gmail.com',
  'smmmcwin@gmail.com'
];

async function testEmailDelivery() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 ТЕСТОВАЯ ОТПРАВКА EMAIL');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден');
    process.exit(1);
  }

  console.log('✅ Resend API key найден');
  console.log('🔑 Key:', process.env.RESEND_API_KEY.substring(0, 10) + '...');
  console.log('');

  const resend = new Resend(process.env.RESEND_API_KEY);

  console.log('📧 Отправляю тестовые письма на:');
  TEST_EMAILS.forEach(email => console.log(`   - ${email}`));
  console.log('');

  const results = [];

  for (const email of TEST_EMAILS) {
    try {
      console.log(`📤 Отправка на ${email}...`);
      
      const result = await resend.emails.send({
        from: 'onAI Academy <notifications@onai.academy>',
        to: email,
        subject: SUBJECT,
        text: MESSAGE,
        html: EMAIL_HTML,
      });

      console.log(`✅ Успешно! ID: ${result.data?.id || 'unknown'}`);
      results.push({ email, success: true, id: result.data?.id });

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Ошибка: ${error.message}`);
      results.push({ email, success: false, error: error.message });
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📊 РЕЗУЛЬТАТЫ:');
  console.log('═══════════════════════════════════════════════════════════════');
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ ${r.email}: Отправлено (ID: ${r.id})`);
    } else {
      console.log(`❌ ${r.email}: Ошибка (${r.error})`);
    }
  });
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('🔍 ПРОВЕРЬ СВОЮ ПОЧТУ (в том числе СПАМ)!');
  console.log('');
  console.log('📧 Если письмо не пришло:');
  console.log('   1. Проверь папку СПАМ');
  console.log('   2. Проверь Resend Dashboard (https://resend.com/emails)');
  console.log('   3. Проверь что домен onai.academy верифицирован');
  console.log('');
}

testEmailDelivery()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('💥 Ошибка:', error);
    process.exit(1);
  });
