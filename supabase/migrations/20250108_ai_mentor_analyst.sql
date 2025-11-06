-- ========================
-- AI-НАСТАВНИК + AI-АНАЛИТИК
-- Создано: 7 ноября 2025
-- Статус: ОТКЛЮЧЕНО (структура готова)
-- ========================

-- ========================
-- AI-НАСТАВНИК: АНАЛИЗ СТУДЕНТА
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Период анализа
  analysis_date DATE NOT NULL,
  analysis_period VARCHAR(50) DEFAULT 'daily', -- daily, weekly, monthly
  
  -- === МЕТРИКИ АКТИВНОСТИ ===
  total_time_online INTEGER DEFAULT 0, -- секунд на платформе за день
  lessons_watched INTEGER DEFAULT 0, -- уроков просмотрено
  lessons_completed INTEGER DEFAULT 0, -- уроков завершено (100%)
  modules_completed INTEGER DEFAULT 0, -- модулей завершено
  
  -- === МЕТРИКИ AI-КУРАТОРА ===
  questions_asked INTEGER DEFAULT 0, -- вопросов задано AI-куратору
  ai_conversations INTEGER DEFAULT 0, -- диалогов с AI
  avg_response_satisfaction DECIMAL, -- удовлетворённость ответами (1-5)
  
  -- === ПРОГРЕСС ===
  progress_percentage DECIMAL DEFAULT 0, -- общий прогресс курса
  progress_change DECIMAL, -- изменение за период (+/-)
  stuck_lessons TEXT[], -- уроки где застрял (>2 дня)
  problem_topics TEXT[], -- проблемные темы
  
  -- === НАСТРОЕНИЕ ===
  overall_mood VARCHAR(50), -- positive, neutral, negative, frustrated, demotivated
  mood_trend VARCHAR(50), -- improving, stable, declining
  mood_score DECIMAL, -- балл настроения (0-10)
  frustration_level INTEGER, -- уровень фрустрации (1-5)
  
  -- Индикаторы настроения
  positive_interactions INTEGER DEFAULT 0,
  neutral_interactions INTEGER DEFAULT 0,
  negative_interactions INTEGER DEFAULT 0,
  frustrated_messages INTEGER DEFAULT 0,
  
  -- === ПРОБЛЕМЫ ===
  detected_problems TEXT[], -- выявленные проблемы
  stuck_duration_days INTEGER, -- сколько дней застрял
  needs_help BOOLEAN DEFAULT false,
  
  -- === ДОСТИЖЕНИЯ ===
  achievements_unlocked INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0, -- дней подряд
  streak_broken BOOLEAN DEFAULT false,
  
  -- === АНАЛИЗ ОТ AI ===
  ai_summary TEXT, -- краткое резюме от AI
  ai_insights TEXT[], -- инсайты от AI
  recommendations TEXT[], -- рекомендации действий
  
  -- === УВЕДОМЛЕНИЯ ===
  notification_sent BOOLEAN DEFAULT false,
  notification_type VARCHAR(50), -- motivation, help, achievement, reminder
  notification_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, analysis_date)
);

CREATE INDEX idx_mentor_analysis_user_id ON ai_mentor_analysis(user_id);
CREATE INDEX idx_mentor_analysis_date ON ai_mentor_analysis(analysis_date DESC);
CREATE INDEX idx_mentor_analysis_mood ON ai_mentor_analysis(overall_mood);
CREATE INDEX idx_mentor_analysis_needs_help ON ai_mentor_analysis(needs_help) WHERE needs_help = true;

-- ========================
-- AI-НАСТАВНИК: УВЕДОМЛЕНИЯ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES ai_mentor_analysis(id) ON DELETE CASCADE,
  
  -- Тип уведомления
  type VARCHAR(50) NOT NULL, 
  -- motivation, reminder, help_offer, achievement, streak, warning
  
  -- Сообщение
  message TEXT NOT NULL,
  message_ru TEXT, -- русский
  message_kk TEXT, -- казахский (опционально)
  
  -- Telegram
  telegram_sent BOOLEAN DEFAULT false,
  telegram_sent_at TIMESTAMPTZ,
  telegram_message_id TEXT,
  
  -- Метаданные
  trigger_reason TEXT, -- почему отправлено
  ai_generated BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- 1-5 (5 = критично)
  
  -- Расписание
  scheduled_for TIMESTAMPTZ, -- когда отправить
  send_immediately BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mentor_notif_user_id ON ai_mentor_notifications(user_id);
CREATE INDEX idx_mentor_notif_type ON ai_mentor_notifications(type);
CREATE INDEX idx_mentor_notif_scheduled ON ai_mentor_notifications(scheduled_for) 
  WHERE telegram_sent = false;

-- ========================
-- AI-НАСТАВНИК: ИСТОРИЯ НАСТРОЕНИЯ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_mood_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Настроение
  mood VARCHAR(50) NOT NULL, -- positive, neutral, negative, frustrated, demotivated
  mood_score DECIMAL NOT NULL, -- 0-10
  confidence DECIMAL DEFAULT 0.7, -- уверенность AI (0-1)
  
  -- Источники данных
  from_curator_chat BOOLEAN DEFAULT false,
  from_lesson_behavior BOOLEAN DEFAULT false,
  from_direct_question BOOLEAN DEFAULT false,
  from_inactivity BOOLEAN DEFAULT false,
  
  -- Индикаторы
  indicators JSONB, 
  
  -- Контекст
  related_lesson_id TEXT,
  related_topic TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_tracking_user_id ON ai_mentor_mood_tracking(user_id);
CREATE INDEX idx_mood_tracking_created ON ai_mentor_mood_tracking(created_at DESC);
CREATE INDEX idx_mood_tracking_mood ON ai_mentor_mood_tracking(mood);

-- ========================
-- AI-НАСТАВНИК: РЕКОМЕНДАЦИИ
-- ========================
CREATE TABLE IF NOT EXISTS ai_mentor_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES ai_mentor_analysis(id) ON DELETE CASCADE,
  
  -- Рекомендация
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- motivation, learning, technical, social
  
  -- Приоритет
  priority INTEGER DEFAULT 1, -- 1-5
  is_urgent BOOLEAN DEFAULT false,
  
  -- Действия
  suggested_actions TEXT[], -- что сделать
  resources_links TEXT[], -- полезные ссылки
  
  -- Статус
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Эффективность
  was_helpful BOOLEAN,
  user_feedback TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- когда перестаёт быть актуальной
);

CREATE INDEX idx_recommendations_user_id ON ai_mentor_recommendations(user_id);
CREATE INDEX idx_recommendations_priority ON ai_mentor_recommendations(priority DESC);
CREATE INDEX idx_recommendations_urgent ON ai_mentor_recommendations(is_urgent) 
  WHERE is_urgent = true AND is_completed = false;

-- ========================
-- AI-АНАЛИТИК: ОТЧЁТЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип отчёта
  report_type VARCHAR(50) NOT NULL, 
  -- student_summary, class_overview, platform_trends, curator_effectiveness
  
  -- Период
  period VARCHAR(50) NOT NULL, -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Для кого
  user_id UUID REFERENCES auth.users(id), -- если персональный
  
  -- Данные отчёта
  summary TEXT NOT NULL, -- краткое резюме от AI
  key_metrics JSONB NOT NULL,
  
  insights TEXT[], -- инсайты
  recommendations TEXT[], -- рекомендации
  
  -- Визуализация
  charts_data JSONB,
  
  -- Метаданные
  generated_by_ai BOOLEAN DEFAULT true,
  ai_model VARCHAR(50),
  
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_reports_type ON ai_analytics_reports(report_type);
CREATE INDEX idx_analytics_reports_period ON ai_analytics_reports(period, period_start DESC);
CREATE INDEX idx_analytics_reports_user ON ai_analytics_reports(user_id) WHERE user_id IS NOT NULL;

-- ========================
-- AI-АНАЛИТИК: ИНСАЙТЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES ai_analytics_reports(id) ON DELETE CASCADE,
  
  -- Тип инсайта
  insight_type VARCHAR(50) NOT NULL,
  -- trend (тренд), anomaly (аномалия), achievement (успех), problem (проблема)
  
  -- Приоритет
  priority VARCHAR(50) NOT NULL, -- high, medium, low
  severity INTEGER DEFAULT 1, -- 1-5 (5 = критично)
  
  -- Содержание
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_users INTEGER, -- сколько студентов затронуто
  affected_user_ids UUID[], -- конкретные студенты
  
  -- Данные
  metrics JSONB,
  
  -- Действия
  action_required BOOLEAN DEFAULT false,
  action_suggestions TEXT[],
  
  -- Статус
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_type ON ai_analytics_insights(insight_type);
CREATE INDEX idx_insights_priority ON ai_analytics_insights(priority, severity DESC);
CREATE INDEX idx_insights_action ON ai_analytics_insights(action_required) 
  WHERE action_required = true AND is_resolved = false;

-- ========================
-- AI-АНАЛИТИК: ТРЕНДЫ
-- ========================
CREATE TABLE IF NOT EXISTS ai_analytics_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Тип тренда
  trend_type VARCHAR(50) NOT NULL,
  -- mood, activity, progress, questions, completions
  
  -- Данные
  trend_data JSONB NOT NULL,
  
  -- Анализ
  trend_direction VARCHAR(50), -- up, down, stable
  trend_strength DECIMAL, -- 0-1 (насколько сильный тренд)
  
  -- Прогноз
  prediction JSONB,
  
  -- Период
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trends_type ON ai_analytics_trends(trend_type);
CREATE INDEX idx_trends_period ON ai_analytics_trends(period_start DESC);

-- ========================
-- RLS ПОЛИТИКИ
-- ========================

-- ai_mentor_analysis
ALTER TABLE ai_mentor_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analysis"
  ON ai_mentor_analysis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analysis"
  ON ai_mentor_analysis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ai_mentor_notifications
ALTER TABLE ai_mentor_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON ai_mentor_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications"
  ON ai_mentor_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ai_mentor_mood_tracking
ALTER TABLE ai_mentor_mood_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood"
  ON ai_mentor_mood_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- ai_mentor_recommendations
ALTER TABLE ai_mentor_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
  ON ai_mentor_recommendations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own recommendations"
  ON ai_mentor_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Аналитика: только админы
ALTER TABLE ai_analytics_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analytics_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view analytics reports"
  ON ai_analytics_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view insights"
  ON ai_analytics_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view trends"
  ON ai_analytics_trends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ========================
-- ТРИГГЕРЫ
-- ========================

-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_ai_mentor_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_analysis_updated_at
  BEFORE UPDATE ON ai_mentor_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_mentor_analysis_updated_at();

-- ========================
-- КОММЕНТАРИИ
-- ========================
COMMENT ON TABLE ai_mentor_analysis IS 'Ежедневный анализ студентов от AI-наставника (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_mentor_notifications IS 'Уведомления студентам в Telegram (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_mentor_mood_tracking IS 'История настроения студентов';
COMMENT ON TABLE ai_mentor_recommendations IS 'Рекомендации от AI-наставника';
COMMENT ON TABLE ai_analytics_reports IS 'Отчёты AI-аналитика для админов (ОТКЛЮЧЕНО)';
COMMENT ON TABLE ai_analytics_insights IS 'Инсайты и аномалии';
COMMENT ON TABLE ai_analytics_trends IS 'Тренды платформы';

