/**
 * 📧 SCRIPT ДЛЯ МАССОВОЙ РАССЫЛКИ EMAIL СТУДЕНТАМ
 * 
 * Отправляет техническое обновление всем студентам Tripwire
 */

const { Resend } = require('resend');

// ✅ НАСТРОЙКИ
const RESEND_API_KEY = 're_123456789'; // ⚠️ ВСТАВЬ СВОЙ API KEY!
const FROM_EMAIL = 'noreply@onai.academy'; // ⚠️ ПРОВЕРЬ ДОМЕН В RESEND!
const SUBJECT = '✅ Технические работы завершены - Платформа работает стабильно';

// ✅ ТЕКСТ ПИСЬМА
const EMAIL_TEXT = `Привет!

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

// ✅ HTML ВЕРСИЯ
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
    .button:hover { background: #00cc88; }
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

// ✅ СПИСОК СТУДЕНТОВ (62 студента)
const STUDENTS = [
  "onai.agency.kz@gmail.com",
  "gilvanova1992@list.ru",
  "Afanasievvladimir2702@gmail.com",
  "Sattarov.renat@gmail.com",
  "aldiyar09n@gmail.com",
  "ayaulym@onaiacademy.kz",
  "bakkee24@gamil.com",
  "alena-live2010@mail.ru",
  "Alisherpush@gmail.com",
  "milkon00@mail.ru",
  "azeha_awer@mail.ru",
  "snursapa9@gmail.com",
  "aselya@onaiacademy.kz",
  "amina.berekenova@kimep.kz",
  "zhaniyaaaaaa@mail.ru",
  "Sabzhaslan@mail.ru",
  "zhandosm76@gmail.com",
  "timotul@gmail.com",
  "alina.kisba@mail.ru",
  "mitrodell3545@gmail.com",
  "alinapriteyeva@gmail.com",
  "0zxcbad@gmail.com",
  "Xusnatdinov@bk.ru",
  "aminokturlik@mail.ru",
  "heroran456@gmail.com",
  "mzaidenova@gmail.com",
  "irinadexkaimer@gmail.com",
  "icekvup@gmail.com",
  "garnaeva_munira@mail.ru",
  "arafatbashiza@gmail.com",
  "rakhatsadybekov01@gmail.com",
  "rakhatsadybekov@gmail.com",
  "m.mankeyeva@gmail.com",
  "di-ai8@mail.ru",
  "Weasellux@gmail.com",
  "zhaslaniskakov-72@mail.ru",
  "tamirlan.kudajbergen@mail.ru",
  "assiriez@mail.ru",
  "pafnuchev.66@gmail.com",
  "erasyl.maidanov@gmail.com",
  "marish77ka@yandex.ru",
  "romsvetnik@gmail.com",
  "ykuanischev53@gmail.com",
  "formula15ball@gmail.com",
  "a.aubakirov@gmail.com",
  "consonan@mail.ru",
  "adilbek2012a@icloud.com",
  "gulnara.y.66.kz@gmail.com",
  "zbajten@inbox.ru",
  "gruz321@yandex.ru",
  "azizahasimova416@gmail.com",
  "dusenbajajgul@gmail.com",
  "paudedanil15@gmail.com",
  "katya_15_8@mail.ru",
  "dyusekengulim@mail.ru",
  "milenochka.kotlyar@mail.ru",
  "amina.utegenova04@gmail.com",
  "madeinalmaty@gmail.com",
  "digital.mcwin@gmail.com",
  "smmmcwin@gmail.com",
  "rakhat@onaiacademy.kz",
  "amina@onaiacademy.kz"
];

// ✅ ФУНКЦИЯ ОТПРАВКИ
async function sendEmails() {
  const resend = new Resend(RESEND_API_KEY);
  
  console.log(`📧 Начинаем рассылку для ${STUDENTS.length} студентов...`);
  console.log(`📨 Тема: ${SUBJECT}`);
  console.log(`📤 От: ${FROM_EMAIL}\n`);
  
  let sent = 0;
  let failed = 0;
  const errors = [];
  
  // Отправляем по одному с задержкой (чтобы не превысить rate limit)
  for (const email of STUDENTS) {
    try {
      const result = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: SUBJECT,
        text: EMAIL_TEXT,
        html: EMAIL_HTML,
      });
      
      console.log(`✅ [${sent + 1}/${STUDENTS.length}] Отправлено: ${email}`);
      sent++;
      
      // Задержка 100ms между письмами (600 писем/минуту)
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ [${sent + failed + 1}/${STUDENTS.length}] Ошибка: ${email}`);
      console.error(`   Причина: ${error.message}`);
      failed++;
      errors.push({ email, error: error.message });
    }
  }
  
  // ✅ ИТОГИ
  console.log('\n' + '='.repeat(60));
  console.log('📊 ИТОГИ РАССЫЛКИ:');
  console.log('='.repeat(60));
  console.log(`✅ Успешно отправлено: ${sent}`);
  console.log(`❌ Ошибок: ${failed}`);
  console.log(`📧 Всего студентов: ${STUDENTS.length}`);
  console.log('='.repeat(60));
  
  if (errors.length > 0) {
    console.log('\n❌ СПИСОК ОШИБОК:');
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.email}: ${err.error}`);
    });
  }
  
  console.log('\n🎉 Рассылка завершена!');
}

// ✅ ЗАПУСК
if (require.main === module) {
  sendEmails()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('💥 Критическая ошибка:', error);
      process.exit(1);
    });
}

module.exports = { sendEmails, STUDENTS, EMAIL_HTML, EMAIL_TEXT };




