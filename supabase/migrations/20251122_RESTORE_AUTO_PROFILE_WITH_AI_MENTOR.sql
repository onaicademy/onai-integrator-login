-- ============================================
-- ВОССТАНОВЛЕНИЕ АВТОМАТИЧЕСКОГО СОЗДАНИЯ ПРОФИЛЕЙ
-- + AI MENTOR DATA ДЛЯ НОВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- ============================================
-- 
-- ПРОБЛЕМА: После миграции 20251108_REMOVE_AUTO_PROFILE_TRIGGER.sql
-- новые пользователи НЕ получают profiles, missions, weekly_goals
-- 
-- РЕШЕНИЕ: Восстанавливаем триггер с защитой от дубликатов
-- + создаём начальные данные для AI Наставника
-- ============================================

-- 1. ФУНКЦИЯ: Автоматическое создание профиля и AI Mentor данных
CREATE OR REPLACE FUNCTION public.handle_new_user_with_ai_mentor()
RETURNS trigger AS $$
DECLARE
  v_user_id UUID;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  v_user_id := NEW.id;
  v_week_start := DATE_TRUNC('week', CURRENT_DATE);
  v_week_end := v_week_start + INTERVAL '6 days';

  -- ============================================
  -- A. ПРОФИЛЬ (profiles)
  -- ============================================
  INSERT INTO public.profiles (
    id, email, full_name, role, is_active, 
    level, xp, current_streak, longest_streak,
    created_at, updated_at
  )
  VALUES (
    v_user_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email = 'saint@onaiacademy.kz' THEN 'admin'
      WHEN NEW.email LIKE '%@admin%' THEN 'admin'
      WHEN NEW.raw_user_meta_data->>'role' IS NOT NULL THEN NEW.raw_user_meta_data->>'role'
      ELSE 'student'
    END,
    true,
    1,    -- начальный уровень
    0,    -- начальный XP
    0,    -- streak
    0,    -- longest_streak
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;  -- ✅ Защита от дубликатов!

  -- ============================================
  -- B. СТАТИСТИКА (user_statistics)
  -- ============================================
  INSERT INTO public.user_statistics (
    user_id, 
    lessons_completed, modules_completed, courses_completed,
    total_xp, current_level, current_streak, longest_streak,
    last_activity_date, created_at, updated_at
  )
  VALUES (
    v_user_id,
    0, 0, 0,  -- начальные значения
    0, 1, 0, 0,
    CURRENT_DATE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;  -- ✅ Защита от дубликатов!

  -- ============================================
  -- C. НАЧАЛЬНЫЕ МИССИИ (missions)
  -- ============================================
  -- Миссия 1: Первый урок
  INSERT INTO public.missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward, is_completed,
    expires_at, created_at, updated_at
  )
  VALUES (
    v_user_id,
    'complete_lessons',
    'Первый шаг',
    'Завершите свой первый урок',
    1, 0, 50, false,
    NOW() + INTERVAL '30 days',
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Миссия 2: Неделя обучения
  INSERT INTO public.missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward, is_completed,
    expires_at, created_at, updated_at
  )
  VALUES (
    v_user_id,
    'complete_lessons',
    'Марафон обучения',
    'Завершите 5 уроков',
    5, 0, 100, false,
    NOW() + INTERVAL '30 days',
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Миссия 3: Streak
  INSERT INTO public.missions (
    user_id, mission_type, title, description,
    target_value, current_value, xp_reward, is_completed,
    expires_at, created_at, updated_at
  )
  VALUES (
    v_user_id,
    'streak_days',
    'Неделя упорства',
    'Занимайтесь 7 дней подряд',
    7, 0, 150, false,
    NOW() + INTERVAL '30 days',
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- D. НЕДЕЛЬНЫЕ ЦЕЛИ (weekly_goals)
  -- ============================================
  -- Цель 1: Уроки
  INSERT INTO public.weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed,
    created_at, updated_at
  )
  VALUES (
    v_user_id,
    'lessons_completed',
    5, 0,
    v_week_start, v_week_end, false,
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Цель 2: Время обучения
  INSERT INTO public.weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed,
    created_at, updated_at
  )
  VALUES (
    v_user_id,
    'study_time_minutes',
    60, 0,
    v_week_start, v_week_end, false,
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  -- Цель 3: Streak
  INSERT INTO public.weekly_goals (
    user_id, goal_type, target_value, current_value,
    week_start_date, week_end_date, is_completed,
    created_at, updated_at
  )
  VALUES (
    v_user_id,
    'streak_maintain',
    7, 0,
    v_week_start, v_week_end, false,
    NOW(), NOW()
  )
  ON CONFLICT DO NOTHING;

  RAISE NOTICE '✅ Профиль и AI Mentor данные созданы для пользователя: %', NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. ТРИГГЕР: Срабатывает при создании пользователя
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created_with_ai_mentor ON auth.users;

CREATE TRIGGER on_auth_user_created_with_ai_mentor
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_ai_mentor();

-- ============================================
-- 3. ПРОВЕРКА
-- ============================================
DO $$
BEGIN
  -- Проверяем что триггер создан
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_with_ai_mentor'
  ) THEN
    RAISE NOTICE '✅ Триггер on_auth_user_created_with_ai_mentor создан';
  ELSE
    RAISE EXCEPTION '❌ Триггер НЕ создан!';
  END IF;
  
  -- Проверяем что функция создана
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user_with_ai_mentor'
  ) THEN
    RAISE NOTICE '✅ Функция handle_new_user_with_ai_mentor создана';
  ELSE
    RAISE EXCEPTION '❌ Функция НЕ создана!';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '🎯 ГОТОВО! Новые пользователи получат:';
  RAISE NOTICE '   - Профиль (profiles)';
  RAISE NOTICE '   - Статистику (user_statistics)';
  RAISE NOTICE '   - 3 начальные миссии (missions)';
  RAISE NOTICE '   - 3 недельные цели (weekly_goals)';
  RAISE NOTICE '   - AI Наставник готов к работе! 🤖';
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;








