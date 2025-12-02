-- Проверка ВСЕХ видео для модуля 2
SELECT 
  l.id as lesson_id,
  l.order_index,
  l.title as lesson_title,
  l.duration_minutes,
  vc.id as video_id,
  vc.duration_seconds,
  vc.filename,
  vc.created_at as video_uploaded_at
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

