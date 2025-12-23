/**
 * 🧪 ТЕСТОВАЯ ОТПРАВКА EMAIL ЧЕРЕЗ NODEMAILER SMTP
 * Проверяет работу SMTP и нового Gmail-compatible темплейта
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { sendWelcomeEmail } from '../src/services/emailService';

// Загружаем .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSMTPEmail() {
  console.log('\n🧪 ===== ТЕСТ ОТПРАВКИ EMAIL ЧЕРЕЗ SMTP =====\n');

  // Проверка SMTP настроек
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || '465';

  console.log('📧 SMTP SETTINGS:');
  console.log('   Host:', smtpHost);
  console.log('   Port:', smtpPort);
  console.log('   User exists:', !!smtpUser);
  console.log('   User:', smtpUser || 'NOT SET');
  console.log('   Password exists:', !!smtpPass);
  console.log('   Password length:', smtpPass?.length || 0);
  console.log('');

  if (!smtpUser || !smtpPass) {
    console.error('❌ ОШИБКА: SMTP credentials не настроены!');
    console.error('❌ Добавьте в backend/.env:');
    console.error('   SMTP_HOST=smtp.gmail.com');
    console.error('   SMTP_PORT=465');
    console.error('   SMTP_SECURE=true');
    console.error('   SMTP_USER=your-email@gmail.com');
    console.error('   SMTP_PASS=your-app-password');
    console.error('');
    console.error('💡 Для Gmail нужен App Password:');
    console.error('   https://myaccount.google.com/apppasswords');
    process.exit(1);
  }

  // Тестовые данные
  const testEmail = 'icekvup@gmail.com';
  const testPassword = 'TestPass123!';
  const testName = 'Тестовый Пользователь';

  console.log('📨 Отправка тестового письма...');
  console.log('   TO:', testEmail);
  console.log('   FROM:', smtpUser);
  console.log('   NAME:', testName);
  console.log('   PASSWORD:', testPassword);
  console.log('');

  try {
    const success = await sendWelcomeEmail({
      toEmail: testEmail,
      name: testName,
      password: testPassword,
    });

    if (success) {
      console.log('✅ ПИСЬМО УСПЕШНО ОТПРАВЛЕНО!');
      console.log('');
      console.log('📬 Получатель:', testEmail);
      console.log('');
      console.log('💡 Проверьте почту (включая спам-папку)');
      console.log('');
      console.log('🎉 Тест пройден! SMTP работает корректно.');
    } else {
      console.error('❌ Отправка не удалась (см. логи выше)');
      process.exit(1);
    }

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
testSMTPEmail();
































