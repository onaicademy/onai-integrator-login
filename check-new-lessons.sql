-- Проверить новые уроки (Тест 1, Тест 2, Тест 3)
SELECT 
  l.id as lesson_id,
  l.title as lesson_title,
  l.duration_minutes,
  l.video_url,
  l.created_at,
  vc.id as video_id,
  vc.public_url,
  vc.duration_seconds,
  vc.filename,
  vc.upload_status
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
  AND l.title LIKE 'Тест%'
ORDER BY l.created_at DESC;

-- Должно показать:
-- - Если video_url = null → видео НЕ загружено
-- - Если video_id = null → video_content записи нет
-- - Если duration_seconds = null → длительность не сохранена

