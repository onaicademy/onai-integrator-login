/**
 * 🧪 ТЕСТОВАЯ ОТПРАВКА EMAIL НА digital.mcwin@gmail.com
 * Проверяет работу SMTP и отправляет тестовое письмо
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { sendWelcomeEmail } from '../src/services/emailService';

// Загружаем .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testEmailToDigital() {
  console.log('\n🧪 ===== ТЕСТ ОТПРАВКИ EMAIL НА digital.mcwin@gmail.com =====\n');

  // Проверка SMTP настроек
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = process.env.SMTP_PORT || '465';

  console.log('📧 SMTP SETTINGS:');
  console.log('   Host:', smtpHost);
  console.log('   Port:', smtpPort);
  console.log('   User:', smtpUser || 'NOT SET');
  console.log('   Password exists:', !!smtpPass);
  console.log('   Password length:', smtpPass?.length || 0);
  console.log('');

  if (!smtpUser || !smtpPass) {
    console.error('❌ ОШИБКА: SMTP credentials не настроены!');
    process.exit(1);
  }

  // Отправка на digital.mcwin@gmail.com
  const targetEmail = 'digital.mcwin@gmail.com';
  const testPassword = 'Welcome2024!';
  const testName = 'Тестовый Пользователь';

  console.log('📨 Отправка приветственного письма...');
  console.log('   TO:', targetEmail);
  console.log('   FROM:', smtpUser);
  console.log('   NAME:', testName);
  console.log('   PASSWORD:', testPassword);
  console.log('');

  try {
    console.log('⏳ Отправка... (может занять до 30 секунд)');
    
    const success = await sendWelcomeEmail({
      toEmail: targetEmail,
      name: testName,
      password: testPassword,
    });

    if (success) {
      console.log('');
      console.log('✅ ========================================');
      console.log('✅ ПИСЬМО УСПЕШНО ОТПРАВЛЕНО!');
      console.log('✅ ========================================');
      console.log('');
      console.log('📬 Получатель:', targetEmail);
      console.log('📧 Отправитель:', smtpUser);
      console.log('');
      console.log('💡 Проверьте почту digital.mcwin@gmail.com');
      console.log('💡 (включая папку "Спам" или "Промоакции")');
      console.log('');
      console.log('🎉 SMTP работает! Email отправлен успешно.');
      console.log('');
    } else {
      console.error('');
      console.error('❌ ========================================');
      console.error('❌ ОТПРАВКА НЕ УДАЛАСЬ');
      console.error('❌ ========================================');
      console.error('');
      console.error('Возможные причины:');
      console.error('1. Firewall блокирует порт 465');
      console.error('2. Неверный App Password для Gmail');
      console.error('3. Gmail блокирует соединение с сервера');
      console.error('');
      console.error('Проверьте логи выше для деталей.');
      process.exit(1);
    }

  } catch (exception: any) {
    console.error('');
    console.error('❌ ========================================');
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА ПРИ ОТПРАВКЕ');
    console.error('❌ ========================================');
    console.error('');
    console.error('Exception:', exception);
    console.error('Message:', exception.message);
    console.error('');
    
    if (exception.message?.includes('timeout')) {
      console.error('💡 ДИАГНОЗ: Connection Timeout');
      console.error('   - Firewall блокирует исходящие соединения на порту 465');
      console.error('   - Или SMTP сервер недоступен');
      console.error('');
      console.error('   РЕШЕНИЕ:');
      console.error('   1. Проверить firewall: ufw status');
      console.error('   2. Разрешить порт 465: ufw allow 465/tcp');
      console.error('   3. Попробовать порт 587 (TLS) вместо 465 (SSL)');
    } else if (exception.message?.includes('authentication')) {
      console.error('💡 ДИАГНОЗ: Authentication Failed');
      console.error('   - Неверный SMTP_USER или SMTP_PASS');
      console.error('   - App Password может быть недействительным');
      console.error('');
      console.error('   РЕШЕНИЕ:');
      console.error('   1. Создать новый App Password: https://myaccount.google.com/apppasswords');
      console.error('   2. Обновить SMTP_PASS в .env');
      console.error('   3. Перезапустить backend: pm2 restart onai-backend');
    }
    
    console.error('');
    console.error('Stack:', exception.stack);
    process.exit(1);
  }
}

// Запускаем тест
testEmailToDigital();

