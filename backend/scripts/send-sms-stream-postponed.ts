/**
 * 📱 SMS РАССЫЛКА: Перенос эфира на 20 декабря
 * 
 * Использует телефоны из landing_leads (лендинг БД)
 * Сопоставляет по email с tripwire_users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { sendSMS } from '../src/services/mobizon-simple';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL;
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY;
const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

// ❌ Исключаем админов и sales менеджеров
const EXCLUDED_EMAILS = [
  'test.student.tripwire@test.com',
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
  'ayaulym@onaiacademy.kz',
];

// 📱 SMS текст (БЕЗ ЭМОДЗИ! Mobizon их не поддерживает)
const SMS_MESSAGE = 'Efir perenesen na subbotu 20 dekabrya 20:00! Uspey proyti moduli: onai.academy/integrator';

const sendSMSStreamPostponed = async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 SMS РАССЫЛКА: Перенос эфира');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!LANDING_SUPABASE_URL || !LANDING_SUPABASE_SERVICE_KEY || !TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_KEY) {
    console.error('❌ Supabase credentials не найдены');
    process.exit(1);
  }

  const landingSupabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY);
  const tripwireSupabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  // Функция нормализации имени
  function normalizeName(name: string | null): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^а-яёa-z\s]/gi, '');
  }

  try {
    // 1️⃣ Получить всех студентов Tripwire
    console.log('📊 Получаем список студентов Tripwire...');
    const { data: tripwireStudents, error: tripwireError } = await tripwireSupabase
      .from('tripwire_users')
      .select('email, full_name')
      .not('email', 'in', `(${EXCLUDED_EMAILS.map(e => `"${e}"`).join(',')})`);

    if (tripwireError) {
      console.error('❌ Error fetching Tripwire students:', tripwireError);
      process.exit(1);
    }

    console.log(`✅ Найдено студентов Tripwire: ${tripwireStudents?.length || 0}\n`);

    // 2️⃣ Получить всех лидов с телефонами из landing_leads
    console.log('📞 Получаем телефоны из landing_leads...');
    const { data: leadsWithPhones, error: leadsError } = await landingSupabase
      .from('landing_leads')
      .select('email, phone, name')
      .not('phone', 'is', null);

    if (leadsError) {
      console.error('❌ Error fetching leads:', leadsError);
      process.exit(1);
    }

    console.log(`✅ Найдено лидов с телефонами: ${leadsWithPhones?.length || 0}\n`);

    // 3️⃣ Создать Map email -> phone (сопоставление по EMAIL)
    const phoneMap = new Map<string, string>();
    tripwireStudents?.forEach(student => {
      const lead = leadsWithPhones?.find(l => 
        l.email?.toLowerCase().trim() === student.email?.toLowerCase().trim()
      );
      if (lead && lead.phone) {
        phoneMap.set(student.email, lead.phone);
      }
    });

    console.log(`✅ Сопоставлено по EMAIL: ${phoneMap.size}`);

    // 4️⃣ Сопоставить по ИМЕНИ для оставшихся
    tripwireStudents?.forEach(student => {
      // Пропускаем если уже нашли по email
      if (phoneMap.has(student.email)) return;
      
      const studentName = normalizeName(student.full_name);
      if (!studentName) return;
      
      const lead = leadsWithPhones?.find(l => {
        const leadName = normalizeName(l.name);
        if (!leadName) return false;
        
        // Попробуем найти полное совпадение или частичное
        return leadName === studentName || 
               studentName.includes(leadName) || 
               leadName.includes(studentName);
      });
      
      if (lead && lead.phone) {
        phoneMap.set(student.email, lead.phone);
      }
    });

    console.log(`✅ Сопоставлено по ИМЕНИ: ${phoneMap.size - phoneMap.size}`);

    // 5️⃣ Сопоставить студентов с телефонами
    const studentsWithPhones = tripwireStudents?.filter(student => {
      return phoneMap.has(student.email);
    }) || [];

    console.log(`✅ ВСЕГО студентов с телефонами: ${studentsWithPhones.length}\n`);

    if (studentsWithPhones.length === 0) {
      console.error('❌ Нет студентов с телефонами для отправки SMS');
      process.exit(1);
    }

    // 5️⃣ Показать SMS текст
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 SMS ТЕКСТ:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`"${SMS_MESSAGE}"`);
    console.log(`\nДлина: ${SMS_MESSAGE.length} символов\n`);

    if (SMS_MESSAGE.length > 70) {
      console.warn(`⚠️  ВНИМАНИЕ: SMS длиннее 70 символов (${SMS_MESSAGE.length})`);
      console.warn('   Это может увеличить стоимость!\n');
    }

    // 6️⃣ Подтверждение
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  ВНИМАНИЕ! МАССОВАЯ SMS РАССЫЛКА!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Будет отправлено ${studentsWithPhones.length} SMS`);
    console.log(`Примерная стоимость: ~${studentsWithPhones.length * 12}₸ (~${Math.round(studentsWithPhones.length * 12 / 500)}$)`);
    console.log('\nЗапуск через 5 секунд...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // 7️⃣ Отправка SMS
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 ОТПРАВКА SMS...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    let successCount = 0;
    let failCount = 0;
    const errors: Array<{ phone: string; email: string; error: string }> = [];

    for (const student of studentsWithPhones) {
      const phone = phoneMap.get(student.email);
      
      if (!phone) {
        console.log(`  ⚠️  Пропущен: ${student.email} (нет телефона в map)`);
        continue;
      }

      try {
        const success = await sendSMS({
          recipient: phone,
          text: SMS_MESSAGE,
        });

        if (success) {
          console.log(`  ✅ ${phone} (${student.email})`);
          successCount++;
        } else {
          console.error(`  ❌ ${phone} (${student.email}): Failed to send`);
          failCount++;
          errors.push({ phone, email: student.email, error: 'Failed to send' });
        }

        // ⏱️ Задержка 1000ms между SMS
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (err: any) {
        console.error(`  ❌ ${phone} (${student.email}): ${err.message}`);
        failCount++;
        errors.push({ phone, email: student.email, error: err.message });
      }
    }

    // 8️⃣ Итоговая статистика
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ SMS успешно: ${successCount}`);
    console.log(`❌ SMS ошибок: ${failCount}`);
    console.log(`📱 Попыток отправки: ${studentsWithPhones.length}`);
    console.log(`👥 Всего студентов Tripwire: ${tripwireStudents?.length || 0}`);

    if (errors.length > 0) {
      console.log('\n⚠️  СПИСОК ОШИБОК:');
      errors.forEach(({ phone, email, error }) => {
        console.log(`  • ${phone} (${email}): ${error}`);
      });
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount === studentsWithPhones.length) {
      console.log('🎉 ВСЕ SMS УСПЕШНО ОТПРАВЛЕНЫ!');
    } else if (successCount > 0) {
      console.log(`⚠️  Отправлено ${successCount} из ${studentsWithPhones.length} SMS`);
    } else {
      console.log('❌ Критическая ошибка: ни один SMS не был отправлен');
    }

  } catch (error: any) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
};

sendSMSStreamPostponed();







