-- УДАЛЕНИЕ старого видео из урока "Тест 1" (lesson_id = 39)

-- Шаг 1: Удалить video_content
DELETE FROM video_content 
WHERE lesson_id = 39;

-- Шаг 2: Очистить video_url и duration_minutes из lessons
UPDATE lessons 
SET 
  video_url = NULL,
  duration_minutes = 0,
  updated_at = NOW()
WHERE id = 39;

-- Проверка: Должны остаться только новые данные
SELECT 
  l.id,
  l.title,
  l.duration_minutes,
  vc.duration_seconds,
  vc.filename
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

-- ИТОГО после удаления (должно быть только 20 секунд)
SELECT 
  SUM(vc.duration_seconds) as total_seconds,
  COUNT(vc.id) as videos_count
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false;

