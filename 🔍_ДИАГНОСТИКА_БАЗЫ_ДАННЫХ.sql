-- 🔍 ПОЛНАЯ ДИАГНОСТИКА БАЗЫ ДАННЫХ
-- Выполни этот SQL в Supabase Dashboard → SQL Editor
-- Этот скрипт покажет ВСЁ что есть в твоей базе

-- ============================================================
-- 1. ПОКАЗАТЬ ВСЕ ТАБЛИЦЫ В БАЗЕ
-- ============================================================

SELECT 
  schemaname as schema,
  tablename as table_name,
  tableowner as owner
FROM pg_tables
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;

-- ============================================================
-- 2. ПРОВЕРИТЬ auth.users (ГЛАВНАЯ ТАБЛИЦА АВТОРИЗАЦИИ)
-- ============================================================

-- Эта таблица ВСЕГДА существует в Supabase, но скрыта в UI!
SELECT 
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- Сколько пользователей в auth.users?
SELECT COUNT(*) as total_users_in_auth
FROM auth.users;

-- ============================================================
-- 3. ПРОВЕРИТЬ public.users (НАША ТАБЛИЦА ПРОФИЛЕЙ)
-- ============================================================

-- Существует ли таблица public.users?
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'users'
) as public_users_exists;

-- Если существует, показать содержимое:
SELECT 
  id,
  email,
  full_name,
  role,
  is_ceo,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 20;

-- Сколько пользователей в public.users?
SELECT COUNT(*) as total_users_in_public
FROM public.users;

-- ============================================================
-- 4. СРАВНЕНИЕ: Кто есть в auth.users, но НЕТ в public.users?
-- ============================================================

-- Эти пользователи могут войти, но у них нет профиля/роли!
SELECT 
  au.id,
  au.email,
  au.created_at,
  'НЕТ В public.users' as status
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- ============================================================
-- 5. СРАВНЕНИЕ: Кто есть в public.users, но НЕТ в auth.users?
-- ============================================================

-- Это ошибка! Не должно быть таких записей
SELECT 
  pu.id,
  pu.email,
  pu.created_at,
  'НЕТ В auth.users (ОШИБКА!)' as status
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL;

-- ============================================================
-- 6. ПОКАЗАТЬ СТРУКТУРУ public.users
-- ============================================================

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================
-- 7. ПРОВЕРИТЬ RLS ПОЛИТИКИ НА public.users
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================================
-- 8. ПОКАЗАТЬ ВСЕХ АДМИНОВ
-- ============================================================

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.role = 'admin' OR u.is_ceo = true
ORDER BY u.created_at DESC;

-- ============================================================
-- ИТОГОВАЯ СВОДКА
-- ============================================================

SELECT 
  'auth.users' as table_name,
  COUNT(*) as total_records
FROM auth.users

UNION ALL

SELECT 
  'public.users' as table_name,
  COUNT(*) as total_records
FROM public.users

UNION ALL

SELECT 
  'Админов' as table_name,
  COUNT(*) as total_records
FROM public.users
WHERE role = 'admin' OR is_ceo = true;

-- ============================================================
-- ✅ РЕЗУЛЬТАТЫ:
-- ============================================================
-- 
-- После выполнения ты увидишь:
-- 1. Список всех таблиц в базе
-- 2. Всех пользователей в auth.users
-- 3. Всех пользователей в public.users
-- 4. Кто есть в одной, но нет в другой
-- 5. Структуру таблицы users
-- 6. RLS политики
-- 7. Список админов
-- 8. Итоговую сводку
--
-- Скопируй ВЕСЬ вывод и пришли мне!

