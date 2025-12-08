import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!TRIPWIRE_URL || !TRIPWIRE_KEY) {
  console.error('❌ Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function resetProgress(email: string) {
  console.log(`🔄 Resetting progress for ${email}...`);

  try {
    // 1. Найти UUID пользователя
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error fetching users:', userError);
      process.exit(1);
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = user.id;
    console.log(`✅ Found user: ${user.email} (UUID: ${userId})`);

    // 2. Удаляем прогресс из tripwire_progress
    const { error: progressError } = await supabase
      .from('tripwire_progress')
      .delete()
      .eq('tripwire_user_id', userId);
    
    if (progressError) {
      console.error('❌ Error deleting tripwire_progress:', progressError);
    } else {
      console.log('✅ Deleted tripwire_progress records');
    }

    // 3. Удаляем достижения из tripwire_achievements
    const { error: achievementsError } = await supabase
      .from('tripwire_achievements')
      .delete()
      .eq('user_id', userId);
    
    if (achievementsError) {
      console.error('❌ Error deleting tripwire_achievements:', achievementsError);
    } else {
      console.log('✅ Deleted tripwire_achievements');
    }

    // 4. Удаляем достижения из user_achievements
    const { error: userAchievementsError } = await supabase
      .from('user_achievements')
      .delete()
      .eq('user_id', userId);
    
    if (userAchievementsError) {
      console.error('❌ Error deleting user_achievements:', userAchievementsError);
    } else {
      console.log('✅ Deleted user_achievements');
    }

    // 5. Удаляем разблокировки модулей из module_unlocks
    const { error: unlocksError } = await supabase
      .from('module_unlocks')
      .delete()
      .eq('user_id', userId);
    
    if (unlocksError) {
      console.error('❌ Error deleting module_unlocks:', unlocksError);
    } else {
      console.log('✅ Deleted module_unlocks');
    }

    // 6. Блокируем модули 17 и 18, оставляем 16 открытым
    const { error: lockError } = await supabase
      .from('tripwire_modules')
      .update({ is_locked: true })
      .in('id', [17, 18]);
    
    if (lockError) {
      console.error('❌ Error locking modules:', lockError);
    } else {
      console.log('✅ Locked modules 17 and 18');
    }

    const { error: unlockError } = await supabase
      .from('tripwire_modules')
      .update({ is_locked: false })
      .eq('id', 16);
    
    if (unlockError) {
      console.error('❌ Error unlocking module 16:', unlockError);
    } else {
      console.log('✅ Unlocked module 16');
    }

    // 7. Создаем начальный прогресс для Module 16, Lesson 67
    const { error: initError } = await supabase
      .from('tripwire_progress')
      .insert({
        tripwire_user_id: userId,
        module_id: 16,
        lesson_id: 67,
        is_completed: false,
        completion_percentage: 0,
        video_progress_percent: 0
      });
    
    if (initError && initError.code !== '23505') { // Ignore duplicate key error
      console.error('❌ Error creating initial progress:', initError);
    } else {
      console.log('✅ Created initial progress for Module 16, Lesson 67');
    }

    console.log('');
    console.log('🎉 Progress reset complete for ' + email + '!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - All lesson progress cleared');
    console.log('  - All achievements cleared');
    console.log('  - Module 16 unlocked (Modules 17-18 locked)');
    console.log('  - Ready for fresh testing!');
    console.log('');
    
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run reset for icekvup@gmail.com
resetProgress('icekvup@gmail.com');
