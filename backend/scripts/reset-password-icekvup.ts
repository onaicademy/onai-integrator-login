import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  const email = 'icekvup@gmail.com';
  const newPassword = 'Saintcom';
  
  console.log(`\n🔄 Сброс пароля для ${email}...\n`);
  
  const { data, error } = await tripwireSupabase.auth.admin.updateUserById(
    '23408904-cb2f-4b11-92a6-f435fb7c3905', // auth.users.id from previous output
    { password: newPassword }
  );
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Пароль изменен для:', email);
    console.log('✅ Новый пароль:', newPassword);
  }
  
  process.exit(0);
}

resetPassword();
