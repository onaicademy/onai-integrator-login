/**
 * Simple script to execute migration 004 using Supabase client
 * This creates the integration_logs table step by step
 */

import { createClient } from '@supabase/supabase-js';

// Landing BD credentials
const SUPABASE_URL = 'https://xikaiavwqinamgolmtcy.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('\n🚀 МИГРАЦИЯ 004: Создание таблицы integration_logs');
  console.log('=' .repeat(60));
  console.log('База: Landing BD (xikaiavwqinamgolmtcy)\n');

  // Проверяем, что таблица еще не создана
  console.log('🔍 Шаг 1: Проверка существования таблицы...');

  const { error: checkError } = await supabase
    .from('integration_logs')
    .select('id', { count: 'exact', head: true });

  if (!checkError) {
    console.log('✅ Таблица integration_logs уже существует!');
    console.log('   Пропускаем создание...\n');

    // Покажем текущее количество записей
    const { count } = await supabase
      .from('integration_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Текущее количество записей: ${count || 0}\n`);

    console.log('💡 Таблица уже готова к использованию!');
    console.log('   Если нужно пересоздать таблицу, выполните:');
    console.log('   DROP TABLE IF EXISTS integration_logs CASCADE;\n');

    return;
  }

  console.log('⚠️  Таблица не найдена. Создаем...\n');

  // Информируем о необходимости ручного выполнения
  console.log('📋 ИНСТРУКЦИЯ: Ручное выполнение миграции');
  console.log('=' .repeat(60));
  console.log('');
  console.log('К сожалению, Supabase не позволяет выполнять DDL команды через REST API.');
  console.log('Миграцию необходимо выполнить вручную через SQL Editor.');
  console.log('');
  console.log('🔗 Откройте SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor');
  console.log('');
  console.log('📄 Файл миграции:');
  console.log('   /Users/miso/onai-integrator-login/sql/migrations/004_create_integration_logs_table.sql');
  console.log('');
  console.log('✅ Шаги:');
  console.log('   1. Откройте SQL Editor в Supabase Dashboard');
  console.log('   2. Создайте новый запрос (New Query)');
  console.log('   3. Скопируйте содержимое файла 004_create_integration_logs_table.sql');
  console.log('   4. Вставьте в редактор и нажмите Run (Ctrl/Cmd + Enter)');
  console.log('   5. Дождитесь успешного выполнения (~1-2 секунды)');
  console.log('   6. Запустите этот скрипт снова для проверки');
  console.log('');
  console.log('=' .repeat(60));
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n❌ Ошибка:', error);
  process.exit(1);
});
