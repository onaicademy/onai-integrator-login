-- ⚡ АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ auth.users → public.users
-- Выполни этот SQL в Supabase Dashboard → SQL Editor
-- Этот скрипт:
-- 1. Создаст таблицу public.users если её нет
-- 2. Синхронизирует всех пользователей из auth.users
-- 3. Сделает одного пользователя админом

-- ============================================================
-- ШАГ 1: СОЗДАТЬ ТАБЛИЦУ public.users (если её нет)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
  is_ceo BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаём индексы
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_ceo ON public.users(is_ceo);

-- Включаем Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all" ON public.users;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.users;

-- Политика: Пользователи видят свой профиль
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Политика: Пользователи могут обновлять свой профиль
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Политика: Админы видят всех
CREATE POLICY "Admins can view all"
  ON public.users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() 
      AND (role = 'admin' OR is_ceo = true)
    )
  );

-- Политика: Все авторизованные могут читать базовую инфу
CREATE POLICY "Enable read for authenticated users"
  ON public.users
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- ШАГ 2: СИНХРОНИЗИРОВАТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ИЗ auth.users
-- ============================================================

-- Вставляем/обновляем всех пользователей из auth.users в public.users
INSERT INTO public.users (
  id, 
  email, 
  full_name, 
  avatar_url,
  role,
  created_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', 'User ' || SUBSTRING(au.email FROM 1 FOR 10)),
  au.raw_user_meta_data->>'avatar_url',
  'student', -- По умолчанию все студенты
  au.created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = NOW();

-- Показываем результат синхронизации
SELECT 
  'Синхронизировано' as status,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'student' THEN 1 END) as students
FROM public.users;

-- ============================================================
-- ШАГ 3: ПОКАЗАТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================================

SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.last_sign_in_at,
  u.created_at
FROM public.users u
JOIN auth.users au ON au.id = u.id
ORDER BY u.created_at DESC;

-- ============================================================
-- ШАГ 4 (ОПЦИОНАЛЬНО): СДЕЛАТЬ ОДНОГО ПОЛЬЗОВАТЕЛЯ АДМИНОМ
-- ============================================================

-- РАСКОММЕНТИРУЙ И ЗАМЕНИ EMAIL НА НУЖНЫЙ:

/*
UPDATE public.users 
SET 
  role = 'admin',
  is_ceo = true,
  full_name = COALESCE(full_name, 'Admin OnAI Academy')
WHERE email = 'ЗАМЕНИ_НА_НУЖНЫЙ_EMAIL@gmail.com';

-- Проверка:
SELECT 
  u.email,
  u.full_name,
  u.role,
  u.is_ceo,
  'Теперь АДМИН!' as status
FROM public.users u
WHERE u.role = 'admin' OR u.is_ceo = true;
*/

-- ============================================================
-- ✅ ГОТОВО!
-- ============================================================
-- 
-- Теперь:
-- 1. Таблица public.users создана
-- 2. Все пользователи из auth.users синхронизированы
-- 3. Раскомментируй Шаг 4 чтобы сделать кого-то админом
--
-- После этого пользователь сможет:
-- - Войти на сайт с email/паролем
-- - Админ получит доступ к /admin панели

