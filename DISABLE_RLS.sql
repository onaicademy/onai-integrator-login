-- ОТКЛЮЧЕНИЕ RLS НА ТАБЛИЦЕ profiles
-- Выполни этот SQL в Supabase Dashboard → SQL Editor

-- 1. ОТКЛЮЧАЕМ RLS на profiles (временно для теста)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. ПРОВЕРЯЕМ что RLS отключен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- После этого запроса rowsecurity должно быть FALSE

-- ВАЖНО: Это ВРЕМЕННО для диагностики!
-- После того как всё заработает, нужно будет:
-- 1. Включить RLS обратно: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- 2. Создать правильные политики доступа

