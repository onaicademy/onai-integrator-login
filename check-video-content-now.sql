-- Проверить что тестовая запись действительно добавилась
SELECT * FROM video_content WHERE lesson_id = 39;

-- Проверить JOIN с lessons
SELECT 
  l.id, 
  l.title,
  l.duration_minutes,
  vc.id as video_id,
  vc.duration_seconds,
  vc.r2_object_key
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.id = 39;

