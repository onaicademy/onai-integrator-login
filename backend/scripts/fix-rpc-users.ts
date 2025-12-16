/**
 * 🔧 FIX: rpc_get_tripwire_users - возвращает NULL для email и full_name
 */

import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../env.env') });

const supabaseUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const supabaseKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRPC() {
  console.log('🔧 ОБНОВЛЕНИЕ RPC ФУНКЦИИ\n');
  console.log('='.repeat(80));

  try {
    // Читаем SQL файл
    const sqlPath = path.resolve(__dirname, 'fix-rpc-get-users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('\n📤 Выполнение SQL...');
    
    // Выполняем через rpc (используем .rpc для выполнения SQL)
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // Если exec_sql не существует, пробуем напрямую
      console.log('   ⚠️  exec_sql не найден, используем альтернативный метод...');
      
      // Создаём функцию напрямую
      const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.rpc_get_tripwire_users(
  p_manager_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20,
  p_status TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  status TEXT,
  modules_completed INTEGER,
  granted_by UUID,
  manager_name TEXT,
  first_login_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  welcome_email_sent BOOLEAN,
  email_opened BOOLEAN,
  total_count BIGINT
) AS $body$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  WITH filtered_users AS (
    SELECT 
      tw.id,
      tw.user_id,
      tw.full_name,
      tw.email,
      tw.status,
      tw.modules_completed,
      tw.granted_by,
      tw.manager_name,
      tw.first_login_at,
      tw.last_active_at,
      tw.created_at,
      tw.welcome_email_sent,
      tw.email_opened
    FROM public.tripwire_users tw
    WHERE 
      (p_manager_id IS NULL OR tw.granted_by = p_manager_id)
      AND (p_status IS NULL OR tw.status = p_status)
      AND (p_start_date IS NULL OR tw.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tw.created_at <= p_end_date)
    ORDER BY tw.created_at DESC
  ),
  total AS (
    SELECT COUNT(*)::BIGINT AS cnt FROM filtered_users
  )
  SELECT 
    fu.id,
    fu.user_id,
    fu.full_name,
    fu.email,
    fu.status,
    fu.modules_completed,
    fu.granted_by,
    fu.manager_name,
    fu.first_login_at,
    fu.last_active_at,
    fu.created_at,
    fu.welcome_email_sent,
    fu.email_opened,
    t.cnt AS total_count
  FROM filtered_users fu
  CROSS JOIN total t
  LIMIT p_limit
  OFFSET v_offset;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;
`;

      console.log('\n❌ Не удалось выполнить SQL через Supabase JS');
      console.log('\n📋 ИНСТРУКЦИЯ: Выполни SQL вручную в Supabase SQL Editor:');
      console.log('\n1. Открой: https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto/sql');
      console.log('2. Вставь SQL:');
      console.log('\n' + '='.repeat(80));
      console.log(createFunctionSQL);
      console.log('='.repeat(80));
      console.log('\n3. Нажми "Run"');
      console.log('\n✅ После выполнения - обнови страницу Sales Manager (F5)');
      
      // Сохраняем SQL в файл для копирования
      fs.writeFileSync(
        path.resolve(__dirname, 'fix-rpc-users-manual.sql'),
        createFunctionSQL
      );
      console.log('\n💾 SQL сохранён в: backend/scripts/fix-rpc-users-manual.sql');
    } else {
      console.log('✅ RPC функция обновлена!');
    }

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    throw error;
  }
}

fixRPC()
  .then(() => {
    console.log('\n✅ ГОТОВО!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ ОШИБКА:', error);
    process.exit(1);
  });
