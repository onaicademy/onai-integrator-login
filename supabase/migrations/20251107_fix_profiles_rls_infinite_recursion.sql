-- ИСПРАВЛЕНИЕ: Бесконечная рекурсия в RLS политиках для profiles
-- Проблема: политики проверяют profiles.role, что создаёт рекурсию
-- Решение: использовать auth.jwt() для получения роли напрямую из токена

-- ============================================
-- 1. УДАЛЯЕМ ВСЕ СТАРЫЕ ПОЛИТИКИ
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- ============================================
-- 2. СОЗДАЁМ НОВЫЕ ПРАВИЛЬНЫЕ ПОЛИТИКИ
-- ============================================

-- Пользователи видят только свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- АДМИНЫ: Проверяем роль через auth.jwt() (БЕЗ рекурсии!)
-- Просмотр всех профилей
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'saint@onaiacademy.kz'
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Создание профилей
CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'saint@onaiacademy.kz'
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Обновление всех профилей
CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    (auth.jwt() ->> 'email') = 'saint@onaiacademy.kz'
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Удаление профилей
CREATE POLICY "Admins can delete all profiles"
  ON profiles FOR DELETE
  USING (
    (auth.jwt() ->> 'email') = 'saint@onaiacademy.kz'
    OR 
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================
-- КОММЕНТАРИИ
-- ============================================

COMMENT ON POLICY "Users can view own profile" ON profiles IS 
  'Пользователи могут просматривать только свой профиль';

COMMENT ON POLICY "Admins can view all profiles" ON profiles IS 
  'Админы (saint@onaiacademy.kz или role=admin в JWT) видят все профили БЕЗ рекурсии';

