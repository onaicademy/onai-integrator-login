import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;
const supabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function fullReset(email: string) {
  console.log(`🔄 ПОЛНАЯ ОЧИСТКА ПРОГРЕССА для ${email}...`);
  console.log('');

  try {
    // 1. Найти пользователя
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = userData.users.find(u => u.email === email);
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = user.id;
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   UUID: ${userId}`);
    console.log('');

    // 2. Удаляем прогресс видео из video_tracking
    const { error: videoError } = await supabase
      .from('video_tracking')
      .delete()
      .eq('user_id', userId);
    
    if (videoError) {
      console.log('⚠️ video_tracking:', videoError.message);
    } else {
      console.log('✅ Deleted video_tracking (прогресс просмотра)');
    }

    // 3. Удаляем прогресс из tripwire_progress
    const { error: progressError } = await supabase
      .from('tripwire_progress')
      .delete()
      .eq('tripwire_user_id', userId);
    
    if (progressError) {
      console.log('⚠️ tripwire_progress:', progressError.message);
    } else {
      console.log('✅ Deleted tripwire_progress (завершенные уроки)');
    }

    // 4. Удаляем достижения из tripwire_achievements
    const { error: achievementsError } = await supabase
      .from('tripwire_achievements')
      .delete()
      .eq('user_id', userId);
    
    if (achievementsError) {
      console.log('⚠️ tripwire_achievements:', achievementsError.message);
    } else {
      console.log('✅ Deleted tripwire_achievements');
    }

    // 5. Удаляем из user_achievements
    const { error: userAchievementsError } = await supabase
      .from('user_achievements')
      .delete()
      .eq('user_id', userId);
    
    if (userAchievementsError) {
      console.log('⚠️ user_achievements:', userAchievementsError.message);
    } else {
      console.log('✅ Deleted user_achievements');
    }

    // 6. Удаляем разблокировки модулей
    const { error: unlocksError } = await supabase
      .from('module_unlocks')
      .delete()
      .eq('user_id', userId);
    
    if (unlocksError) {
      console.log('⚠️ module_unlocks:', unlocksError.message);
    } else {
      console.log('✅ Deleted module_unlocks');
    }

    // 7. Блокируем модули 17 и 18
    const { error: lockError } = await supabase
      .from('tripwire_modules')
      .update({ is_locked: true })
      .in('id', [17, 18]);
    
    if (lockError) {
      console.log('⚠️ Locking modules:', lockError.message);
    } else {
      console.log('✅ Locked modules 17 and 18');
    }

    // 8. Разблокируем модуль 16
    const { error: unlockError } = await supabase
      .from('tripwire_modules')
      .update({ is_locked: false })
      .eq('id', 16);
    
    if (unlockError) {
      console.log('⚠️ Unlocking module 16:', unlockError.message);
    } else {
      console.log('✅ Unlocked module 16');
    }

    console.log('');
    console.log('🎉 ПОЛНАЯ ОЧИСТКА ЗАВЕРШЕНА!');
    console.log('');
    console.log('📋 Что было очищено:');
    console.log('  ✅ video_tracking - весь прогресс просмотра видео');
    console.log('  ✅ tripwire_progress - все завершенные уроки');
    console.log('  ✅ tripwire_achievements - все достижения');
    console.log('  ✅ user_achievements - все достижения');
    console.log('  ✅ module_unlocks - все разблокировки модулей');
    console.log('  ✅ Модули 17, 18 заблокированы');
    console.log('  ✅ Модуль 16 разблокирован');
    console.log('');
    console.log('🔄 Теперь сделайте Hard Refresh (Cmd+Shift+R) в браузере');
    console.log('');
    
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fullReset('icekvup@gmail.com');
