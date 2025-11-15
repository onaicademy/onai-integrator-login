-- ========================================
-- МИГРАЦИЯ: Видео-аналитика + AI-Ментор мотивация
-- Дата: 2025-11-15
-- ========================================

-- ====================================
-- 1. ТАБЛИЦА: video_segments_analytics
-- ====================================
CREATE TABLE IF NOT EXISTS public.video_segments_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_content(id) ON DELETE CASCADE,
  
  -- Сегмент видео (каждые 10 секунд)
  start_second INTEGER NOT NULL,
  end_second INTEGER NOT NULL,
  
  -- Метрики сегмента
  total_views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  skip_count INTEGER DEFAULT 0,
  replay_count INTEGER DEFAULT 0,
  average_watch_time DECIMAL(5,2) DEFAULT 0,
  
  -- Индикаторы
  is_hot_zone BOOLEAN DEFAULT false, -- Часто перематывают назад
  is_cold_zone BOOLEAN DEFAULT false, -- Часто пропускают
  difficulty_score DECIMAL(3,2) DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_video_segment UNIQUE (video_id, start_second)
);

CREATE INDEX IF NOT EXISTS idx_segments_video ON video_segments_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_segments_hot ON video_segments_analytics(video_id, is_hot_zone) WHERE is_hot_zone = true;
CREATE INDEX IF NOT EXISTS idx_segments_cold ON video_segments_analytics(video_id, is_cold_zone) WHERE is_cold_zone = true;

COMMENT ON TABLE video_segments_analytics IS 'Посегментная аналитика видео (каждые 10 секунд)';

-- ====================================
-- 2. ТАБЛИЦА: student_learning_metrics
-- ====================================
CREATE TABLE IF NOT EXISTS public.student_learning_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Общие метрики
  total_watch_time_seconds INTEGER DEFAULT 0,
  average_engagement_score DECIMAL(3,2) DEFAULT 0,
  average_difficulty_score DECIMAL(3,2) DEFAULT 0,
  learning_efficiency DECIMAL(3,2) DEFAULT 0,
  
  -- Прогресс
  lessons_started INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0,
  
  -- Поведение
  average_session_duration INTEGER DEFAULT 0, -- секунды
  total_sessions INTEGER DEFAULT 0,
  average_playback_speed DECIMAL(3,2) DEFAULT 1.0,
  
  -- Риски
  days_since_last_activity INTEGER DEFAULT 0,
  churn_risk_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  predicted_completion_date DATE,
  
  -- Временные метки
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_student_course_metrics UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_metrics_user ON student_learning_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_course ON student_learning_metrics(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_metrics_churn ON student_learning_metrics(churn_risk_score) WHERE churn_risk_score > 0.7;

COMMENT ON TABLE student_learning_metrics IS 'Метрики обучения каждого студента';

-- ====================================
-- 3. ТАБЛИЦА: course_health_metrics
-- ====================================
CREATE TABLE IF NOT EXISTS public.course_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Общие показатели
  total_enrollments INTEGER DEFAULT 0,
  active_students INTEGER DEFAULT 0,
  completed_students INTEGER DEFAULT 0,
  
  -- Качество курса
  average_engagement DECIMAL(3,2) DEFAULT 0,
  average_drop_off_rate DECIMAL(3,2) DEFAULT 0,
  average_completion_time_days INTEGER DEFAULT 0,
  
  -- Проблемные места
  most_difficult_lesson_id UUID REFERENCES lessons(id),
  most_skipped_lesson_id UUID REFERENCES lessons(id),
  highest_drop_off_lesson_id UUID REFERENCES lessons(id),
  
  -- Оценки
  overall_health_score DECIMAL(3,2) DEFAULT 0, -- 0-1
  needs_improvement BOOLEAN DEFAULT false,
  
  -- Дата расчёта
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_course_health UNIQUE (course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_health ON course_health_metrics(course_id);
CREATE INDEX IF NOT EXISTS idx_course_needs_improvement ON course_health_metrics(course_id) WHERE needs_improvement = true;

COMMENT ON TABLE course_health_metrics IS 'Общее здоровье курса';

-- ====================================
-- 4. ТАБЛИЦА: mentor_motivation_log
-- ====================================
CREATE TABLE IF NOT EXISTS public.mentor_motivation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  
  -- Анализируемый период
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  
  -- Метрики за период
  days_active INTEGER DEFAULT 0, -- Сколько дней был активен из 3
  lessons_watched INTEGER DEFAULT 0,
  lessons_completed INTEGER DEFAULT 0,
  total_watch_time_seconds INTEGER DEFAULT 0,
  last_activity_date DATE,
  
  -- Статус студента
  student_status VARCHAR(50) NOT NULL CHECK (student_status IN ('active', 'inactive', 'at_risk', 'dropping')),
  motivation_type VARCHAR(50) NOT NULL CHECK (motivation_type IN ('keep_going', 'come_back', 'great_progress', 'need_help')),
  
  -- Отправленное сообщение
  message_sent TEXT NOT NULL,
  message_sent_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_message_id VARCHAR(100),
  
  -- Реакция студента
  student_clicked_button BOOLEAN DEFAULT false,
  student_resumed_learning BOOLEAN DEFAULT false,
  resumed_within_hours INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_log_user ON mentor_motivation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_mentor_log_course ON mentor_motivation_log(course_id);
CREATE INDEX IF NOT EXISTS idx_mentor_log_status ON mentor_motivation_log(student_status);
CREATE INDEX IF NOT EXISTS idx_mentor_log_sent_at ON mentor_motivation_log(message_sent_at);

COMMENT ON TABLE mentor_motivation_log IS 'Лог мотивационных сообщений от AI-Ментора';

-- ====================================
-- 5. ФУНКЦИЯ: Анализ статуса студента
-- ====================================
CREATE OR REPLACE FUNCTION analyze_student_status(
  p_user_id UUID,
  p_course_id INTEGER,
  p_days_to_analyze INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_days_active INTEGER;
  v_lessons_watched INTEGER;
  v_lessons_completed INTEGER;
  v_total_watch_time INTEGER;
  v_last_activity_date DATE;
  v_days_since_last_activity INTEGER;
  v_status VARCHAR(50);
  v_motivation_type VARCHAR(50);
  v_churn_risk DECIMAL;
BEGIN
  -- Подсчитываем активность за последние N дней
  SELECT 
    COUNT(DISTINCT DATE(sp.updated_at)) as days_active,
    COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_started = true) as lessons_watched,
    COUNT(DISTINCT sp.lesson_id) FILTER (WHERE sp.is_completed = true) as lessons_completed,
    SUM(sp.watch_time_seconds) as total_watch_time,
    MAX(DATE(sp.updated_at)) as last_activity_date
  INTO 
    v_days_active,
    v_lessons_watched,
    v_lessons_completed,
    v_total_watch_time,
    v_last_activity_date
  FROM student_progress sp
  JOIN lessons l ON l.id = sp.lesson_id
  JOIN modules m ON m.id = l.module_id
  WHERE sp.user_id = p_user_id
    AND m.course_id = p_course_id
    AND sp.updated_at >= NOW() - INTERVAL '1 day' * p_days_to_analyze;
  
  -- Рассчитываем дни с последней активности
  v_days_since_last_activity := COALESCE(CURRENT_DATE - v_last_activity_date, 999);
  
  -- Определяем статус студента
  IF v_days_active >= 2 AND v_lessons_completed > 0 THEN
    v_status := 'active';
    v_motivation_type := 'great_progress';
    v_churn_risk := 0.1;
    
  ELSIF v_days_active = 1 AND v_lessons_watched > 0 THEN
    v_status := 'active';
    v_motivation_type := 'keep_going';
    v_churn_risk := 0.3;
    
  ELSIF v_days_since_last_activity BETWEEN 3 AND 7 THEN
    v_status := 'at_risk';
    v_motivation_type := 'come_back';
    v_churn_risk := 0.6;
    
  ELSIF v_days_since_last_activity > 7 THEN
    v_status := 'dropping';
    v_motivation_type := 'need_help';
    v_churn_risk := 0.9;
    
  ELSE
    v_status := 'inactive';
    v_motivation_type := 'come_back';
    v_churn_risk := 0.7;
  END IF;
  
  -- Формируем результат
  v_result := jsonb_build_object(
    'userId', p_user_id,
    'courseId', p_course_id,
    'daysActive', COALESCE(v_days_active, 0),
    'lessonsWatched', COALESCE(v_lessons_watched, 0),
    'lessonsCompleted', COALESCE(v_lessons_completed, 0),
    'totalWatchTime', COALESCE(v_total_watch_time, 0),
    'lastActivityDate', v_last_activity_date,
    'daysSinceLastActivity', v_days_since_last_activity,
    'status', v_status,
    'motivationType', v_motivation_type,
    'churnRisk', v_churn_risk
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION analyze_student_status IS 'Анализирует статус студента за последние N дней для AI-Ментора';

-- ====================================
-- 6. RLS ПОЛИТИКИ
-- ====================================

-- video_segments_analytics
ALTER TABLE video_segments_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view video segments" ON video_segments_analytics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- student_learning_metrics
ALTER TABLE student_learning_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own metrics" ON student_learning_metrics FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all metrics" ON student_learning_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- course_health_metrics
ALTER TABLE course_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view course health" ON course_health_metrics FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- mentor_motivation_log
ALTER TABLE mentor_motivation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own motivation log" ON mentor_motivation_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all motivation logs" ON mentor_motivation_log FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ========================================
-- ГОТОВО! 🎉
-- ========================================

