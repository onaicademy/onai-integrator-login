-- Проверить RLS policies для SELECT
SELECT 
  policyname,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies
WHERE tablename = 'video_content'
  AND cmd IN ('ALL', 'SELECT')
ORDER BY cmd, policyname;

-- Тест: попробовать SELECT как service_role
-- (это должно работать через Supabase SQL Editor)
SELECT * FROM video_content WHERE lesson_id = 39;

-- Если SELECT возвращает запись в SQL Editor,
-- но backend API не видит - значит проблема в backend client configuration

