-- Проверка RLS policies для video_content
-- Скопируй и выполни в Supabase SQL Editor

-- 1. Проверить включен ли RLS на video_content
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'video_content';

-- 2. Проверить все policies на video_content
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'video_content'
ORDER BY policyname;

-- 3. Проверить есть ли SELECT policy
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'video_content'
  AND cmd IN ('SELECT', 'ALL');

-- 4. КРИТИЧНО: Если нет SELECT policy - добавить!
-- (Выполнить ТОЛЬКО если предыдущий запрос показал пустой результат)

-- DROP POLICY IF EXISTS "Allow SELECT for video_content" ON video_content;

-- CREATE POLICY "Allow SELECT for video_content"
-- ON video_content
-- FOR SELECT
-- USING (true);

-- CREATE POLICY "Allow all for authenticated admins - video_content"
-- ON video_content
-- FOR ALL
-- USING (true)
-- WITH CHECK (true);

