/**
 * 🧹 Очистка старых записей из sales_activity_log
 * Оставляем только записи созданные за последние 24 часа
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanActivity() {
  console.log('🧹 ОЧИСТКА ИСТОРИИ ДЕЙСТВИЙ\n');
  console.log('='.repeat(80));

  try {
    // 1. Смотрим что есть
    console.log('\n1️⃣ Проверяем текущие записи...');
    const { data: allActivity, error: countError } = await supabase
      .from('sales_activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (countError) throw countError;

    console.log(`   📊 Всего записей: ${allActivity?.length || 0}`);

    if (!allActivity || allActivity.length === 0) {
      console.log('   ℹ️  История пустая, нечего удалять');
      return;
    }

    // Показываем первые 5 записей
    console.log('\n   📋 Последние записи:');
    allActivity.slice(0, 5).forEach((log: any) => {
      const date = new Date(log.created_at).toLocaleString('ru-RU');
      console.log(`   - ${date}: ${log.action_type} (${log.target_user_email || 'N/A'})`);
    });

    // 2. Удаляем ВСЕ старые записи (оставляем только за сегодня)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    console.log(`\n2️⃣ Удаляем записи старше ${today.toLocaleDateString('ru-RU')}...`);

    const { data: deleted, error: deleteError } = await supabase
      .from('sales_activity_log')
      .delete()
      .lt('created_at', todayISO)
      .select();

    if (deleteError) throw deleteError;

    console.log(`   ✅ Удалено записей: ${deleted?.length || 0}`);

    // 3. Проверяем что осталось
    const { data: remaining, error: remainingError } = await supabase
      .from('sales_activity_log')
      .select('*')
      .order('created_at', { ascending: false });

    if (remainingError) throw remainingError;

    console.log(`\n3️⃣ Осталось записей: ${remaining?.length || 0}`);

    if (remaining && remaining.length > 0) {
      console.log('\n   📋 Оставшиеся записи:');
      remaining.forEach((log: any) => {
        const date = new Date(log.created_at).toLocaleString('ru-RU');
        console.log(`   - ${date}: ${log.action_type} (${log.target_user_email || 'N/A'})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ИСТОРИЯ ОЧИЩЕНА!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ Ошибка:', error.message);
    throw error;
  }
}

cleanActivity()
  .then(() => {
    console.log('\n✅ ГОТОВО!');
    console.log('   Обнови страницу Sales Manager (F5)');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ОШИБКА:', error);
    process.exit(1);
  });
