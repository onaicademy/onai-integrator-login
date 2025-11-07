-- 🚀 ПОЛНЫЙ СКРИПТ СОЗДАНИЯ АДМИНА ДЛЯ ONAI ACADEMY
-- Выполни этот SQL в Supabase Dashboard → SQL Editor
-- Этот скрипт создаст пользователя БЕЗ использования Dashboard UI

-- ============================================================
-- ШАГ 1: СОЗДАТЬ ПОЛЬЗОВАТЕЛЯ В auth.users
-- ============================================================

-- Удаляем если пользователь уже существует (для чистоты)
DELETE FROM auth.users WHERE email = 'saint@onaiacademy.kz';

-- Создаём пользователя напрямую в auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Генерируем уникальный ID
  'authenticated',
  'authenticated',
  'saint@onaiacademy.kz',
  crypt('Onai2134!', gen_salt('bf')), -- Шифруем пароль с помощью bcrypt
  NOW(), -- Email сразу подтверждён
  NULL,
  '',
  NULL,
  '',
  NULL,
  '',
  '',
  NULL,
  NULL,
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin OnAI Academy"}',
  NULL,
  NOW(),
  NOW(),
  NULL,
  NULL,
  '',
  '',
  NULL,
  '',
  0,
  NULL,
  '',
  NULL
);

-- Проверяем что пользователь создался
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'saint@onaiacademy.kz';

-- ============================================================
-- ШАГ 2: СОЗДАТЬ ТАБЛИЦУ public.users (если её нет)
-- ============================================================

-- Создаём таблицу users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student',
  is_ceo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаём индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Создаём индекс для поиска по роли
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Включаем Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они есть
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.users;

-- Политика: Пользователи могут читать только свои данные
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Политика: Пользователи могут обновлять только свои данные
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Политика: Админы могут видеть всех
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- ШАГ 3: СОЗДАТЬ ЗАПИСЬ АДМИНА В public.users
-- ============================================================

-- Добавляем запись для админа
INSERT INTO public.users (id, email, full_name, role, is_ceo, created_at)
SELECT 
  au.id,
  'saint@onaiacademy.kz',
  'Admin OnAI Academy',
  'admin',
  true,
  NOW()
FROM auth.users au
WHERE au.email = 'saint@onaiacademy.kz'
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_ceo = true,
  full_name = 'Admin OnAI Academy',
  updated_at = NOW();

-- ============================================================
-- ШАГ 4: ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================

-- Проверяем что всё создалось корректно
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  au.email_confirmed_at,
  au.encrypted_password IS NOT NULL as has_password,
  u.created_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = 'saint@onaiacademy.kz';

-- ============================================================
-- ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
-- ============================================================
-- id: UUID пользователя
-- email: saint@onaiacademy.kz
-- full_name: Admin OnAI Academy
-- role: admin
-- is_ceo: true
-- email_confirmed_at: текущая дата/время
-- has_password: true
-- created_at: текущая дата/время

-- ============================================================
-- 🎉 ГОТОВО! ТЕПЕРЬ МОЖНО ВОЙТИ:
-- ============================================================
-- Email: saint@onaiacademy.kz
-- Password: Onai2134!

