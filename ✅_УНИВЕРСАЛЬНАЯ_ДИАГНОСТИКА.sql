-- ✅ УНИВЕРСАЛЬНАЯ ДИАГНОСТИКА БД (БЕЗ ОШИБОК!)
-- Этот скрипт работает с ЛЮБОЙ структурой таблицы
-- Выполни в Supabase Dashboard → SQL Editor

-- ============================================================
-- 1. ПОКАЗАТЬ ВСЕ ТАБЛИЦЫ В БАЗЕ
-- ============================================================

SELECT 
  schemaname as schema,
  tablename as table_name
FROM pg_tables
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;

-- ============================================================
-- 2. ПРОВЕРИТЬ auth.users (ВСЕГДА СУЩЕСТВУЕТ)
-- ============================================================

SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Сколько пользователей?
SELECT COUNT(*) as total_in_auth FROM auth.users;

-- ============================================================
-- 3. ПРОВЕРИТЬ СУЩЕСТВУЕТ ЛИ public.users
-- ============================================================

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as public_users_exists;

-- ============================================================
-- 4. ПОКАЗАТЬ СТРУКТУРУ public.users (КАКИЕ КОЛОНКИ ЕСТЬ)
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================
-- 5. ПОКАЗАТЬ СОДЕРЖИМОЕ public.users (ЕСЛИ СУЩЕСТВУЕТ)
-- ============================================================

-- Покажи ВСЁ что есть в таблице (все колонки)
SELECT * FROM public.users LIMIT 20;

-- Сколько записей?
SELECT COUNT(*) as total_in_public FROM public.users;

-- ============================================================
-- 6. СРАВНЕНИЕ: Кто в auth.users, но НЕТ в public.users?
-- ============================================================

SELECT 
  au.id,
  au.email,
  au.created_at,
  'Missing in public.users' as note
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- ============================================================
-- ИТОГОВАЯ СВОДКА
-- ============================================================

SELECT 
  'auth.users' as table_name,
  COUNT(*) as records
FROM auth.users
UNION ALL
SELECT 
  'public.users' as table_name,
  COUNT(*) as records
FROM public.users;

-- ============================================================
-- ✅ ГОТОВО!
-- ============================================================
-- Скопируй ВЕСЬ результат и пришли мне!
-- Я посмотрю какая РЕАЛЬНАЯ структура и скажу что делать дальше

