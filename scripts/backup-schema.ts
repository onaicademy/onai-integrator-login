#!/usr/bin/env ts-node

/**
 * 📦 SUPABASE SCHEMA BACKUP SCRIPT
 * 
 * Создаёт полный backup структуры БД перед удалением:
 * - Все таблицы и их структура
 * - Все RLS политики
 * - Все триггеры и функции
 * - Все индексы
 * - Storage buckets конфигурация
 * 
 * Usage: npm run backup:schema
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

interface BackupData {
  timestamp: string;
  supabase_url: string;
  tables: any[];
  rls_policies: any[];
  functions: any[];
  triggers: any[];
  storage_buckets: any[];
  indexes: any[];
}

/**
 * Получить список всех таблиц
 */
async function getTables(): Promise<any[]> {
  console.log('📋 Получаю список таблиц...');
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('*')
    .eq('table_schema', 'public')
    .neq('table_type', 'VIEW');

  if (error) {
    console.warn('⚠️ Не удалось получить таблицы через Supabase client, пытаюсь через SQL...');
    
    const { data: sqlData, error: sqlError } = await supabase.rpc('get_tables', {
      query: `
        SELECT 
          table_name,
          table_schema,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

    if (sqlError) {
      console.error('❌ Ошибка получения таблиц:', sqlError);
      return [];
    }
    
    return sqlData || [];
  }

  console.log(`✅ Найдено таблиц: ${data?.length || 0}`);
  return data || [];
}

/**
 * Получить структуру таблицы (колонки)
 */
async function getTableColumns(tableName: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('*')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .order('ordinal_position');

  if (error) {
    console.warn(`⚠️ Не удалось получить колонки для ${tableName}:`, error);
    return [];
  }

  return data || [];
}

/**
 * Получить все RLS политики
 */
async function getRLSPolicies(): Promise<any[]> {
  console.log('🔒 Получаю RLS политики...');
  
  // Используем прямой SQL запрос через REST API
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить RLS политики:', error);
    return [];
  }

  console.log(`✅ Найдено RLS политик: ${data?.length || 0}`);
  return data || [];
}

/**
 * Получить все функции
 */
async function getFunctions(): Promise<any[]> {
  console.log('⚙️ Получаю функции...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        n.nspname as schema,
        p.proname as name,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      ORDER BY p.proname;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить функции:', error);
    return [];
  }

  console.log(`✅ Найдено функций: ${data?.length || 0}`);
  return data || [];
}

/**
 * Получить все триггеры
 */
async function getTriggers(): Promise<any[]> {
  console.log('🔔 Получаю триггеры...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        trigger_schema,
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить триггеры:', error);
    return [];
  }

  console.log(`✅ Найдено триггеров: ${data?.length || 0}`);
  return data || [];
}

/**
 * Получить все Storage buckets
 */
async function getStorageBuckets(): Promise<any[]> {
  console.log('🗄️ Получаю Storage buckets...');
  
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    console.warn('⚠️ Не удалось получить Storage buckets:', error);
    return [];
  }

  console.log(`✅ Найдено Storage buckets: ${data?.length || 0}`);
  return data || [];
}

/**
 * Получить все индексы
 */
async function getIndexes(): Promise<any[]> {
  console.log('📊 Получаю индексы...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `
  });

  if (error) {
    console.warn('⚠️ Не удалось получить индексы:', error);
    return [];
  }

  console.log(`✅ Найдено индексов: ${data?.length || 0}`);
  return data || [];
}

/**
 * Создать backup schema
 */
async function createBackup(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📦 SUPABASE SCHEMA BACKUP');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

  // Собираем все данные
  const tables = await getTables();
  const rls_policies = await getRLSPolicies();
  const functions = await getFunctions();
  const triggers = await getTriggers();
  const storage_buckets = await getStorageBuckets();
  const indexes = await getIndexes();

  // Получаем структуру каждой таблицы
  const tablesWithColumns = await Promise.all(
    tables.map(async (table: any) => {
      const columns = await getTableColumns(table.table_name);
      return {
        ...table,
        columns
      };
    })
  );

  const backupData: BackupData = {
    timestamp: new Date().toISOString(),
    supabase_url: SUPABASE_URL,
    tables: tablesWithColumns,
    rls_policies,
    functions,
    triggers,
    storage_buckets,
    indexes
  };

  // Создаём директорию для backup если её нет
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Сохраняем JSON backup
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const jsonFilename = `schema-backup-${timestamp}.json`;
  const jsonPath = path.join(backupDir, jsonFilename);
  
  fs.writeFileSync(jsonPath, JSON.stringify(backupData, null, 2));
  console.log(`\n✅ JSON backup сохранён: ${jsonFilename}`);

  // Создаём SQL backup (для удобства восстановления)
  const sqlFilename = `schema-backup-${timestamp}.sql`;
  const sqlPath = path.join(backupDir, sqlFilename);
  
  let sqlContent = `-- SUPABASE SCHEMA BACKUP\n`;
  sqlContent += `-- Created: ${backupData.timestamp}\n`;
  sqlContent += `-- URL: ${SUPABASE_URL}\n\n`;

  // Добавляем CREATE TABLE statements
  sqlContent += `-- ═══════════════════════════════════════════════════════════════\n`;
  sqlContent += `-- TABLES\n`;
  sqlContent += `-- ═══════════════════════════════════════════════════════════════\n\n`;

  for (const table of tablesWithColumns) {
    sqlContent += `-- Table: ${table.table_name}\n`;
    sqlContent += `CREATE TABLE IF NOT EXISTS ${table.table_name} (\n`;
    
    const columnDefs = table.columns.map((col: any) => {
      let def = `  ${col.column_name} ${col.data_type}`;
      if (col.character_maximum_length) {
        def += `(${col.character_maximum_length})`;
      }
      if (col.is_nullable === 'NO') {
        def += ` NOT NULL`;
      }
      if (col.column_default) {
        def += ` DEFAULT ${col.column_default}`;
      }
      return def;
    });
    
    sqlContent += columnDefs.join(',\n');
    sqlContent += `\n);\n\n`;
  }

  // Добавляем RLS политики
  if (rls_policies.length > 0) {
    sqlContent += `-- ═══════════════════════════════════════════════════════════════\n`;
    sqlContent += `-- RLS POLICIES\n`;
    sqlContent += `-- ═══════════════════════════════════════════════════════════════\n\n`;

    for (const policy of rls_policies) {
      sqlContent += `-- Policy: ${policy.policyname} on ${policy.tablename}\n`;
      sqlContent += `ALTER TABLE ${policy.tablename} ENABLE ROW LEVEL SECURITY;\n`;
      sqlContent += `-- ${JSON.stringify(policy, null, 2)}\n\n`;
    }
  }

  fs.writeFileSync(sqlPath, sqlContent);
  console.log(`✅ SQL backup сохранён: ${sqlFilename}`);

  // Статистика
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 СТАТИСТИКА BACKUP');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log(`📋 Таблиц: ${tables.length}`);
  console.log(`🔒 RLS политик: ${rls_policies.length}`);
  console.log(`⚙️ Функций: ${functions.length}`);
  console.log(`🔔 Триггеров: ${triggers.length}`);
  console.log(`🗄️ Storage buckets: ${storage_buckets.length}`);
  console.log(`📊 Индексов: ${indexes.length}`);
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ BACKUP ЗАВЕРШЁН');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Запускаем backup
createBackup().catch((error) => {
  console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА при создании backup:', error);
  process.exit(1);
});

