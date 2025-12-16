/**
 * 🧪 Создание тестового студента (с предварительной очисткой)
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

// 📧 Импортируем emailService ПОСЛЕ загрузки env
import { sendWelcomeEmail } from '../src/services/emailService';

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_STUDENT = {
  full_name: 'Тестовый Студент',
  email: 'test.student.tripwire@test.com',
  password: 'TestPass123!'
};

const AMINA_ID = 'a902044d-8c7a-4129-bd6a-855736a3190f';

async function createTestStudent() {
  console.log('👨‍🎓 СОЗДАНИЕ ТЕСТОВОГО СТУДЕНТА\n');
  console.log('='.repeat(80));

  try {
    // 1. Удаляем если существует
    console.log('🗑️  Удаляем старого студента (если есть)...');
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === TEST_STUDENT.email);
    
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
      console.log('   ✅ Старый студент удалён');
    } else {
      console.log('   ℹ️  Старого студента нет');
    }

    await new Promise(r => setTimeout(r, 1000));

    console.log('\n📧 Email: ' + TEST_STUDENT.email);
    console.log('👤 Имя: ' + TEST_STUDENT.full_name);
    console.log('🔑 Пароль: ' + TEST_STUDENT.password);
    console.log('='.repeat(80));

    // 2. Создаём пользователя
    console.log('\n1️⃣ Создаём в auth.users...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: TEST_STUDENT.email,
      password: TEST_STUDENT.password,
      email_confirm: true,
      user_metadata: { full_name: TEST_STUDENT.full_name }
    });

    if (authError) throw authError;
    const userId = authData.user.id;
    console.log(`   ✅ User ID: ${userId}`);

    // 3. tripwire_users
    console.log('\n2️⃣ Создаём в tripwire_users...');
    await supabase.from('tripwire_users').insert({
      id: userId,
      email: TEST_STUDENT.email,
      full_name: TEST_STUDENT.full_name,
      granted_by: AMINA_ID,
      manager_name: 'Amina Sales Manager',
      price: 5000,
      status: 'active',
      modules_completed: 0
    });
    console.log('   ✅ Запись создана');

    // 4. Профиль
    console.log('\n3️⃣ Создаём профиль...');
    await supabase.from('tripwire_user_profile').insert({
      user_id: userId,
      full_name: TEST_STUDENT.full_name
    });
    console.log('   ✅ Профиль создан');

    // 5. Разблокируем модуль 1
    console.log('\n4️⃣ Разблокируем модуль 1 (ID: 16)...');
    await supabase.from('module_unlocks').insert({
      user_id: userId,
      module_id: 16
    });
    console.log('   ✅ Модуль 1 разблокирован');

    // 6. 📧 ОТПРАВКА WELCOME EMAIL
    console.log('\n5️⃣ Отправка приветственного email...');
    try {
      const emailSent = await sendWelcomeEmail({
        toEmail: TEST_STUDENT.email,
        name: TEST_STUDENT.full_name,
        password: TEST_STUDENT.password
      });

      if (emailSent) {
        console.log('   ✅ Email отправлен');
        // Обновляем флаг в БД
        await supabase
          .from('tripwire_users')
          .update({ welcome_email_sent: true })
          .eq('id', userId);
      } else {
        console.log('   ⚠️  Email не отправлен (проверьте RESEND_API_KEY)');
      }
    } catch (emailError: any) {
      console.error('   ⚠️  Ошибка отправки email:', emailError.message);
      // НЕ крашим скрипт если email не отправился
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ТЕСТОВЫЙ СТУДЕНТ СОЗДАН!');
    console.log('='.repeat(80));
    console.log('\n📋 КРЕДЕНШАЛЫ:');
    console.log(`   📧 Email: ${TEST_STUDENT.email}`);
    console.log(`   🔑 Пароль: ${TEST_STUDENT.password}`);
    console.log(`\n🔗 http://localhost:8080/integrator/login`);
    console.log(`\n📬 Email с доступами отправлен на: ${TEST_STUDENT.email}`);
    console.log(`   (Проверьте также папку СПАМ!)\n`);

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    if (error.details) console.error('   Details:', error.details);
    process.exit(1);
  }
}

createTestStudent().then(() => process.exit(0));
