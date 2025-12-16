/**
 * Применить миграцию telegram_groups через pg (PostgreSQL client)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL connection для Landing Supabase
const connectionString = 'postgresql://postgres.xikaiavwqinamgolmtcy:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

async function applyMigration() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📱 ПРИМЕНЕНИЕ МИГРАЦИИ TELEGRAM_GROUPS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔗 Подключение к Landing Supabase...');
    console.log('   Project: xikaiavwqinamgolmtcy\n');

    await client.connect();
    console.log('✅ Подключено успешно!\n');

    // Читаем SQL файл
    const sqlPath = path.join(__dirname, '../supabase/migrations/create_telegram_groups.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL файл загружен:', sqlPath);
    console.log('📏 Размер:', sql.length, 'символов\n');

    // Применяем миграцию
    console.log('🚀 Применение миграции...\n');
    
    await client.query(sql);
    
    console.log('✅ Миграция применена успешно!\n');

    // Проверяем результат
    console.log('🔍 Проверка таблицы telegram_groups...\n');
    
    const result = await client.query('SELECT COUNT(*) as total FROM telegram_groups');
    console.log('✅ Таблица существует!');
    console.log('   Записей в таблице:', result.rows[0].total, '\n');

    // Показываем структуру таблицы
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'telegram_groups'
      ORDER BY ordinal_position
    `);

    console.log('📊 Структура таблицы telegram_groups:\n');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✨ Готово! Теперь можешь активировать группу кодом 2134!\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('\n⚠️  Попробуй применить SQL вручную:');
    console.error('   1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
    console.error('   2. Скопируй SQL из: backend/supabase/migrations/create_telegram_groups.sql');
    console.error('   3. Выполни в SQL Editor\n');
  } finally {
    await client.end();
    console.log('═══════════════════════════════════════════════════════════════\n');
  }
}

applyMigration();
