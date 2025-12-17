/**
 * 🔄 RESET ALL TRIPWIRE STUDENTS PROGRESS (FIXED SCHEMA)
 * 
 * ⚠️  КРИТИЧНО: Этот скрипт ПОЛНОСТЬЮ СБРАСЫВАЕТ прогресс ВСЕХ студентов!
 * 
 * Что делает:
 * 1. Удаляет ВСЕ записи из tripwire_progress
 * 2. Удаляет ВСЕ записи из module_unlocks
 * 3. Удаляет ВСЕ записи из user_achievements
 * 4. Удаляет ВСЕ записи из certificates
 * 5. Создает начальный прогресс для урока 67 (0%)
 * 6. Разблокирует ТОЛЬКО модуль 1 (ID: 16) для всех
 * 
 * Исключения:
 * - Admin: smmmcwin@gmail.com (Alexander CEO)
 * - Sales Manager 1: rakhat@onaiacademy.kz
 * - Sales Manager 2: amina@onaiacademy.kz
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

// ⚠️  Исключаем этих пользователей (admin + sales managers)
const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO) ✅
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
];

async function resetAllStudentsProgress() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);
  
  console.log('\n🔥🔥🔥 RESET ALL STUDENTS PROGRESS (FIXED SCHEMA) 🔥🔥🔥\n');
  console.log('⚠️  WARNING: Этот скрипт УДАЛИТ ВСЕ данные прогресса студентов!\n');
  console.log('Что будет удалено:');
  console.log('  - Весь прогресс по урокам (tripwire_progress)');
  console.log('  - Все разблокировки модулей (module_unlocks)');
  console.log('  - Все достижения (user_achievements)');
  console.log('  - Все сертификаты (certificates)\n');
  
  // ============================================
  // STEP 1: Получить всех студентов
  // ============================================
  const { data: students, error: studentsError } = await supabase
    .from('tripwire_users')
    .select('id, user_id, email, full_name');
  
  if (studentsError) {
    console.error('❌ Ошибка получения студентов:', studentsError);
    process.exit(1);
  }
  
  // Фильтруем исключенных + студентов без user_id
  const studentsToReset = students.filter(s => 
    !EXCLUDED_EMAILS.includes(s.email) && 
    s.user_id !== null  // ✅ Исключаем студентов без user_id!
  );
  const excludedStudents = students.filter(s => EXCLUDED_EMAILS.includes(s.email));
  
  console.log(`📊 Найдено студентов: ${students.length}`);
  console.log(`   - Будет сброшено: ${studentsToReset.length}`);
  console.log(`   - Исключено: ${excludedStudents.length}`);
  excludedStudents.forEach(s => {
    console.log(`      • ${s.full_name} (${s.email})`);
  });
  console.log('');
  
  console.log('⚠️  АВТОМАТИЧЕСКИЙ ЗАПУСК');
  console.log('🔄 Начинаю сброс через 2 секунды...\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Извлекаем ID для удаления
  const tripwireUserIds = studentsToReset.map(s => s.id);          // Для tripwire_progress
  const authUserIds = studentsToReset.map(s => s.user_id);         // Для module_unlocks, achievements, certificates
  
  console.log(`🔑 Будет удалено для ${tripwireUserIds.length} студентов\n`);
  
  // ============================================
  // STEP 2: Удаляем весь прогресс (tripwire_progress)
  // ============================================
  console.log('🗑️  [1/5] Удаляю прогресс по урокам (tripwire_progress)...');
  const { error: deleteProgressError } = await supabase
    .from('tripwire_progress')
    .delete()
    .in('tripwire_user_id', tripwireUserIds);
  
  if (deleteProgressError) {
    console.error('   ❌ Ошибка:', deleteProgressError.message);
  } else {
    console.log('   ✅ Прогресс удален');
  }
  
  // ============================================
  // STEP 3: Удаляем разблокировки модулей (module_unlocks)
  // ============================================
  console.log('🗑️  [2/5] Удаляю разблокировки модулей (module_unlocks)...');
  const { error: deleteUnlocksError } = await supabase
    .from('module_unlocks')
    .delete()
    .in('user_id', authUserIds);  // ✅ Используем user_id!
  
  if (deleteUnlocksError) {
    console.error('   ❌ Ошибка:', deleteUnlocksError.message);
  } else {
    console.log('   ✅ Разблокировки удалены');
  }
  
  // ============================================
  // STEP 4: Удаляем достижения (user_achievements)
  // ============================================
  console.log('🗑️  [3/5] Удаляю достижения (user_achievements)...');
  const { error: deleteAchievementsError } = await supabase
    .from('user_achievements')
    .delete()
    .in('user_id', authUserIds);  // ✅ Используем user_id!
  
  if (deleteAchievementsError) {
    console.error('   ❌ Ошибка:', deleteAchievementsError.message);
  } else {
    console.log('   ✅ Достижения удалены');
  }
  
  // ============================================
  // STEP 5: Удаляем сертификаты (certificates)
  // ============================================
  console.log('🗑️  [4/5] Удаляю сертификаты (certificates)...');
  const { error: deleteCertificatesError } = await supabase
    .from('certificates')
    .delete()
    .in('user_id', authUserIds);  // ✅ Используем user_id!
  
  if (deleteCertificatesError) {
    console.error('   ❌ Ошибка:', deleteCertificatesError.message);
  } else {
    console.log('   ✅ Сертификаты удалены');
  }
  
  // ============================================
  // STEP 6: Создаем начальное состояние
  // ============================================
  console.log('✨ [5/5] Создаю начальное состояние для всех студентов...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const student of studentsToReset) {
    console.log(`   Processing: ${student.full_name} (${student.email})`);
    
    try {
      // 1. Создать прогресс для урока 67 (модуль 1) - 0%
      const { error: progressError } = await supabase
        .from('tripwire_progress')
        .insert({
          tripwire_user_id: student.id,  // ✅ Используем tripwire_user.id
          lesson_id: 67,
          module_id: 16,
          is_completed: false,
          watch_time_seconds: 0,
          last_position_seconds: 0,
          video_progress_percent: 0,  // ✅ Правильное название!
          video_qualified_for_completion: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (progressError) {
        console.error(`      ❌ Прогресс: ${progressError.message}`);
        errorCount++;
        continue;
      }
      
      // 2. Разблокировать только модуль 1 (ID: 16)
      const { error: unlockError } = await supabase
        .from('module_unlocks')
        .insert({
          user_id: student.user_id,  // ✅ Используем user_id (auth UUID)
          module_id: 16,
          unlocked_at: new Date().toISOString()
        });
      
      if (unlockError) {
        console.error(`      ❌ Разблокировка: ${unlockError.message}`);
        errorCount++;
      } else {
        console.log(`      ✅ Готово (прогресс 0%, модуль 1 открыт)\n`);
        successCount++;
      }
      
    } catch (err: any) {
      console.error(`      ❌ Ошибка:`, err.message);
      errorCount++;
    }
  }
  
  console.log('\n═══════════════════════════════════════════');
  console.log('✅ СБРОС ЗАВЕРШЕН!');
  console.log('═══════════════════════════════════════════\n');
  console.log(`📊 Статистика:`);
  console.log(`   • Всего студентов: ${students.length}`);
  console.log(`   • Исключено (admin/sales): ${excludedStudents.length}`);
  console.log(`   • Обработано: ${studentsToReset.length}`);
  console.log(`   • Успешно: ${successCount} ✅`);
  console.log(`   • Ошибок: ${errorCount} ❌\n`);
  
  console.log('🎯 Начальное состояние для студентов:');
  console.log('   - Модуль 1 (ID: 16, урок 67): ОТКРЫТ, прогресс 0%');
  console.log('   - Модули 2-3: ЗАБЛОКИРОВАНЫ');
  console.log('   - Достижения: НЕТ');
  console.log('   - Сертификаты: НЕТ\n');
}

// Запуск
resetAllStudentsProgress()
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  });
