/**
 * 🔧 ФИКС: Добавить роль 'sales' в user_metadata для Aselya
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

async function fixAselyaRole() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔧 ИСПРАВЛЕНИЕ РОЛИ ДЛЯ ASELYA\n');

  const email = 'aselya@onaiacademy.kz';

  try {
    // 1. Найти пользователя
    console.log('🔍 Поиск пользователя...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Ошибка поиска пользователей:', listError);
      process.exit(1);
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ Пользователь ${email} не найден!`);
      process.exit(1);
    }

    console.log(`✅ Пользователь найден! ID: ${user.id}\n`);

    // 2. Обновить user_metadata
    console.log('📝 Обновление user_metadata...');
    
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          role: 'sales',
          full_name: 'Aselya Sales Manager',
        },
      }
    );

    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError);
      process.exit(1);
    }

    console.log('✅ user_metadata обновлены!\n');

    // 3. Проверка
    console.log('🔍 Проверка...');
    const { data: { user: verifyUser }, error: verifyError } = await supabase.auth.admin.getUserById(user.id);

    if (verifyError || !verifyUser) {
      console.error('❌ Ошибка проверки:', verifyError);
      process.exit(1);
    }

    console.log('✅ Роль установлена:', verifyUser.user_metadata?.role);
    console.log('✅ Имя установлено:', verifyUser.user_metadata?.full_name);

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ РОЛЬ УСПЕШНО УСТАНОВЛЕНА!');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('📊 Результат:');
    console.log(`   • Email: ${email}`);
    console.log(`   • User ID: ${user.id}`);
    console.log(`   • Роль: sales ✅`);
    console.log(`   • Имя: Aselya Sales Manager\n`);
    
    console.log('🎯 Теперь Aselya сможет войти на платформу!\n');

  } catch (err: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
    process.exit(1);
  }
}

fixAselyaRole();
