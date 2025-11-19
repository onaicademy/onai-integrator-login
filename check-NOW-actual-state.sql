-- АКТУАЛЬНОЕ состояние ПРЯМО СЕЙЧАС
-- Модуль 2 - ВСЕ уроки и видео

SELECT 
  l.id,
  l.order_index,
  l.title,
  l.duration_minutes as lesson_dur,
  l.video_url,
  vc.id as video_id,
  vc.duration_seconds as video_sec,
  vc.filename,
  -- Вычисляем минуты из секунд
  CASE 
    WHEN vc.duration_seconds >= 60 THEN 
      FLOOR(vc.duration_seconds / 60) || ' мин ' || (vc.duration_seconds % 60) || ' сек'
    ELSE 
      vc.duration_seconds || ' секунд'
  END as readable_duration,
  -- Считаем минуты как система
  CASE 
    WHEN vc.duration_seconds IS NOT NULL THEN 
      CEIL(vc.duration_seconds::float / 60)
    ELSE 0
  END as system_minutes
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
ORDER BY l.order_index;

-- ИТОГО
SELECT 
  COUNT(*) as total_lessons,
  COUNT(vc.id) as with_video,
  SUM(vc.duration_seconds) as total_seconds,
  FLOOR(SUM(vc.duration_seconds) / 60) as total_minutes_floor,
  CEIL(SUM(vc.duration_seconds)::float / 60) as total_minutes_ceil,
  SUM(CEIL(vc.duration_seconds::float / 60)) as sum_of_ceiled
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false;

