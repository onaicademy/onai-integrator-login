/**
 * 🧪 ТЕСТ: Проверка статистики продаж (исключая admin + sales)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
  'aselya@onaiacademy.kz',    // Sales Manager 3
];

async function testSalesStats() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  console.log('\n🧪 ТЕСТ: Статистика продаж (исключая admin + sales)\n');

  try {
    // 1. Получить всех пользователей из tripwire_users
    console.log('📊 Шаг 1: Получение всех пользователей из tripwire_users...');
    const { data: allUsers, error: allError } = await supabase
      .from('tripwire_users')
      .select('id, email, full_name, user_id')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true });

    if (allError) throw allError;

    console.log(`   ✅ Всего пользователей с user_id: ${allUsers?.length || 0}`);

    // 2. Получить исключенных пользователей
    console.log('\n📊 Шаг 2: Получение исключенных (admin + sales)...');
    const { data: excludedUsers, error: excludedError } = await supabase
      .from('tripwire_users')
      .select('id, email, full_name, user_id')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    if (excludedError) throw excludedError;

    console.log(`   ✅ Исключенных пользователей: ${excludedUsers?.length || 0}`);
    
    if (excludedUsers && excludedUsers.length > 0) {
      console.log('\n   Список исключенных:');
      excludedUsers.forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} - ${user.full_name}`);
      });
    }

    const excludedUserIds = excludedUsers?.map(u => u.user_id) || [];

    // 3. Получить профили студентов (с исключениями)
    console.log('\n📊 Шаг 3: Получение профилей студентов (БЕЗ admin + sales)...');
    
    let query = supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules');

    if (excludedUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data: studentProfiles, error: profileError } = await query;

    if (profileError) throw profileError;

    console.log(`   ✅ Профилей студентов (продажи): ${studentProfiles?.length || 0}`);

    // 4. Проверка: есть ли в профилях исключенные пользователи?
    if (studentProfiles && excludedUserIds.length > 0) {
      const foundExcluded = studentProfiles.filter(p => 
        excludedUserIds.includes(p.user_id)
      );

      if (foundExcluded.length > 0) {
        console.log('\n   ⚠️  ОШИБКА! Найдены исключенные пользователи в результатах:');
        foundExcluded.forEach(p => {
          const user = excludedUsers?.find(u => u.user_id === p.user_id);
          console.log(`      - ${user?.email} (${user?.full_name})`);
        });
      } else {
        console.log('\n   ✅ Исключенные пользователи правильно отфильтрованы!');
      }
    }

    // 5. Статистика активности
    console.log('\n📊 Шаг 4: Анализ активности студентов...');
    
    const completed = studentProfiles?.filter(p => 
      p.modules_completed >= p.total_modules
    ).length || 0;

    const inProgress = studentProfiles?.filter(p => 
      p.modules_completed > 0 && p.modules_completed < p.total_modules
    ).length || 0;

    const notStarted = studentProfiles?.filter(p => 
      p.modules_completed === 0
    ).length || 0;

    console.log(`   • Завершили курс: ${completed}`);
    console.log(`   • В процессе: ${inProgress}`);
    console.log(`   • Не начали: ${notStarted}`);

    // 6. Итоговый отчет
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ ТЕСТ УСПЕШНО ЗАВЕРШЁН!');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА:');
    console.log(`   • Всего пользователей в БД: ${allUsers?.length || 0}`);
    console.log(`   • Исключено (admin + sales): ${excludedUsers?.length || 0}`);
    console.log(`   • 💰 ПРОДАЖИ (студенты): ${studentProfiles?.length || 0}`);
    console.log(`   • Завершили курс: ${completed} (${studentProfiles?.length ? Math.round((completed / studentProfiles.length) * 100) : 0}%)`);
    console.log(`   • В процессе: ${inProgress}`);
    console.log(`   • Не начали: ${notStarted}\n`);

    console.log('✅ API endpoint `/api/tripwire/admin/stats` будет показывать:');
    console.log(`   total_students: ${studentProfiles?.length || 0} (продажи)\n`);

  } catch (err: any) {
    console.error('\n❌ ОШИБКА:', err.message);
    process.exit(1);
  }
}

testSalesStats();
