import { tripwirePool } from '../src/config/tripwire-db';

async function resetProgress() {
  console.log('🔄 Resetting progress for icekvup@gmail.com...');

  try {
    // 1. Найти UUID пользователя
    const userResult = await tripwirePool.query(`
      SELECT id, email FROM auth.users WHERE email = 'icekvup@gmail.com'
    `);

    if (userResult.rows.length === 0) {
      console.error('❌ User not found: icekvup@gmail.com');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`✅ Found user: ${userResult.rows[0].email} (UUID: ${userId})`);

    // 2. Удаляем прогресс видео из tripwire_progress
    await tripwirePool.query(`DELETE FROM tripwire_progress WHERE tripwire_user_id = $1`, [userId]);
    console.log('✅ Deleted tripwire_progress records');

    // 3. Удаляем достижения из user_achievements
    await tripwirePool.query(`DELETE FROM user_achievements WHERE user_id = $1`, [userId]);
    console.log('✅ Deleted user_achievements');

    // 4. Удаляем достижения из tripwire_achievements
    await tripwirePool.query(`DELETE FROM tripwire_achievements WHERE user_id = $1`, [userId]);
    console.log('✅ Deleted tripwire_achievements');

    // 5. Удаляем разблокировки модулей из module_unlocks
    await tripwirePool.query(`DELETE FROM module_unlocks WHERE user_id = $1`, [userId]);
    console.log('✅ Deleted module_unlocks');

    // 6. Блокируем все модули кроме первого (16)
    await tripwirePool.query(`
      UPDATE tripwire_modules
      SET is_locked = CASE WHEN id = 16 THEN false ELSE true END
    `);
    console.log('✅ Locked modules 17 and 18, unlocked module 16');

    // 7. Создаем начальный прогресс для Module 16, Lesson 67
    await tripwirePool.query(`
      INSERT INTO tripwire_progress (
        tripwire_user_id, module_id, lesson_id, is_completed, created_at, updated_at
      )
      VALUES ($1, 16, 67, FALSE, NOW(), NOW())
      ON CONFLICT (tripwire_user_id, lesson_id) DO NOTHING
    `, [userId]);
    console.log('✅ Created initial progress for Module 16');

    console.log('🎉 Progress reset complete for icekvup@gmail.com!');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetProgress();
