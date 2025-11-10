-- ============================================
-- УЛЬТРА-ПРОСТЫЕ RLS ПОЛИТИКИ (БЕЗ ПОДЗАПРОСОВ!)
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ ПОЛИТИКИ
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;

-- 2. СОЗДАЁМ ФУНКЦИЮ is_admin (один раз вызывается, кешируется)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users 
    WHERE id = auth.uid()
  ) = 'saint@onaiacademy.kz';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. ПРОСТЕЙШИЕ RLS ПОЛИТИКИ

-- Все могут читать все профили (для простоты)
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  USING (true);

-- Пользователи обновляют только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- АДМИН может создавать профили
CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- АДМИН может обновлять все профили
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (public.is_admin());

-- АДМИН может удалять профили
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (public.is_admin());

COMMENT ON FUNCTION public.is_admin IS 'Проверка админа по email (STABLE = кешируется)';
COMMENT ON TABLE profiles IS 'Профили с ПРОСТЫМИ RLS политиками';

