/**
 * APPLY TRIPWIRE DB MIGRATION
 * Применение SQL миграции к новой базе Tripwire
 * 
 * Запуск: npx tsx src/scripts/apply-migration.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { Client } from 'pg';

// Загружаем .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_DB_PASSWORD = process.env.TRIPWIRE_DB_PASSWORD!;
const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL!;

if (!TRIPWIRE_DB_PASSWORD || !TRIPWIRE_SUPABASE_URL) {
  console.error('❌ Отсутствуют ENV переменные: TRIPWIRE_DB_PASSWORD или TRIPWIRE_SUPABASE_URL');
  process.exit(1);
}

// Извлекаем project ref из URL
const projectRef = TRIPWIRE_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Не удалось извлечь project ref из URL:', TRIPWIRE_SUPABASE_URL);
  process.exit(1);
}

// Connection String для Tripwire DB (прямое подключение через порт 5432)
const connectionString = `postgresql://postgres.${projectRef}:${TRIPWIRE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`;

console.log('\n🔧 TRIPWIRE DB MIGRATION');
console.log('='.repeat(60));
console.log('📍 Project Ref:', projectRef);
console.log('🔗 Connection String:', connectionString.replace(TRIPWIRE_DB_PASSWORD, '***'));
console.log('='.repeat(60));

/**
 * Применить миграцию
 */
async function applyMigration(): Promise<void> {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false, // Для Supabase pooler
    },
  });

  try {
    // Подключаемся
    console.log('\n🔌 Подключаемся к Tripwire DB...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Читаем SQL файл
    const sqlPath = path.resolve(__dirname, 'init-tripwire-schema.sql');
    console.log('\n📄 Читаем миграцию:', sqlPath);
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL файл не найден: ${sqlPath}`);
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    console.log(`✅ Прочитано ${sqlContent.length} символов SQL`);

    // Выполняем миграцию
    console.log('\n⚙️  Применяем миграцию...');
    console.log('━'.repeat(60));
    
    await client.query(sqlContent);
    
    console.log('━'.repeat(60));
    console.log('✅ Миграция применена успешно!');

    // Проверяем созданные таблицы
    console.log('\n🔍 Проверяем созданные таблицы...');
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('✅ Таблицы в public schema:');
    tables.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });

    // Проверяем триггер
    console.log('\n🔍 Проверяем триггер on_auth_user_created...');
    const { rows: triggers } = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
      ORDER BY trigger_name;
    `);

    console.log('✅ Триггеры:');
    triggers.forEach((row) => {
      console.log(`   - ${row.trigger_name} (${row.event_manipulation} on ${row.event_object_table})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✨ МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    // Закрываем соединение
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

// Запуск
applyMigration();

