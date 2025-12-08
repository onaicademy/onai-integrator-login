import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../backend/.env' });

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!
);

async function check() {
  console.log('📊 CHECKING PROGRESS FOR icekvup@gmail.com\n');
  
  // Get user
  const { data: tripwireUser } = await tripwireSupabase
    .from('tripwire_users')
    .select('id, user_id, email')
    .eq('email', 'icekvup@gmail.com')
    .single();
  
  if (!tripwireUser) {
    console.error('❌ User not found!');
    return;
  }
  
  console.log('👤 User:', tripwireUser);
  console.log('\n');
  
  // Check tripwire_progress
  const { data: progress } = await tripwireSupabase
    .from('tripwire_progress')
    .select('*')
    .eq('lesson_id', 67);
  
  console.log('📝 tripwire_progress for lesson 67:', progress);
  console.log('\n');
  
  // Check module_unlocks
  const { data: unlocks } = await tripwireSupabase
    .from('module_unlocks')
    .select('*')
    .eq('user_id', tripwireUser.user_id)
    .order('unlocked_at', { ascending: false });
  
  console.log('🔓 module_unlocks:', unlocks);
  console.log('\n');
  
  // Check achievements
  const { data: achievements } = await tripwireSupabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', tripwireUser.user_id);
  
  console.log('🏆 user_achievements:', achievements);
}

check().catch(console.error);
