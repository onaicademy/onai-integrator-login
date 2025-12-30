/**
 * 📱 SMS РАССЫЛКА: Отправка SMS всем студентам
 * 
 * Использует телефоны из основной БД users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { sendSMS } from '../src/services/mobizon-simple';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

// ❌ Исключаем админов и sales менеджеров
const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

// 📱 SMS текст (ИЗМЕНИ ЭТО!)
const SMS_MESSAGE = 'Эфир 20 декабря 20:00! Пройди модули expresscourse.onai.academy';
const SHORT_LINK = 'expresscourse.onai.academy'; // короткая ссылка

const sendSMSBroadcast = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SMS МАССОВАЯ РАССЫЛКА');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase credentials не найдены');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1️⃣ Получить всех студентов из tripwire_users
    console.log('📊 Получаем список студентов...');
    const { data: allStudents, error: studentsError } = await supabase
      .from('tripwire_users')
      .select('user_id, email, full_name')
      .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      process.exit(1);
    }

    if (!allStudents || allStudents.length === 0) {
      console.error('❌ Студенты не найдены');
      process.exit(1);
    }

    console.log(`✅ Найдено студентов: ${allStudents.length}\n`);

    // 2️⃣ Получить телефоны из основной БД users
    console.log('📞 Получаем телефоны из основной БД...');
    const userIds = allStudents.map(s => s.user_id);
    const { data: usersWithPhone } = await supabase
      .from('users')
      .select('id, phone')
      .in('id', userIds);

    // Создать Map для быстрого доступа к телефонам
    const phoneMap = new Map<string, string>();
    usersWithPhone?.forEach(u => {
      if (u.phone && u.phone.trim()) {
        phoneMap.set(u.id, u.phone);
      }
    });

    console.log(`✅ Найдено телефонов: ${phoneMap.size}\n`);

    if (phoneMap.size === 0) {
      console.error('❌ Нет телефонов для отправки SMS');
      process.exit(1);
    }

    // 3️⃣ Подготовить SMS текст
    const smsText = SMS_MESSAGE.replace(/{SHORT_LINK}/g, SHORT_LINK);
    console.log('📱 SMS текст:');
    console.log(`   "${smsText}"`);
    console.log(`   Длина: ${smsText.length} символов\n`);

    if (smsText.length > 70) {
      console.warn(`⚠️  ВНИМАНИЕ: SMS длиннее 70 символов (${smsText.length})`);
      console.warn('   Это может увеличить стоимость отправки!\n');
    }

    // 4️⃣ Подтверждение
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  ВНИМАНИЕ!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Будет отправлено ${phoneMap.size} SMS`);
    console.log(`Примерная стоимость: ~${phoneMap.size * 12}₸ (~${Math.round(phoneMap.size * 12 / 500)}$)`);
    console.log('\nЗапуск через 5 секунд...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5️⃣ Отправка SMS
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 ОТПРАВКА SMS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ phone: string; email: string; error: string }> = [];

    for (const student of allStudents) {
      const phone = phoneMap.get(student.user_id);
      
      if (!phone) {
        console.log(`  ⚠️  Пропущен: ${student.email} (нет телефона)`);
        continue;
      }

      try {
        const success = await sendSMS({
          recipient: phone,
          text: smsText,
        });

        if (success) {
          console.log(`  ✅ ${phone} (${student.email})`);
          successCount++;
        } else {
          console.error(`  ❌ ${phone} (${student.email}): Failed to send`);
          failCount++;
          errors.push({ phone, email: student.email, error: 'Failed to send' });
        }

        // ⏱️ Задержка 1000ms между SMS (чтобы не превысить лимиты)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err: any) {
        console.error(`  ❌ ${phone} (${student.email}): ${err.message}`);
        failCount++;
        errors.push({ phone, email: student.email, error: err.message });
      }
    }

    // 6️⃣ Итоговая статистика
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ SMS успешно: ${successCount}`);
    console.log(`❌ SMS ошибок: ${failCount}`);
    console.log(`📞 Телефонов в БД: ${phoneMap.size}`);
    console.log(`👥 Всего студентов: ${allStudents.length}`);

    if (errors.length > 0) {
      console.log('\n⚠️  СПИСОК ОШИБОК:');
      errors.forEach(({ phone, email, error }) => {
        console.log(`  • ${phone} (${email}): ${error}`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount === phoneMap.size) {
      console.log('🎉 ВСЕ SMS УСПЕШНО ОТПРАВЛЕНЫ!');
    } else if (successCount > 0) {
      console.log(`⚠️  Отправлено ${successCount} из ${phoneMap.size} SMS`);
    } else {
      console.log('❌ Критическая ошибка: ни один SMS не был отправлен');
    }

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
};

sendSMSBroadcast();
