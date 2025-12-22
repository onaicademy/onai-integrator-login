-- Очистка неудачных загрузок для уроков 40 и 41
-- Выполни в Supabase Dashboard перед повторной загрузкой

-- Проверка текущих video_content для уроков 40 и 41
SELECT 
  id,
  lesson_id,
  duration_seconds,
  filename,
  upload_status
FROM video_content
WHERE lesson_id IN (40, 41);

-- Если есть записи с NULL duration_seconds или upload_status != 'completed', удали их:
-- DELETE FROM video_content WHERE lesson_id IN (40, 41) AND (duration_seconds IS NULL OR upload_status != 'completed');

-- Также можно полностью удалить все video_content для этих уроков перед повторной загрузкой:
-- DELETE FROM video_content WHERE lesson_id IN (40, 41);

