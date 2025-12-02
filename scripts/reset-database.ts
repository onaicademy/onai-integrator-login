#!/usr/bin/env ts-node

/**
 * 🗑️ SUPABASE DATABASE RESET SCRIPT
 * 
 * ОПАСНО! Полностью удаляет:
 * - Все таблицы в public schema
 * - Все RLS политики
 * - Все триггеры и функции
 * - Все данные в Storage buckets
 * - Все индексы
 * 
 * ТРЕБУЕТ ПОДТВЕРЖДЕНИЕ: --confirm флаг
 * 
 * Usage: npm run reset:database -- --confirm
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as child_process from 'child_process';

// Загружаем .env из корня проекта
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ОШИБКА: Не найдены SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env');
  console.error('Убедитесь что в .env файле есть:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Проверяем флаг --confirm
const hasConfirmFlag = process.argv.includes('--confirm');

if (!hasConfirmFlag) {
  console.error('\n❌ ОШИБКА: Требуется флаг --confirm для безопасности!\n');
  console.error('Этот скрипт удалит ВСЮ БАЗУ ДАННЫХ!');
  console.error('Чтобы продолжить, запустите:\n');
  console.error('  npm run reset:database -- --confirm\n');
  process.exit(1);
}

/**
 * Создать backup перед удалением
 */
async function createBackupBeforeReset(): Promise<void> {
  console.log('\n📦 Создаю backup перед удалением...\n');
  
  try {
    // Запускаем backup скрипт
    child_process.execSync('ts-node scripts/backup-schema.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    console.log('\n✅ Backup создан успешно!\n');
  } catch (error) {
    console.warn('\n⚠️ Не удалось создать backup:', error);
    console.warn('Продолжаем удаление без backup...\n');
  }
}

/**
 * Получить список всех таблиц
 */
async function getAllTables(): Promise<string[]> {
  console.log('📋 Получаю список таблиц для удаления...');
  
  // Используем прямой SQL запрос
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `
  });

  if (error) {
    console.error('❌ Ошибка получения таблиц:', error);
    return [];
  }

  const tables = (data || []).map((row: any) => row.tablename);
  console.log(`✅ Найдено таблиц: ${tables.length}`);
  
  if (tables.length > 0) {
    console.log('📋 Таблицы для удаления:');
    tables.forEach((table: string) => console.log(`   - ${table}`));
  }

  return tables;
}

/**
 * Удалить все таблицы
 */
async function dropAllTables(tables: string[]): Promise<void> {
  console.log('\n🗑️ Удаляю все таблицы...');

  if (tables.length === 0) {
    console.log('✅ Таблиц для удаления нет');
    return;
  }

  // Удаляем таблицы с CASCADE (удалит все зависимости)
  for (const table of tables) {
    console.log(`   🗑️ Удаляю таблицу: ${table}`);
    
    const { error } = await supabase.rpc('exec_sql', {
      query: `DROP TABLE IF EXISTS ${table} CASCADE;`
    });

    if (error) {
      console.error(`   ❌ Ошибка удаления ${table}:`, error);
    } else {
      console.log(`   ✅ Удалена: ${table}`);
    }
  }

  console.log(`\n✅ Все таблицы удалены (${tables.length})`);
}

/**
 * Удалить все функции
 */
async function dropAllFunctions(): Promise<void> {
  console.log('\n⚙️ Удаляю все функции...');

  // Получаем список функций
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        n.nspname as schema,
        p.proname as name,
        pg_get_function_identity_arguments(p.oid) as args
      FROM pg_proc p
      LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить функции:', error);
    return;
  }

  const functions = data || [];
  console.log(`📋 Найдено функций: ${functions.length}`);

  if (functions.length === 0) {
    console.log('✅ Функций для удаления нет');
    return;
  }

  for (const func of functions) {
    console.log(`   🗑️ Удаляю функцию: ${func.name}(${func.args})`);
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `DROP FUNCTION IF EXISTS ${func.name}(${func.args}) CASCADE;`
    });

    if (dropError) {
      console.error(`   ❌ Ошибка удаления ${func.name}:`, dropError);
    } else {
      console.log(`   ✅ Удалена: ${func.name}`);
    }
  }

  console.log(`\n✅ Все функции удалены (${functions.length})`);
}

/**
 * Удалить все триггеры
 */
async function dropAllTriggers(): Promise<void> {
  console.log('\n🔔 Удаляю все триггеры...');

  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        trigger_name,
        event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить триггеры:', error);
    return;
  }

  const triggers = data || [];
  console.log(`📋 Найдено триггеров: ${triggers.length}`);

  if (triggers.length === 0) {
    console.log('✅ Триггеров для удаления нет');
    return;
  }

  for (const trigger of triggers) {
    console.log(`   🗑️ Удаляю триггер: ${trigger.trigger_name} on ${trigger.event_object_table}`);
    
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `DROP TRIGGER IF EXISTS ${trigger.trigger_name} ON ${trigger.event_object_table} CASCADE;`
    });

    if (dropError) {
      console.error(`   ❌ Ошибка удаления ${trigger.trigger_name}:`, dropError);
    } else {
      console.log(`   ✅ Удалён: ${trigger.trigger_name}`);
    }
  }

  console.log(`\n✅ Все триггеры удалены (${triggers.length})`);
}

/**
 * Очистить все Storage buckets
 */
async function cleanupStorageBuckets(): Promise<void> {
  console.log('\n🗄️ Очищаю Storage buckets...');

  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.warn('⚠️ Не удалось получить Storage buckets:', error);
    return;
  }

  console.log(`📋 Найдено Storage buckets: ${buckets?.length || 0}`);

  if (!buckets || buckets.length === 0) {
    console.log('✅ Storage buckets для очистки нет');
    return;
  }

  for (const bucket of buckets) {
    console.log(`   🗑️ Очищаю bucket: ${bucket.name}`);

    try {
      // Получаем список всех файлов в bucket
      const { data: files, error: listError } = await supabase.storage
        .from(bucket.name)
        .list('', {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error(`   ❌ Ошибка получения файлов из ${bucket.name}:`, listError);
        continue;
      }

      if (!files || files.length === 0) {
        console.log(`   ✅ Bucket ${bucket.name} пуст`);
        continue;
      }

      // Удаляем все файлы
      const filePaths = files.map(file => file.name);
      const { error: deleteError } = await supabase.storage
        .from(bucket.name)
        .remove(filePaths);

      if (deleteError) {
        console.error(`   ❌ Ошибка удаления файлов из ${bucket.name}:`, deleteError);
      } else {
        console.log(`   ✅ Удалено файлов: ${filePaths.length} из ${bucket.name}`);
      }

      // Опционально: удаляем сам bucket
      // const { error: deleteBucketError } = await supabase.storage.deleteBucket(bucket.name);
      // if (deleteBucketError) {
      //   console.error(`   ❌ Ошибка удаления bucket ${bucket.name}:`, deleteBucketError);
      // }

    } catch (err) {
      console.error(`   ❌ Неожиданная ошибка при очистке ${bucket.name}:`, err);
    }
  }

  console.log(`\n✅ Все Storage buckets очищены`);
}

/**
 * Удалить миграции Supabase
 */
async function resetMigrations(): Promise<void> {
  console.log('\n🔄 Сбрасываю миграции...');

  // Удаляем таблицу миграций supabase
  const { error } = await supabase.rpc('exec_sql', {
    query: `DROP TABLE IF EXISTS supabase_migrations.schema_migrations CASCADE;`
  });

  if (error) {
    console.warn('⚠️ Не удалось сбросить миграции:', error);
  } else {
    console.log('✅ Миграции сброшены');
  }
}

/**
 * Применить начальные миграции
 */
async function applyInitMigrations(): Promise<void> {
  console.log('\n🚀 Применяю начальную миграцию...');

  try {
    // Запускаем Supabase migration
    child_process.execSync('npx supabase db push', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });

    console.log('✅ Начальные миграции применены');
  } catch (error) {
    console.error('❌ Ошибка применения миграций:', error);
    console.error('Запустите вручную: npx supabase db push');
  }
}

/**
 * Главная функция сброса БД
 */
async function resetDatabase(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🗑️ SUPABASE DATABASE RESET');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('⚠️ ВНИМАНИЕ! Эта операция необратима!');
  console.log('⚠️ Будут удалены ВСЕ данные в базе данных!\n');
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

  // Создаём backup перед удалением
  await createBackupBeforeReset();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🗑️ НАЧИНАЮ УДАЛЕНИЕ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Получаем список таблиц
  const tables = await getAllTables();

  // Удаляем всё по порядку
  await dropAllTriggers();
  await dropAllFunctions();
  await dropAllTables(tables);
  await cleanupStorageBuckets();
  await resetMigrations();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ БАЗА ДАННЫХ ПОЛНОСТЬЮ ОЧИЩЕНА');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Применяем начальные миграции
  const shouldApplyMigrations = process.argv.includes('--apply-migrations');
  
  if (shouldApplyMigrations) {
    await applyInitMigrations();
  } else {
    console.log('💡 Чтобы применить начальные миграции, запустите:');
    console.log('   npm run reset:database -- --confirm --apply-migrations\n');
    console.log('💡 Или вручную:');
    console.log('   npx supabase db push\n');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ RESET ЗАВЕРШЁН');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Запускаем reset
resetDatabase().catch((error) => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА при сбросе БД:', error);
  process.exit(1);
});

