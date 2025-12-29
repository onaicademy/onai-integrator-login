/**
 * ОТПРАВКА WELCOME EMAIL ЧЕРЕZ RESEND API
 * Для студента Tacher12122005@gmail.com
 */

const resend = require('resend');

// Конфигурация Resend
const RESEND_API_KEY = 're_8YogT2EB_7JvsyYANkbHkUk2jZ9UfvHFk';

// Данные студента
const studentData = {
  email: 'Tacher12122005@gmail.com',
  password: 'Tripwire2024!',
  full_name: 'Ильязов Микаэль'
};

// Создаем клиент Resend
const resendClient = new resend.Resend(RESEND_API_KEY);

async function sendWelcomeEmail() {
  console.log('📧 Начинаем отправку welcome email...');
  console.log('📧 Email:', studentData.email);
  console.log('👤 Full Name:', studentData.full_name);
  console.log('');

  try {
    // Отправка email
    const { data, error } = await resendClient.emails.send({
      from: 'onAI Academy <platform@onai.academy>',
      to: [studentData.email],
      subject: '🎉 Добро пожаловать в onAI Academy - Tripwire!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Добро пожаловать в onAI Academy - Tripwire</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #6366f1;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 8px;
            }
            h1 {
              color: #6366f1;
              margin-bottom: 20px;
            }
            p {
              margin-bottom: 15px;
            }
            .credentials {
              background-color: #f0f7ff;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .credentials strong {
              color: #6366f1;
            }
            .button {
              display: inline-block;
              background-color: #6366f1;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #4752a4;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            .footer a {
              color: #6366f1;
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">onAI Academy</div>
            </div>
            
            <div class="content">
              <h1>🎉 Добро пожаловать в Tripwire!</h1>
              
              <p>Здравствуйте, <strong>${studentData.full_name}</strong>!</p>
              
              <p>Ваша учетная запись успешно создана. Теперь вы можете начать обучение на платформе Tripwire.</p>
              
              <div class="credentials">
                <p><strong>📧 Email:</strong> ${studentData.email}</p>
                <p><strong>🔑 Пароль:</strong> ${studentData.password}</p>
              </div>
              
              <p>Для входа в систему, перейдите по ссылке ниже:</p>
              
              <p style="text-align: center;">
                <a href="https://api.onai.academy/tripwire" class="button">Войти в Tripwire</a>
              </p>
              
              <p><strong>ℹ️ Важно:</strong></p>
              <ul>
                <li>Рекомендуем сменить пароль после первого входа</li>
                <li>Сохраните ваши учетные данные в безопасном месте</li>
                <li>Если у вас возникнут вопросы, свяжитесь с поддержкой</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2024 onAI Academy. Все права защищены.</p>
              <p>
                <a href="https://onai.academy">onai.academy</a> | 
                <a href="https://onai.academy/support">Поддержка</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Добро пожаловать в onAI Academy - Tripwire!
        
        Здравствуйте, ${studentData.full_name}!
        
        Ваша учетная запись успешно создана. Теперь вы можете начать обучение на платформе Tripwire.
        
        Ваши учетные данные:
        Email: ${studentData.email}
        Пароль: ${studentData.password}
        
        Для входа в систему, перейдите по ссылке:
        https://api.onai.academy/tripwire
        
        Важно:
        - Рекомендуем сменить пароль после первого входа
        - Сохраните ваши учетные данные в безопасном месте
        - Если у вас возникнут вопросы, свяжитесь с поддержкой
        
        © 2024 onAI Academy. Все права защищены.
      `
    });

    if (error) {
      console.error('❌ Ошибка при отправке email:', error);
      throw error;
    }

    console.log('✅ Email успешно отправлен!');
    console.log('📧 Email ID:', data.id);
    console.log('📧 Кому:', studentData.email);
    console.log('');
    console.log('============================================');
    console.log('🎉 WELCOME EMAIL УСПЕШНО ОТПРАВЛЕН!');
    console.log('============================================');
    console.log('');
    console.log('📋 Детали отправки:');
    console.log('  [✅] Отправитель: platform@onai.academy');
    console.log('  [✅] Получатель:', studentData.email);
    console.log('  [✅] Тема: Добро пожаловать в onAI Academy - Tripwire!');
    console.log('  [✅] Email ID:', data.id);
    console.log('');
    console.log('⏭️  Следующие шаги:');
    console.log('  1. Проверить почтовый ящик студента');
    console.log('  2. Убедиться, что email доставлен');
    console.log('  3. Проверить, что студент может войти в систему');
    console.log('');

    // Обновление tripwire_users с пометкой об отправке email
    console.log('📝 Обновление tripwire_users...');
    const { createClient } = require('@supabase/supabase-js');
    const SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
    const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc5NTMwOCwiZXhwIjoyMDgwMzcxMzA4fQ.QB_iIKt06nqa0owpVtKwKXmDwFInuy9mOyALf3VgWyk';
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: updateError } = await supabase
      .from('tripwire_users')
      .update({
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString()
      })
      .eq('email', studentData.email);

    if (updateError) {
      console.error('❌ Ошибка при обновлении tripwire_users:', updateError);
    } else {
      console.log('✅ tripwire_users обновлен с пометкой об отправке email');
    }

  } catch (error) {
    console.error('');
    console.error('============================================');
    console.error('❌ ОШИБКА ПРИ ОТПРАВКЕ EMAIL!');
    console.error('============================================');
    console.error('');
    console.error('Детали ошибки:', error);
    console.error('');
    process.exit(1);
  }
}

// Запуск
sendWelcomeEmail();
