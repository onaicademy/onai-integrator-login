/**
 * 👤 СОЗДАНИЕ SALES АККАУНТА: Ayaulym
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './env.env' });

const TRIPWIRE_SUPABASE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

async function createSalesAccount() {
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n👤 СОЗДАНИЕ SALES АККАУНТА\n');

  const newSalesManager = {
    email: 'ayaulym@onaiacademy.kz',
    password: 'Ayaulym2134',
    full_name: 'Ayaulym Sales Manager'
  };

  console.log(`📧 Email: ${newSalesManager.email}`);
  console.log(`👤 Имя: ${newSalesManager.full_name}\n`);

  try {
    // 1. Создать пользователя в auth.users
    console.log('🔐 Шаг 1/2: Создание пользователя в auth.users...');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: newSalesManager.email,
      password: newSalesManager.password,
      email_confirm: true, // Автоматическое подтверждение email
      user_metadata: {
        role: 'sales', // 🔑 КРИТИЧНО: Устанавливаем роль для StudentGuard
        full_name: newSalesManager.full_name,
      },
    });

    if (authError) {
      console.error('❌ Ошибка создания пользователя:', authError);
      process.exit(1);
    }

    if (!authUser.user) {
      console.error('❌ Пользователь не создан!');
      process.exit(1);
    }

    console.log(`✅ Пользователь создан! ID: ${authUser.user.id}\n`);

    // 2. Создать запись в tripwire_users
    console.log('📝 Шаг 2/2: Создание записи в tripwire_users...');
    
    const { data: tripwireUser, error: tripwireError } = await supabase
      .from('tripwire_users')
      .insert({
        user_id: authUser.user.id,
        email: newSalesManager.email,
        full_name: newSalesManager.full_name,
      })
      .select()
      .single();

    if (tripwireError) {
      console.error('❌ Ошибка создания записи в tripwire_users:', tripwireError);
      
      // Откатить создание пользователя
      console.log('🔄 Откатываю создание пользователя...');
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      process.exit(1);
    }

    console.log(`✅ Запись в tripwire_users создана! ID: ${tripwireUser.id}\n`);

    // 3. Итоги
    console.log('═══════════════════════════════════════════');
    console.log('✅ SALES АККАУНТ СОЗДАН УСПЕШНО!');
    console.log('═══════════════════════════════════════════\n');
    
    console.log('📊 Детали:');
    console.log(`   • Email: ${newSalesManager.email}`);
    console.log(`   • Пароль: ${newSalesManager.password}`);
    console.log(`   • Имя: ${newSalesManager.full_name}`);
    console.log(`   • Auth User ID: ${authUser.user.id}`);
    console.log(`   • Tripwire User ID: ${tripwireUser.id}\n`);
    
    console.log('🔑 Данные для входа:');
    console.log(`   URL: https://onai.academy/integrator`);
    console.log(`   Email: ${newSalesManager.email}`);
    console.log(`   Password: ${newSalesManager.password}\n`);
    
    console.log('⚠️  ВАЖНО: Этот аккаунт НЕ будет получать массовые рассылки!');
    console.log('   (уже добавлен в EXCLUDED_EMAILS)\n');

  } catch (err: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', err.message);
    process.exit(1);
  }
}

createSalesAccount();
