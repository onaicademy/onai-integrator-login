/**
 * Скрипт для массовой отправки уведомления о технических работах
 * всем участникам "Экспресс курса" (бывший Tripwire)
 * 
 * Запуск:
 * cd backend && node scripts/send-maintenance-notification-tripwire.js
 */

require('dotenv').config();

const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

// Инициализация Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Инициализация Supabase Tripwire
const supabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || process.env.VITE_TRIPWIRE_SUPABASE_URL,
  process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Проверка переменных окружения:');
console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅' : '❌ отсутствует'}`);
console.log(`   TRIPWIRE_SUPABASE_URL: ${process.env.TRIPWIRE_SUPABASE_URL || process.env.VITE_TRIPWIRE_SUPABASE_URL ? '✅' : '❌ отсутствует'}`);
console.log(`   TRIPWIRE_SERVICE_ROLE_KEY: ${process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ отсутствует'}`);

// Шаблон email
const emailTemplate = (name) => `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Технические работы - onAI Academy</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4f46e5;
        }
        .content {
            margin-bottom: 30px;
        }
        h1 {
            color: #4f46e5;
            font-size: 24px;
            margin-bottom: 20px;
        }
        h2 {
            color: #333;
            font-size: 18px;
            margin-bottom: 15px;
        }
        p {
            margin-bottom: 15px;
        }
        .highlight {
            background-color: #fff3cd;
            padding: 15px;
            border-left: 4px solid #ffc107;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #666;
            font-size: 14px;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4f46e5;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .btn:hover {
            background-color: #3a3dcd;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">onAI Academy</div>
        </div>
        
        <div class="content">
            <h1>🔧 Важное уведомление о технических работах</h1>
            
            <p>Здравствуйте${name ? ', ' + name : ''}!</p>
            
            <p>Сообщаем вам о проведении плановых технических работ на платформе onAI Academy.</p>
            
            <div class="highlight">
                <h2>📅 Время проведения:</h2>
                <p><strong>До 20:00 (время Астаны) 29 декабря 2025 года</strong></p>
            </div>
            
            <h2>⚠️ Что это значит для вас:</h2>
            <ul>
                <li>Возможны кратковременные перебои в работе платформы</li>
                <li>Некоторые функции могут быть временно недоступны</li>
                <li>Возможны задержки в загрузке видеоуроков</li>
            </ul>
            
            <h2>🎯 Что мы делаем:</h2>
            <ul>
                <li>Оптимизируем работу системы</li>
                <li>Обновляем инфраструктуру</li>
                <li>Улучшаем стабильность платформы</li>
                <li>Подготавливаем систему к новым функциям</li>
            </ul>
            
            <p>Мы делаем все возможное, чтобы ваше обучение было максимально комфортным и продуктивным.</p>
            
            <p>После завершения работ платформа будет работать еще быстрее и стабильнее!</p>
            
            <div style="text-align: center;">
                <a href="https://onai.academy/expresscourse" class="btn">Перейти к обучению</a>
            </div>
        </div>
        
        <div class="footer">
            <p>С уважением,<br><strong>Команда onAI Academy</strong></p>
            <p>Если у вас возникнут вопросы, напишите нам: support@onai.academy</p>
        </div>
    </div>
</body>
</html>
`;

// Текстовая версия email
const textTemplate = (name) => `
Важное уведомление о технических работах - onAI Academy
${'='.repeat(60)}

Здравствуйте${name ? ', ' + name : ''}!

Сообщаем вам о проведении плановых технических работ на платформе onAI Academy.

📅 Время проведения:
До 20:00 (время Астаны) 29 декабря 2025 года

⚠️ Что это значит для вас:
- Возможны кратковременные перебои в работе платформы
- Некоторые функции могут быть временно недоступны
- Возможны задержки в загрузке видеоуроков

🎯 Что мы делаем:
- Оптимизируем работу системы
- Обновляем инфраструктуру
- Улучшаем стабильность платформы
- Подготавливаем систему к новым функциям

Мы делаем все возможное, чтобы ваше обучение было максимально комфортным и продуктивным.

После завершения работ платформа будет работать еще быстрее и стабильнее!

🔗 Перейти к обучению: https://onai.academy/expresscourse

С уважением,
Команда onAI Academy

Если у вас возникнут вопросы, напишите нам: support@onai.academy
`;

async function sendMaintenanceNotification() {
  try {
    console.log('🚀 Начинаем отправку уведомлений о технических работах...\n');

    // Получаем список всех активных участников Экспресс курса
    const { data: tripwireUsers, error: fetchError } = await supabase
      .from('tripwire_users')
      .select('id, email, full_name, status, maintenance_notification_sent')
      .eq('status', 'active')
      .or('maintenance_notification_sent.is.null,maintenance_notification_sent.eq.false')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Ошибка при получении списка участников:', fetchError);
      process.exit(1);
    }

    if (!tripwireUsers || tripwireUsers.length === 0) {
      console.log('⚠️ Не найдено активных участников Экспресс курса (или все уже уведомлены)');
      process.exit(0);
    }

    console.log(`📊 Найдено ${tripwireUsers.length} активных участников Экспресс курса для отправки\n`);

    // Отправляем email каждому участнику
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (let i = 0; i < tripwireUsers.length; i++) {
      const user = tripwireUsers[i];
      const fullName = user.full_name || '';
      
      try {
        console.log(`📧 [${i + 1}/${tripwireUsers.length}] Отправка email: ${user.email}`);
        
        const { data, error } = await resend.emails.send({
          from: 'onAI Academy <platform@onai.academy>',
          to: user.email,
          subject: '🔧 Важное уведомление: Технические работы на платформе',
          html: emailTemplate(fullName),
          text: textTemplate(fullName),
        });

        if (error) {
          console.error(`❌ Ошибка отправки для ${user.email}:`, error);
          errorCount++;
          results.push({
            email: user.email,
            status: 'error',
            error: error.message
          });
        } else {
          console.log(`✅ Успешно отправлено: ${user.email} (ID: ${data.id})`);
          successCount++;
          results.push({
            email: user.email,
            status: 'success',
            emailId: data.id
          });
        }

        // Небольшая задержка между отправками (Rate Limiting)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Критическая ошибка для ${user.email}:`, error);
        errorCount++;
        results.push({
          email: user.email,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Итоговая статистика:');
    console.log(`   Всего участников: ${tripwireUsers.length}`);
    console.log(`   ✅ Успешно отправлено: ${successCount}`);
    console.log(`   ❌ Ошибок: ${errorCount}`);
    console.log('='.repeat(60));

    // Сохраняем результаты в файл
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const resultsFile = `maintenance-notification-results-${timestamp}.json`;
    
    fs.writeFileSync(
      resultsFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        total: tripwireUsers.length,
        success: successCount,
        errors: errorCount,
        results: results
      }, null, 2)
    );

    console.log(`\n📄 Результаты сохранены в: ${resultsFile}`);

    // Обновляем tripwire_users с пометкой об отправке email
    console.log('\n🔄 Обновляем tripwire_users с пометкой об отправке email...');
    
    const { error: updateError } = await supabase
      .from('tripwire_users')
      .update({
        maintenance_notification_sent: true,
        maintenance_notification_sent_at: new Date().toISOString()
      })
      .in('email', tripwireUsers.map(u => u.email));

    if (updateError) {
      console.error('⚠️ Ошибка при обновлении tripwire_users:', updateError);
    } else {
      console.log('✅ tripwire_users успешно обновлены');
    }

    console.log('\n✅ Завершено!');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

// Запускаем скрипт
sendMaintenanceNotification();
