-- =====================================================
-- RLS ПОЛИТИКИ ДЛЯ AI-CURATOR ТАБЛИЦ
-- Дата: 2025-11-13
-- Цель: Исправить ошибку "new row violates row-level security policy"
-- =====================================================

-- 1. ВКЛЮЧАЕМ RLS НА ВСЕХ ТАБЛИЦАХ (если ещё не включено)
ALTER TABLE ai_curator_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curator_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_curator_metrics ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ПОЛИТИКИ ДЛЯ ai_curator_threads
-- =====================================================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view their own threads" ON ai_curator_threads;
DROP POLICY IF EXISTS "Users can insert their own threads" ON ai_curator_threads;
DROP POLICY IF EXISTS "Users can update their own threads" ON ai_curator_threads;
DROP POLICY IF EXISTS "Users can delete their own threads" ON ai_curator_threads;

-- SELECT: Пользователи видят свои потоки
CREATE POLICY "Users can view their own threads"
ON ai_curator_threads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Пользователи создают свои потоки
CREATE POLICY "Users can insert their own threads"
ON ai_curator_threads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Пользователи обновляют свои потоки
CREATE POLICY "Users can update their own threads"
ON ai_curator_threads
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Пользователи удаляют свои потоки (soft delete через is_archived)
CREATE POLICY "Users can delete their own threads"
ON ai_curator_threads
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 3. ПОЛИТИКИ ДЛЯ ai_curator_messages
-- =====================================================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view their own messages" ON ai_curator_messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON ai_curator_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON ai_curator_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON ai_curator_messages;

-- SELECT: Пользователи видят свои сообщения
CREATE POLICY "Users can view their own messages"
ON ai_curator_messages
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Пользователи создают свои сообщения
CREATE POLICY "Users can insert their own messages"
ON ai_curator_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Пользователи обновляют свои сообщения
CREATE POLICY "Users can update their own messages"
ON ai_curator_messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Пользователи удаляют свои сообщения
CREATE POLICY "Users can delete their own messages"
ON ai_curator_messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =====================================================
-- 4. ПОЛИТИКИ ДЛЯ ai_curator_metrics
-- =====================================================

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can view their own metrics" ON ai_curator_metrics;
DROP POLICY IF EXISTS "Users can insert their own metrics" ON ai_curator_metrics;
DROP POLICY IF EXISTS "Admins can view all metrics" ON ai_curator_metrics;

-- SELECT: Пользователи видят свои метрики
CREATE POLICY "Users can view their own metrics"
ON ai_curator_metrics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Пользователи создают свои метрики
CREATE POLICY "Users can insert their own metrics"
ON ai_curator_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- SELECT: Админы видят все метрики (если нужна аналитика)
CREATE POLICY "Admins can view all metrics"
ON ai_curator_metrics
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
-- 5. ДОПОЛНИТЕЛЬНО: ПОЛИТИКИ ДЛЯ АНОНИМНЫХ ПОЛЬЗОВАТЕЛЕЙ
-- (если нужна возможность тестирования без авторизации)
-- =====================================================

-- РАСКОММЕНТИРУЙ ЕСЛИ НУЖНО:
-- CREATE POLICY "Allow anonymous read for threads"
-- ON ai_curator_threads
-- FOR SELECT
-- TO anon
-- USING (true);

-- =====================================================
-- 6. ПРОВЕРКА ПОЛИТИК
-- =====================================================

-- Посмотреть все политики для ai_curator_threads:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_threads';

-- Посмотреть все политики для ai_curator_messages:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_messages';

-- Посмотреть все политики для ai_curator_metrics:
-- SELECT * FROM pg_policies WHERE tablename = 'ai_curator_metrics';

-- =====================================================
-- ГОТОВО! 
-- =====================================================
-- После выполнения этого скрипта ошибка RLS должна исчезнуть!
-- Пользователи смогут сохранять свои сообщения и метрики.

