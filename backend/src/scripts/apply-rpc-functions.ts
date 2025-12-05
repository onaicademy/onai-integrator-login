/**
 * APPLY RPC FUNCTIONS TO TRIPWIRE DB
 * Применяет RPC функции к Tripwire базе данных
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

// Connection String для Tripwire DB (session pooler через порт 6543)
const connectionString = `postgresql://postgres.${projectRef}:${TRIPWIRE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

console.log('\n🔧 APPLYING RPC FUNCTIONS TO TRIPWIRE DB');
console.log('='.repeat(60));
console.log('📍 Project Ref:', projectRef);
console.log('🔗 Connection:', connectionString.replace(TRIPWIRE_DB_PASSWORD, '***'));
console.log('='.repeat(60));

async function applyRpcFunctions(): Promise<void> {
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('\n🔌 Подключаемся к Tripwire DB...');
    await client.connect();
    console.log('✅ Подключение установлено');

    // Читаем SQL файл с RPC функциями
    const sqlPath = path.resolve(__dirname, 'fix-rpc-with-sleep.sql');
    console.log('\n📄 Читаем RPC миграцию:', sqlPath);

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL файл не найден: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    console.log(`✅ Прочитано ${sqlContent.length} символов SQL`);

    // Выполняем миграцию
    console.log('\n⚙️  Применяем RPC функции...');
    console.log('━'.repeat(60));

    await client.query(sqlContent);

    console.log('━'.repeat(60));
    console.log('✅ RPC функции созданы успешно!');

    // Проверяем созданные функции
    console.log('\n🔍 Проверяем созданные RPC функции...');
    const { rows: functions } = await client.query(`
      SELECT
        proname AS function_name,
        pg_get_function_arguments(oid) AS arguments
      FROM pg_proc
      WHERE proname LIKE 'rpc_get%'
        AND pronamespace = 'public'::regnamespace
      ORDER BY proname;
    `);

    console.log('✅ RPC функции в public schema:');
    functions.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.function_name}(${row.arguments || 'no params'})`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('✨ RPC МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
    console.log('🔔 PostgREST schema cache был обновлен через NOTIFY pgrst');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Соединение закрыто');
  }
}

// Запуск
applyRpcFunctions();
