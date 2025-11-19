-- Проверить структуру таблицы video_content
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'video_content'
ORDER BY ordinal_position;

