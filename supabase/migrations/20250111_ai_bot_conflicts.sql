-- ============================================
-- SUPABASE MIGRATION: AI BOT CONFLICTS
-- Отслеживание ошибок и конфликтов AI-куратора
-- ============================================

-- Таблица: Конфликты и ошибки бота
CREATE TABLE IF NOT EXISTS ai_bot_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Ссылки на диалог
  thread_id UUID REFERENCES ai_curator_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES ai_curator_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Тип конфликта
  conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN (
    'INCORRECT_ANSWER',
    'HALLUCINATION',
    'MISUNDERSTOOD_QUESTION',
    'REPETITIVE_ANSWER',
    'INAPPROPRIATE_TONE',
    'TECHNICAL_ERROR',
    'INCOMPLETE_ANSWER'
  )),
  
  -- Серьёзность
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  
  -- Детали конфликта
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  detected_issue TEXT NOT NULL,
  
  -- Контекст
  previous_messages JSONB, -- последние 3-5 сообщений для контекста
  
  -- Метаданные
  response_time_ms INTEGER,
  token_count INTEGER,
  model VARCHAR(50),
  
  -- Статус
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'ignored')),
  
  -- Решение
  resolution_notes TEXT,
  resolution_action VARCHAR(100), -- 'PROMPT_UPDATE', 'CONTEXT_UPDATE', 'CODE_FIX', 'KB_UPDATE'
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  
  -- Таймстампы
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_conflicts_thread ON ai_bot_conflicts(thread_id);
CREATE INDEX idx_conflicts_user ON ai_bot_conflicts(user_id);
CREATE INDEX idx_conflicts_type ON ai_bot_conflicts(conflict_type);
CREATE INDEX idx_conflicts_severity ON ai_bot_conflicts(severity);
CREATE INDEX idx_conflicts_status ON ai_bot_conflicts(status);
CREATE INDEX idx_conflicts_created ON ai_bot_conflicts(created_at DESC);

-- Таблица: Статистика конфликтов (агрегированная)
CREATE TABLE IF NOT EXISTS ai_bot_conflicts_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  
  -- Общая статистика
  total_messages INTEGER DEFAULT 0,
  total_conflicts INTEGER DEFAULT 0,
  conflict_rate DECIMAL(5, 2) DEFAULT 0, -- процент конфликтов
  
  -- По типам
  incorrect_answer_count INTEGER DEFAULT 0,
  hallucination_count INTEGER DEFAULT 0,
  misunderstood_count INTEGER DEFAULT 0,
  repetitive_count INTEGER DEFAULT 0,
  inappropriate_tone_count INTEGER DEFAULT 0,
  technical_error_count INTEGER DEFAULT 0,
  incomplete_answer_count INTEGER DEFAULT 0,
  
  -- По severity
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  
  -- Решённые
  resolved_count INTEGER DEFAULT 0,
  avg_resolution_time_hours DECIMAL(10, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс для быстрого поиска по датам
CREATE INDEX idx_conflicts_stats_date ON ai_bot_conflicts_stats(date DESC);

-- Триггер: Обновление updated_at
CREATE OR REPLACE FUNCTION update_conflicts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conflicts_updated_at
  BEFORE UPDATE ON ai_bot_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_conflicts_updated_at();

-- Функция: Логирование конфликта
CREATE OR REPLACE FUNCTION log_bot_conflict(
  p_thread_id UUID,
  p_message_id UUID,
  p_user_id UUID,
  p_conflict_type VARCHAR,
  p_severity VARCHAR,
  p_user_message TEXT,
  p_ai_response TEXT,
  p_detected_issue TEXT,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_token_count INTEGER DEFAULT NULL,
  p_model VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conflict_id UUID;
BEGIN
  INSERT INTO ai_bot_conflicts (
    thread_id,
    message_id,
    user_id,
    conflict_type,
    severity,
    user_message,
    ai_response,
    detected_issue,
    response_time_ms,
    token_count,
    model,
    status
  ) VALUES (
    p_thread_id,
    p_message_id,
    p_user_id,
    p_conflict_type,
    p_severity,
    p_user_message,
    p_ai_response,
    p_detected_issue,
    p_response_time_ms,
    p_token_count,
    p_model,
    'new'
  ) RETURNING id INTO v_conflict_id;
  
  -- Обновляем дневную статистику
  INSERT INTO ai_bot_conflicts_stats (date, total_conflicts)
  VALUES (CURRENT_DATE, 1)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_conflicts = ai_bot_conflicts_stats.total_conflicts + 1,
    updated_at = NOW();
  
  RETURN v_conflict_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Пометить конфликт как решённый
CREATE OR REPLACE FUNCTION resolve_bot_conflict(
  p_conflict_id UUID,
  p_resolved_by UUID,
  p_resolution_notes TEXT,
  p_resolution_action VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_bot_conflicts
  SET
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = p_resolved_by,
    resolution_notes = p_resolution_notes,
    resolution_action = p_resolution_action,
    updated_at = NOW()
  WHERE id = p_conflict_id;
  
  -- Обновляем статистику
  UPDATE ai_bot_conflicts_stats
  SET
    resolved_count = resolved_count + 1,
    updated_at = NOW()
  WHERE date = CURRENT_DATE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS Политики
ALTER TABLE ai_bot_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_bot_conflicts_stats ENABLE ROW LEVEL SECURITY;

-- Админы видят всё
CREATE POLICY "Admins can view all conflicts"
  ON ai_bot_conflicts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update conflicts"
  ON ai_bot_conflicts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Система может создавать конфликты
CREATE POLICY "System can insert conflicts"
  ON ai_bot_conflicts FOR INSERT
  WITH CHECK (true);

-- Админы видят статистику
CREATE POLICY "Admins can view stats"
  ON ai_bot_conflicts_stats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- ГОТОВО!
-- ============================================
-- Таблицы для отслеживания конфликтов бота созданы
-- Функции для логирования и решения конфликтов готовы
-- RLS политики настроены
-- ============================================

