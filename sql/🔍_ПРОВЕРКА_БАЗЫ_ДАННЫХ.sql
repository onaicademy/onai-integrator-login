-- ============================================
-- 🔍 ПРОВЕРКА СТРУКТУРЫ БАЗЫ ДАННЫХ
-- ============================================
-- Скопируй и запусти в Supabase SQL Editor
-- https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx/sql

-- 1️⃣ ПРОВЕРКА: Какие таблицы существуют в public схеме
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2️⃣ ПРОВЕРКА: Пользователи в auth.users (ВСЕ пользователи)
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at DESC;

-- 3️⃣ ПРОВЕРКА: Если таблица public.users существует
-- (Если ошибка - значит таблицы НЕТ)
SELECT * FROM public.users LIMIT 5;

-- 4️⃣ ПРОВЕРКА: Если таблица achievements существует
-- (Если ошибка - значит таблицы НЕТ)
SELECT * FROM public.achievements LIMIT 5;

-- 5️⃣ ПРОВЕРКА: Если таблица user_progress существует
-- (Если ошибка - значит таблицы НЕТ)
SELECT * FROM public.user_progress LIMIT 5;

-- ============================================
-- 📊 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
-- ============================================
-- 1. Список таблиц в public (скорее всего пустой)
-- 2. Список пользователей из auth.users
-- 3-5. Ошибки "table does not exist" (это нормально)

