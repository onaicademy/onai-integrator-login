/**
 * 🗑️ Удалить одного пользователя по email
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const EMAIL_TO_DELETE = 'icekvup@gmail.com';

async function deleteUser() {
  console.log(`🗑️  Удаляем: ${EMAIL_TO_DELETE}\n`);

  try {
    // Найти пользователя
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === EMAIL_TO_DELETE);

    if (!user) {
      console.log('❌ Пользователь не найден');
      return;
    }

    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);

    // Удалить
    const { error } = await supabase.auth.admin.deleteUser(user.id);

    if (error) throw error;

    console.log('\n✅ УДАЛЁН!\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

deleteUser().then(() => process.exit(0));
