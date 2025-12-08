import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function findUserId() {
  const email = 'icekvup@gmail.com';
  
  console.log('\n🔍 ПОИСК USER_ID...\n');
  
  // Check tripwire_users
  const { data: tripwireUser } = await tripwireSupabase
    .from('tripwire_users')
    .select('id, email, user_id')
    .eq('email', email)
    .single();
  
  console.log('tripwire_users:', JSON.stringify(tripwireUser, null, 2));
  
  // Check users table
  const { data: users } = await tripwireSupabase
    .from('users')
    .select('*')
    .eq('email', email);
  
  console.log('\nusers table:', JSON.stringify(users, null, 2));
  
  // Check existing module_unlocks
  const { data: unlocks } = await tripwireSupabase
    .from('module_unlocks')
    .select('*')
    .limit(3);
  
  console.log('\nSample module_unlocks:', JSON.stringify(unlocks, null, 2));
  
  process.exit(0);
}

findUserId();
