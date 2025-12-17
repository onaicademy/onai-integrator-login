/**
 * 🔄 RESET ALL TRIPWIRE STUDENTS PROGRESS
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
 * - Admin: saint@onaiacademy.kz
 * - Sales менеджеры (если есть)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

// ⚠️  Исключаем этих пользователей (admin + sales managers)
const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetAllStudentsProgress() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY);
  
  console.log('\n🔥🔥🔥 RESET ALL STUDENTS PROGRESS 🔥🔥🔥\n');
  console.log('⚠️  WARNING: Этот скрипт УДАЛИТ ВСЕ данные прогресса студентов!\n');
  console.log('Что будет удалено:');
  console.log('  - Весь прогресс по урокам (tripwire_progress)');
  console.log('  - Все разблокировки модулей (module_unlocks)');
  console.log('  - Все достижения (user_achievements)');
  console.log('  - Все сертификаты (certificates)\n');
  
  // 1. Получить всех студентов (кроме исключенных)
  const { data: students, error: studentsError } = await supabase
    .from('tripwire_users')
    .select('id, user_id, email, full_name');
  
  if (studentsError) {
    console.error('❌ Ошибка получения студентов:', studentsError);
    process.exit(1);
  }
  
  // Фильтруем исключенных
  const studentsToReset = students.filter(s => !EXCLUDED_EMAILS.includes(s.email));
  const excludedStudents = students.filter(s => EXCLUDED_EMAILS.includes(s.email));
  
  console.log(`📊 Найдено студентов: ${students.length}`);
  console.log(`   - Будет сброшено: ${studentsToReset.length}`);
  console.log(`   - Исключено: ${excludedStudents.length} (${excludedStudents.map(s => s.email).join(', ')})\n`);
  
  console.log('⚠️  АВТОМАТИЧЕСКИЙ ЗАПУСК (без подтверждения)');
  console.log('🔄 Начинаю сброс через 2 секунды...\n');
  
  // Даём 2 секунды чтобы прервать если нужно (Ctrl+C)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const studentIds = studentsToReset.map(s => s.id);
  
  // ============================================
  // STEP 1: Удаляем весь прогресс
  // ============================================
  console.log('🗑️  [1/5] Удаляю прогресс по урокам (tripwire_progress)...');
  const { error: deleteProgressError } = await supabase
    .from('tripwire_progress')
    .delete()
    .in('tripwire_user_id', studentIds);
  
  if (deleteProgressError) {
    console.error('❌ Ошибка удаления прогресса:', deleteProgressError);
  } else {
    console.log('   ✅ Прогресс удален');
  }
  
  // ============================================
  // STEP 2: Удаляем все разблокировки модулей
  // ============================================
  console.log('🗑️  [2/5] Удаляю разблокировки модулей (module_unlocks)...');
  const { error: deleteUnlocksError } = await supabase
    .from('module_unlocks')
    .delete()
    .in('tripwire_user_id', studentIds);
  
  if (deleteUnlocksError) {
    console.error('❌ Ошибка удаления разблокировок:', deleteUnlocksError);
  } else {
    console.log('   ✅ Разблокировки удалены');
  }
  
  // ============================================
  // STEP 3: Удаляем все достижения
  // ============================================
  console.log('🗑️  [3/5] Удаляю достижения (user_achievements)...');
  const { error: deleteAchievementsError } = await supabase
    .from('user_achievements')
    .delete()
    .in('tripwire_user_id', studentIds);
  
  if (deleteAchievementsError) {
    console.error('❌ Ошибка удаления достижений:', deleteAchievementsError);
  } else {
    console.log('   ✅ Достижения удалены');
  }
  
  // ============================================
  // STEP 4: Удаляем все сертификаты
  // ============================================
  console.log('🗑️  [4/5] Удаляю сертификаты (certificates)...');
  const { error: deleteCertificatesError } = await supabase
    .from('certificates')
    .delete()
    .in('tripwire_user_id', studentIds);
  
  if (deleteCertificatesError) {
    console.error('❌ Ошибка удаления сертификатов:', deleteCertificatesError);
  } else {
    console.log('   ✅ Сертификаты удалены');
  }
  
  // ============================================
  // STEP 5: Создаем начальное состояние
  // ============================================
  console.log('✨ [5/5] Создаю начальное состояние для всех студентов...\n');
  
  for (const student of studentsToReset) {
    console.log(`   Processing: ${student.full_name} (${student.email})`);
    
    // Создать прогресс для урока 67 (модуль 1) - 0%
    const { error: progressError } = await supabase
      .from('tripwire_progress')
      .insert({
        tripwire_user_id: student.id,
        lesson_id: 67,
        progress_percentage: 0,
        is_completed: false,
        last_position_seconds: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (progressError) {
      console.error(`   ❌ Ошибка создания прогресса:`, progressError.message);
    } else {
      console.log(`   ✅ Прогресс создан (урок 67: 0%)`);
    }
    
    // Разблокировать только модуль 1 (ID: 16)
    const { error: unlockError } = await supabase
      .from('module_unlocks')
      .insert({
        tripwire_user_id: student.id,
        module_id: 16,
        unlocked_at: new Date().toISOString()
      });
    
    if (unlockError) {
      console.error(`   ❌ Ошибка разблокировки модуля 1:`, unlockError.message);
    } else {
      console.log(`   ✅ Модуль 1 (ID: 16) разблокирован\n`);
    }
  }
  
  console.log('\n✅ ВСЁ ГОТОВО! Прогресс сброшен для всех студентов.');
  console.log(`\n📊 Итого обработано: ${studentsToReset.length} студентов`);
  console.log('\n🎯 Начальное состояние:');
  console.log('   - Модуль 1 (ID: 16, урок 67): ОТКРЫТ, прогресс 0%');
  console.log('   - Модули 2-3: ЗАБЛОКИРОВАНЫ');
  console.log('   - Достижения: НЕТ');
  console.log('   - Сертификаты: НЕТ\n');
  
  rl.close();
}

// Запуск
resetAllStudentsProgress()
  .catch(error => {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    rl.close();
    process.exit(1);
  });
