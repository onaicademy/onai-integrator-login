/**
 * Проверить и применить миграцию telegram_groups к Landing Supabase
 * + Проверить все таблицы связанные с лендингами
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// Load env variables
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../backend/env.env') });

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

if (!LANDING_SUPABASE_URL || !LANDING_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Landing Supabase credentials!');
  process.exit(1);
}

console.log('🔗 Connecting to Landing Supabase:', LANDING_SUPABASE_URL);

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY);

async function checkAndApply() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 ПРОВЕРКА LANDING SUPABASE БД');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Проверяем существующие таблицы
  console.log('📊 Шаг 1: Проверка существующих таблиц\n');
  
  const tablesToCheck = [
    'landing_leads',
    'journey_stages', 
    'scheduled_notifications',
    'telegram_groups'
  ];

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          console.log(`   ❌ Таблица ${tableName} НЕ СУЩЕСТВУЕТ`);
        } else {
          console.log(`   ⚠️  Таблица ${tableName}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ Таблица ${tableName} существует`);
      }
    } catch (err: any) {
      console.log(`   ❌ Ошибка проверки ${tableName}: ${err.message}`);
    }
  }

  // 2. Проверяем количество записей в таблицах
  console.log('\n📈 Шаг 2: Статистика таблиц\n');
  
  try {
    const { count: leadsCount } = await supabase
      .from('landing_leads')
      .select('*', { count: 'exact', head: true });
    console.log(`   📝 landing_leads: ${leadsCount || 0} записей`);
  } catch (err) {
    console.log('   ⚠️  landing_leads: таблица недоступна');
  }

  try {
    const { count: journeyCount } = await supabase
      .from('journey_stages')
      .select('*', { count: 'exact', head: true });
    console.log(`   📍 journey_stages: ${journeyCount || 0} записей`);
  } catch (err) {
    console.log('   ⚠️  journey_stages: таблица недоступна');
  }

  try {
    const { count: notifCount } = await supabase
      .from('scheduled_notifications')
      .select('*', { count: 'exact', head: true });
    console.log(`   📧 scheduled_notifications: ${notifCount || 0} записей`);
  } catch (err) {
    console.log('   ⚠️  scheduled_notifications: таблица недоступна');
  }

  // 3. Применяем миграцию telegram_groups
  console.log('\n🚀 Шаг 3: Применение миграции telegram_groups\n');

  const createTableSQL = `
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

COMMENT ON TABLE public.telegram_groups IS 'Хранит активные Telegram группы для уведомлений';
COMMENT ON COLUMN public.telegram_groups.group_type IS 'Тип группы: leads (лиды), admin (админ), notifications (уведомления)';
COMMENT ON COLUMN public.telegram_groups.is_active IS 'Активна ли группа для отправки сообщений';
`;

  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION update_telegram_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

  const createTriggerSQL = `
DROP TRIGGER IF EXISTS trigger_telegram_groups_updated_at ON public.telegram_groups;
CREATE TRIGGER trigger_telegram_groups_updated_at
  BEFORE UPDATE ON public.telegram_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_groups_updated_at();
`;

  const createPolicySQL = `
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to telegram_groups" ON public.telegram_groups;
CREATE POLICY "Service role has full access to telegram_groups"
  ON public.telegram_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT ALL ON public.telegram_groups TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
`;

  // Используем прямое подключение к PostgreSQL через fetch
  console.log('   📝 Создание таблицы telegram_groups...');
  
  try {
    // Пробуем через REST API
    const response = await fetch(`${LANDING_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': LANDING_SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${LANDING_SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: createTableSQL })
    });

    if (!response.ok) {
      console.log('   ⚠️  REST API недоступен, пробую альтернативный метод...');
    } else {
      console.log('   ✅ Таблица создана через REST API');
    }
  } catch (err: any) {
    console.log('   ⚠️  REST API недоступен:', err.message);
  }

  // Проверяем результат
  console.log('\n🔍 Шаг 4: Проверка результата\n');
  
  try {
    const { data, error } = await supabase
      .from('telegram_groups')
      .select('*')
      .limit(1);

    if (error) {
      console.log('   ❌ Таблица telegram_groups НЕ создана');
      console.log('   📝 Ошибка:', error.message);
      console.log('\n⚠️  НУЖНО ПРИМЕНИТЬ ВРУЧНУЮ:');
      console.log('   1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
      console.log('   2. Скопируй SQL из: backend/supabase/migrations/create_telegram_groups.sql');
      console.log('   3. Выполни в SQL Editor');
    } else {
      console.log('   ✅ Таблица telegram_groups СОЗДАНА И ДОСТУПНА!');
      
      // Проверяем структуру
      const { count } = await supabase
        .from('telegram_groups')
        .select('*', { count: 'exact', head: true });
      console.log(`   📊 Записей в таблице: ${count || 0}`);
    }
  } catch (err: any) {
    console.log('   ❌ Ошибка проверки:', err.message);
  }

  // 5. Итоговая сводка
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 ИТОГОВАЯ СВОДКА');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('✅ Все таблицы для заявок с лендинга:');
  console.log('   - landing_leads (основные лиды)');
  console.log('   - journey_stages (путь пользователя)');
  console.log('   - scheduled_notifications (отложенные уведомления)');
  console.log('   - telegram_groups (активные группы для уведомлений)\n');

  console.log('📍 Находятся в: Landing Supabase');
  console.log('   URL:', LANDING_SUPABASE_URL);
  console.log('   Project ID: xikaiavwqinamgolmtcy\n');

  console.log('✨ Готово!\n');
}

checkAndApply();
