-- Проверка нового урока "Мастер-класс"
SELECT 
  l.id as lesson_id,
  l.order_index,
  l.title,
  l.duration_minutes,
  vc.id as video_id,
  vc.duration_seconds,
  vc.filename,
  vc.upload_status,
  vc.created_at
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.title LIKE '%Мастер%'
  AND l.is_archived = false;

-- Все уроки модуля 2 с подробностями
SELECT 
  l.id as lesson_id,
  l.order_index,
  l.title,
  l.duration_minutes as lesson_dur,
  vc.duration_seconds as video_dur_sec,
  CASE 
    WHEN vc.duration_seconds IS NOT NULL THEN CEIL(vc.duration_seconds::float / 60)
    ELSE 0
  END as calculated_minutes,
  vc.filename,
  CASE 
    WHEN vc.id IS NOT NULL THEN '✅'
    ELSE '❌'
  END as has_video
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

