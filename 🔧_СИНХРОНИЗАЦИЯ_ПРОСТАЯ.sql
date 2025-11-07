-- 🔧 ПРОСТАЯ СИНХРОНИЗАЦИЯ БЕЗ ЛИШНИХ КОЛОНОК
-- Работает с ЛЮБОЙ структурой таблицы users

-- ============================================
-- 1. ПРОВЕРКА: Какие колонки есть в users?
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
-- 2. ПРОВЕРКА: Кто есть в auth.users?
-- ============================================
SELECT 
  '=== ПОЛЬЗОВАТЕЛИ В auth.users ===' as info,
  id,
  email,
  created_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- 3. ПРОВЕРКА: Кто есть в public.users?
-- ============================================
SELECT 
  '=== ПОЛЬЗОВАТЕЛИ В public.users ===' as info,
  *
FROM public.users
ORDER BY created_at DESC;

-- ============================================
-- 4. ДОБАВЛЕНИЕ НЕДОСТАЮЩИХ КОЛОНОК (ЕСЛИ НЕТ)
-- ============================================

-- Добавляем total_xp если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'total_xp'
  ) THEN
    ALTER TABLE public.users ADD COLUMN total_xp INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Добавлена колонка total_xp';
  ELSE
    RAISE NOTICE '✓ Колонка total_xp уже существует';
  END IF;
END $$;

-- Добавляем level если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'level'
  ) THEN
    ALTER TABLE public.users ADD COLUMN level INTEGER DEFAULT 1;
    RAISE NOTICE '✅ Добавлена колонка level';
  ELSE
    RAISE NOTICE '✓ Колонка level уже существует';
  END IF;
END $$;

-- Добавляем last_login_at если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_login_at TIMESTAMPTZ;
    RAISE NOTICE '✅ Добавлена колонка last_login_at';
  ELSE
    RAISE NOTICE '✓ Колонка last_login_at уже существует';
  END IF;
END $$;

-- Добавляем avatar_url если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    RAISE NOTICE '✅ Добавлена колонка avatar_url';
  ELSE
    RAISE NOTICE '✓ Колонка avatar_url уже существует';
  END IF;
END $$;

-- ============================================
-- 5. СОЗДАНИЕ ТРИГГЕРА ДЛЯ АВТОСИНХРОНИЗАЦИИ
-- ============================================

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Создаём функцию синхронизации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Вставляем нового пользователя в public.users
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);

  RETURN NEW;
END;
$$;

-- Создаём триггер
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. СИНХРОНИЗАЦИЯ СУЩЕСТВУЮЩИХ СТУДЕНТОВ
-- ============================================

-- Синхронизируем всех кто есть в auth.users но НЕТ в public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  created_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'student') as role,
  au.created_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. ПРОВЕРКА ПОСЛЕ СИНХРОНИЗАЦИИ
-- ============================================
SELECT 
  '=== ИТОГ СИНХРОНИЗАЦИИ ===' as info,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(*) FROM public.users WHERE role = 'student' OR role IS NULL) as students_count,
  (SELECT COUNT(*) FROM public.users WHERE email = 'saint@onaiacademy.kz') as admins_count;

-- ============================================
-- 8. СПИСОК ВСЕХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
SELECT 
  '=== ВСЕ ПОЛЬЗОВАТЕЛИ ===' as info,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================
-- 9. СПИСОК СТУДЕНТОВ (ИСКЛЮЧАЯ АДМИНА)
-- ============================================
SELECT 
  '=== СТУДЕНТЫ (БЕЗ АДМИНА) ===' as info,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
WHERE email != 'saint@onaiacademy.kz'
ORDER BY created_at DESC;

