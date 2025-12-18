/**
 * 📧 МАССОВАЯ РАССЫЛКА: Письмо о переносе эфира
 * 
 * ⚠️ ЗАПУСКАТЬ ТОЛЬКО ПОСЛЕ ОДОБРЕНИЯ ТЕСТОВОГО ПИСЬМА!
 * 
 * Отправляет письмо всем 51 студенту (исключая админов)
 */

import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { tripwireStreamPostponedEmail } from '../src/templates/tripwireStreamPostponedEmail';
import { tripwireStreamPostponedSMS } from '../src/templates/tripwireStreamPostponedSMS';
import { sendSMS } from '../src/services/mobizon-simple';

// Загружаем env переменные
dotenv.config({ path: path.join(__dirname, '../env.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;
const FROM_EMAIL = 'onAI Academy <notifications@onai.academy>';

// ❌ Исключаем админов и тестовые аккаунты
const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',   // Sales Manager 3
  'ayaulym@onaiacademy.kz',  // Sales Manager 4
];

const sendMassEmail = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 МАССОВАЯ РАССЫЛКА: Письмо о переносе эфира');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Проверка env переменных
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Отсутствуют необходимые env переменные');
    process.exit(1);
  }

  const resend = new Resend(RESEND_API_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1️⃣ Получаем всех студентов из БД
    console.log('📊 Получаем список студентов из БД...\n');

    const { data: students, error } = await supabase
      .from('tripwire_users')
      .select('email, full_name')
      .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);

    if (error) {
      console.error('❌ Ошибка получения студентов:', error);
      process.exit(1);
    }

    if (!students || students.length === 0) {
      console.error('❌ Студенты не найдены');
      process.exit(1);
    }

    console.log(`✅ Найдено студентов: ${students.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 2️⃣ Отправляем EMAIL (SMS не отправляем, т.к. нет телефонов в БД)
    console.log('📤 Начинаем массовую EMAIL рассылку...\n');
    console.log('⚠️  SMS рассылка пропущена: телефоны не найдены в БД tripwire_users\n');

    let emailSuccessCount = 0;
    let emailFailCount = 0;
    const errors: Array<{ contact: string; type: string; error: string }> = [];

    for (const student of students) {
      try {
        // 📧 Отправка EMAIL
        const emailHtml = tripwireStreamPostponedEmail({
          recipientName: student.full_name || 'Студент',
          recipientEmail: student.email,
        });

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: FROM_EMAIL,
          to: student.email,
          subject: '⚡ Важно: эфир переносится на субботу',
          html: emailHtml,
        });

        if (emailError) {
          console.error(`  ❌ ${student.email}: ${emailError.message}`);
          emailFailCount++;
          errors.push({ contact: student.email, type: 'email', error: emailError.message });
        } else {
          console.log(`  ✅ ${student.email} (ID: ${emailData?.id})`);
          emailSuccessCount++;
        }

        // ⏱️ Задержка 100ms между отправками (чтобы не превысить rate limit)
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err: any) {
        console.error(`  ❌ ${student.email}: ${err.message}`);
        emailFailCount++;
        errors.push({ contact: student.email, type: 'email', error: err.message });
      }
    }

    // 3️⃣ Итоговая статистика
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ EMAIL успешно: ${emailSuccessCount}`);
    console.log(`❌ EMAIL ошибок: ${emailFailCount}`);
    console.log(`👥 Всего студентов: ${students.length}`);
    console.log(`📱 SMS: пропущено (нет телефонов в БД)`);

    if (errors.length > 0) {
      console.log('\n⚠️  СПИСОК ОШИБОК:');
      errors.forEach(({ contact, type, error }) => {
        console.log(`  • [${type.toUpperCase()}] ${contact}: ${error}`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (emailSuccessCount === students.length) {
      console.log('🎉 ВСЕ EMAIL УСПЕШНО ОТПРАВЛЕНЫ!');
    } else if (emailSuccessCount > 0) {
      console.log('⚠️  Некоторые email не были отправлены. Проверь ошибки выше.');
    } else {
      console.log('❌ Критическая ошибка: ничего не было отправлено.');
    }

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
};

// ⚠️ Подтверждение перед запуском
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('⚠️  ВНИМАНИЕ! МАССОВАЯ РАССЫЛКА!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Это отправит письма ВСЕМ студентам (~51 человек).');
console.log('Убедись, что ты протестировал письмо на тестовом email!');
console.log('\nЗапуск через 5 секунд...\n');

setTimeout(() => {
  sendMassEmail();
}, 5000);
