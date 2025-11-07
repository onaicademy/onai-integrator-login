-- 🔍 ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ В SUPABASE
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- 1. Проверяем есть ли пользователь в auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'saint@onaiacademy.kz';

-- 2. Проверяем роль в таблице users (если она есть)
SELECT 
  id,
  email,
  role,
  is_ceo,
  created_at
FROM public.users
WHERE email = 'saint@onaiacademy.kz';

-- ❓ РЕЗУЛЬТАТЫ:

-- Если в auth.users НЕТ пользователя:
-- → Нужно создать через Dashboard: Authentication → Users → Add user

-- Если в auth.users ЕСТЬ, но email_confirmed_at = NULL:
-- → Нужно подтвердить email или пересоздать с галочкой "Auto Confirm User"

-- Если в public.users НЕТ записи:
-- → Выполни следующий скрипт для создания:

/*
-- 3. Создать запись в public.users (замени USER_ID на реальный ID из auth.users)
INSERT INTO public.users (id, email, role, is_ceo, created_at)
VALUES (
  'USER_ID_FROM_AUTH_USERS', -- Замени на реальный UUID
  'saint@onaiacademy.kz',
  'admin',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_ceo = true;
*/

