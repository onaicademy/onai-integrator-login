-- AI-наставник и AI-аналитик для onAI Academy
-- Создана: 7 ноября 2025

-- ============================================
-- ТАБЛИЦА: Сессии AI-наставника
-- ============================================
CREATE TABLE IF NOT EXISTS ai_mentor_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Связь с учеником
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Информация о сессии
  session_type TEXT NOT NULL CHECK (session_type IN (
    'learning_support',      -- Помощь в обучении
    'motivation',            -- Мотивация
    'career_guidance',       -- Карьерные советы
    'progress_review',       -- Обзор прогресса
    'problem_solving'        -- Решение проблем
  )),
  
  -- Контекст
  context_data JSONB, -- Достижения, прогресс, проблемы
  
  -- Рекомендации наставника
  recommendations JSONB, -- Список рекомендаций
  action_items JSONB,     -- Конкретные задачи
  follow_up_date TIMESTAMP WITH TIME ZONE,
  
  -- Статус
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  
  -- Метаданные
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ТАБЛИЦА: Сообщения AI-наставника
-- ============================================
CREATE TABLE IF NOT EXISTS ai_mentor_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  session_id UUID NOT NULL REFERENCES ai_mentor_sessions(id) ON DELETE CASCADE,
  
  -- Сообщение
  role TEXT NOT NULL CHECK (role IN ('user', 'mentor', 'system')),
  content TEXT NOT NULL,
  
  -- Метаданные
  metadata JSONB, -- Используемые данные, источники
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ТАБЛИЦА: Анализы AI-аналитика
-- ============================================
CREATE TABLE IF NOT EXISTS ai_analyst_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип анализа
  report_type TEXT NOT NULL CHECK (report_type IN (
    'student_progress',       -- Анализ прогресса ученика
    'ai_curator_effectiveness', -- Эффективность AI-куратора
    'learning_patterns',       -- Паттерны обучения
    'engagement_analysis',     -- Анализ вовлечённости
    'problem_areas',           -- Проблемные области
    'overall_platform'         -- Общая аналитика платформы
  )),
  
  -- Цель анализа (NULL = общая аналитика)
  target_student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Период анализа
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Данные анализа
  raw_data JSONB NOT NULL,            -- Исходные данные
  analysis_results JSONB NOT NULL,    -- Результаты анализа
  insights JSONB,                     -- Инсайты
  recommendations JSONB,              -- Рекомендации
  
  -- Метрики
  metrics JSONB,                      -- Ключевые метрики
  
  -- Статус
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  
  -- Метаданные
  generated_by TEXT DEFAULT 'gpt-4o', -- Модель AI
  processing_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ТАБЛИЦА: Настроения учеников (из AI-куратора)
-- ============================================
ALTER TABLE ai_curator_messages 
ADD COLUMN IF NOT EXISTS student_mood VARCHAR(50),
ADD COLUMN IF NOT EXISTS mood_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS mood_indicators JSONB,
ADD COLUMN IF NOT EXISTS is_problem_detected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS problem_type VARCHAR(100);

-- Комментарии для новых колонок
COMMENT ON COLUMN ai_curator_messages.student_mood IS 'Определённое настроение: positive, neutral, negative, frustrated, confused, motivated';
COMMENT ON COLUMN ai_curator_messages.mood_confidence IS 'Уверенность в определении (0.00 - 1.00)';
COMMENT ON COLUMN ai_curator_messages.mood_indicators IS 'Индикаторы настроения: слова, эмодзи, паттерны';
COMMENT ON COLUMN ai_curator_messages.is_problem_detected IS 'Обнаружена ли проблема требующая внимания';
COMMENT ON COLUMN ai_curator_messages.problem_type IS 'Тип проблемы: understanding, motivation, technical, personal';

-- ============================================
-- ТАБЛИЦА: Задачи для AI-наставника
-- ============================================
CREATE TABLE IF NOT EXISTS ai_mentor_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Источник задачи
  triggered_by TEXT NOT NULL CHECK (triggered_by IN (
    'ai_curator_alert',     -- Триггер от AI-куратора
    'analyst_report',       -- Из отчёта аналитика
    'admin_request',        -- Запрос админа
    'scheduled',            -- Запланированная задача
    'student_request'       -- Запрос ученика
  )),
  
  -- Целевой ученик
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Детали задачи
  task_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Контекст
  context_data JSONB,
  
  -- Статус выполнения
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Результат
  result JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ИНДЕКСЫ
-- ============================================
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_student ON ai_mentor_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_type ON ai_mentor_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_mentor_sessions_status ON ai_mentor_sessions(status);
CREATE INDEX IF NOT EXISTS idx_mentor_messages_session ON ai_mentor_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_analyst_reports_type ON ai_analyst_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_analyst_reports_student ON ai_analyst_reports(target_student_id);
CREATE INDEX IF NOT EXISTS idx_analyst_reports_period ON ai_analyst_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_curator_mood ON ai_curator_messages(student_mood);
CREATE INDEX IF NOT EXISTS idx_curator_problems ON ai_curator_messages(is_problem_detected);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_student ON ai_mentor_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_status ON ai_mentor_tasks(status);
CREATE INDEX IF NOT EXISTS idx_mentor_tasks_priority ON ai_mentor_tasks(priority);

-- ============================================
-- RLS POLICIES
-- ============================================

-- AI-наставник сессии: студенты видят свои, админы всё
ALTER TABLE ai_mentor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own mentor sessions"
  ON ai_mentor_sessions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can view all mentor sessions"
  ON ai_mentor_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "System can create mentor sessions"
  ON ai_mentor_sessions FOR INSERT
  WITH CHECK (true);

-- AI-наставник сообщения: как сессии
ALTER TABLE ai_mentor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own mentor messages"
  ON ai_mentor_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ai_mentor_sessions
      WHERE ai_mentor_sessions.id = ai_mentor_messages.session_id
      AND ai_mentor_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all mentor messages"
  ON ai_mentor_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- AI-аналитик отчёты: только админы
ALTER TABLE ai_analyst_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all analyst reports"
  ON ai_analyst_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- AI-наставник задачи: студенты видят свои, админы всё
ALTER TABLE ai_mentor_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own mentor tasks"
  ON ai_mentor_tasks FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Admins can manage all mentor tasks"
  ON ai_mentor_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- ФУНКЦИИ
-- ============================================

-- Функция: Создать задачу для AI-наставника из алерта
CREATE OR REPLACE FUNCTION create_mentor_task_from_alert(
  p_student_id UUID,
  p_problem_type TEXT,
  p_context JSONB
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  INSERT INTO ai_mentor_tasks (
    triggered_by,
    student_id,
    task_type,
    description,
    priority,
    context_data,
    status
  ) VALUES (
    'ai_curator_alert',
    p_student_id,
    p_problem_type,
    'AI-куратор обнаружил проблему: ' || p_problem_type,
    CASE 
      WHEN p_problem_type IN ('understanding', 'motivation') THEN 'high'
      ELSE 'medium'
    END,
    p_context,
    'pending'
  ) RETURNING id INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: Получить статистику для AI-аналитика
CREATE OR REPLACE FUNCTION get_student_analytics_data(
  p_student_id UUID,
  p_period_start TIMESTAMP WITH TIME ZONE,
  p_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- Статистика обучения
    'learning_stats', (
      SELECT jsonb_build_object(
        'lessons_completed', COALESCE(lessons_completed, 0),
        'modules_completed', COALESCE(modules_completed, 0),
        'total_xp', COALESCE(total_xp, 0),
        'streak_days', COALESCE(streak_days, 0),
        'average_lesson_score', COALESCE(average_lesson_score, 0)
      )
      FROM user_statistics
      WHERE user_id = p_student_id
    ),
    
    -- Достижения
    'achievements', (
      SELECT jsonb_agg(jsonb_build_object(
        'achievement_id', achievement_id,
        'completed_at', completed_at
      ))
      FROM user_achievements
      WHERE user_id = p_student_id
        AND is_completed = true
        AND completed_at BETWEEN p_period_start AND p_period_end
    ),
    
    -- AI-куратор взаимодействия
    'ai_curator_interactions', (
      SELECT jsonb_build_object(
        'total_messages', COUNT(*),
        'moods', jsonb_agg(DISTINCT student_mood),
        'problems_detected', COUNT(*) FILTER (WHERE is_problem_detected = true),
        'avg_mood_confidence', AVG(mood_confidence)
      )
      FROM ai_curator_messages
      WHERE thread_id IN (
        SELECT id FROM ai_curator_threads WHERE student_id = p_student_id
      )
      AND created_at BETWEEN p_period_start AND p_period_end
    ),
    
    -- Активность
    'activity', (
      SELECT jsonb_build_object(
        'last_login', last_login_at,
        'days_active', EXTRACT(day FROM (NOW() - invited_at))
      )
      FROM student_profiles
      WHERE id = p_student_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- КОММЕНТАРИИ
-- ============================================
COMMENT ON TABLE ai_mentor_sessions IS 'Сессии AI-наставника с учениками';
COMMENT ON TABLE ai_mentor_messages IS 'Сообщения в сессиях AI-наставника';
COMMENT ON TABLE ai_analyst_reports IS 'Отчёты AI-аналитика по платформе и ученикам';
COMMENT ON TABLE ai_mentor_tasks IS 'Задачи для AI-наставника триггеры и запросы';
COMMENT ON FUNCTION create_mentor_task_from_alert IS 'Создать задачу для AI-наставника из алерта AI-куратора';
COMMENT ON FUNCTION get_student_analytics_data IS 'Получить аналитические данные ученика для AI-аналитика';

