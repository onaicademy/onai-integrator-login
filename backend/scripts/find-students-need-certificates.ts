#!/usr/bin/env tsx
/**
 * Поиск студентов, которые завершили 3/3 модуля, но не получили сертификат
 *
 * Использование:
 *   npx tsx scripts/find-students-need-certificates.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || '';
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Tripwire Supabase credentials');
  process.exit(1);
}

const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 ПОИСК СТУДЕНТОВ БЕЗ СЕРТИФИКАТОВ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Получаем всех студентов с завершёнными модулями
  const { data: profiles, error: profileError } = await supabase
    .from('tripwire_user_profile')
    .select('user_id, modules_completed, certificate_issued, completion_percentage')
    .eq('modules_completed', 3)
    .eq('certificate_issued', false);

  if (profileError) {
    console.error('❌ Ошибка получения профилей:', profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ Все студенты с 3/3 модулями уже получили сертификаты!\n');
    console.log('   Нет студентов, требующих ручной выдачи.\n');
    return;
  }

  console.log(`🎓 Найдено студентов без сертификата: ${profiles.length}\n`);

  // 2. Для каждого студента получаем детальную информацию
  const studentsNeedingCerts = [];

  for (const profile of profiles) {
    // Получаем email и имя
    const { data: user, error: userError } = await supabase
      .from('tripwire_users')
      .select('email, full_name')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (userError || !user) {
      console.log(`⚠️ Студент ${profile.user_id}: не найден в tripwire_users`);
      continue;
    }

    // Проверяем прогресс по модулям
    const { data: progress, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('module_id, is_completed')
      .eq('tripwire_user_id', profile.user_id)
      .eq('is_completed', true);

    if (progressError) {
      console.log(`⚠️ Студент ${user.email}: ошибка получения прогресса`);
      continue;
    }

    const completedModules = new Set(progress?.map(p => p.module_id) || []);

    // Проверяем что действительно завершены модули 16, 17, 18
    const hasModule16 = completedModules.has(16);
    const hasModule17 = completedModules.has(17);
    const hasModule18 = completedModules.has(18);
    const allModulesCompleted = hasModule16 && hasModule17 && hasModule18;

    if (allModulesCompleted) {
      studentsNeedingCerts.push({
        user_id: profile.user_id,
        email: user.email,
        full_name: user.full_name,
        modules_completed: profile.modules_completed,
        completion_percentage: profile.completion_percentage,
      });
    }
  }

  // 3. Выводим результаты
  if (studentsNeedingCerts.length === 0) {
    console.log('✅ Нет студентов, требующих выдачи сертификата\n');
    return;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📋 СТУДЕНТЫ БЕЗ СЕРТИФИКАТА (${studentsNeedingCerts.length})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  studentsNeedingCerts.forEach((student, index) => {
    console.log(`${index + 1}. ${student.full_name}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   User ID: ${student.user_id}`);
    console.log(`   Прогресс: ${student.modules_completed}/3 модулей (${student.completion_percentage}%)`);
    console.log('');
  });

  // 4. Предлагаем автоматическую выдачу
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 РЕКОМЕНДАЦИИ');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Для выдачи сертификата каждому студенту, выполните:\n');

  studentsNeedingCerts.forEach(student => {
    console.log(`# ${student.full_name} (${student.email})`);
    console.log(`STUDENT_USER_ID="${student.user_id}" npx tsx scripts/check-certificate-issue.ts\n`);
  });

  console.log('Или создайте bash скрипт для массовой выдачи.\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(err => {
  console.error('💥 Необработанная ошибка:', err);
  process.exit(1);
});
