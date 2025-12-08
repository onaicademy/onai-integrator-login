import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!
);

async function check() {
  const email = 'icekvup@gmail.com';
  
  // Get user
  const { data: tripwireUser } = await tripwireSupabase
    .from('tripwire_users')
    .select('id, user_id, email')
    .eq('email', email)
    .single();
  
  if (!tripwireUser) {
    console.log('❌ User not found!');
    return;
  }
  
  console.log('👤 USER:');
  console.log(`   tripwire_users.id: ${tripwireUser.id}`);
  console.log(`   users.id: ${tripwireUser.user_id}`);
  console.log('');
  
  // Check tripwire_progress
  const { data: progress } = await tripwireSupabase
    .from('tripwire_progress')
    .select('*')
    .eq('tripwire_user_id', tripwireUser.user_id);
  
  console.log(`📝 TRIPWIRE_PROGRESS (tripwire_user_id = users.id):`);
  console.log(`   Записей: ${progress?.length || 0}`);
  if (progress && progress.length > 0) {
    progress.forEach(p => {
      console.log(`   - Lesson ${p.lesson_id}, completed: ${p.is_completed}`);
    });
  }
  console.log('');
  
  // Check module_unlocks
  const { data: unlocks } = await tripwireSupabase
    .from('module_unlocks')
    .select('*')
    .eq('user_id', tripwireUser.user_id);
  
  console.log(`🔓 MODULE_UNLOCKS (user_id = users.id):`);
  console.log(`   Записей: ${unlocks?.length || 0}`);
  if (unlocks && unlocks.length > 0) {
    unlocks.forEach(u => {
      console.log(`   - Module ${u.module_id}`);
    });
  }
  console.log('');
  
  // Check achievements
  const { data: achievements } = await tripwireSupabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', tripwireUser.user_id);
  
  console.log(`🏆 USER_ACHIEVEMENTS (user_id = users.id):`);
  console.log(`   Записей: ${achievements?.length || 0}`);
  if (achievements && achievements.length > 0) {
    achievements.forEach(a => {
      console.log(`   - ${a.achievement_id}, completed: ${a.is_completed}`);
    });
  }
}

check().catch(console.error);
