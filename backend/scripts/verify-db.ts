import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const url = process.env.TRIPWIRE_SUPABASE_URL || '';
const key = process.env.TRIPWIRE_SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function verify() {
  console.log('🔍 ПРОВЕРКА СИНХРОНИЗАЦИИ БД для icekvup@gmail.com\n');
  
  // 1. Get user IDs
  const { data: tripwireUser } = await supabase
    .from('tripwire_users')
    .select('id, user_id, email')
    .eq('email', 'icekvup@gmail.com')
    .single();
  
  if (!tripwireUser) {
    console.error('❌ Пользователь не найден!');
    return;
  }
  
  console.log('👤 USER IDs:');
  console.log(`   tripwire_users.id: ${tripwireUser.id}`);
  console.log(`   users.id (user_id): ${tripwireUser.user_id}`);
  console.log('');
  
  // 2. Check tripwire_progress (should be empty)
  const { data: progress, count: progressCount } = await supabase
    .from('tripwire_progress')
    .select('*', { count: 'exact' })
    .eq('tripwire_user_id', tripwireUser.user_id);
  
  console.log(`📝 tripwire_progress: ${progressCount} записей`);
  if (progressCount && progressCount > 0) {
    console.log('   ⚠️ ДОЛЖНО БЫТЬ 0!');
    console.log('   Записи:', progress);
  } else {
    console.log('   ✅ Пусто (корректно)');
  }
  console.log('');
  
  // 3. Check module_unlocks (should have only module 16)
  const { data: unlocks, count: unlocksCount } = await supabase
    .from('module_unlocks')
    .select('module_id, unlocked_at', { count: 'exact' })
    .eq('user_id', tripwireUser.user_id)
    .order('module_id');
  
  console.log(`🔓 module_unlocks: ${unlocksCount} записей`);
  if (unlocksCount === 1 && unlocks?.[0]?.module_id === 16) {
    console.log('   ✅ Только модуль 16 разблокирован (корректно)');
  } else {
    console.log('   ⚠️ Ожидался только модуль 16!');
    console.log('   Модули:', unlocks?.map(u => u.module_id));
  }
  console.log('');
  
  // 4. Check user_achievements (should be empty)
  const { data: achievements, count: achievementsCount } = await supabase
    .from('user_achievements')
    .select('*', { count: 'exact' })
    .eq('user_id', tripwireUser.user_id);
  
  console.log(`🏆 user_achievements: ${achievementsCount} записей`);
  if (achievementsCount && achievementsCount > 0) {
    console.log('   ⚠️ ДОЛЖНО БЫТЬ 0!');
    console.log('   Достижения:', achievements);
  } else {
    console.log('   ✅ Пусто (корректно)');
  }
  console.log('');
  
  // 5. Check video_tracking (should be empty)
  const { data: videoTracking, count: videoCount } = await supabase
    .from('video_tracking')
    .select('*', { count: 'exact' })
    .eq('user_id', tripwireUser.user_id);
  
  console.log(`📹 video_tracking: ${videoCount} записей`);
  if (videoCount && videoCount > 0) {
    console.log('   ⚠️ ДОЛЖНО БЫТЬ 0!');
    console.log('   Записи:', videoTracking);
  } else {
    console.log('   ✅ Пусто (корректно)');
  }
  console.log('');
  
  // 6. Summary
  const allCorrect = 
    (progressCount === 0) &&
    (unlocksCount === 1 && unlocks?.[0]?.module_id === 16) &&
    (achievementsCount === 0) &&
    (videoCount === 0);
  
  console.log('═══════════════════════════════════════════════');
  if (allCorrect) {
    console.log('✅ ВСЕ СИНХРОНИЗИРОВАНО КОРРЕКТНО!');
    console.log('📋 Состояние:');
    console.log('   • Прогресс: ПУСТО ✅');
    console.log('   • Разблокировано: ТОЛЬКО модуль 16 ✅');
    console.log('   • Достижения: ПУСТО ✅');
    console.log('   • Video tracking: ПУСТО ✅');
  } else {
    console.log('⚠️ НАЙДЕНЫ НЕСООТВЕТСТВИЯ!');
  }
  console.log('═══════════════════════════════════════════════');
}

verify().catch(console.error);
