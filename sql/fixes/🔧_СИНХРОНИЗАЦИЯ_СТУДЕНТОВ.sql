-- 🔧 СИНХРОНИЗАЦИЯ СТУДЕНТОВ auth.users → public.users
-- Решает проблему: студенты не отображаются в админ-панели

-- ============================================
-- 1. ПРОВЕРКА: Кто есть в auth.users?
-- ============================================
SELECT 
  '=== ПОЛЬЗОВАТЕЛИ В auth.users ===' as info,
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'role' as role
FROM auth.users
ORDER BY created_at DESC;

-- ============================================
-- 2. ПРОВЕРКА: Кто есть в public.users?
-- ============================================
SELECT 
  '=== ПОЛЬЗОВАТЕЛИ В public.users ===' as info,
  id,
  email,
  full_name,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC;

-- ============================================
-- 3. СОЗДАНИЕ ТРИГГЕРА ДЛЯ АВТОСИНХРОНИЗАЦИИ
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
    total_xp,
    level,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    0,
    1,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Создаём триггер
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. СИНХРОНИЗАЦИЯ СУЩЕСТВУЮЩИХ СТУДЕНТОВ
-- ============================================

-- Синхронизируем всех кто есть в auth.users но НЕТ в public.users
INSERT INTO public.users (
  id,
  email,
  full_name,
  role,
  total_xp,
  level,
  created_at,
  updated_at
)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'student') as role,
  0 as total_xp,
  1 as level,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. ПРОВЕРКА ПОСЛЕ СИНХРОНИЗАЦИИ
-- ============================================
SELECT 
  '=== ИТОГ СИНХРОНИЗАЦИИ ===' as info,
  (SELECT COUNT(*) FROM auth.users) as auth_users_count,
  (SELECT COUNT(*) FROM public.users) as public_users_count,
  (SELECT COUNT(*) FROM public.users WHERE role = 'student') as students_count,
  (SELECT COUNT(*) FROM public.users WHERE role = 'admin' OR email = 'saint@onaiacademy.kz') as admins_count;

-- ============================================
-- 6. СПИСОК СТУДЕНТОВ (ИСКЛЮЧАЯ АДМИНА)
-- ============================================
SELECT 
  '=== СТУДЕНТЫ ДЛЯ АДМИН-ПАНЕЛИ ===' as info,
  id,
  email,
  full_name,
  role,
  total_xp,
  level,
  created_at
FROM public.users
WHERE email != 'saint@onaiacademy.kz'
ORDER BY created_at DESC;

