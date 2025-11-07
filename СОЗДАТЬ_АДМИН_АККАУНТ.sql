-- ========================
-- СОЗДАНИЕ АДМИН АККАУНТА
-- Email: saint@onaiacademy.kz
-- Password: Onai2134!
-- ========================

-- 1. Создаём пользователя через auth.users
-- ⚠️  ВАЖНО: Этот SQL нужно выполнить в Supabase SQL Editor

-- Создаём админа
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'saint@onaiacademy.kz',
  crypt('Onai2134!', gen_salt('bf')), -- Хешируем пароль
  NOW(),
  '{"provider":"email","providers":["email"],"role":"admin","is_ceo":true}', -- Роль админа
  '{"full_name":"Saint","role":"admin","is_ceo":true}', -- Данные профиля
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE
SET 
  encrypted_password = crypt('Onai2134!', gen_salt('bf')),
  raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin","is_ceo":true}',
  raw_user_meta_data = '{"full_name":"Saint","role":"admin","is_ceo":true}',
  email_confirmed_at = NOW(),
  updated_at = NOW();

-- 2. Создаём запись в profiles (если есть такая таблица)
-- Если у вас нет таблицы profiles, закомментируйте этот блок

INSERT INTO profiles (
  id,
  full_name,
  avatar_url,
  role,
  is_ceo,
  created_at,
  updated_at
)
SELECT 
  id,
  'Saint',
  NULL,
  'admin',
  true,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'saint@onaiacademy.kz'
ON CONFLICT (id) DO UPDATE
SET 
  full_name = 'Saint',
  role = 'admin',
  is_ceo = true,
  updated_at = NOW();

-- ========================
-- ГОТОВО!
-- ========================
-- Теперь можно войти:
-- Email: saint@onaiacademy.kz
-- Password: Onai2134!

SELECT 
  'Админ аккаунт создан!' as status,
  email,
  raw_user_meta_data->>'full_name' as name,
  raw_app_meta_data->>'role' as role
FROM auth.users 
WHERE email = 'saint@onaiacademy.kz';

