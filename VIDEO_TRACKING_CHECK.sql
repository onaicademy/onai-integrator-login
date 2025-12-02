-- 🔍 SQL ЗАПРОС ДЛЯ ПРОВЕРКИ VIDEO TRACKING
-- Выполни этот запрос в Supabase SQL Editor

-- 1️⃣ ОСНОВНАЯ ПРОВЕРКА: Кто смотрит видео?
SELECT 
  u.email,
  vt.lesson_id,
  vt.watch_percentage,
  vt.is_qualified_for_completion,
  vt.last_position_seconds,
  vt.video_duration_seconds,
  vt.updated_at
FROM video_tracking vt
JOIN auth.users u ON vt.user_id = u.id
ORDER BY vt.updated_at DESC
LIMIT 20;

-- 2️⃣ СТАТИСТИКА ПО УРОКАМ: Какие уроки смотрят чаще всего?
SELECT 
  lesson_id,
  COUNT(DISTINCT user_id) as unique_viewers,
  ROUND(AVG(watch_percentage), 1) as avg_percentage,
  COUNT(*) FILTER (WHERE is_qualified_for_completion = true) as qualified_count
FROM video_tracking
GROUP BY lesson_id
ORDER BY unique_viewers DESC;

-- 3️⃣ ПРОБЛЕМНЫЕ СТУДЕНТЫ: Кто не досматривает видео?
SELECT 
  u.email,
  vt.lesson_id,
  vt.watch_percentage,
  vt.updated_at
FROM video_tracking vt
JOIN auth.users u ON vt.user_id = u.id
WHERE vt.watch_percentage < 80
ORDER BY vt.updated_at DESC;

-- 4️⃣ ТОП СТУДЕНТЫ: Кто досматривает всё до конца?
SELECT 
  u.email,
  COUNT(*) as lessons_completed,
  ROUND(AVG(vt.watch_percentage), 1) as avg_completion
FROM video_tracking vt
JOIN auth.users u ON vt.user_id = u.id
WHERE vt.is_qualified_for_completion = true
GROUP BY u.email
ORDER BY lessons_completed DESC
LIMIT 10;

-- 5️⃣ REAL-TIME МОНИТОРИНГ: Кто смотрит прямо сейчас?
SELECT 
  u.email,
  vt.lesson_id,
  vt.watch_percentage,
  vt.updated_at,
  NOW() - vt.updated_at as time_since_update
FROM video_tracking vt
JOIN auth.users u ON vt.user_id = u.id
WHERE vt.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY vt.updated_at DESC;

