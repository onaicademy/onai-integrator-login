/**
 * СКРИПТ: Синхронизация Sales Managers в Tripwire DB
 * 
 * ПРОБЛЕМА: Sales managers логинятся через Tripwire Auth,
 * но их профили не существуют в public.users (Tripwire DB).
 * 
 * РЕШЕНИЕ: Создать их вручную с тем же UUID из auth.users.
 */

import 'dotenv/config'; // ✅ Load .env before imports
import { tripwireAdminSupabase } from '../src/config/supabase-tripwire';

const SALES_MANAGERS = [
  {
    email: 'amina@onaiacademy.kz',
    full_name: 'Amina Sales Manager',
    role: 'sales',
    password: 'OnaiSales2024!', // Временный пароль (можно поменять)
  },
  {
    email: 'rakhat@onaiacademy.kz',
    full_name: 'Rakhat Sales Manager',
    role: 'sales',
    password: 'OnaiSales2024!',
  },
];

async function syncSalesManagers() {
  console.log('🚀 Starting Sales Managers Sync to Tripwire DB...\n');

  for (const manager of SALES_MANAGERS) {
    console.log(`\n📧 Processing: ${manager.email}`);

    try {
      // 1. Проверяем, существует ли пользователь в auth.users по email
      const { data: { users: existingUsers }, error: checkAuthError } = 
        await tripwireAdminSupabase.auth.admin.listUsers();

      const existingAuthUser = existingUsers?.find(u => u.email === manager.email);

      let userId: string;

      if (existingAuthUser) {
        console.log(`  ✅ Auth user exists: ${existingAuthUser.id}`);
        userId = existingAuthUser.id;
      } else {
        // 2. Создаем пользователя в auth.users
        console.log('  🔧 Creating auth user...');
        const { data: authData, error: authError } = await tripwireAdminSupabase.auth.admin.createUser({
          email: manager.email,
          password: manager.password,
          email_confirm: true,
          user_metadata: {
            full_name: manager.full_name,
            role: manager.role,
          },
        });

        if (authError) {
          console.error(`  ❌ Auth error:`, authError.message);
          continue;
        }

        userId = authData.user.id;
        console.log(`  ✅ Auth user created: ${userId}`);
      }

      // 3. Проверяем public.users
      const { data: existingProfile, error: profileCheckError } = await tripwireAdminSupabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        console.log(`  ℹ️  Profile exists in public.users:`, existingProfile);
        
        // Обновляем роль, если она неправильная
        if (existingProfile.role !== 'sales') {
          console.log(`  🔧 Updating role from ${existingProfile.role} to sales...`);
          const { error: updateError } = await tripwireAdminSupabase
            .from('users')
            .update({ role: 'sales' })
            .eq('id', userId);

          if (updateError) {
            console.error(`  ❌ Update error:`, updateError.message);
          } else {
            console.log(`  ✅ Role updated to sales`);
          }
        }
      } else {
        // 4. Создаем запись в public.users через RAW SQL (bypassing schema cache)
        console.log('  🔧 Creating profile in public.users via SQL...');
        const { error: insertError } = await tripwireAdminSupabase.rpc('exec_sql', {
          sql_query: `
            INSERT INTO public.users (id, email, full_name, role, platform, created_at, updated_at)
            VALUES (
              '${userId}',
              '${manager.email}',
              '${manager.full_name}',
              '${manager.role}',
              'tripwire',
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              role = EXCLUDED.role,
              full_name = EXCLUDED.full_name,
              updated_at = NOW();
          `
        });

        if (insertError) {
          console.error(`  ❌ Insert error:`, insertError.message);
        } else {
          console.log(`  ✅ Profile created/updated in public.users`);
        }
      }

    } catch (error: any) {
      console.error(`  ❌ Unexpected error:`, error.message);
    }
  }

  console.log('\n✅ Sync complete!');
  process.exit(0);
}

syncSalesManagers().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

