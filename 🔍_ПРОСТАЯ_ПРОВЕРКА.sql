-- 🔍 ПРОСТАЯ ПРОВЕРКА - Смотрим что РЕАЛЬНО есть в базе

-- ============================================
-- 1. КАКИЕ ТАБЛИЦЫ СУЩЕСТВУЮТ?
-- ============================================
SELECT 
  '=== ВСЕ ТАБЛИЦЫ В PUBLIC ===' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. СТРУКТУРА public.users (если существует)
-- ============================================
SELECT 
  '=== СТРУКТУРА public.users ===' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 3. ПОЛЬЗОВАТЕЛЬ В auth.users
-- ============================================
SELECT 
  '=== auth.users ===' as info,
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users
WHERE email = 'test-another@gmail.com';

-- ============================================
-- 4. ПОЛЬЗОВАТЕЛЬ В public.users (если есть таблица)
-- ============================================
SELECT 
  '=== public.users ===' as info,
  *
FROM public.users
WHERE email = 'test-another@gmail.com'
LIMIT 1;

-- ============================================
-- 5. ИТОГ
-- ============================================
SELECT 
  '=== ИТОГ ===' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    )
    THEN '✅ Таблица public.users существует'
    ELSE '❌ Таблица public.users НЕ СУЩЕСТВУЕТ'
  END as public_users_table,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users WHERE email = 'test-another@gmail.com'
    )
    THEN '✅ Пользователь в auth.users'
    ELSE '❌ Пользователя НЕТ в auth.users'
  END as auth_user,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AND EXISTS (
      SELECT 1 FROM public.users WHERE email = 'test-another@gmail.com'
    )
    THEN '✅ Пользователь в public.users'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    )
    THEN '❌ Таблица есть, но пользователя НЕТ'
    ELSE '❌ Таблица public.users НЕ СУЩЕСТВУЕТ'
  END as public_user;

