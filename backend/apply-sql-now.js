/**
 * Применить SQL миграцию через прямое подключение к PostgreSQL
 */

const { Client } = require('pg');

// Пробуем разные варианты подключения
const connectionOptions = [
  // Вариант 1: Pooler connection
  'postgresql://postgres.xikaiavwqinamgolmtcy:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  // Вариант 2: Direct connection
  'postgresql://postgres.xikaiavwqinamgolmtcy:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:5432/postgres',
  // Вариант 3: IPv6
  'postgresql://postgres:[RM8O6L2XN9XG7HI9]@db.xikaiavwqinamgolmtcy.supabase.co:5432/postgres'
];

const sql = `
CREATE TABLE IF NOT EXISTS public.telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  chat_title TEXT,
  group_type TEXT NOT NULL DEFAULT 'leads',
  is_active BOOLEAN DEFAULT true,
  activated_by TEXT,
  activated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_groups_chat_id ON public.telegram_groups(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_groups_type_active ON public.telegram_groups(group_type, is_active) WHERE is_active = true;

ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to telegram_groups" ON public.telegram_groups;
CREATE POLICY "Service role has full access to telegram_groups"
  ON public.telegram_groups FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.telegram_groups TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
`;

async function tryConnection(connString, index) {
  console.log(`\n[${index + 1}/${connectionOptions.length}] Пробую подключение...`);
  
  const client = new Client({
    connectionString: connString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ Подключено!');
    
    console.log('🚀 Применяю SQL миграцию...');
    await client.query(sql);
    console.log('✅ SQL выполнен успешно!');
    
    // Проверяем результат
    const result = await client.query('SELECT COUNT(*) as count FROM telegram_groups');
    console.log(`✅ Таблица создана! Записей: ${result.rows[0].count}`);
    
    await client.end();
    return true;
  } catch (error) {
    console.log(`❌ Ошибка: ${error.message}`);
    try {
      await client.end();
    } catch (e) {}
    return false;
  }
}

async function applySQL() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📱 ПРИМЕНЕНИЕ SQL МИГРАЦИИ TELEGRAM_GROUPS');
  console.log('═══════════════════════════════════════════════════════════════');

  for (let i = 0; i < connectionOptions.length; i++) {
    const success = await tryConnection(connectionOptions[i], i);
    if (success) {
      console.log('\n🎉 УСПЕХ! SQL применен!');
      console.log('\n✨ Теперь можешь:');
      console.log('   1. Отправить 2134 в группе');
      console.log('   2. Бот сохранит группу в БД');
      console.log('   3. Лиды будут приходить автоматически!');
      console.log('\n═══════════════════════════════════════════════════════════════\n');
      process.exit(0);
    }
  }

  console.log('\n❌ Не удалось подключиться ни одним способом');
  console.log('\n📋 Нужно применить вручную:');
  console.log('   1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
  console.log('   2. Скопируй SQL из: МИНИМАЛЬНЫЙ_SQL.sql');
  console.log('   3. Выполни в SQL Editor\n');
  process.exit(1);
}

applySQL();
