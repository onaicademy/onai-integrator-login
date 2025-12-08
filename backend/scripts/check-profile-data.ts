import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SUPABASE_ANON_KEY!
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
  console.log(`   Email: ${tripwireUser.email}`);
  console.log(`   tripwire_users.id: ${tripwireUser.id}`);
  console.log(`   users.id: ${tripwireUser.user_id}`);
  console.log('');
  
  // Check tripwire_progress
  const { data: progress } = await tripwireSupabase
    .from('tripwire_progress')
    .select('*')
    .eq('tripwire_user_id', tripwireUser.user_id)
    .eq('is_completed', true);
  
  console.log(`📝 Completed lessons: ${progress?.length || 0}`);
  if (progress && progress.length > 0) {
    progress.forEach(p => {
      console.log(`   - Lesson ${p.lesson_id} (Module ${p.module_id})`);
    });
  }
  console.log('');
  
  // Check module_unlocks
  const { data: unlocks } = await tripwireSupabase
    .from('module_unlocks')
    .select('module_id, unlocked_at')
    .eq('user_id', tripwireUser.user_id)
    .order('module_id');
  
  console.log(`🔓 Unlocked modules: ${unlocks?.length || 0}`);
  if (unlocks && unlocks.length > 0) {
    unlocks.forEach(u => {
      console.log(`   - Module ${u.module_id}`);
    });
  }
  console.log('');
  
  // Check achievements
  const { data: achievements } = await tripwireSupabase
    .from('user_achievements')
    .select('achievement_id, is_completed')
    .eq('user_id', tripwireUser.user_id)
    .eq('is_completed', true);
  
  console.log(`🏆 Achievements: ${achievements?.length || 0}`);
  if (achievements && achievements.length > 0) {
    achievements.forEach(a => {
      console.log(`   - ${a.achievement_id}`);
    });
  }
}

check().catch(console.error);
