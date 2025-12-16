/**
 * 🧹 ЗАЧИСТКА TRIPWIRE - УДАЛЕНИЕ ТЕСТОВЫХ СТУДЕНТОВ
 * 
 * ОСТАВЛЯЕМ:
 * - amina@onaiacademy.kz (Amina Sales Manager)
 * - rakhat@onaiacademy.kz (Rakhat Sales Manager)
 * - smmmcwin@gmail.com (Alexander CEO Admin)
 * 
 * УДАЛЯЕМ ВСЁ ОСТАЛЬНОЕ!
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Загружаем env.env
dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing TRIPWIRE_SUPABASE_URL or service key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 🟢 WHITELIST - НЕ ТРОГАТЬ!
const KEEP_EMAILS = [
  'amina@onaiacademy.kz',
  'rakhat@onaiacademy.kz',
  'smmmcwin@gmail.com'
];

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function cleanupTripwire() {
  console.log('🧹 ЗАЧИСТКА TRIPWIRE БД\n');
  console.log('='.repeat(80));
  console.log('\n🟢 ОСТАВЛЯЕМ (НЕ ТРОГАЕМ):');
  KEEP_EMAILS.forEach(email => console.log(`   ✅ ${email}`));
  console.log('\n' + '='.repeat(80));

  try {
    // 1. Получаем список ВСЕХ пользователей из auth.users
    console.log('\n📊 Получаем список пользователей из auth.users...');
    
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) throw listError;

    console.log(`   Найдено всего: ${users.length} пользователей`);

    // 2. Фильтруем - кого удалять
    const usersToDelete = users.filter(user => !KEEP_EMAILS.includes(user.email || ''));
    const usersToKeep = users.filter(user => KEEP_EMAILS.includes(user.email || ''));

    console.log('\n🟢 ОСТАВЛЯЕМ:');
    usersToKeep.forEach(user => {
      console.log(`   ✅ ${user.email} (ID: ${user.id})`);
    });

    console.log('\n🔴 УДАЛЯЕМ:');
    usersToDelete.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.email} (ID: ${user.id})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`📊 ИТОГО: Удалить ${usersToDelete.length} пользователей`);
    console.log('='.repeat(80));

    if (usersToDelete.length === 0) {
      console.log('\n✅ Нечего удалять!');
      return;
    }

    // 3. Подтверждение
    console.log('\n⚠️  ВНИМАНИЕ! Это необратимая операция!');
    const answer = await askQuestion('\nПродолжить удаление? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Отменено пользователем');
      return;
    }

    // 4. УДАЛЯЕМ!
    console.log('\n🔥 НАЧИНАЕМ УДАЛЕНИЕ...\n');

    let deleted = 0;
    let failed = 0;

    for (const user of usersToDelete) {
      try {
        console.log(`🗑️  Удаляем: ${user.email} (${user.id})...`);

        // Удаляем из auth.users (это автоматически удалит из всех связанных таблиц через FK CASCADE)
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (deleteError) {
          console.error(`   ❌ Ошибка: ${deleteError.message}`);
          failed++;
        } else {
          console.log(`   ✅ Удалён`);
          deleted++;
        }

        // Небольшая задержка чтобы не перегрузить API
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error: any) {
        console.error(`   ❌ Ошибка: ${error.message}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 РЕЗУЛЬТАТ:');
    console.log(`   ✅ Удалено успешно: ${deleted}`);
    console.log(`   ❌ Ошибки: ${failed}`);
    console.log('='.repeat(80));

    // 5. Финальная проверка
    console.log('\n🔍 Финальная проверка...');
    const { data: { users: finalUsers } } = await supabase.auth.admin.listUsers();
    console.log(`\n✅ Осталось пользователей: ${finalUsers.length}`);
    
    finalUsers.forEach(user => {
      console.log(`   ✅ ${user.email}`);
    });

    console.log('\n🎉 ЗАЧИСТКА ЗАВЕРШЕНА!\n');

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    process.exit(1);
  }
}

cleanupTripwire()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal:', err);
    process.exit(1);
  });
