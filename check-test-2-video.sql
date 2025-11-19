-- Проверка загрузки видео для урока "Тест 2" (lesson_id = 40)
SELECT 
  l.id as lesson_id,
  l.title,
  l.duration_minutes as lesson_duration,
  vc.id as video_id,
  vc.duration_seconds,
  vc.filename,
  vc.upload_status,
  vc.created_at,
  vc.updated_at
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.id = 40;

-- Также проверим все уроки модуля 2
SELECT 
  l.id as lesson_id,
  l.order_index,
  l.title,
  l.duration_minutes,
  vc.duration_seconds,
  vc.filename,
  CASE 
    WHEN vc.id IS NOT NULL THEN '✅ Есть'
    ELSE '❌ Нет'
  END as video_status
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

-- Итоговое время модуля
SELECT 
  SUM(
    CASE 
      WHEN l.duration_minutes > 0 THEN l.duration_minutes
      WHEN vc.duration_seconds > 0 THEN CEIL(vc.duration_seconds::float / 60)
      ELSE 0
    END
  ) as total_minutes,
  COUNT(*) as total_lessons,
  COUNT(vc.id) as lessons_with_video
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false;

