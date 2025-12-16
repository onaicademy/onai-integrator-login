/**
 * Быстро применить миграцию telegram_groups через Supabase API
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../backend/env.env') });

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL;
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY;

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('\n🚀 Применение миграции telegram_groups...\n');

  // Проверяем существует ли таблица
  const { data: existingTable, error: checkError } = await supabase
    .from('telegram_groups')
    .select('*')
    .limit(1);

  if (!checkError) {
    console.log('✅ Таблица telegram_groups уже существует!');
    const { count } = await supabase
      .from('telegram_groups')
      .select('*', { count: 'exact', head: true });
    console.log('📊 Записей в таблице:', count || 0);
    console.log('\n✨ Миграция не требуется!\n');
    return;
  }

  console.log('❌ Таблица не найдена. Нужно применить SQL вручную:');
  console.log('\n📋 ИНСТРУКЦИЯ:\n');
  console.log('1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new');
  console.log('2. Скопируй SQL из: QUICK_APPLY_THIS.sql');
  console.log('3. Выполни в SQL Editor');
  console.log('4. Запусти этот скрипт снова для проверки\n');
}

applyMigration();
