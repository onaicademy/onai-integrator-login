-- =====================================================
-- FIX: FOREIGN KEY CHECK для таблицы users
-- Проблема: ai_curator_messages.user_id → users.id FK проверка блокируется RLS
-- Решение: Разрешить authenticated пользователям читать базовую информацию из users
-- =====================================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view basic user info" ON public.users;

-- ✅ ГЛАВНАЯ ПОЛИТИКА: Authenticated пользователи могут видеть базовую информацию о ВСЕХ пользователях
-- Это нужно для проверки FOREIGN KEY constraints
CREATE POLICY "Authenticated users can view basic user info"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- ✅ UPDATE: Пользователи обновляют ТОЛЬКО свой профиль
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ✅ INSERT: Пользователи создают ТОЛЬКО свой профиль
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- =====================================================
-- ПРОВЕРКА
-- =====================================================

-- Посмотреть все политики для users:
SELECT * FROM pg_policies WHERE tablename = 'users';

-- =====================================================
-- ГОТОВО!
-- =====================================================
-- После выполнения этого скрипта ошибка "permission denied for table users" исчезнет!
-- Foreign Key проверки будут работать корректно.

