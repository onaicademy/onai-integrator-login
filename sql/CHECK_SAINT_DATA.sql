-- ============================================
-- ПРОВЕРКА ДАННЫХ SAINT В SUPABASE
-- ============================================

-- 1. Находим User ID
SELECT 
  '=== 1. USER INFO ===' as step,
  id as user_id, 
  email,
  created_at
FROM auth.users
WHERE email = 'saint@onaiacademy.kz';

-- 2. Проверяем профиль
SELECT 
  '=== 2. PROFILE ===' as step,
  id,
  full_name,
  role,
  created_at
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

-- 3. Проверяем статистику пользователя
SELECT 
  '=== 3. USER STATISTICS ===' as step,
  *
FROM user_statistics
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

-- 4. Проверяем прогресс по урокам
SELECT 
  '=== 4. STUDENT PROGRESS ===' as step,
  COUNT(*) as total_progress,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_lessons
FROM student_progress
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

-- 5. Проверяем миссии
SELECT 
  '=== 5. MISSIONS ===' as step,
  id,
  title,
  current_value,
  target_value,
  is_completed,
  xp_reward
FROM missions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')
ORDER BY created_at DESC
LIMIT 5;

-- 6. Проверяем недельные цели
SELECT 
  '=== 6. WEEKLY GOALS ===' as step,
  id,
  title,
  current_value,
  target_value,
  is_completed,
  week_start
FROM weekly_goals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')
ORDER BY created_at DESC
LIMIT 5;

-- 7. Проверяем видео сессии
SELECT 
  '=== 7. VIDEO WATCH SESSIONS ===' as step,
  COUNT(*) as total_sessions,
  SUM(max_second_reached) as total_seconds_watched,
  ROUND(SUM(max_second_reached) / 60.0) as total_minutes_watched
FROM video_watch_sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

-- 8. Проверяем AI задачи
SELECT 
  '=== 8. AI MENTOR TASKS ===' as step,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE is_resolved = true) as resolved_tasks,
  COUNT(*) FILTER (WHERE is_resolved = false) as pending_tasks
FROM ai_mentor_tasks
WHERE student_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

-- 9. ИТОГОВАЯ СВОДКА
SELECT 
  '=== 9. SUMMARY ===' as step,
  (SELECT COUNT(*) FROM user_statistics WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as has_statistics,
  (SELECT COUNT(*) FROM missions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as missions_count,
  (SELECT COUNT(*) FROM weekly_goals WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz')) as goals_count,
  (SELECT COUNT(*) FROM student_progress WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz' AND is_completed = true)) as completed_lessons;



















