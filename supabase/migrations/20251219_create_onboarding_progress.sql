-- 🎓 ONBOARDING PROGRESS TRACKING
-- Отслеживание прогресса обучения пользователей

-- Таблица прогресса обучения
CREATE TABLE IF NOT EXISTS traffic_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Статус обучения
  is_completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  
  -- Временные метки
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_step_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Счетчики
  view_count INTEGER DEFAULT 1,
  skip_count INTEGER DEFAULT 0,
  
  -- Тип тура
  tour_type TEXT CHECK (tour_type IN ('targetologist', 'admin')),
  
  -- Метаданные (для дополнительной информации)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность по пользователю
  UNIQUE(user_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_onboarding_user_id ON traffic_onboarding_progress(user_id);
CREATE INDEX idx_onboarding_completed ON traffic_onboarding_progress(is_completed);
CREATE INDEX idx_onboarding_tour_type ON traffic_onboarding_progress(tour_type);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления
DROP TRIGGER IF EXISTS trigger_update_onboarding_updated_at ON traffic_onboarding_progress;
CREATE TRIGGER trigger_update_onboarding_updated_at
  BEFORE UPDATE ON traffic_onboarding_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

-- View для статистики обучения
CREATE OR REPLACE VIEW onboarding_stats AS
SELECT 
  tour_type,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE is_completed = true) as completed_users,
  COUNT(*) FILTER (WHERE is_completed = false) as in_progress_users,
  AVG(CASE WHEN is_completed THEN EXTRACT(EPOCH FROM (completed_at - started_at)) END) as avg_completion_time_seconds,
  AVG(view_count) as avg_views,
  SUM(skip_count) as total_skips
FROM traffic_onboarding_progress
GROUP BY tour_type;

-- Комментарии
COMMENT ON TABLE traffic_onboarding_progress IS 'Прогресс прохождения обучения пользователями';
COMMENT ON COLUMN traffic_onboarding_progress.user_id IS 'ID пользователя из traffic_users';
COMMENT ON COLUMN traffic_onboarding_progress.is_completed IS 'Завершено ли обучение';
COMMENT ON COLUMN traffic_onboarding_progress.tour_type IS 'Тип тура: targetologist или admin';
COMMENT ON COLUMN traffic_onboarding_progress.view_count IS 'Сколько раз пользователь смотрел обучение';
COMMENT ON COLUMN traffic_onboarding_progress.skip_count IS 'Сколько раз пропускал';
