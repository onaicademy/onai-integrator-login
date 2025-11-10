-- ============================================
-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: profiles + RLS
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ НЕБЕЗОПАСНЫЕ ПОЛИТИКИ
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON profiles;

-- 2. СОЗДАЁМ БЕЗОПАСНЫЕ RLS ПОЛИТИКИ (БЕЗ user_metadata!)
-- Используем только auth.uid() и hardcoded email для админа

-- Пользователи видят только свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Пользователи обновляют только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- АДМИН (только saint@onaiacademy.kz) - просмотр всех
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'saint@onaiacademy.kz'
  );

-- АДМИН - создание профилей
CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'saint@onaiacademy.kz'
  );

-- АДМИН - обновление всех профилей
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'saint@onaiacademy.kz'
  );

-- АДМИН - удаление профилей
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'saint@onaiacademy.kz'
  );

-- 3. СИНХРОНИЗАЦИЯ: Создаём профили для ВСЕХ пользователей из auth.users
INSERT INTO profiles (id, email, full_name, role, is_active, created_at, updated_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email) as full_name,
  CASE 
    WHEN u.email = 'saint@onaiacademy.kz' THEN 'admin'
    WHEN u.email = 'admin@onai.com' THEN 'admin'
    ELSE 'student'
  END as role,
  true as is_active,
  u.created_at,
  NOW() as updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- 4. ТРИГГЕР: Автоматически создавать профиль при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email = 'saint@onaiacademy.kz' THEN 'admin'
      WHEN NEW.email = 'admin@onai.com' THEN 'admin'
      ELSE 'student'
    END,
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Создаём новый триггер
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. ПРОВЕРКА: Вывести количество профилей
DO $$
DECLARE
  profile_count integer;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM profiles;
  RAISE NOTICE 'Количество профилей в таблице: %', profile_count;
END $$;

COMMENT ON TABLE profiles IS 'Профили пользователей с безопасными RLS политиками (БЕЗ user_metadata)';

