-- 🔧 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ RLS ДЛЯ profiles
-- Выполни этот SQL в Supabase SQL Editor

-- 1. Удаляем битую политику с circular dependency
DROP POLICY IF EXISTS "Admins have full access to all profiles" ON profiles;

-- 2. Проверяем, существует ли функция is_admin()
-- Если нет - создаём её
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 3. Создаём правильную политику для SELECT (чтение профилей)
CREATE POLICY "Admins can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (is_admin() OR auth.uid() = id);
-- Админы видят всех, обычные пользователи - только себя

-- 4. ПРОВЕРКА: Должны вернуться все профили
SELECT id, email, full_name, role, is_active 
FROM profiles 
ORDER BY created_at DESC;

