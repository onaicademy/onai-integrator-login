/**
 * 🔧 ФИКС: Установить роль 'sales' для всех sales менеджеров
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const SALES_MANAGERS = [
  { email: 'rakhat@onaiacademy.kz', name: 'Rakhat Sales Manager' },
  { email: 'amina@onaiacademy.kz', name: 'Amina Sales Manager' },
  { email: 'aselya@onaiacademy.kz', name: 'Aselya Sales Manager' },
];

async function fixAllSalesRoles() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔧 ИСПРАВЛЕНИЕ РОЛЕЙ ДЛЯ ВСЕХ SALES МЕНЕДЖЕРОВ\n');

  try {
    // Получить всех пользователей
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Ошибка поиска пользователей:', listError);
      process.exit(1);
    }

    let successCount = 0;
    let skipCount = 0;

    for (const salesManager of SALES_MANAGERS) {
      console.log(`\n📧 Обработка: ${salesManager.email}`);
      
      const user = users.find(u => u.email === salesManager.email);

      if (!user) {
        console.log(`   ⚠️  Пользователь не найден, пропускаю...`);
        continue;
      }

      console.log(`   ✅ Найден! ID: ${user.id}`);

      // Проверить текущую роль
      const currentRole = user.user_metadata?.role;
      console.log(`   📝 Текущая роль: ${currentRole || 'не установлена'}`);

      if (currentRole === 'sales') {
        console.log(`   ✅ Роль уже установлена, пропускаю...`);
        skipCount++;
        continue;
      }

      // Обновить user_metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        {
          user_metadata: {
            role: 'sales',
            full_name: salesManager.name,
          },
        }
      );

      if (updateError) {
        console.error(`   ❌ Ошибка обновления:`, updateError);
        continue;
      }

      console.log(`   ✅ Роль 'sales' установлена!`);
      successCount++;
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('📊 Статистика:');
    console.log(`   • Всего sales менеджеров: ${SALES_MANAGERS.length}`);
    console.log(`   • Обновлено: ${successCount}`);
    console.log(`   • Пропущено (уже было): ${skipCount}\n`);
    
    console.log('🎯 Все sales менеджеры теперь могут войти на платформу!\n');

  } catch (err: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
    process.exit(1);
  }
}

fixAllSalesRoles();
