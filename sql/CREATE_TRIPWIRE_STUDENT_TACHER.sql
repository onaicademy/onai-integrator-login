-- ================================================================
-- СОЗДАНИЕ СТУДЕНТА Tacher12122005@gmail.com В TRIPWIRE
-- Минует Sales Manager, создает все записи напрямую в БД
-- ================================================================

-- ВНИМАНИЕ: auth.users НЕ создается этим скриптом!
-- Для создания auth.users используйте Supabase Dashboard или Admin API
-- После создания auth.users, используйте UUID пользователя ниже

-- Сгенерированный UUID для пользователя (будет использоваться как user_id)
-- Если auth.users уже создан, замените этот UUID на реальный
DO $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_email TEXT := 'Tacher12122005@gmail.com';
  v_full_name TEXT := 'Ильязов Микаэль';
  v_generated_password TEXT := 'Tripwire2024!'; -- Сгенерированный пароль
BEGIN
  RAISE NOTICE 'User ID для создания: %', v_user_id;
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Full Name: %', v_full_name;
  RAISE NOTICE 'Generated Password: %', v_generated_password;
END $$;

-- ================================================================
-- 1. СОЗДАНИЕ ЗАПИСИ В public.users
-- ================================================================
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Используйте тот же UUID, что и в auth.users
  'Tacher12122005@gmail.com',
  'Ильязов Микаэль',
  'student',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- 2. СОЗДАНИЕ ЗАПИСИ В tripwire_users
-- ================================================================
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
  email_opened,
  first_login_at,
  last_active_at,
  modules_completed,
  status,
  price,
  onboarding_completed,
  onboarding_completed_at,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  gen_random_uuid(), -- Используйте тот же UUID, что и в auth.users
  'Ильязов Микаэль',
  'Tacher12122005@gmail.com',
  NULL, -- granted_by (менеджер)
  'System', -- manager_name (создано системой)
  'Tripwire2024!', -- generated_password
  FALSE, -- password_changed
  FALSE, -- welcome_email_sent
  NULL, -- welcome_email_sent_at
  FALSE, -- email_opened
  NULL, -- first_login_at
  NULL, -- last_active_at
  0, -- modules_completed
  'active', -- status
  5000, -- price (KZT)
  FALSE, -- onboarding_completed
  NULL, -- onboarding_completed_at
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- 3. СОЗДАНИЕ ЗАПИСИ В tripwire_user_profile
-- ================================================================
INSERT INTO public.tripwire_user_profile (
  user_id,
  modules_completed,
  total_modules,
  completion_percentage,
  certificate_issued,
  certificate_url,
  added_by_manager_id,
  created_at,
  updated_at,
  full_name
) VALUES (
  gen_random_uuid(), -- Используйте тот же UUID, что и в auth.users
  0, -- modules_completed
  3, -- total_modules (3 модуля: 16, 17, 18)
  0, -- completion_percentage
  FALSE, -- certificate_issued
  NULL, -- certificate_url
  NULL, -- added_by_manager_id
  NOW(),
  NOW(),
  'Ильязов Микаэль'
) ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- 4. РАЗБЛОКИРОВКА МОДУЛЕЙ (16, 17, 18)
-- ================================================================
INSERT INTO public.module_unlocks (
  user_id,
  module_id,
  unlocked_at
) VALUES
  (gen_random_uuid(), 16, NOW()), -- Модуль 16
  (gen_random_uuid(), 17, NOW()), -- Модуль 17
  (gen_random_uuid(), 18, NOW())  -- Модуль 18
ON CONFLICT DO NOTHING;

-- ================================================================
-- 5. СОЗДАНИЕ ЗАПИСЕЙ В student_progress (уроки 67, 68, 69)
-- ================================================================
INSERT INTO public.student_progress (
  user_id,
  module_id,
  lesson_id,
  status,
  started_at,
  completed_at,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 16, 67, 'not_started', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 17, 68, 'not_started', NULL, NULL, NOW(), NOW()),
  (gen_random_uuid(), 18, 69, 'not_started', NULL, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- 6. СОЗДАНИЕ ЗАПИСЕЙ В video_tracking
-- ================================================================
INSERT INTO public.video_tracking (
  user_id,
  lesson_id,
  watched_segments,
  total_watched_seconds,
  video_duration_seconds,
  watch_percentage,
  last_position_seconds,
  is_qualified_for_completion,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 67, '[]'::jsonb, 0, 0, 0, 0, FALSE, NOW(), NOW()),
  (gen_random_uuid(), 68, '[]'::jsonb, 0, 0, 0, 0, FALSE, NOW(), NOW()),
  (gen_random_uuid(), 69, '[]'::jsonb, 0, 0, 0, 0, FALSE, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- 7. СОЗДАНИЕ ЗАПИСЕЙ В user_achievements
-- ================================================================
INSERT INTO public.user_achievements (
  user_id,
  achievement_id,
  current_value,
  required_value,
  is_completed,
  completed_at,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 'first_module_complete', 0, 1, FALSE, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'second_module_complete', 0, 1, FALSE, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'third_module_complete', 0, 1, FALSE, NULL, NOW(), NOW()),
  (gen_random_uuid(), 'tripwire_graduate', 0, 1, FALSE, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- 8. СОЗДАНИЕ ЗАПИСИ В user_statistics
-- ================================================================
INSERT INTO public.user_statistics (
  user_id,
  lessons_completed,
  total_time_spent,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(), -- Используйте тот же UUID, что и в auth.users
  0, -- lessons_completed
  0, -- total_time_spent
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- ================================================================
-- 9. СОЗДАНИЕ ЗАПИСЕЙ В tripwire_progress
-- ================================================================
INSERT INTO public.tripwire_progress (
  tripwire_user_id,
  module_id,
  lesson_id,
  is_completed,
  watch_time_seconds,
  started_at,
  completed_at,
  video_qualified_for_completion,
  video_progress_percent,
  last_position_seconds,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 16, 67, FALSE, 0, NULL, NULL, FALSE, 0, 0, NOW(), NOW()),
  (gen_random_uuid(), 17, 68, FALSE, 0, NULL, NULL, FALSE, 0, 0, NOW(), NOW()),
  (gen_random_uuid(), 18, 69, FALSE, 0, NULL, NULL, FALSE, 0, 0, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ================================================================
-- 10. ЛОГИРОВАНИЕ ДЕЙСТВИЯ В sales_activity_log
-- ================================================================
INSERT INTO public.sales_activity_log (
  id,
  manager_id,
  action_type,
  target_user_id,
  details,
  created_at
) VALUES (
  gen_random_uuid(),
  NULL, -- manager_id (создано системой)
  'student_created',
  gen_random_uuid(), -- target_user_id
  jsonb_build_object(
    'email', 'Tacher12122005@gmail.com',
    'full_name', 'Ильязов Микаэль',
    'manager_name', 'System',
    'created_via', 'Direct SQL Script',
    'generated_password', 'Tripwire2024!'
  ),
  NOW()
);

-- ================================================================
-- ПРОВЕРКА СОЗДАННЫХ ЗАПИСЕЙ
-- ================================================================
SELECT 
  'public.users' as table_name, 
  COUNT(*) as record_count 
FROM public.users 
WHERE email = 'Tacher12122005@gmail.com'

UNION ALL

SELECT 
  'tripwire_users' as table_name, 
  COUNT(*) as record_count 
FROM public.tripwire_users 
WHERE email = 'Tacher12122005@gmail.com'

UNION ALL

SELECT 
  'tripwire_user_profile' as table_name, 
  COUNT(*) as record_count 
FROM public.tripwire_user_profile 
WHERE full_name = 'Ильязов Микаэль'

UNION ALL

SELECT 
  'module_unlocks' as table_name, 
  COUNT(*) as record_count 
FROM public.module_unlocks 
WHERE user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'student_progress' as table_name, 
  COUNT(*) as record_count 
FROM public.student_progress 
WHERE user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'video_tracking' as table_name, 
  COUNT(*) as record_count 
FROM public.video_tracking 
WHERE user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'user_achievements' as table_name, 
  COUNT(*) as record_count 
FROM public.user_achievements 
WHERE user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'user_statistics' as table_name, 
  COUNT(*) as record_count 
FROM public.user_statistics 
WHERE user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'tripwire_progress' as table_name, 
  COUNT(*) as record_count 
FROM public.tripwire_progress 
WHERE tripwire_user_id = (
  SELECT user_id FROM public.tripwire_users 
  WHERE email = 'Tacher12122005@gmail.com'
)

UNION ALL

SELECT 
  'sales_activity_log' as table_name, 
  COUNT(*) as record_count 
FROM public.sales_activity_log 
WHERE details->>'email' = 'Tacher12122005@gmail.com';

-- ================================================================
-- ИНСТРУКЦИЯ ПОСЛЕ ВЫПОЛНЕНИЯ СКРИПТА
-- ================================================================
-- 1. Создайте пользователя в auth.users через Supabase Dashboard:
--    - Перейдите в Supabase Dashboard -> Authentication -> Users
--    - Нажмите "Add user"
--    - Email: Tacher12122005@gmail.com
--    - Password: Tripwire2024!
--    - Auto Confirm User: YES
--    
-- 2. Получите UUID созданного пользователя из auth.users
--
-- 3. Обновите все записи в таблицах, заменив gen_random_uuid() на реальный UUID:
--    UPDATE public.users SET id = 'REAL_UUID' WHERE email = 'Tacher12122005@gmail.com';
--    UPDATE public.tripwire_users SET user_id = 'REAL_UUID' WHERE email = 'Tacher12122005@gmail.com';
--    UPDATE public.tripwire_user_profile SET user_id = 'REAL_UUID' WHERE full_name = 'Ильязов Микаэль';
--    UPDATE public.module_unlocks SET user_id = 'REAL_UUID' WHERE user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--    UPDATE public.student_progress SET user_id = 'REAL_UUID' WHERE user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--    UPDATE public.video_tracking SET user_id = 'REAL_UUID' WHERE user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--    UPDATE public.user_achievements SET user_id = 'REAL_UUID' WHERE user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--    UPDATE public.user_statistics SET user_id = 'REAL_UUID' WHERE user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--    UPDATE public.tripwire_progress SET tripwire_user_id = 'REAL_UUID' WHERE tripwire_user_id = (SELECT user_id FROM public.tripwire_users WHERE email = 'Tacher12122005@gmail.com');
--
-- 4. Отправьте welcome email через Resend API
--
-- 5. Проверьте, что пользователь может войти в систему
-- ================================================================
