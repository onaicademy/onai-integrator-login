-- ===================================================================
-- SETUP AI-MENTOR TABLES
-- Создание таблиц для функционала AI-наставника (NeuroHUB)
-- ===================================================================

-- 1. Таблица для метрик AI-аналитика
CREATE TABLE IF NOT EXISTS ai_analytics_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL, -- 'daily_progress', 'weekly_summary', 'study_streak', etc
  metric_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Индексы для быстрого поиска
  INDEX idx_analytics_user_id (user_id),
  INDEX idx_analytics_metric_type (metric_type),
  INDEX idx_analytics_created_at (created_at)
);

COMMENT ON TABLE ai_analytics_metrics IS 'Метрики для AI-аналитики прогресса студентов';
COMMENT ON COLUMN ai_analytics_metrics.metric_type IS 'Тип метрики: daily_progress, weekly_summary, study_streak, assignment_completion';
COMMENT ON COLUMN ai_analytics_metrics.metric_data IS 'JSON данные метрики';

-- ===================================================================

-- 2. Таблица для рейтингов студентов
CREATE TABLE IF NOT EXISTS student_rankings (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_completed_lessons INT DEFAULT 0,
  total_xp INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  rank_position INT,
  percentile DECIMAL(5,2),
  last_updated TIMESTAMP DEFAULT NOW(),
  
  -- Индексы
  INDEX idx_rankings_user_id (user_id),
  INDEX idx_rankings_position (rank_position),
  INDEX idx_rankings_xp (total_xp DESC)
);

COMMENT ON TABLE student_rankings IS 'Рейтинг студентов по прогрессу и активности';
COMMENT ON COLUMN student_rankings.streak_days IS 'Количество дней подряд с активностью';
COMMENT ON COLUMN student_rankings.percentile IS 'Процентиль студента относительно других (0-100)';

-- ===================================================================

-- 3. Триггер для автоматического обновления рейтингов
CREATE OR REPLACE FUNCTION update_student_ranking()
RETURNS TRIGGER AS $$
BEGIN
  -- Пересчитать рейтинг при изменении прогресса
  WITH ranked AS (
    SELECT 
      u.id,
      COUNT(sp.id) FILTER (WHERE sp.completed = true) as completed_lessons,
      COALESCE(SUM(sp.xp_earned), 0) as total_xp,
      ROW_NUMBER() OVER (ORDER BY COUNT(sp.id) FILTER (WHERE sp.completed = true) DESC, COALESCE(SUM(sp.xp_earned), 0) DESC) as position,
      COUNT(*) OVER () as total_students
    FROM users u
    LEFT JOIN student_progress sp ON u.id = sp.user_id
    WHERE u.role = 'student'
    GROUP BY u.id
  )
  INSERT INTO student_rankings (
    user_id, 
    total_completed_lessons, 
    total_xp, 
    rank_position, 
    percentile,
    last_updated
  )
  SELECT 
    id, 
    completed_lessons, 
    total_xp,
    position::INT,
    ROUND((1 - (position::DECIMAL / total_students)) * 100, 2) as percentile,
    NOW()
  FROM ranked
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_completed_lessons = EXCLUDED.total_completed_lessons,
    total_xp = EXCLUDED.total_xp,
    rank_position = EXCLUDED.rank_position,
    percentile = EXCLUDED.percentile,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_student_ranking() IS 'Автоматически обновляет рейтинг студентов при изменении прогресса';

-- Создание триггера на таблицу student_progress
DROP TRIGGER IF EXISTS student_progress_update_trigger ON student_progress;
CREATE TRIGGER student_progress_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON student_progress
FOR EACH ROW
EXECUTE FUNCTION update_student_ranking();

-- ===================================================================

-- 4. RLS политики для безопасности
ALTER TABLE ai_analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_rankings ENABLE ROW LEVEL SECURITY;

-- Удалить старые политики если есть
DROP POLICY IF EXISTS "Students see own metrics" ON ai_analytics_metrics;
DROP POLICY IF EXISTS "Admins see all metrics" ON ai_analytics_metrics;
DROP POLICY IF EXISTS "Anyone see rankings" ON student_rankings;

-- Студенты видят только свои метрики
CREATE POLICY "Students see own metrics" ON ai_analytics_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Админы видят всё
CREATE POLICY "Admins see all metrics" ON ai_analytics_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'tech_specialist')
    )
  );

-- Все видят рейтинги (но без персональных данных)
CREATE POLICY "Anyone see rankings" ON student_rankings
  FOR SELECT USING (true);

-- ===================================================================

-- 5. Функция для получения топ студентов
CREATE OR REPLACE FUNCTION get_top_students(limit_count INT DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  name VARCHAR,
  completed_lessons INT,
  total_xp INT,
  rank_position INT,
  percentile DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.user_id,
    u.full_name as name,
    sr.total_completed_lessons as completed_lessons,
    sr.total_xp,
    sr.rank_position,
    sr.percentile
  FROM student_rankings sr
  JOIN users u ON sr.user_id = u.id
  ORDER BY sr.rank_position ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_students IS 'Возвращает топ N студентов по рейтингу';

-- ===================================================================

-- 6. Функция для подсчёта streak (дни подряд)
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_streak INT := 0;
  v_current_date DATE;
  v_check_date DATE;
BEGIN
  v_current_date := CURRENT_DATE;
  v_check_date := v_current_date;
  
  -- Идём по дням назад, пока находим активность
  LOOP
    -- Проверяем есть ли активность в этот день
    IF EXISTS (
      SELECT 1 FROM student_progress
      WHERE user_id = p_user_id
        AND DATE(created_at) = v_check_date
    ) THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      -- Если текущий день ещё не закончился, проверяем вчера
      IF v_check_date = v_current_date THEN
        v_check_date := v_check_date - INTERVAL '1 day';
        CONTINUE;
      END IF;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_user_streak IS 'Подсчитывает количество дней подряд с активностью пользователя';

-- ===================================================================

-- 7. Функция для обновления streak в рейтинге
CREATE OR REPLACE FUNCTION update_all_streaks()
RETURNS VOID AS $$
BEGIN
  UPDATE student_rankings sr
  SET 
    streak_days = calculate_user_streak(sr.user_id),
    last_updated = NOW()
  FROM users u
  WHERE sr.user_id = u.id AND u.role = 'student';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_all_streaks IS 'Обновляет streak для всех студентов (запускать раз в день)';

-- ===================================================================

-- 8. Функция для получения прогресса студента
CREATE OR REPLACE FUNCTION get_student_progress_stats(p_user_id UUID)
RETURNS TABLE (
  completed_lessons INT,
  total_lessons INT,
  completion_percentage DECIMAL,
  total_xp INT,
  rank_position INT,
  streak_days INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(sp.id) FILTER (WHERE sp.completed = true), 0)::INT as completed_lessons,
    (SELECT COUNT(*) FROM lessons)::INT as total_lessons,
    ROUND(
      (COALESCE(COUNT(sp.id) FILTER (WHERE sp.completed = true), 0)::DECIMAL / 
       NULLIF((SELECT COUNT(*) FROM lessons), 0)) * 100, 
      2
    ) as completion_percentage,
    COALESCE(sr.total_xp, 0)::INT as total_xp,
    COALESCE(sr.rank_position, 0)::INT as rank_position,
    COALESCE(sr.streak_days, 0)::INT as streak_days
  FROM users u
  LEFT JOIN student_progress sp ON u.id = sp.user_id
  LEFT JOIN student_rankings sr ON u.id = sr.user_id
  WHERE u.id = p_user_id
  GROUP BY u.id, sr.total_xp, sr.rank_position, sr.streak_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_student_progress_stats IS 'Возвращает статистику прогресса конкретного студента';

-- ===================================================================

-- 9. Начальная инициализация рейтингов
-- Запускаем функцию для создания начальных рейтингов
DO $$
BEGIN
  -- Создаём начальные записи для всех студентов
  INSERT INTO student_rankings (user_id, total_completed_lessons, total_xp, last_updated)
  SELECT 
    u.id,
    0,
    0,
    NOW()
  FROM users u
  WHERE u.role = 'student'
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Обновляем рейтинги
  PERFORM update_student_ranking();
  
  -- Обновляем streak для всех
  PERFORM update_all_streaks();
END $$;

-- ===================================================================

-- 10. Создание расписания для автоматического обновления streak
-- (требует расширение pg_cron, если доступно)
-- Если pg_cron недоступен, нужно запускать update_all_streaks() вручную раз в день

-- SELECT cron.schedule(
--   'update-streaks-daily',
--   '0 0 * * *', -- Каждый день в полночь
--   'SELECT update_all_streaks();'
-- );

-- ===================================================================

-- ✅ ГОТОВО!
-- Все таблицы и функции созданы.
-- Теперь можно использовать:
-- 1. get_top_students(10) - получить топ 10 студентов
-- 2. get_student_progress_stats(user_id) - получить статистику студента
-- 3. calculate_user_streak(user_id) - подсчитать streak
-- 4. update_all_streaks() - обновить streak для всех (запускать раз в день)

SELECT 
  '✅ AI-Mentor tables setup complete!' as status,
  (SELECT COUNT(*) FROM ai_analytics_metrics) as analytics_metrics,
  (SELECT COUNT(*) FROM student_rankings) as student_rankings;

