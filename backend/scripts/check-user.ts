import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function checkUser() {
  const email = 'icekvup@gmail.com';
  
  console.log(`\n🔍 Проверка пользователя ${email}...\n`);
  
  // Check tripwire_users
  const { data: tripwireUser } = await tripwireSupabase
    .from('tripwire_users')
    .select('*')
    .eq('email', email)
    .single();
  
  console.log('tripwire_users:', JSON.stringify(tripwireUser, null, 2));
  
  // List all auth users  
  const { data: authData, error } = await tripwireSupabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error listing users:', error);
  } else {
    const userMatch = authData.users.find((u: any) => u.email === email);
    console.log('\nauth.users match:', userMatch ? 'FOUND' : 'NOT FOUND');
    if (userMatch) {
      console.log('Auth user:', JSON.stringify({
        id: userMatch.id,
        email: userMatch.email,
        email_confirmed_at: userMatch.email_confirmed_at,
        created_at: userMatch.created_at
      }, null, 2));
    }
  }
  
  process.exit(0);
}

checkUser();
