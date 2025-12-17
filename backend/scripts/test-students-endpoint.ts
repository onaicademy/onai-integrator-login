/**
 * 🧪 ТЕСТ: Endpoint /api/tripwire/admin/students
 * Проверяем фильтрацию админов/sales
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',
  'rakhat@onaiacademy.kz',
  'amina@onaiacademy.kz',
  'aselya@onaiacademy.kz',
];

async function testStudentsEndpoint() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  console.log('\n🧪 ТЕСТ: Endpoint /api/tripwire/admin/students\n');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Симулируем точную логику endpoint
    
    // 🚫 ШАГ 0: Получить user_id для исключенных
    const { data: excludedUsersData } = await supabase
      .from('tripwire_users')
      .select('user_id')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    const excludedUserIds = excludedUsersData?.map(u => u.user_id) || [];

    console.log('🚫 Исключаем user_id:', excludedUserIds.length);
    console.log('   IDs:', excludedUserIds.map(id => id.substring(0, 8) + '...'));

    // ✅ ШАГ 1: Получить профили (с фильтрацией)
    let profileQuery = supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules, completion_percentage, created_at, updated_at');

    if (excludedUserIds.length > 0) {
      profileQuery = profileQuery.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data: tripwireProfiles, error: profileError } = await profileQuery;

    if (profileError) throw profileError;

    console.log(`\n✅ Профилей после фильтрации: ${tripwireProfiles?.length || 0}`);

    // ✅ ШАГ 2: Получить users
    const userIds = tripwireProfiles?.map(p => p.user_id) || [];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    if (usersError) throw usersError;

    console.log(`✅ Users получено: ${users?.length || 0}\n`);

    // 🎯 ПРОВЕРКА: Есть ли админы/sales в результате?
    const leakedAdmins = users?.filter(u => 
      EXCLUDED_EMAILS.includes(u.email)
    ) || [];

    if (leakedAdmins.length > 0) {
      console.log('❌ ПРОВАЛ! УТЕЧКА ДАННЫХ!');
      console.log('   Админы/sales в списке:');
      leakedAdmins.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.full_name})`);
      });
    } else {
      console.log('✅ УСПЕХ! Админы/sales отфильтрованы!');
    }

    console.log('\n📊 Первые 5 студентов:');
    users?.slice(0, 5).forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email} - ${u.full_name}`);
    });

    console.log('\n═══════════════════════════════════════════════');
    if (leakedAdmins.length === 0) {
      console.log('✅ ФИЛЬТРАЦИЯ РАБОТАЕТ КОРРЕКТНО!');
    } else {
      console.log('❌ ФИЛЬТРАЦИЯ НЕ РАБОТАЕТ!');
    }
    console.log('═══════════════════════════════════════════════\n');

  } catch (err: any) {
    console.error('\n❌ ОШИБКА:', err.message);
    process.exit(1);
  }
}

testStudentsEndpoint();
