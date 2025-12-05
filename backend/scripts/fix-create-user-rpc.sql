-- ================================================================
-- FIX: rpc_create_tripwire_user_full
-- УБИРАЕМ создание auth.users (это делает Supabase Admin API)
-- ТОЛЬКО создаем запись в tripwire_users
-- ================================================================

DROP FUNCTION IF EXISTS public.rpc_create_tripwire_user_full;

CREATE OR REPLACE FUNCTION public.rpc_create_tripwire_user_full(
  p_email TEXT,
  p_full_name TEXT,
  p_generated_password TEXT,
  p_granted_by UUID,
  p_manager_name TEXT,
  p_user_id UUID,
  p_welcome_email_sent BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Создаем запись в tripwire_users (auth.users уже создан Admin API)
  INSERT INTO public.tripwire_users (
    id,
    user_id,
    full_name,
    email,
    granted_by,
    manager_name,
    generated_password,
    password_changed,
    welcome_email_sent,
    welcome_email_sent_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_full_name,
    p_email,
    p_granted_by,
    p_manager_name,
    p_generated_password,
    FALSE,
    p_welcome_email_sent,
    CASE WHEN p_welcome_email_sent THEN NOW() ELSE NULL END,
    'active',
    NOW(),
    NOW()
  );

  -- 2. Логируем действие
  INSERT INTO public.sales_activity_log (
    id,
    manager_id,
    action_type,
    target_user_id,
    details,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_granted_by,
    'student_created',
    p_user_id,
    jsonb_build_object(
      'email', p_email,
      'full_name', p_full_name,
      'manager_name', p_manager_name
    ),
    NOW()
  );

  -- 3. Создаем профиль в users таблице
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (p_user_id, p_email, p_full_name, 'student')
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- 4. Возвращаем результат
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'email', p_email,
    'full_name', p_full_name,
    'status', 'active'
  );

  RETURN v_result;
END;
$$;

-- Выдаем права
GRANT EXECUTE ON FUNCTION public.rpc_create_tripwire_user_full TO service_role, authenticated;

COMMENT ON FUNCTION public.rpc_create_tripwire_user_full IS 'Создание Tripwire пользователя (auth.users создается Admin API, эта функция только tripwire_users + activity_log)';

