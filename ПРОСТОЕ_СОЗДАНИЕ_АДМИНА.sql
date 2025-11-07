-- 🎯 ПРОСТОЙ СПОСОБ СОЗДАТЬ АДМИНА
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- ============================================================
-- ВАРИАНТ 1: СДЕЛАТЬ АДМИНОМ СУЩЕСТВУЮЩЕГО ПОЛЬЗОВАТЕЛЯ
-- ============================================================

-- Посмотри список всех пользователей
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  is_ceo,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- Выбери нужного пользователя и ЗАМЕНИ EMAIL:
UPDATE public.users 
SET 
  role = 'admin',
  is_ceo = true
WHERE email = 'ЗАМЕНИ_НА_НУЖНЫЙ_EMAIL@gmail.com';

-- Проверь что роль обновилась:
SELECT id, email, full_name, role, is_ceo 
FROM public.users 
WHERE role = 'admin';

-- ============================================================
-- ВАРИАНТ 2: СОЗДАТЬ НОВОГО АДМИНА (ЧЕРЕЗ DASHBOARD UI + SQL)
-- ============================================================

-- ШАГ 1: Сначала создай пользователя через UI:
-- https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx/auth/users
-- Нажми "+ Add user" → Email: saint@onaiacademy.kz, Password: Onai2134!
-- ✅ Auto Confirm User

-- ШАГ 2: Потом выполни этот SQL:
UPDATE public.users 
SET 
  role = 'admin',
  is_ceo = true,
  full_name = 'Admin OnAI Academy'
WHERE email = 'saint@onaiacademy.kz';

-- Проверка:
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  au.email_confirmed_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = 'saint@onaiacademy.kz';

-- ============================================================
-- ПРОВЕРКА СТРУКТУРЫ БД
-- ============================================================

-- Проверь какие колонки есть в таблице users
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ✅ ГОТОВО!
-- После выполнения SQL попробуй войти на сайт с этим email/паролем

