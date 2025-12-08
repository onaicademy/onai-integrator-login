import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function clearProgress() {
  const email = 'icekvup@gmail.com';
  
  console.log(`\n🔄 ПОЛНАЯ ОЧИСТКА ПРОГРЕССА для ${email}...\n`);
  
  // Get user_id
  const { data: user, error: userError } = await tripwireSupabase
    .from('tripwire_users')
    .select('id')
    .eq('email', email)
    .single();
  
  if (userError || !user) {
    console.error('❌ Пользователь не найден:', userError);
    return;
  }
  
  const userId = user.id;
  console.log(`✅ User ID: ${userId}\n`);
  
  // 1. Clear video_tracking
  const { error: e1 } = await tripwireSupabase
    .from('video_tracking')
    .delete()
    .eq('user_id', userId);
  console.log(e1 ? `❌ video_tracking: ${e1.message}` : '✅ video_tracking cleared');
  
  // 2. Clear tripwire_progress
  const { error: e2 } = await tripwireSupabase
    .from('tripwire_progress')
    .delete()
    .eq('user_id', userId);
  console.log(e2 ? `❌ tripwire_progress: ${e2.message}` : '✅ tripwire_progress cleared');
  
  // 3. Clear user_achievements
  const { error: e3 } = await tripwireSupabase
    .from('user_achievements')
    .delete()
    .eq('user_id', userId);
  console.log(e3 ? `❌ user_achievements: ${e3.message}` : '✅ user_achievements cleared');
  
  // 4. Clear module_unlocks
  const { error: e4 } = await tripwireSupabase
    .from('module_unlocks')
    .delete()
    .eq('user_id', userId);
  console.log(e4 ? `❌ module_unlocks: ${e4.message}` : '✅ module_unlocks cleared');
  
  // 5. Reset module 16 as unlocked (вводный модуль)
  const { error: e5 } = await tripwireSupabase
    .from('module_unlocks')
    .insert({
      user_id: userId,
      module_id: 16,
      unlocked_at: new Date().toISOString()
    });
  console.log(e5 ? `❌ Failed to unlock module 16: ${e5.message}` : '✅ Module 16 (вводный) unlocked');
  
  console.log('\n🎉 ОЧИСТКА ЗАВЕРШЕНА!\n');
  process.exit(0);
}

clearProgress();
