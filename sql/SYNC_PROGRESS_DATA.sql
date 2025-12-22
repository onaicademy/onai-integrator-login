-- ✅ СИНХРОНИЗАЦИЯ ПРОГРЕССА: student_progress → tripwire_progress
-- Этот скрипт копирует существующие данные для отображения в профиле

-- 1. Синхронизируем данные из student_progress в tripwire_progress
INSERT INTO tripwire_progress (
  tripwire_user_id,
  lesson_id,
  module_id,
  video_progress_percent,
  last_position_seconds,
  watch_time_seconds,
  is_completed,
  completed_at,
  updated_at,
  created_at
)
SELECT 
  sp.user_id as tripwire_user_id,
  sp.lesson_id,
  l.module_id,
  sp.video_progress_percent,
  sp.last_position_seconds,
  sp.watch_time_seconds,
  sp.is_completed,
  sp.completed_at,
  sp.updated_at,
  sp.created_at
FROM student_progress sp
INNER JOIN lessons l ON l.id = sp.lesson_id
WHERE l.module_id IN (16, 17, 18) -- Только Tripwire модули
ON CONFLICT (tripwire_user_id, lesson_id) 
DO UPDATE SET
  video_progress_percent = EXCLUDED.video_progress_percent,
  last_position_seconds = EXCLUDED.last_position_seconds,
  watch_time_seconds = EXCLUDED.watch_time_seconds,
  is_completed = EXCLUDED.is_completed,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at;

-- 2. Проверяем результат
SELECT 
  tp.tripwire_user_id,
  COUNT(*) as total_lessons,
  COUNT(*) FILTER (WHERE tp.is_completed) as completed_lessons,
  SUM(tp.watch_time_seconds) as total_watch_time_seconds,
  ROUND(AVG(tp.video_progress_percent)) as avg_progress
FROM tripwire_progress tp
GROUP BY tp.tripwire_user_id
ORDER BY total_watch_time_seconds DESC;

-- ✅ Готово! Теперь данные синхронизированы

