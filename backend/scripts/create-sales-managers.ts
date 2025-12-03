/**
 * 🔐 СОЗДАНИЕ SALES МЕНЕДЖЕРОВ В MAIN PLATFORM
 * 
 * Этот скрипт создает аккаунты Sales Менеджеров в ОСНОВНОЙ базе данных.
 * Менеджеры логинятся в Admin Panel основной платформы, но создают
 * пользователей для Tripwire в ОТДЕЛЬНОЙ базе.
 * 
 * ЗАПУСК:
 * cd backend
 * npx ts-node scripts/create-sales-managers.ts
 */

import { adminSupabase } from '../src/config/supabase'; // Main Platform Admin Client

const SALES_MANAGERS = [
  {
    email: 'amina@onaiacademy.kz',
    password: 'Amina2134',
    full_name: 'Amina',
    role: 'sales',
  },
  {
    email: 'rakhat@onaiacademy.kz',
    password: 'Rakhat2134',
    full_name: 'Rakhat',
    role: 'sales',
  },
];

async function createSalesManager(manager: typeof SALES_MANAGERS[0]) {
  console.log(`\n🔧 Creating Sales Manager: ${manager.email}...`);

  try {
    // 1. Проверяем существование через public.users (по email)
    const { data: existingUserRecord } = await adminSupabase
      .from('users')
      .select('id, email, role')
      .eq('email', manager.email)
      .single();

    let userId: string;

    if (existingUserRecord) {
      console.log(`✅ User already exists in public.users: ${manager.email}`);
      console.log(`   User ID: ${existingUserRecord.id}`);
      userId = existingUserRecord.id;

      // Обновляем роль если нужно
      if (existingUserRecord.role !== 'sales') {
        console.log(`   Updating role to 'sales'...`);
        
        const { error: updateError } = await adminSupabase
          .from('users')
          .update({ role: 'sales', updated_at: new Date().toISOString() })
          .eq('id', existingUserRecord.id);

        if (updateError) {
          console.error(`   ❌ Error updating role:`, updateError);
        } else {
          console.log(`   ✅ Role updated to 'sales'`);
        }
      } else {
        console.log(`   ✅ Role already set to 'sales'`);
      }

      // Обновляем пароль в auth.users
      console.log(`   Updating password in auth.users...`);
      const { error: updateAuthError } = await adminSupabase.auth.admin.updateUserById(userId, {
        password: manager.password,
        user_metadata: {
          full_name: manager.full_name,
          role: manager.role,
        },
      });

      if (updateAuthError) {
        console.error(`   ⚠️ Warning: Could not update auth password:`, updateAuthError.message);
      } else {
        console.log(`   ✅ Password updated in auth.users`);
      }

      return;
    }

    // 2. Создаём нового пользователя в Supabase Auth (MAIN Platform)
    console.log(`   Creating user in auth.users...`);
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email: manager.email,
      password: manager.password,
      email_confirm: true,
      user_metadata: {
        full_name: manager.full_name,
        role: manager.role,
      },
    });

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`);
    }

    userId = authData.user.id;
    console.log(`   ✅ User created in auth.users: ${userId}`);

    // 3. Создаём запись в public.users
    console.log(`   Creating record in public.users...`);
    const { error: usersError } = await adminSupabase
      .from('users')
      .insert({
        id: userId,
        email: manager.email,
        full_name: manager.full_name,
        role: manager.role,
        platform: 'main', // Важно! Менеджеры в основной платформе
      });

    if (usersError) {
      console.error(`   ❌ Error inserting to users:`, usersError);
      
      // Откатываем создание в auth
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Users table error: ${usersError.message}`);
    }

    console.log(`   ✅ Record created in public.users`);

    // 4. Создаём профиль
    console.log(`   Creating profile...`);
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: manager.email,
        full_name: manager.full_name,
        role: manager.role,
        is_active: true,
      });

    if (profileError) {
      console.warn(`   ⚠️ Profile creation warning:`, profileError.message);
      // Не критично, продолжаем
    } else {
      console.log(`   ✅ Profile created`);
    }

    console.log(`\n✅ Sales Manager created successfully: ${manager.email}`);
    console.log(`   Password: ${manager.password}`);
    console.log(`   Login URL: https://onai.academy/login`);
    console.log(`   Dashboard URL: https://onai.academy/admin/tripwire-manager`);

  } catch (error: any) {
    console.error(`\n❌ Failed to create Sales Manager ${manager.email}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('🚀 CREATING SALES MANAGERS IN MAIN PLATFORM');
  console.log('════════════════════════════════════════════════════════');
  console.log('\nThis script will create Sales Manager accounts in the');
  console.log('MAIN PLATFORM database (not Tripwire).\n');
  console.log('Managers will login at: https://onai.academy/login');
  console.log('And access Sales Dashboard at: /admin/tripwire-manager\n');
  console.log('When they create users, those users will be created');
  console.log('in the TRIPWIRE database (isolated).\n');

  try {
    for (const manager of SALES_MANAGERS) {
      await createSalesManager(manager);
    }

    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ ALL SALES MANAGERS CREATED SUCCESSFULLY');
    console.log('════════════════════════════════════════════════════════\n');

    console.log('📋 SUMMARY:');
    console.log('─────────────────────────────────────────────────────────');
    SALES_MANAGERS.forEach((manager, index) => {
      console.log(`${index + 1}. ${manager.full_name} (${manager.email})`);
      console.log(`   Password: ${manager.password}`);
      console.log(`   Role: ${manager.role}`);
      console.log('');
    });

    console.log('🔗 LOGIN URL: https://onai.academy/login');
    console.log('📊 SALES DASHBOARD: https://onai.academy/admin/tripwire-manager\n');

    console.log('✅ NEXT STEPS:');
    console.log('1. Managers can login at /login with their credentials');
    console.log('2. After login, they\'ll be redirected to Sales Dashboard');
    console.log('3. When they create a Tripwire user, it will be created');
    console.log('   in the TRIPWIRE database (isolated from Main Platform)');
    console.log('\n✨ Setup complete!');

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

// Запуск скрипта
main()
  .then(() => {
    console.log('\n👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
