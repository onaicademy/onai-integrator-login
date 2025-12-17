/**
 * 🔍 ПРОВЕРКА: Активность и прогресс студентов в БД
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

async function checkStudentProgress() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);

  console.log('\n🔍 ПРОВЕРКА: Активность и прогресс студентов\n');

  try {
    // 1. Проверить tripwire_progress (где трекается просмотр уроков)
    console.log('📊 Шаг 1: Проверка tripwire_progress (прогресс по урокам)...');
    
    const { data: progressData, error: progressError } = await supabase
      .from('tripwire_progress')
      .select('tripwire_user_id, lesson_id, video_progress_percent, last_position_seconds, completed, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (progressError) {
      console.log('   ⚠️  Ошибка получения tripwire_progress:', progressError.message);
    } else if (!progressData || progressData.length === 0) {
      console.log('   ⚠️  КРИТИЧНО! Таблица tripwire_progress ПУСТАЯ!');
      console.log('   ❌ Прогресс НЕ ТРЕКАЕТСЯ!');
    } else {
      console.log(`   ✅ Записей в tripwire_progress: ${progressData.length}`);
      console.log('\n   Последние 3 записи:');
      progressData.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. User: ${p.tripwire_user_id.substring(0, 8)}... | Lesson: ${p.lesson_id} | Progress: ${p.video_progress_percent}% | Completed: ${p.completed}`);
      });
    }

    // 2. Проверить module_unlocks (разблокировка модулей)
    console.log('\n📊 Шаг 2: Проверка module_unlocks (разблокировка модулей)...');
    
    const { data: unlocksData, error: unlocksError } = await supabase
      .from('module_unlocks')
      .select('user_id, module_id, unlocked, completed, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (unlocksError) {
      console.log('   ⚠️  Ошибка получения module_unlocks:', unlocksError.message);
    } else if (!unlocksData || unlocksData.length === 0) {
      console.log('   ⚠️  КРИТИЧНО! Таблица module_unlocks ПУСТАЯ!');
    } else {
      console.log(`   ✅ Записей в module_unlocks: ${unlocksData.length}`);
      console.log('\n   Последние 3 записи:');
      unlocksData.slice(0, 3).forEach((u, i) => {
        console.log(`   ${i + 1}. User: ${u.user_id.substring(0, 8)}... | Module: ${u.module_id} | Unlocked: ${u.unlocked} | Completed: ${u.completed}`);
      });
    }

    // 3. Получить реальных студентов (без admin и sales)
    console.log('\n📊 Шаг 3: Получение реальных студентов (без admin/sales)...');
    
    const { data: excludedUsers } = await supabase
      .from('tripwire_users')
      .select('user_id, email')
      .in('email', EXCLUDED_EMAILS)
      .not('user_id', 'is', null);

    const excludedUserIds = excludedUsers?.map(u => u.user_id) || [];

    // Получить всех студентов
    const { data: allStudents, error: studentsError } = await supabase
      .from('tripwire_users')
      .select('id, user_id, email, full_name, created_at')
      .not('user_id', 'is', null)
      .order('created_at', { ascending: true });

    if (studentsError) throw studentsError;

    // Фильтровать студентов (без admin/sales)
    const students = allStudents?.filter(s => !excludedUserIds.includes(s.user_id)) || [];

    console.log(`   ✅ Всего студентов (без admin/sales): ${students.length}`);

    // 4. Проверить прогресс для каждого студента
    console.log('\n📊 Шаг 4: Анализ прогресса студентов...\n');

    let studentsWithProgress = 0;
    let studentsWithoutProgress = 0;
    let studentsWithCompletedModules = 0;

    for (const student of students.slice(0, 10)) {  // Проверяем первых 10
      // Получить прогресс из tripwire_progress
      const { data: studentProgress } = await supabase
        .from('tripwire_progress')
        .select('lesson_id, video_progress_percent, completed')
        .eq('tripwire_user_id', student.user_id);

      const hasProgress = studentProgress && studentProgress.length > 0;
      const completedLessons = studentProgress?.filter(p => p.completed).length || 0;

      if (hasProgress) {
        studentsWithProgress++;
      } else {
        studentsWithoutProgress++;
      }

      console.log(`   ${student.email}`);
      console.log(`      Уроков просмотрено: ${studentProgress?.length || 0}`);
      console.log(`      Уроков завершено: ${completedLessons}`);
      console.log(`      Статус: ${hasProgress ? '✅ Прогресс есть' : '⚠️  Прогресса нет'}\n`);

      // Проверить разблокированные модули
      const { data: studentModules } = await supabase
        .from('module_unlocks')
        .select('module_id, unlocked, completed')
        .eq('user_id', student.user_id);

      const completedModules = studentModules?.filter(m => m.completed).length || 0;
      
      if (completedModules > 0) {
        studentsWithCompletedModules++;
      }

      console.log(`      Модулей разблокировано: ${studentModules?.length || 0}`);
      console.log(`      Модулей завершено: ${completedModules}\n`);
    }

    // 5. Итоговая статистика
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ ПРОВЕРКА ЗАВЕРШЕНА!');
    console.log('═══════════════════════════════════════════\n');

    console.log('📊 СТАТИСТИКА (из первых 10 студентов):');
    console.log(`   • Всего студентов: ${students.length}`);
    console.log(`   • С прогрессом: ${studentsWithProgress} ✅`);
    console.log(`   • Без прогресса: ${studentsWithoutProgress} ${studentsWithoutProgress > 0 ? '⚠️' : '✅'}`);
    console.log(`   • С завершенными модулями: ${studentsWithCompletedModules}\n`);

    if (progressData && progressData.length > 0) {
      console.log('✅ ВЫВОД: Прогресс ТРЕКАЕТСЯ корректно!');
      console.log(`   • tripwire_progress: ${progressData.length} записей`);
      console.log(`   • module_unlocks: ${unlocksData?.length || 0} записей`);
      console.log('\n✅ Админка может показывать прогресс студентов!');
    } else {
      console.log('❌ КРИТИЧНО: Прогресс НЕ ТРЕКАЕТСЯ!');
      console.log('   • tripwire_progress: ПУСТАЯ');
      console.log('   • Нужно проверить логику сохранения прогресса в TripwireLesson.tsx');
    }

    console.log('');

  } catch (err: any) {
    console.error('\n❌ ОШИБКА:', err.message);
    process.exit(1);
  }
}

checkStudentProgress();
