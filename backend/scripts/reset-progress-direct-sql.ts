/**
 * 🔄 RESET STUDENT PROGRESS - DIRECT SQL
 * Использует прямое PostgreSQL подключение для обхода Supabase REST API
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const { Pool } = pg;

const EXCLUDED_EMAILS = [
  'smmmcwin@gmail.com',       // Admin (Alexander CEO)
  'rakhat@onaiacademy.kz',    // Sales Manager 1
  'amina@onaiacademy.kz',     // Sales Manager 2
];

async function resetProgressDirectSQL() {
  const pool = new Pool({
    connectionString: process.env.TRIPWIRE_DATABASE_URL,
  });

  try {
    console.log('\n🔥🔥🔥 RESET PROGRESS - DIRECT SQL 🔥🔥🔥\n');

    // 1. Получить всех студентов (кроме исключенных, с user_id NOT NULL)
    const studentsQuery = `
      SELECT id, user_id, email, full_name
      FROM tripwire_users
      WHERE email NOT IN ($1, $2, $3)
        AND user_id IS NOT NULL
      ORDER BY created_at DESC
    `;

    const { rows: students } = await pool.query(studentsQuery, EXCLUDED_EMAILS);

    console.log(`📊 Найдено студентов: ${students.length}\n`);
    console.log('⚠️  Начинаю сброс через 2 секунды...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const tripwireUserIds = students.map(s => s.id);
    const authUserIds = students.map(s => s.user_id);

    // 2. DELETE tripwire_progress
    console.log('🗑️  [1/5] Удаляю tripwire_progress...');
    const deleteProgress = await pool.query(
      'DELETE FROM tripwire_progress WHERE tripwire_user_id = ANY($1::uuid[])',
      [tripwireUserIds]
    );
    console.log(`   ✅ Удалено: ${deleteProgress.rowCount} записей\n`);

    // 3. DELETE module_unlocks
    console.log('🗑️  [2/5] Удаляю module_unlocks...');
    const deleteUnlocks = await pool.query(
      'DELETE FROM module_unlocks WHERE user_id = ANY($1::uuid[])',
      [authUserIds]
    );
    console.log(`   ✅ Удалено: ${deleteUnlocks.rowCount} записей\n`);

    // 4. DELETE user_achievements
    console.log('🗑️  [3/5] Удаляю user_achievements...');
    const deleteAchievements = await pool.query(
      'DELETE FROM user_achievements WHERE user_id = ANY($1::uuid[])',
      [authUserIds]
    );
    console.log(`   ✅ Удалено: ${deleteAchievements.rowCount} записей\n`);

    // 5. DELETE certificates
    console.log('🗑️  [4/5] Удаляю certificates...');
    const deleteCertificates = await pool.query(
      'DELETE FROM certificates WHERE user_id = ANY($1::uuid[])',
      [authUserIds]
    );
    console.log(`   ✅ Удалено: ${deleteCertificates.rowCount} записей\n`);

    // 6. INSERT начальные данные
    console.log('✨ [5/5] Создаю начальное состояние...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const student of students) {
      try {
        // INSERT в tripwire_progress
        await pool.query(`
          INSERT INTO tripwire_progress (
            tripwire_user_id, lesson_id, module_id, is_completed,
            watch_time_seconds, last_position_seconds, video_progress_percent,
            video_qualified_for_completion, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [student.id, 67, 16, false, 0, 0, 0, false]);

        // INSERT в module_unlocks
        await pool.query(`
          INSERT INTO module_unlocks (user_id, module_id, unlocked_at)
          VALUES ($1, $2, NOW())
        `, [student.user_id, 16]);

        console.log(`   ✅ ${student.full_name} (${student.email})`);
        successCount++;
      } catch (err: any) {
        console.error(`   ❌ ${student.email}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ СБРОС ЗАВЕРШЕН!');
    console.log('═══════════════════════════════════════════\n');
    console.log(`📊 Статистика:`);
    console.log(`   • Обработано: ${students.length}`);
    console.log(`   • Успешно: ${successCount} ✅`);
    console.log(`   • Ошибок: ${errorCount} ❌\n`);

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

resetProgressDirectSQL();
