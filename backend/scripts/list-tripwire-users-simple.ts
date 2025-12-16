/**
 * 🔍 СПИСОК ВСЕХ TRIPWIRE ПОЛЬЗОВАТЕЛЕЙ
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Загружаем env.env
dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing TRIPWIRE_SUPABASE_URL or service key');
  console.log('URL:', supabaseUrl);
  console.log('Key exists:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
  console.log('📊 СПИСОК ВСЕХ TRIPWIRE ПОЛЬЗОВАТЕЛЕЙ\n');
  console.log('='.repeat(80));

  try {
    const { data, error } = await supabase
      .from('tripwire_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`\n✅ Найдено: ${data?.length || 0} пользователей\n`);

    const admins: any[] = [];
    const students: any[] = [];

    data?.forEach((user: any) => {
      if (user.role === 'admin' || user.role === 'sales') {
        admins.push(user);
      } else {
        students.push(user);
      }
    });

    console.log('🟢 ОСТАВИТЬ (Admin/Sales):');
    console.log('-'.repeat(80));
    admins.forEach((user: any) => {
      console.log(`📧 ${user.email}`);
      console.log(`   Роль: ${user.role} | ID: ${user.id}`);
      console.log(`   Имя: ${user.full_name}\n`);
    });

    console.log('\n🔴 УДАЛИТЬ (Студенты):');
    console.log('-'.repeat(80));
    students.forEach((user: any, idx: number) => {
      console.log(`${idx + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Имя: ${user.full_name}`);
      console.log(`   Прогресс: ${user.modules_completed || 0}/3`);
      console.log(`   Создан: ${new Date(user.created_at).toLocaleString('ru-RU')}\n`);
    });

    console.log('='.repeat(80));
    console.log(`\n📊 ИТОГО:`);
    console.log(`   🟢 Оставить: ${admins.length}`);
    console.log(`   🔴 Удалить: ${students.length}\n`);

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

listUsers().then(() => process.exit(0));
