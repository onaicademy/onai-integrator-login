-- ========================================
-- ПРОВЕРКА ПОЛЬЗОВАТЕЛЯ zankachidix.ai@gmail.com
-- ========================================

-- 1. Проверяем, есть ли пользователь в системе
SELECT 
  u.id as user_id,
  u.email,
  u.created_at,
  tu.id as tripwire_user_id,
  tup.full_name,
  tup.modules_completed,
  tup.certificate_issued
FROM users u
LEFT JOIN tripwire_users tu ON tu.user_id = u.id
LEFT JOIN tripwire_user_profile tup ON tup.user_id = u.id
WHERE u.email = 'zankachidix.ai@gmail.com';

-- 2. Проверяем прогресс по урокам
SELECT 
  tp.lesson_id,
  l.title as lesson_title,
  l.module_id,
  m.title as module_title,
  tp.is_completed,
  tp.completed_at,
  tp.video_progress_percent,
  tp.watch_time_seconds
FROM tripwire_progress tp
JOIN lessons l ON l.id = tp.lesson_id
JOIN modules m ON m.id = l.module_id
WHERE tp.tripwire_user_id = (
  SELECT tu.id 
  FROM tripwire_users tu 
  JOIN users u ON u.id = tu.user_id 
  WHERE u.email = 'zankachidix.ai@gmail.com'
)
ORDER BY l.module_id, l.order_index;

-- 3. Проверяем какие уроки Tripwire завершены (67, 68, 69)
SELECT 
  tp.lesson_id,
  l.title,
  l.module_id,
  tp.is_completed,
  tp.completed_at,
  CASE 
    WHEN tp.lesson_id = 67 THEN 'Урок 1 - должен перейти на AMOCRM_STAGE_LESSON_1'
    WHEN tp.lesson_id = 68 THEN 'Урок 2 - должен перейти на AMOCRM_STAGE_LESSON_2'
    WHEN tp.lesson_id = 69 THEN 'Урок 3 - должен перейти на AMOCRM_STAGE_LESSON_3'
    ELSE 'Не Tripwire урок'
  END as amocrm_action
FROM tripwire_progress tp
JOIN lessons l ON l.id = tp.lesson_id
WHERE tp.tripwire_user_id = (
  SELECT tu.id 
  FROM tripwire_users tu 
  JOIN users u ON u.id = tu.user_id 
  WHERE u.email = 'zankachidix.ai@gmail.com'
)
AND tp.lesson_id IN (67, 68, 69)
AND tp.is_completed = TRUE
ORDER BY tp.lesson_id;

-- 4. Проверяем достижения
SELECT 
  ua.achievement_id,
  a.title,
  a.description,
  ua.is_completed,
  ua.completed_at
FROM user_achievements ua
JOIN achievements a ON a.title = ua.achievement_id
WHERE ua.user_id = (
  SELECT user_id 
  FROM tripwire_users tu 
  JOIN users u ON u.id = tu.user_id 
  WHERE u.email = 'zankachidix.ai@gmail.com'
)
ORDER BY ua.completed_at;






















