-- 🔍 УНИВЕРСАЛЬНАЯ ПРОВЕРКА БАЗЫ ДАННЫХ
-- Сначала узнаём какие колонки есть, потом проверяем данные

-- ============================================
-- 1. УЗНАЁМ СТРУКТУРУ ТАБЛИЦ
-- ============================================
SELECT 
  '=== СТРУКТУРА public.users ===' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 2. ПРОВЕРКА auth.users
-- ============================================
SELECT 
  '=== AUTH.USERS ===' as section,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'test-another@gmail.com';

-- ============================================
-- 3. ПРОВЕРКА public.users (ВСЕ КОЛОНКИ)
-- ============================================
SELECT 
  '=== PUBLIC.USERS ===' as section,
  *
FROM public.users
WHERE email = 'test-another@gmail.com';

-- ============================================
-- 4. ПРОВЕРКА user_stats (если таблица существует)
-- ============================================
SELECT 
  '=== USER_STATS ===' as section,
  *
FROM public.user_stats
WHERE user_id = (
  SELECT id FROM public.users WHERE email = 'test-another@gmail.com' LIMIT 1
)
LIMIT 1;

-- ============================================
-- 5. ПРОВЕРКА ВСЕХ ТАБЛИЦ
-- ============================================
SELECT 
  '=== ВСЕ ТАБЛИЦЫ ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- ИТОГОВЫЙ ВЕРДИКТ
-- ============================================
SELECT 
  '=== ИТОГ ===' as section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'test-another@gmail.com')
    THEN '✅ Пользователь в auth.users'
    ELSE '❌ НЕТ в auth.users'
  END as auth_status,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE email = 'test-another@gmail.com')
    THEN '✅ Пользователь в public.users'
    ELSE '❌ НЕТ в public.users'
  END as public_users_status;

