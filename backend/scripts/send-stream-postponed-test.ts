/**
 * 📧 ТЕСТОВАЯ ОТПРАВКА: Письмо о переносе эфира
 * 
 * Сначала отправляем на тестовый email для проверки
 * После одобрения — используем send-stream-postponed-mass.ts
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { tripwireStreamPostponedEmail } from '../src/templates/tripwireStreamPostponedEmail';

// Загружаем env переменные
dotenv.config({ path: path.join(__dirname, '../env.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

// 🎯 Тестовый получатель
const TEST_EMAIL = 'irinadexkaimer@gmail.com';

const sendTestEmail = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 ТЕСТОВАЯ ОТПРАВКА: Письмо о переносе эфира');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY не найден в env.env');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    console.log(`🎯 Отправляем тестовое письмо на: ${TEST_EMAIL}`);
    console.log(`📤 От: ${FROM_EMAIL}\n`);

    const emailHtml = tripwireStreamPostponedEmail({
      recipientName: 'Ирина',
      recipientEmail: TEST_EMAIL,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_EMAIL,
      subject: '⚡ Важно: эфир переносится на субботу',
      html: emailHtml,
    });

    if (error) {
      console.error('❌ Ошибка отправки:', error);
      process.exit(1);
    }

    console.log('✅ Письмо успешно отправлено!');
    console.log('📧 ID письма:', data?.id);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NEXT STEP:');
    console.log('1. Проверь письмо в почте irinadexkaimer@gmail.com');
    console.log('2. Убедись, что дизайн корректен (светлая/тёмная тема)');
    console.log('3. Проверь мобильную версию');
    console.log('4. После одобрения — запусти send-stream-postponed-mass.ts');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
};

sendTestEmail();
