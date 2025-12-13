/**
 * 🧪 ТЕСТОВАЯ ОТПРАВКА EMAIL ЧЕРЕЗ RESEND
 * Проверяет работу Resend API и шаблона письма
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { Resend } from 'resend';
import { getWelcomeEmailHtml } from '../src/templates/tripwireWelcomeBulletproof';

// Загружаем .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendTestEmail() {
  console.log('\n🧪 ===== ТЕСТ ОТПРАВКИ EMAIL ЧЕРЕЗ RESEND =====\n');

  // Проверка API ключа
  const apiKey = process.env.RESEND_API_KEY;
  console.log('📧 RESEND_API_KEY exists:', !!apiKey);
  console.log('📧 RESEND_API_KEY length:', apiKey?.length || 0);
  console.log('📧 First 10 chars:', apiKey?.substring(0, 10) || 'EMPTY');
  console.log('');

  if (!apiKey || apiKey.length < 20) {
    console.error('❌ ОШИБКА: RESEND_API_KEY не найден или неверный!');
    console.error('❌ Добавьте RESEND_API_KEY=re_ваш_ключ в backend/.env');
    process.exit(1);
  }

  // Тестовые данные
  const testEmail = 'smmmcwin@gmail.com';
  const testPassword = 'TestPassword123!';
  const testName = 'Тестовый Пользователь';

  // Используем верифицированный домен
  const fromEmail = 'onAI Academy <noreply@onai.academy>';
  
  console.log('📨 Отправка тестового письма...');
  console.log('   TO:', testEmail);
  console.log('   FROM:', fromEmail);
  console.log('   SUBJECT: Доступ открыт! Ваши данные для входа');
  console.log('');

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: testEmail,
      subject: 'Доступ открыт! Ваши данные для входа',
      html: getWelcomeEmailHtml(testEmail, testPassword, testName),
    });

    if (error) {
      console.error('❌ ОШИБКА RESEND:');
      console.error(JSON.stringify(error, null, 2));
      console.error('');
      
      // Расшифровка типичных ошибок
      if (error.message?.includes('401')) {
        console.error('💡 ДИАГНОЗ: Неверный API ключ (401 Unauthorized)');
        console.error('   РЕШЕНИЕ: Проверьте RESEND_API_KEY в .env');
      } else if (error.message?.includes('403')) {
        console.error('💡 ДИАГНОЗ: API ключ отозван или недействителен (403 Forbidden)');
        console.error('   РЕШЕНИЕ: Создайте новый ключ на https://resend.com/api-keys');
      } else if (error.message?.includes('429')) {
        console.error('💡 ДИАГНОЗ: Превышен лимит отправки (429 Too Many Requests)');
        console.error('   РЕШЕНИЕ: Подождите до следующего дня (лимит: 100 писем/день)');
      } else if (error.message?.includes('400')) {
        console.error('💡 ДИАГНОЗ: Неверные параметры запроса (400 Bad Request)');
        console.error('   РЕШЕНИЕ: Проверьте email отправителя и получателя');
      }
      
      process.exit(1);
    }

    console.log('✅ ПИСЬМО УСПЕШНО ОТПРАВЛЕНО!');
    console.log('');
    console.log('📬 Email ID:', data?.id);
    console.log('📧 Получатель:', testEmail);
    console.log('');
    console.log('💡 Проверьте почту (включая спам-папку)');
    console.log('');
    console.log('🎉 Тест пройден! Resend работает корректно.');

  } catch (exception: any) {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ОТПРАВКЕ:');
    console.error('');
    console.error('Exception:', exception);
    console.error('Message:', exception.message);
    console.error('Stack:', exception.stack);
    process.exit(1);
  }
}

// Запускаем тест
sendTestEmail();














