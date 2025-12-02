-- 🔧 ИСПРАВЛЕНИЕ RLS ПРАВИЛ ДЛЯ ТАБЛИЦЫ profiles
-- Выполни этот SQL в Supabase SQL Editor

-- 1. Проверяем, включен ли RLS на таблице profiles
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 2. Показываем все существующие политики
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 3. УДАЛЯЕМ все старые политики (если есть проблемы)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- 4. СОЗДАЁМ ПРАВИЛЬНЫЕ ПОЛИТИКИ

-- Политика для админов: полный доступ ко всем профилям
CREATE POLICY "Admins have full access to all profiles"
ON profiles
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Политика для пользователей: читать свой профиль
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- 5. Убедись, что RLS включен
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. ПРОВЕРКА: Запроси профили от имени текущего пользователя
SELECT id, email, full_name, role, is_active 
FROM profiles 
LIMIT 10;

