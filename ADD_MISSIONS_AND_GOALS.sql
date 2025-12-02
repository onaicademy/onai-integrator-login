-- ============================================
-- ДОБАВЛЯЕМ МИССИИ И ЦЕЛИ ДЛЯ SAINT
-- ============================================

DO $$
DECLARE
  v_saint_id UUID;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- 1. Получаем ID Saint
  SELECT id INTO v_saint_id
  FROM auth.users
  WHERE email = 'saint@onaiacademy.kz';
  
  RAISE NOTICE '✅ Saint ID: %', v_saint_id;
  
  -- 2. Удаляем старые миссии (если нужно начать с чистого листа)
  -- DELETE FROM missions WHERE user_id = v_saint_id;
  -- DELETE FROM weekly_goals WHERE user_id = v_saint_id;
  
  -- 3. Создаем активные миссии
  
  -- Миссия 1: Завершить 5 уроков (почти выполнена)
  INSERT INTO missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward,
    is_completed, expires_at
  )
  VALUES (
    v_saint_id,
    'complete_lessons',
    'Марафон обучения',
    'Завершите 5 уроков подряд',
    5, 4, 100,
    false,
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT DO NOTHING;
  
  -- Миссия 2: Streak 7 дней (выполнена!)
  INSERT INTO missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward,
    is_completed, completed_at
  )
  VALUES (
    v_saint_id,
    'maintain_streak',
    'Неделя упорства',
    'Поддерживайте streak 7 дней',
    7, 7, 150,
    true,
    NOW() - INTERVAL '1 day'
  )
  ON CONFLICT DO NOTHING;
  
  -- Миссия 3: Посмотреть 10 видео (в процессе)
  INSERT INTO missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward,
    is_completed, expires_at
  )
  VALUES (
    v_saint_id,
    'watch_videos',
    'Видео-марафон',
    'Просмотрите 10 обучающих видео',
    10, 6, 80,
    false,
    NOW() + INTERVAL '14 days'
  )
  ON CONFLICT DO NOTHING;
  
  -- Миссия 4: Заработать 500 XP (выполнена!)
  INSERT INTO missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward,
    is_completed, completed_at
  )
  VALUES (
    v_saint_id,
    'earn_xp',
    'Мастер опыта',
    'Заработайте 500 XP',
    500, 1250, 200,
    true,
    NOW() - INTERVAL '3 days'
  )
  ON CONFLICT DO NOTHING;
  
  -- Миссия 5: Пройти модуль (в процессе)
  INSERT INTO missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward,
    is_completed, expires_at
  )
  VALUES (
    v_saint_id,
    'complete_module',
    'Покоритель модуля',
    'Завершите полностью один модуль',
    1, 0, 300,
    false,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Создано 5 миссий';
  
  -- 4. Создаем недельные цели
  v_week_start := DATE_TRUNC('week', CURRENT_DATE);
  v_week_end := v_week_start + INTERVAL '6 days';
  
  -- Цель 1: Завершить 10 уроков за неделю (в процессе)
  INSERT INTO weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed
  )
  VALUES (
    v_saint_id,
    'weekly_lessons',
    10, 6,
    v_week_start, v_week_end,
    false
  )
  ON CONFLICT DO NOTHING;
  
  -- Цель 2: Набрать 500 XP за неделю (почти выполнена)
  INSERT INTO weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed
  )
  VALUES (
    v_saint_id,
    'weekly_xp',
    500, 450,
    v_week_start, v_week_end,
    false
  )
  ON CONFLICT DO NOTHING;
  
  -- Цель 3: Поддерживать streak всю неделю (выполнена!)
  INSERT INTO weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed, completed_at
  )
  VALUES (
    v_saint_id,
    'weekly_streak',
    7, 7,
    v_week_start, v_week_end,
    true,
    NOW() - INTERVAL '1 day'
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE '✅ Создано 3 недельных цели';
  
END $$;

-- Проверяем результат
SELECT 
  '=== МИССИИ ===' as step,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_completed = true) as completed,
  COUNT(*) FILTER (WHERE is_completed = false) as active
FROM missions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');

SELECT 
  '=== НЕДЕЛЬНЫЕ ЦЕЛИ ===' as step,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_completed = true) as completed,
  COUNT(*) FILTER (WHERE is_completed = false) as active
FROM weekly_goals
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'saint@onaiacademy.kz');



















