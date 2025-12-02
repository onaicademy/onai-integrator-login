import { adminSupabase } from '../src/config/supabase';

/**
 * Создание Sales Managers для Tripwire Dashboard
 * 
 * Команда: npm run create-sales-managers
 */

async function createSalesManagers() {
  console.log('🔄 Создание Sales Managers...\n');

  const managers = [
    {
      email: 'amina@onaiacademy.kz',
      password: 'Amina2134',
      full_name: 'Amina',
      position: 'Sales Manager'
    },
    {
      email: 'rakhat@onaiacademy.kz',
      password: 'Rakhat2134',
      full_name: 'Rakhat',
      position: 'Sales Manager'
    }
  ];

  for (const manager of managers) {
    try {
      // Проверяем существует ли пользователь
      const { data: existing } = await adminSupabase
        .from('auth.users')
        .select('id, email')
        .eq('email', manager.email)
        .single();

      if (existing) {
        console.log(`⚠️  ${manager.email} уже существует, обновляем роль...`);
        
        // Обновляем метаданные существующего пользователя
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
          existing.id,
          {
            user_metadata: {
              role: 'sales',
              full_name: manager.full_name,
              position: manager.position
            }
          }
        );

        if (updateError) {
          console.error(`❌ Ошибка обновления ${manager.email}:`, updateError.message);
        } else {
          console.log(`✅ Обновлен ${manager.email} → role: sales\n`);
        }
        continue;
      }

      // Создаем нового пользователя
      const { data, error } = await adminSupabase.auth.admin.createUser({
        email: manager.email,
        password: manager.password,
        email_confirm: true,
        user_metadata: {
          role: 'sales',
          full_name: manager.full_name,
          position: manager.position
        }
      });

      if (error) {
        console.error(`❌ Ошибка создания ${manager.email}:`, error.message);
      } else {
        console.log(`✅ Создан ${manager.email}`);
        console.log(`   ID: ${data.user?.id}`);
        console.log(`   Role: sales`);
        console.log(`   Full Name: ${manager.full_name}\n`);
      }
    } catch (error: any) {
      console.error(`❌ Критическая ошибка для ${manager.email}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Создание Sales Managers завершено!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📝 Данные для входа:\n');
  managers.forEach((m) => {
    console.log(`Email: ${m.email}`);
    console.log(`Password: ${m.password}`);
    console.log(`URL: https://onai.academy/admin/tripwire-manager\n`);
  });

  process.exit(0);
}

createSalesManagers().catch((error) => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});


