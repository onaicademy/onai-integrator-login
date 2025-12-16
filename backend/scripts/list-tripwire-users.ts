/**
 * 🔍 СПИСОК ВСЕХ TRIPWIRE ПОЛЬЗОВАТЕЛЕЙ
 * Показывает кого оставить, кого удалить
 */

import dotenv from 'dotenv';
import path from 'path';

// Загружаем env.env
dotenv.config({ path: path.resolve(__dirname, '../env.env') });

import { tripwireAdminSupabase } from '../src/config/supabase-tripwire';

async function listTripwireUsers() {
  console.log('📊 СПИСОК ВСЕХ TRIPWIRE ПОЛЬЗОВАТЕЛЕЙ\n');
  console.log('=' .repeat(80));

  try {
    // 1. Получаем всех пользователей из tripwire_users
    const { data: tripwireUsers, error: usersError } = await tripwireAdminSupabase
      .from('tripwire_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;

    console.log(`\n✅ Найдено пользователей в tripwire_users: ${tripwireUsers?.length || 0}\n`);

    // Разделяем на АДМИНОВ/SALES и СТУДЕНТОВ
    const admins: any[] = [];
    const students: any[] = [];

    tripwireUsers?.forEach((user: any) => {
      if (user.role === 'admin' || user.role === 'sales') {
        admins.push(user);
      } else {
        students.push(user);
      }
    });

    // Показываем АДМИНОВ/SALES (оставить)
    console.log('🟢 ОСТАВИТЬ (Admin/Sales):');
    console.log('-'.repeat(80));
    admins.forEach((user: any, idx: number) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   Роль: ${user.role} | ID: ${user.id}`);
      console.log(`   Имя: ${user.full_name}`);
      console.log('');
    });

    // Показываем СТУДЕНТОВ (удалить)
    console.log('\n🔴 УДАЛИТЬ (Студенты):');
    console.log('-'.repeat(80));
    students.forEach((user: any, idx: number) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   ID: ${user.id} | Имя: ${user.full_name}`);
      console.log(`   Прогресс: ${user.modules_completed || 0}/3 | Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}`);
      console.log('');
    });

    console.log('=' .repeat(80));
    console.log(`\n📊 ИТОГО:`);
    console.log(`   🟢 Оставить: ${admins.length} (admin/sales)`);
    console.log(`   🔴 Удалить: ${students.length} (студенты)`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

listTripwireUsers()
  .then(() => {
    console.log('✅ Готово!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
