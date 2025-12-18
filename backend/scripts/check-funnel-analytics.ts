/**
 * 🔍 ПРОВЕРКА: Аналитика воронки студентов
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

async function checkFunnelAnalytics() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  console.log('\n🔍 ПРОВЕРКА: Аналитика воронки студентов\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Получить исключённых пользователей
    const { data: excludedUsers } = await supabase
      .from('tripwire_users')
      .select('user_id')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    const excludedUserIds = excludedUsers?.map(u => u.user_id) || [];

    // Получить всех студентов (с фильтрацией)
    let profileQuery = supabase
      .from('tripwire_user_profile')
      .select('user_id, modules_completed, total_modules, completion_percentage');

    if (excludedUserIds.length > 0) {
      profileQuery = profileQuery.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) {
      console.log('❌ Нет данных студентов!');
      return;
    }

    console.log(`📊 Всего студентов: ${profiles.length}\n`);

    // Аналитика по модулям
    const byModules: Record<number, number> = {};
    
    profiles.forEach(p => {
      const completed = p.modules_completed || 0;
      byModules[completed] = (byModules[completed] || 0) + 1;
    });

    console.log('📈 ВОРОНКА ПО МОДУЛЯМ:\n');

    const totalStudents = profiles.length;
    
    // Модуль 0 (зарегистрировались, но не завершили ничего)
    const mod0 = byModules[0] || 0;
    console.log(`   0️⃣  Модуль 0 (не завершили): ${mod0} студентов (${((mod0/totalStudents)*100).toFixed(1)}%)`);

    // Модуль 1
    const mod1Plus = profiles.filter(p => (p.modules_completed || 0) >= 1).length;
    const mod1 = byModules[1] || 0;
    const conv1 = totalStudents > 0 ? (mod1Plus / totalStudents) * 100 : 0;
    console.log(`   1️⃣  Завершили Модуль 1: ${mod1Plus} студентов (${conv1.toFixed(1)}% от всех)`);
    console.log(`      └─ Застряли на 1: ${mod1} студентов`);

    // Модуль 2
    const mod2Plus = profiles.filter(p => (p.modules_completed || 0) >= 2).length;
    const mod2 = byModules[2] || 0;
    const conv2 = totalStudents > 0 ? (mod2Plus / totalStudents) * 100 : 0;
    const conv1to2 = mod1Plus > 0 ? (mod2Plus / mod1Plus) * 100 : 0;
    console.log(`   2️⃣  Завершили Модуль 2: ${mod2Plus} студентов (${conv2.toFixed(1)}% от всех, ${conv1to2.toFixed(1)}% от прошедших М1)`);
    console.log(`      └─ Застряли на 2: ${mod2} студентов`);

    // Модуль 3 (завершили всё)
    const mod3 = byModules[3] || 0;
    const conv3 = totalStudents > 0 ? (mod3 / totalStudents) * 100 : 0;
    const conv2to3 = mod2Plus > 0 ? (mod3 / mod2Plus) * 100 : 0;
    console.log(`   3️⃣  Завершили ВСЁ (Модуль 3): ${mod3} студентов (${conv3.toFixed(1)}% от всех, ${conv2to3.toFixed(1)}% от прошедших М2)`);

    console.log('\n📊 ДЕТАЛЬНАЯ СТАТИСТИКА:\n');
    console.log(`   Всего студентов: ${totalStudents}`);
    console.log(`   Не завершили ничего: ${mod0} (${((mod0/totalStudents)*100).toFixed(1)}%)`);
    console.log(`   Завершили 1+ модулей: ${mod1Plus} (${conv1.toFixed(1)}%)`);
    console.log(`   Завершили 2+ модулей: ${mod2Plus} (${conv2.toFixed(1)}%)`);
    console.log(`   Завершили все 3 модуля: ${mod3} (${conv3.toFixed(1)}%)`);

    console.log('\n🎯 КОНВЕРСИЯ НА КАЖДОМ ШАГЕ:\n');
    console.log(`   Регистрация → Модуль 1: ${conv1.toFixed(1)}%`);
    console.log(`   Модуль 1 → Модуль 2: ${conv1to2.toFixed(1)}%`);
    console.log(`   Модуль 2 → Модуль 3: ${conv2to3.toFixed(1)}%`);
    console.log(`   Регистрация → Завершение: ${conv3.toFixed(1)}%`);

    // Проверка данных студентов (первые 10)
    console.log('\n👥 ПЕРВЫЕ 10 СТУДЕНТОВ:\n');

    const userIds = profiles.slice(0, 10).map(p => p.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);

    profiles.slice(0, 10).forEach((p, i) => {
      const user = users?.find(u => u.id === p.user_id);
      console.log(`   ${i + 1}. ${user?.email || 'N/A'}`);
      console.log(`      Имя: ${user?.full_name || 'Не указано'}`);
      console.log(`      Прогресс: ${Math.round(p.completion_percentage || 0)}% (${p.modules_completed}/3 модулей)`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════');
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА!');
    console.log('═══════════════════════════════════════════\n');

  } catch (err: any) {
    console.error('\n❌ ОШИБКА:', err.message);
    process.exit(1);
  }
}

checkFunnelAnalytics();
