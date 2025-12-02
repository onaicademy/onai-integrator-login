-- ============================================
-- AI-НАСТАВНИК: Функции и триггеры
-- Дата: 21 ноября 2025
-- Описание: Автоматизация для AI-наставника
-- ============================================

-- ========================================
-- 1. ФУНКЦИЯ: Обновление streak при активности
-- ========================================

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  last_activity DATE;
  days_diff INTEGER;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  -- Получаем дату последней активности из profiles
  SELECT
    COALESCE(last_activity_at::date, CURRENT_DATE - INTERVAL '1 year'),
    COALESCE(current_streak, 0),
    COALESCE(longest_streak, 0)
  INTO last_activity, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = NEW.user_id;

  -- Если активность была сегодня, ничего не делаем
  IF last_activity = CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  -- Считаем разницу в днях
  days_diff := CURRENT_DATE - last_activity;

  -- Обновляем streak в profiles
  IF days_diff = 1 THEN
    -- Продолжаем streak
    UPDATE profiles
    SET current_streak = v_current_streak + 1,
        longest_streak = GREATEST(v_longest_streak, v_current_streak + 1),
        last_activity_at = NOW()
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Streak продолжен: % дней', v_current_streak + 1;
  ELSIF days_diff > 1 THEN
    -- Streak прерван, начинаем заново
    UPDATE profiles
    SET current_streak = 1,
        last_activity_at = NOW()
    WHERE id = NEW.user_id;

    RAISE NOTICE 'Streak прерван! Начинаем заново.';
  END IF;

  -- Обновляем user_statistics (если есть)
  UPDATE user_statistics
  SET current_streak = (SELECT current_streak FROM profiles WHERE id = NEW.user_id),
      longest_streak = (SELECT longest_streak FROM profiles WHERE id = NEW.user_id),
      last_activity_date = CURRENT_DATE
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на таблицу user_progress
DROP TRIGGER IF EXISTS on_lesson_activity ON user_progress;
CREATE TRIGGER on_lesson_activity
  AFTER UPDATE ON user_progress
  FOR EACH ROW
  WHEN (NEW.last_accessed_at <> OLD.last_accessed_at)
  EXECUTE FUNCTION update_user_streak();

-- ========================================
-- 2. ФУНКЦИЯ: Проверка и разблокировка достижений
-- ========================================

CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)
RETURNS TABLE(achievement_id TEXT, xp_earned INTEGER) AS $$
DECLARE
  v_stats RECORD;
  v_achievement RECORD;
  v_current_value INTEGER;
BEGIN
  -- Получаем статистику пользователя
  SELECT * INTO v_stats
  FROM user_statistics
  WHERE user_id = p_user_id;

  -- Если статистики нет - ничего не делаем
  IF v_stats IS NULL THEN
    RETURN;
  END IF;

  -- Проверяем все достижения
  FOR v_achievement IN
    SELECT
      ua.achievement_id,
      ua.is_completed,
      ua.current_value,
      ua.required_value
    FROM user_achievements ua
    WHERE ua.user_id = p_user_id
      AND ua.is_completed = false
  LOOP
    -- Получаем текущее значение метрики из user_statistics
    -- Примерная логика (нужно адаптировать под конкретные achievement_id)
    CASE
      WHEN v_achievement.achievement_id LIKE '%lessons%' THEN
        v_current_value := v_stats.lessons_completed;
      WHEN v_achievement.achievement_id LIKE '%streak%' THEN
        v_current_value := v_stats.current_streak;
      WHEN v_achievement.achievement_id LIKE '%xp%' THEN
        v_current_value := v_stats.total_xp;
      WHEN v_achievement.achievement_id LIKE '%module%' THEN
        v_current_value := v_stats.modules_completed;
      ELSE
        v_current_value := 0;
    END CASE;

    -- Обновляем прогресс
    UPDATE user_achievements
    SET current_value = v_current_value
    WHERE user_id = p_user_id
      AND achievement_id = v_achievement.achievement_id;

    -- Проверяем условие разблокировки
    IF v_current_value >= v_achievement.required_value THEN
      -- Разблокируем достижение
      UPDATE user_achievements
      SET is_completed = true,
          completed_at = NOW()
      WHERE user_id = p_user_id
        AND achievement_id = v_achievement.achievement_id;

      -- Вычисляем XP (базовая формула: 10 * required_value)
      DECLARE
        v_xp_reward INTEGER := 10 * v_achievement.required_value;
      BEGIN
        -- Начисляем XP в profiles
        UPDATE profiles
        SET xp = xp + v_xp_reward
        WHERE id = p_user_id;

        -- Обновляем уровень (уровень = XP / 100 + 1)
        UPDATE profiles
        SET level = 1 + FLOOR(xp / 100)
        WHERE id = p_user_id;

        -- Обновляем user_statistics
        UPDATE user_statistics
        SET total_xp = (SELECT xp FROM profiles WHERE id = p_user_id),
            current_level = (SELECT level FROM profiles WHERE id = p_user_id)
        WHERE user_id = p_user_id;

        -- Сохраняем в историю
        INSERT INTO achievement_history (user_id, achievement_id, xp_earned, notification_seen)
        VALUES (p_user_id, v_achievement.achievement_id, v_xp_reward, false);

        -- Возвращаем информацию
        achievement_id := v_achievement.achievement_id;
        xp_earned := v_xp_reward;
        RETURN NEXT;

        RAISE NOTICE 'Достижение разблокировано: %, +% XP', v_achievement.achievement_id, v_xp_reward;
      END;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. ФУНКЦИЯ: Создание задачи для AI-наставника при проблеме
-- ========================================

CREATE OR REPLACE FUNCTION create_mentor_task_from_video_struggle(
  p_user_id UUID,
  p_lesson_id UUID,
  p_rewatch_count INTEGER,
  p_struggling_at_second INTEGER
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
  v_lesson_title TEXT;
BEGIN
  -- Получаем название урока
  SELECT title INTO v_lesson_title
  FROM lessons
  WHERE id = p_lesson_id;

  -- Создаем задачу для AI-наставника
  INSERT INTO ai_mentor_tasks (
    triggered_by,
    student_id,
    task_type,
    description,
    priority,
    context_data,
    status
  )
  VALUES (
    'video_struggle',
    p_user_id,
    'offer_help',
    format('Студент пересмотрел урок "%s" %s раз(а). Возможно, нужна помощь.', v_lesson_title, p_rewatch_count),
    CASE
      WHEN p_rewatch_count >= 5 THEN 'high'
      WHEN p_rewatch_count >= 3 THEN 'medium'
      ELSE 'low'
    END,
    jsonb_build_object(
      'lesson_id', p_lesson_id,
      'lesson_title', v_lesson_title,
      'rewatch_count', p_rewatch_count,
      'struggling_at_second', p_struggling_at_second
    ),
    'pending'
  )
  RETURNING id INTO v_task_id;

  RAISE NOTICE 'Создана задача для AI-наставника: %', v_task_id;
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. ФУНКЦИЯ: Триггер создания задачи при множественных перемотках
-- ========================================

CREATE OR REPLACE FUNCTION detect_video_struggle()
RETURNS TRIGGER AS $$
DECLARE
  v_rewatch_count INTEGER;
BEGIN
  -- Считаем количество перемоток назад
  IF NEW.seeks_count >= 5 THEN
    -- Создаем задачу для AI-наставника
    PERFORM create_mentor_task_from_video_struggle(
      NEW.user_id,
      NEW.lesson_id,
      NEW.seeks_count,
      NEW.max_second_reached
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на video_watch_sessions
DROP TRIGGER IF EXISTS on_video_struggle ON video_watch_sessions;
CREATE TRIGGER on_video_struggle
  AFTER INSERT OR UPDATE ON video_watch_sessions
  FOR EACH ROW
  WHEN (NEW.seeks_count >= 5)
  EXECUTE FUNCTION detect_video_struggle();

-- ========================================
-- 5. ФУНКЦИЯ: Обновление прогресса миссии
-- ========================================

CREATE OR REPLACE FUNCTION update_mission_progress(
  p_user_id UUID,
  p_mission_type TEXT,
  p_increment_value INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_mission RECORD;
BEGIN
  -- Находим активную миссию
  SELECT * INTO v_mission
  FROM missions
  WHERE user_id = p_user_id
    AND mission_type = p_mission_type
    AND is_completed = false
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY created_at DESC
  LIMIT 1;

  -- Если миссия не найдена - ничего не делаем
  IF v_mission IS NULL THEN
    RETURN;
  END IF;

  -- Обновляем прогресс
  UPDATE missions
  SET current_value = current_value + p_increment_value,
      updated_at = NOW()
  WHERE id = v_mission.id;

  -- Проверяем завершение
  IF (v_mission.current_value + p_increment_value) >= v_mission.target_value THEN
    UPDATE missions
    SET is_completed = true,
        completed_at = NOW(),
        current_value = v_mission.target_value
    WHERE id = v_mission.id;

    -- Начисляем XP
    UPDATE profiles
    SET xp = xp + v_mission.xp_reward
    WHERE id = p_user_id;

    -- Обновляем уровень
    UPDATE profiles
    SET level = 1 + FLOOR(xp / 100)
    WHERE id = p_user_id;

    RAISE NOTICE 'Миссия завершена! +% XP', v_mission.xp_reward;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. ФУНКЦИЯ: Триггер обновления миссий при завершении урока
-- ========================================

CREATE OR REPLACE FUNCTION on_lesson_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Если урок завершен
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    -- Обновляем миссию "complete_lessons"
    PERFORM update_mission_progress(NEW.user_id, 'complete_lessons', 1);

    -- Обновляем статистику
    UPDATE user_statistics
    SET lessons_completed = lessons_completed + 1
    WHERE user_id = NEW.user_id;

    -- Проверяем достижения
    PERFORM check_and_unlock_achievements(NEW.user_id);

    RAISE NOTICE 'Урок завершен! Обновлены миссии и достижения.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер на user_progress
DROP TRIGGER IF EXISTS on_user_progress_updated ON user_progress;
CREATE TRIGGER on_user_progress_updated
  AFTER UPDATE ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION on_lesson_completed();

-- ========================================
-- 7. ФУНКЦИЯ: Получение контекста студента для AI
-- ========================================

CREATE OR REPLACE FUNCTION get_student_context_for_ai(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_user RECORD;
  v_stats RECORD;
  v_active_missions JSONB;
  v_recent_achievements JSONB;
  v_recent_questions JSONB;
BEGIN
  -- Получаем данные пользователя
  SELECT id, email, full_name, avatar_url, created_at
  INTO v_user
  FROM auth.users
  WHERE id = p_user_id;

  -- Получаем статистику
  SELECT * INTO v_stats
  FROM user_statistics
  WHERE user_id = p_user_id;

  -- Получаем активные миссии
  SELECT jsonb_agg(
    jsonb_build_object(
      'title', title,
      'current', current_value,
      'target', target_value,
      'progress_percent', ROUND((current_value::decimal / target_value * 100), 0)
    )
  ) INTO v_active_missions
  FROM missions
  WHERE user_id = p_user_id
    AND is_completed = false
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 5;

  -- Получаем последние достижения
  SELECT jsonb_agg(
    jsonb_build_object(
      'achievement_id', achievement_id,
      'xp_earned', xp_earned,
      'unlocked_at', unlocked_at
    )
  ) INTO v_recent_achievements
  FROM achievement_history
  WHERE user_id = p_user_id
  ORDER BY unlocked_at DESC
  LIMIT 3;

  -- Получаем последние вопросы
  SELECT jsonb_agg(
    jsonb_build_object(
      'question', question_text,
      'category', question_category,
      'asked_at', created_at
    )
  ) INTO v_recent_questions
  FROM student_questions_log
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 5;

  -- Формируем результат
  v_result := jsonb_build_object(
    'personal', jsonb_build_object(
      'full_name', v_user.full_name,
      'email', v_user.email,
      'registered_at', v_user.created_at
    ),
    'learning', jsonb_build_object(
      'lessons_completed', COALESCE(v_stats.lessons_completed, 0),
      'modules_completed', COALESCE(v_stats.modules_completed, 0),
      'courses_completed', COALESCE(v_stats.courses_completed, 0)
    ),
    'gamification', jsonb_build_object(
      'level', COALESCE(v_stats.current_level, 1),
      'total_xp', COALESCE(v_stats.total_xp, 0),
      'current_streak', COALESCE(v_stats.current_streak, 0),
      'longest_streak', COALESCE(v_stats.longest_streak, 0)
    ),
    'active_missions', COALESCE(v_active_missions, '[]'::jsonb),
    'recent_achievements', COALESCE(v_recent_achievements, '[]'::jsonb),
    'recent_questions', COALESCE(v_recent_questions, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

-- Тестирование функции
SELECT get_student_context_for_ai(auth.uid());
