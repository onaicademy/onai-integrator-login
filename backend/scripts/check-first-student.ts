/**
 * Проверка первого студента в базе данных
 */

import { createClient } from '@supabase/supabase-js';

const TRIPWIRE_URL = 'https://pjmvxecykysfrzppdcto.supabase.co';
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY || '';

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkStudent() {
  console.log('🔍 Проверка студента: bakkee26@gmail.com\n');

  // Проверяем в Auth
  const { data: { users }, error } = await tripwireSupabase.auth.admin.listUsers();

  if (error) {
    console.error('❌ Ошибка:', error);
    return;
  }

  console.log(`📊 Всего пользователей в Tripwire Auth: ${users?.length || 0}\n`);

  const target = users?.find(u => u.email === 'bakkee26@gmail.com');

  if (target) {
    console.log('✅ Студент НАЙДЕН в Auth:');
    console.log(`   ID: ${target.id}`);
    console.log(`   Email: ${target.email}`);
    console.log(`   Created: ${target.created_at}`);
  } else {
    console.log('❌ Студент НЕ НАЙДЕН в Tripwire Auth');
    console.log('\nПроверяем похожие email:');
    const similar = users?.filter(u => u.email?.includes('bakkee') || u.email?.includes('26'));
    if (similar && similar.length > 0) {
      similar.forEach(u => {
        console.log(`   - ${u.email} (ID: ${u.id})`);
      });
    } else {
      console.log('   Нет похожих email');
    }
  }

  console.log('\n═'.repeat(60));
  console.log('💡 РЕШЕНИЕ:');
  if (!target) {
    console.log('Студент не создан в системе.');
    console.log('Нужно создать через панель: https://expresscourse.onai.academy/sales-manager');
    console.log('Или запросить у пользователя правильный email адрес.');
  }
  console.log('═'.repeat(60));
}

checkStudent()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
