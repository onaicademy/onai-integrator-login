-- 🔍 ПРОВЕРКА И СОЗДАНИЕ ПОЛЬЗОВАТЕЛЯ В SUPABASE
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- ШАГ 1: Проверяем есть ли пользователь в auth.users
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'saint@onaiacademy.kz';

-- ❓ ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ:
-- → Создай через Dashboard: Authentication → Users → Add user
-- → Email: saint@onaiacademy.kz
-- → Password: Onai2134!
-- → ✅ Auto Confirm User (ОБЯЗАТЕЛЬНО!)

-- ============================================================
-- ШАГ 2: СОЗДАТЬ ТАБЛИЦУ users (если её нет)
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

-- Включаем Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Политика: Пользователи могут читать только свои данные
CREATE POLICY IF NOT EXISTS "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Политика: Пользователи могут обновлять только свои данные
CREATE POLICY IF NOT EXISTS "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Политика: Админы могут видеть всех
CREATE POLICY IF NOT EXISTS "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- ШАГ 3: СОЗДАТЬ ЗАПИСЬ АДМИНА
-- ============================================================

-- Добавляем запись для админа (автоматически берёт ID из auth.users)
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
  full_name = 'Admin OnAI Academy';

-- ============================================================
-- ШАГ 4: ПРОВЕРКА РЕЗУЛЬТАТА
-- ============================================================

-- Проверяем что всё создалось
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  au.email_confirmed_at,
  u.created_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
WHERE u.email = 'saint@onaiacademy.kz';

-- ✅ ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:
-- id: UUID пользователя
-- email: saint@onaiacademy.kz
-- full_name: Admin OnAI Academy
-- role: admin
-- is_ceo: true
-- email_confirmed_at: должна быть дата (не NULL)
-- created_at: дата создания

