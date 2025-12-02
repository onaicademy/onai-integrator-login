-- ======================================
-- ДИАГНОСТИКА: video_content для модуля 2
-- ======================================
-- Выполни в Supabase SQL Editor

-- Проверить все уроки модуля 2
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  l.duration_minutes,
  l.video_url,
  vc.id as video_id,
  vc.public_url as video_public_url,
  vc.duration_seconds,
  vc.filename,
  vc.r2_object_key,
  vc.upload_status
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

-- Если video_id = null → video_content пустой (INSERT не прошёл)
-- Если duration_seconds = null → длительность не сохранена
-- Если public_url = null → URL не сохранён

