-- ============================================
-- ПОЛНАЯ ОЧИСТКА И ПЕРЕСОЗДАНИЕ RLS ПОЛИТИК
-- ============================================

-- 1. УДАЛЯЕМ ВСЕ СУЩЕСТВУЮЩИЕ ПОЛИТИКИ (БЕЗ ОШИБОК)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

-- 2. УДАЛЯЕМ СТАРУЮ ФУНКЦИЮ is_admin (если есть)
DROP FUNCTION IF EXISTS public.is_admin();

-- 3. СОЗДАЁМ НОВУЮ ФУНКЦИЮ is_admin (кешируется)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users 
    WHERE id = auth.uid()
  ) = 'saint@onaiacademy.kz';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. СОЗДАЁМ НОВЫЕ RLS ПОЛИТИКИ

-- Все могут читать все профили
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

-- 5. КОММЕНТАРИИ
COMMENT ON FUNCTION public.is_admin IS 'Проверка админа по email (STABLE = кешируется)';
COMMENT ON TABLE profiles IS 'Профили с ПРОСТЫМИ RLS политиками (БЕЗ рекурсии)';

-- 6. ПРОВЕРКА
SELECT 
  'RLS политики успешно пересозданы!' as status,
  COUNT(*) as policies_count 
FROM pg_policies 
WHERE tablename = 'profiles';

