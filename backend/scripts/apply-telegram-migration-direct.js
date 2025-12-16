/**
 * Применить миграцию telegram_groups через прямое PostgreSQL подключение
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Для Landing БД используем только HTTP API, так как DATABASE_URL нет
// Придется применить через Supabase UI

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📱 ПРИМЕНЕНИЕ МИГРАЦИИ TELEGRAM_GROUPS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Читаем SQL файл
const sqlPath = path.join(__dirname, '../supabase/migrations/create_telegram_groups.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

console.log('📄 SQL файл загружен:', sqlPath);
console.log('📏 Размер:', sql.length, 'символов\n');

console.log('⚠️  Для Landing Supabase нужно применить миграцию вручную\n');
console.log('🔗 Причина: Landing БД не имеет прямого DATABASE_URL\n');

console.log('📋 ИНСТРУКЦИЯ:\n');
console.log('1. Открой Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new\n');

console.log('2. Скопируй этот SQL:\n');
console.log('─────────────────────────────────────────────────────────────────');
console.log(sql);
console.log('─────────────────────────────────────────────────────────────────\n');

console.log('3. Вставь в SQL Editor и нажми RUN\n');

console.log('4. Проверь что таблица создалась:');
console.log('   SELECT * FROM telegram_groups LIMIT 10;\n');

console.log('✅ После этого можешь активировать группу кодом 2134!\n');

// Сохраним SQL в отдельный файл для удобства
const quickSqlPath = path.join(__dirname, '../../QUICK_APPLY_THIS.sql');
fs.writeFileSync(quickSqlPath, sql);
console.log('💾 SQL сохранен для быстрого копирования:');
console.log('   ' + quickSqlPath + '\n');

console.log('═══════════════════════════════════════════════════════════════\n');
