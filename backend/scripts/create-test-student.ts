/**
 * 🧪 Создание тестового студента
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_STUDENT = {
  full_name: 'Тестовый Студент',
  email: 'test.student.tripwire@test.com',
  password: 'TestPass123!',
  managerId: 'a902044d-8c7a-4129-bd6a-855736a3190f', // Amina's ID
  managerEmail: 'amina@onaiacademy.kz',
  managerName: 'Amina Sales Manager'
};

async function createTestStudent() {
  console.log('👨‍🎓 СОЗДАНИЕ ТЕСТОВОГО СТУДЕНТА\n');
  console.log('='.repeat(80));
  console.log(`📧 Email: ${TEST_STUDENT.email}`);
  console.log(`👤 Имя: ${TEST_STUDENT.full_name}`);
  console.log(`🔑 Пароль: ${TEST_STUDENT.password}`);
  console.log('='.repeat(80));

  try {
    // 1. Создаём пользователя в auth.users
    console.log('\n1️⃣ Создаём в auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_STUDENT.email,
      password: TEST_STUDENT.password,
      email_confirm: true,
      user_metadata: {
        full_name: TEST_STUDENT.full_name
      }
    });

    if (authError) throw authError;
    console.log(`   ✅ User ID: ${authData.user.id}`);

    // 2. Создаём запись в tripwire_users
    console.log('\n2️⃣ Создаём в tripwire_users...');
    const { data: tripwireUser, error: tripwireError } = await supabase
      .from('tripwire_users')
      .insert({
        id: authData.user.id,
        email: TEST_STUDENT.email,
        full_name: TEST_STUDENT.full_name,
        granted_by: TEST_STUDENT.managerId,
        manager_name: TEST_STUDENT.managerName,
        price: 5000,
        status: 'active',
        modules_completed: 0
      })
      .select()
      .single();

    if (tripwireError) throw tripwireError;
    console.log(`   ✅ Tripwire user создан`);

    // 3. Создаём профиль
    console.log('\n3️⃣ Создаём профиль...');
    const { error: profileError } = await supabase
      .from('tripwire_user_profile')
      .insert({
        user_id: authData.user.id,
        full_name: TEST_STUDENT.full_name
      });

    if (profileError) throw profileError;
    console.log(`   ✅ Профиль создан`);

    // 4. Разблокируем модуль 1
    console.log('\n4️⃣ Разблокируем модуль 1...');
    const { error: unlockError } = await supabase
      .from('module_unlocks')
      .insert({
        user_id: authData.user.id,
        module_id: 16, // Модуль 1
        unlocked_at: new Date().toISOString()
      });

    if (unlockError) throw unlockError;
    console.log(`   ✅ Модуль 1 разблокирован`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ТЕСТОВЫЙ СТУДЕНТ СОЗДАН!');
    console.log('='.repeat(80));
    console.log('\n📋 КРЕДЕНШАЛЫ ДЛЯ ЛОГИНА:');
    console.log(`   Email: ${TEST_STUDENT.email}`);
    console.log(`   Пароль: ${TEST_STUDENT.password}`);
    console.log(`\n🔗 Ссылка для логина: http://localhost:8080/integrator/login`);
    console.log('');

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  }
}

createTestStudent().then(() => process.exit(0));
