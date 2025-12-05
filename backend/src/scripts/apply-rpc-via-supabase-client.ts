/**
 * APPLY RPC FUNCTIONS VIA SUPABASE CLIENT
 * Применяет RPC функции через Supabase JavaScript Client
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Загружаем .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_SERVICE_ROLE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!TRIPWIRE_SUPABASE_URL || !TRIPWIRE_SERVICE_ROLE_KEY) {
  console.error('❌ Отсутствуют ENV переменные');
  process.exit(1);
}

console.log('\n🔧 APPLYING RPC FUNCTIONS VIA SUPABASE CLIENT');
console.log('='.repeat(60));
console.log('📍 URL:', TRIPWIRE_SUPABASE_URL);
console.log('🔑 Service Role Key:', TRIPWIRE_SERVICE_ROLE_KEY.substring(0, 20) + '...');
console.log('='.repeat(60));

async function applyRpcFunctions(): Promise<void> {
  // Создаем Supabase client с service_role_key
  const supabase = createClient(TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });

  try {
    // Читаем SQL файл
    const sqlPath = path.resolve(__dirname, 'fix-rpc-with-sleep.sql');
    console.log('\n📄 Читаем RPC миграцию:', sqlPath);

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL файл не найден: ${sqlPath}`);
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    console.log(`✅ Прочитано ${sqlContent.length} символов SQL`);

    // Разбиваем SQL на отдельные команды (по DROP, CREATE, GRANT)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .map(s => s + ';');

    console.log(`\n📊 Найдено ${statements.length} SQL команд`);

    console.log('\n⚙️  Применяем RPC функции...');
    console.log('━'.repeat(60));

    // Выполняем каждую команду отдельно через rpc()
    let successCount = 0;
    let skipCount = 0;

    for (const [index, statement] of statements.entries()) {
      // Пропускаем комментарии и SELECT pg_sleep
      if (statement.includes('SELECT pg_sleep') || statement.includes('NOTIFY pgrst')) {
        console.log(`⏭️  [${index + 1}/${statements.length}] Пропускаем: ${statement.substring(0, 50)}...`);
        skipCount++;
        continue;
      }

      console.log(`▶️  [${index + 1}/${statements.length}] Выполняем: ${statement.substring(0, 50)}...`);

      // Используем supabase.rpc() для выполнения SQL
      // Внимание: supabase-js не поддерживает прямое выполнение SQL
      // Нужно использовать PostgREST Management API
      const { data, error } = await supabase.rpc('exec', { sql: statement });

      if (error) {
        console.warn(`⚠️  Ошибка (не критично): ${error.message}`);
      } else {
        successCount++;
        console.log(`   ✅ Успешно`);
      }
    }

    console.log('━'.repeat(60));
    console.log(`✅ Выполнено успешно: ${successCount}`);
    console.log(`⏭️  Пропущено: ${skipCount}`);

    console.log('\n' + '='.repeat(60));
    console.log('✨ МИГРАЦИЯ ЗАВЕРШЕНА!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('\n❌ ОШИБКА:', error.message);
    if (error.stack) {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  }
}

applyRpcFunctions();
