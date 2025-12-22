-- =================================================================
-- ПРИМЕР RPC ФУНКЦИИ КОТОРАЯ НЕ РАБОТАЕТ В SUPABASE
-- =================================================================

-- Функция существует в pg_proc, но PostgREST её не видит!

CREATE OR REPLACE FUNCTION public.rpc_get_sales_activity_log(
  p_end_date TIMESTAMPTZ DEFAULT NULL,      -- Параметр 1 (алфавитно: E)
  p_limit INTEGER DEFAULT 20,                -- Параметр 2 (алфавитно: L)
  p_manager_id UUID DEFAULT NULL,            -- Параметр 3 (алфавитно: M)
  p_start_date TIMESTAMPTZ DEFAULT NULL      -- Параметр 4 (алфавитно: S)
)
RETURNS TABLE (
  id UUID,
  manager_id UUID,
  manager_name TEXT,
  action_type TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id,
    sal.manager_id,
    sal.manager_name,
    sal.action_type,
    sal.target_user_id,
    sal.target_user_email,
    sal.details,
    sal.created_at
  FROM public.sales_activity_log sal
  WHERE 
    (p_manager_id IS NULL OR sal.manager_id = p_manager_id)
    AND (p_start_date IS NULL OR sal.created_at >= p_start_date)
    AND (p_end_date IS NULL OR sal.created_at <= p_end_date)
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даем права
GRANT EXECUTE ON FUNCTION public.rpc_get_sales_activity_log(
  TIMESTAMPTZ, 
  INTEGER, 
  UUID, 
  TIMESTAMPTZ
) TO authenticated, anon, service_role;

-- Пытаемся обновить PostgREST cache (НЕ РАБОТАЕТ!)
NOTIFY pgrst, 'reload schema';

-- =================================================================
-- ПРОВЕРКА ЧТО ФУНКЦИЯ СУЩЕСТВУЕТ В БД
-- =================================================================

SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'rpc_get_sales_activity_log';

-- РЕЗУЛЬТАТ: ✅ ФУНКЦИЯ ЕСТЬ!
-- function_name: rpc_get_sales_activity_log
-- arguments: p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 20, p_manager_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone

-- =================================================================
-- ВЫЗОВ ЧЕРЕЗ SUPABASE JS CLIENT (НЕ РАБОТАЕТ!)
-- =================================================================

/*
TypeScript код:

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { data, error } = await supabase.rpc('rpc_get_sales_activity_log', {
  p_manager_id: '123e4567-e89b-12d3-a456-426614174000',
  p_limit: 20,
  p_start_date: '2025-01-01T00:00:00Z',
  p_end_date: '2025-12-31T23:59:59Z',
});

// ОШИБКА:
// RPC error: Could not find the function public.rpc_get_sales_activity_log(p_end_date, p_limit, p_manager_id, p_start_date) in the schema cache
*/

-- =================================================================
-- ПРИМЕЧАНИЕ: ВСЕ 5 НАШИХ RPC ФУНКЦИЙ ИМЕЮТ ЭТУ ПРОБЛЕМУ!
-- =================================================================

-- 1. rpc_get_sales_leaderboard() - БЕЗ параметров - НЕ РАБОТАЕТ
-- 2. rpc_get_sales_activity_log(...) - С параметрами - НЕ РАБОТАЕТ
-- 3. rpc_get_sales_chart_data(...) - С параметрами - НЕ РАБОТАЕТ
-- 4. rpc_get_tripwire_stats(...) - С параметрами - НЕ РАБОТАЕТ
-- 5. rpc_get_tripwire_users(...) - С параметрами - НЕ РАБОТАЕТ

