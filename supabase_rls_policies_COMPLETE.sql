-- =====================================================
-- ПОЛНЫЙ НАБОР RLS ПОЛИТИК ДЛЯ ВСЕХ ТАБЛИЦ
-- Дата: 2025-11-13 22:50
-- Цель: Исправить ошибки RLS для users + AI-curator таблиц
-- =====================================================

-- =====================================================
-- 1. ТАБЛИЦА users
-- =====================================================

-- Включаем RLS (если ещё не включено)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;

-- SELECT: Пользователи видят свой профиль
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- UPDATE: Пользователи обновляют свой профиль
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Пользователи создают свой профиль (при первом входе)
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- SELECT: Админы видят все профили
CREATE POLICY "Admins can view all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- 2. ТАБЛИЦА ai_curator_threads
-- =====================================================

ALTER TABLE public.ai_curator_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own threads" ON public.ai_curator_threads;
DROP POLICY IF EXISTS "Users can insert their own threads" ON public.ai_curator_threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON public.ai_curator_threads;
DROP POLICY IF EXISTS "Users can delete their own threads" ON public.ai_curator_threads;

CREATE POLICY "Users can view their own threads"
ON public.ai_curator_threads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own threads"
ON public.ai_curator_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own threads"
ON public.ai_curator_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads"
ON public.ai_curator_threads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 3. ТАБЛИЦА ai_curator_messages
-- =====================================================

ALTER TABLE public.ai_curator_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own messages" ON public.ai_curator_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.ai_curator_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.ai_curator_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.ai_curator_messages;

CREATE POLICY "Users can view their own messages"
ON public.ai_curator_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
ON public.ai_curator_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.ai_curator_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.ai_curator_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 4. ТАБЛИЦА ai_curator_metrics
-- =====================================================

ALTER TABLE public.ai_curator_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own metrics" ON public.ai_curator_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON public.ai_curator_metrics;
DROP POLICY IF EXISTS "Admins can view all metrics" ON public.ai_curator_metrics;

CREATE POLICY "Users can view their own metrics"
ON public.ai_curator_metrics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
ON public.ai_curator_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics"
ON public.ai_curator_metrics
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- 5. ТАБЛИЦА achievements (если используется)
-- =====================================================

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON public.achievements;
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

-- SELECT: Все авторизованные пользователи видят достижения
CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements
FOR SELECT
TO authenticated
USING (true);

-- Админы могут создавать/изменять достижения
CREATE POLICY "Admins can manage achievements"
ON public.achievements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- =====================================================
-- 6. ТАБЛИЦА user_achievements (если используется)
-- =====================================================

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;

CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
ON public.user_achievements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 7. ПРОВЕРКА ПОЛИТИК
-- =====================================================

-- Посмотреть политики для users:
-- SELECT * FROM pg_policies WHERE tablename = 'users';

-- Посмотреть политики для ai_curator_threads:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_threads';

-- Посмотреть политики для ai_curator_messages:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_messages';

-- Посмотреть политики для ai_curator_metrics:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_metrics';

-- =====================================================
-- ГОТОВО! 
-- =====================================================
-- После выполнения этого скрипта все RLS ошибки должны исчезнуть!

