import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const email = 'icekvup@gmail.com';
  
  // Get user IDs
  const { data: tripwireUser } = await tripwireSupabase
    .from('tripwire_users')
    .select('id, user_id, email')
    .eq('email', email)
    .single();
  
  if (!tripwireUser) {
    console.log('❌ User not found!');
    return;
  }
  
  console.log('👤 USER IDs:');
  console.log(`   tripwire_users.id: ${tripwireUser.id}`);
  console.log(`   users.id (user_id): ${tripwireUser.user_id}`);
  console.log('');
  
  // Check user_achievements
  const { data: achievements, error: achError } = await tripwireSupabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', tripwireUser.user_id);
  
  console.log('🏆 USER_ACHIEVEMENTS (user_id = users.id):');
  console.log(`   Total: ${achievements?.length || 0}`);
  if (achievements && achievements.length > 0) {
    achievements.forEach(a => {
      console.log(`   - ${a.achievement_id}: completed=${a.is_completed}, current=${a.current_value}, target=${a.target_value}`);
    });
  } else if (achError) {
    console.log(`   ERROR: ${achError.message}`);
  } else {
    console.log('   ❌ NO ACHIEVEMENTS FOUND!');
  }
  console.log('');
  
  // Check what achievement IDs exist
  const { data: achDefs } = await tripwireSupabase
    .from('tripwire_achievements')
    .select('id, name');
  
  console.log('📋 AVAILABLE ACHIEVEMENTS:');
  achDefs?.forEach(a => {
    console.log(`   - ${a.id}: ${a.name}`);
  });
}

check().catch(console.error);
