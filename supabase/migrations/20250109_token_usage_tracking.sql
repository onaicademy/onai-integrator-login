-- ========================
-- ОТСЛЕЖИВАНИЕ ТОКЕНОВ И ЗАТРАТ
-- Создано: 7 ноября 2025
-- ========================

-- ========================
-- ТАБЛИЦА: Использование токенов по API
-- ========================
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Какой агент
  agent_type VARCHAR(50) NOT NULL,
  -- 'ai_curator', 'ai_mentor', 'ai_analyst'
  
  -- Модель OpenAI
  model VARCHAR(50) NOT NULL,
  -- 'gpt-4o', 'gpt-3.5-turbo', 'whisper-1'
  
  -- Тип операции
  operation_type VARCHAR(50) NOT NULL,
  -- 'text_message', 'voice_transcription', 'image_analysis', 
  -- 'daily_analysis', 'weekly_report', 'monthly_report'
  
  -- Токены
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  
  -- Специальные метрики для аудио
  audio_duration_seconds INTEGER, -- Для Whisper
  
  -- Стоимость (USD)
  cost_usd DECIMAL(10, 6) NOT NULL,
  cost_kzt DECIMAL(10, 2), -- В тенге (автоматически)
  
  -- Контекст
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  thread_id UUID, -- ID диалога/сессии
  request_id TEXT, -- Уникальный ID запроса для дебага
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE DEFAULT CURRENT_DATE -- Для группировки по дням
);

-- Индексы для быстрого поиска
CREATE INDEX idx_token_usage_agent ON ai_token_usage(agent_type);
CREATE INDEX idx_token_usage_model ON ai_token_usage(model);
CREATE INDEX idx_token_usage_date ON ai_token_usage(date DESC);
CREATE INDEX idx_token_usage_user ON ai_token_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_token_usage_created ON ai_token_usage(created_at DESC);

-- ========================
-- ТАБЛИЦА: Дневная агрегация (для быстрого доступа)
-- ========================
CREATE TABLE IF NOT EXISTS ai_token_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  
  -- По агентам
  curator_tokens INTEGER DEFAULT 0,
  curator_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  mentor_tokens INTEGER DEFAULT 0,
  mentor_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  analyst_tokens INTEGER DEFAULT 0,
  analyst_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- По моделям
  gpt4o_tokens INTEGER DEFAULT 0,
  gpt4o_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  gpt35_tokens INTEGER DEFAULT 0,
  gpt35_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  whisper_minutes DECIMAL(10, 2) DEFAULT 0,
  whisper_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  
  -- Общие
  total_tokens INTEGER DEFAULT 0,
  total_cost_kzt DECIMAL(10, 2) DEFAULT 0,
  total_cost_usd DECIMAL(10, 2) DEFAULT 0,
  
  -- Метаданные
  request_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(date)
);

CREATE INDEX idx_daily_usage_date ON ai_token_usage_daily(date DESC);

-- ========================
-- ТАБЛИЦА: Лимиты и бюджет
-- ========================
CREATE TABLE IF NOT EXISTS ai_budget_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Лимиты
  daily_limit_kzt DECIMAL(10, 2) DEFAULT 5000,   -- 5000 KZT в день
  monthly_limit_kzt DECIMAL(10, 2) DEFAULT 100000, -- 100,000 KZT в месяц
  
  -- Алерты
  alert_threshold_percentage INTEGER DEFAULT 80, -- При 80% лимита
  alert_enabled BOOLEAN DEFAULT true,
  
  -- Email/Telegram для алертов
  alert_contacts JSONB,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем дефолтные лимиты
INSERT INTO ai_budget_limits (id) 
VALUES (uuid_generate_v4())
ON CONFLICT DO NOTHING;

-- ========================
-- ФУНКЦИИ
-- ========================

-- Функция: Логирование использования токенов
CREATE OR REPLACE FUNCTION log_token_usage(
  p_agent_type VARCHAR,
  p_model VARCHAR,
  p_operation_type VARCHAR,
  p_prompt_tokens INTEGER,
  p_completion_tokens INTEGER,
  p_audio_duration_seconds INTEGER DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_total_tokens INTEGER;
  v_cost_usd DECIMAL(10, 6);
  v_cost_kzt DECIMAL(10, 2);
  v_usage_id UUID;
  v_exchange_rate DECIMAL(6, 2) := 450.0; -- 1 USD = 450 KZT
BEGIN
  -- Вычисляем общие токены
  v_total_tokens := p_prompt_tokens + p_completion_tokens;
  
  -- Вычисляем стоимость в зависимости от модели
  IF p_model = 'gpt-4o' THEN
    -- GPT-4o: $2.50 input, $10.00 output per 1M tokens
    v_cost_usd := 
      (p_prompt_tokens * 0.0000025) + 
      (p_completion_tokens * 0.000010);
  
  ELSIF p_model = 'gpt-3.5-turbo' THEN
    -- GPT-3.5-turbo: $0.50 input, $1.50 output per 1M tokens
    v_cost_usd := 
      (p_prompt_tokens * 0.0000005) + 
      (p_completion_tokens * 0.0000015);
  
  ELSIF p_model = 'whisper-1' THEN
    -- Whisper: $0.006 per minute
    v_cost_usd := (p_audio_duration_seconds / 60.0) * 0.006;
    v_total_tokens := 0; -- Whisper не использует токены
  
  ELSE
    v_cost_usd := 0;
  END IF;
  
  -- Конвертируем в KZT
  v_cost_kzt := v_cost_usd * v_exchange_rate;
  
  -- Вставляем запись
  INSERT INTO ai_token_usage (
    agent_type,
    model,
    operation_type,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    audio_duration_seconds,
    cost_usd,
    cost_kzt,
    user_id,
    thread_id,
    request_id,
    date
  ) VALUES (
    p_agent_type,
    p_model,
    p_operation_type,
    p_prompt_tokens,
    p_completion_tokens,
    v_total_tokens,
    p_audio_duration_seconds,
    v_cost_usd,
    v_cost_kzt,
    p_user_id,
    p_thread_id,
    p_request_id,
    CURRENT_DATE
  ) RETURNING id INTO v_usage_id;
  
  -- Обновляем дневную агрегацию
  PERFORM update_daily_aggregation(CURRENT_DATE);
  
  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;

-- Функция: Обновление дневной агрегации
CREATE OR REPLACE FUNCTION update_daily_aggregation(p_date DATE)
RETURNS VOID AS $$
DECLARE
  v_curator_tokens INTEGER;
  v_curator_cost DECIMAL(10, 2);
  v_mentor_tokens INTEGER;
  v_mentor_cost DECIMAL(10, 2);
  v_analyst_tokens INTEGER;
  v_analyst_cost DECIMAL(10, 2);
  v_gpt4o_tokens INTEGER;
  v_gpt4o_cost DECIMAL(10, 2);
  v_gpt35_tokens INTEGER;
  v_gpt35_cost DECIMAL(10, 2);
  v_whisper_minutes DECIMAL(10, 2);
  v_whisper_cost DECIMAL(10, 2);
  v_total_tokens INTEGER;
  v_total_cost DECIMAL(10, 2);
  v_total_cost_usd DECIMAL(10, 2);
  v_request_count INTEGER;
  v_unique_users INTEGER;
BEGIN
  -- Агрегируем данные за день
  
  -- По агентам
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_curator_tokens, v_curator_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_curator';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_mentor_tokens, v_mentor_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_mentor';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_analyst_tokens, v_analyst_cost
  FROM ai_token_usage
  WHERE date = p_date AND agent_type = 'ai_analyst';
  
  -- По моделям
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_gpt4o_tokens, v_gpt4o_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'gpt-4o';
  
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_gpt35_tokens, v_gpt35_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'gpt-3.5-turbo';
  
  SELECT 
    COALESCE(SUM(audio_duration_seconds) / 60.0, 0),
    COALESCE(SUM(cost_kzt), 0)
  INTO v_whisper_minutes, v_whisper_cost
  FROM ai_token_usage
  WHERE date = p_date AND model = 'whisper-1';
  
  -- Общие метрики
  SELECT 
    COALESCE(SUM(total_tokens), 0),
    COALESCE(SUM(cost_kzt), 0),
    COALESCE(SUM(cost_usd), 0),
    COUNT(*),
    COUNT(DISTINCT user_id)
  INTO 
    v_total_tokens,
    v_total_cost,
    v_total_cost_usd,
    v_request_count,
    v_unique_users
  FROM ai_token_usage
  WHERE date = p_date;
  
  -- Вставляем или обновляем дневную запись
  INSERT INTO ai_token_usage_daily (
    date,
    curator_tokens,
    curator_cost_kzt,
    mentor_tokens,
    mentor_cost_kzt,
    analyst_tokens,
    analyst_cost_kzt,
    gpt4o_tokens,
    gpt4o_cost_kzt,
    gpt35_tokens,
    gpt35_cost_kzt,
    whisper_minutes,
    whisper_cost_kzt,
    total_tokens,
    total_cost_kzt,
    total_cost_usd,
    request_count,
    unique_users
  ) VALUES (
    p_date,
    v_curator_tokens,
    v_curator_cost,
    v_mentor_tokens,
    v_mentor_cost,
    v_analyst_tokens,
    v_analyst_cost,
    v_gpt4o_tokens,
    v_gpt4o_cost,
    v_gpt35_tokens,
    v_gpt35_cost,
    v_whisper_minutes,
    v_whisper_cost,
    v_total_tokens,
    v_total_cost,
    v_total_cost_usd,
    v_request_count,
    v_unique_users
  )
  ON CONFLICT (date) DO UPDATE SET
    curator_tokens = EXCLUDED.curator_tokens,
    curator_cost_kzt = EXCLUDED.curator_cost_kzt,
    mentor_tokens = EXCLUDED.mentor_tokens,
    mentor_cost_kzt = EXCLUDED.mentor_cost_kzt,
    analyst_tokens = EXCLUDED.analyst_tokens,
    analyst_cost_kzt = EXCLUDED.analyst_cost_kzt,
    gpt4o_tokens = EXCLUDED.gpt4o_tokens,
    gpt4o_cost_kzt = EXCLUDED.gpt4o_cost_kzt,
    gpt35_tokens = EXCLUDED.gpt35_tokens,
    gpt35_cost_kzt = EXCLUDED.gpt35_cost_kzt,
    whisper_minutes = EXCLUDED.whisper_minutes,
    whisper_cost_kzt = EXCLUDED.whisper_cost_kzt,
    total_tokens = EXCLUDED.total_tokens,
    total_cost_kzt = EXCLUDED.total_cost_kzt,
    total_cost_usd = EXCLUDED.total_cost_usd,
    request_count = EXCLUDED.request_count,
    unique_users = EXCLUDED.unique_users,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Функция: Проверка лимитов и алерты
CREATE OR REPLACE FUNCTION check_budget_limits()
RETURNS TABLE (
  limit_exceeded BOOLEAN,
  current_daily_kzt DECIMAL,
  current_monthly_kzt DECIMAL,
  daily_limit_kzt DECIMAL,
  monthly_limit_kzt DECIMAL,
  alert_message TEXT
) AS $$
DECLARE
  v_limits ai_budget_limits;
  v_daily_spent DECIMAL(10, 2);
  v_monthly_spent DECIMAL(10, 2);
  v_daily_limit DECIMAL(10, 2);
  v_monthly_limit DECIMAL(10, 2);
  v_alert_threshold INTEGER;
BEGIN
  -- Получаем лимиты
  SELECT * INTO v_limits FROM ai_budget_limits LIMIT 1;
  
  v_daily_limit := v_limits.daily_limit_kzt;
  v_monthly_limit := v_limits.monthly_limit_kzt;
  v_alert_threshold := v_limits.alert_threshold_percentage;
  
  -- Текущие затраты за сегодня
  SELECT COALESCE(total_cost_kzt, 0) INTO v_daily_spent
  FROM ai_token_usage_daily
  WHERE date = CURRENT_DATE;
  
  -- Текущие затраты за месяц
  SELECT COALESCE(SUM(total_cost_kzt), 0) INTO v_monthly_spent
  FROM ai_token_usage_daily
  WHERE date >= DATE_TRUNC('month', CURRENT_DATE);
  
  -- Формируем результат
  RETURN QUERY SELECT
    (v_daily_spent >= v_daily_limit OR v_monthly_spent >= v_monthly_limit) AS limit_exceeded,
    v_daily_spent AS current_daily_kzt,
    v_monthly_spent AS current_monthly_kzt,
    v_daily_limit AS daily_limit_kzt,
    v_monthly_limit AS monthly_limit_kzt,
    CASE
      WHEN v_daily_spent >= v_daily_limit THEN 
        '⚠️ Дневной лимит превышен!'
      WHEN v_monthly_spent >= v_monthly_limit THEN 
        '⚠️ Месячный лимит превышен!'
      WHEN (v_daily_spent / v_daily_limit * 100) >= v_alert_threshold THEN
        format('⚠️ Израсходовано %s%% дневного лимита', ROUND(v_daily_spent / v_daily_limit * 100))
      WHEN (v_monthly_spent / v_monthly_limit * 100) >= v_alert_threshold THEN
        format('⚠️ Израсходовано %s%% месячного лимита', ROUND(v_monthly_spent / v_monthly_limit * 100))
      ELSE
        '✅ В пределах лимитов'
    END AS alert_message;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- RLS POLICIES
-- ========================

-- Только админы видят использование токенов
ALTER TABLE ai_token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_token_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_budget_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view token usage"
  ON ai_token_usage FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view daily usage"
  ON ai_token_usage_daily FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Only admins can view budget limits"
  ON ai_budget_limits FOR ALL
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
CREATE OR REPLACE FUNCTION update_token_usage_daily_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_usage_updated_at
  BEFORE UPDATE ON ai_token_usage_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_token_usage_daily_updated_at();

-- ========================
-- КОММЕНТАРИИ
-- ========================
COMMENT ON TABLE ai_token_usage IS 'Детальное логирование использования токенов OpenAI по каждому запросу';
COMMENT ON TABLE ai_token_usage_daily IS 'Дневная агрегация токенов для быстрого доступа и графиков';
COMMENT ON TABLE ai_budget_limits IS 'Лимиты и бюджет на AI агенты';
COMMENT ON FUNCTION log_token_usage IS 'Логирование использования токенов с автоматическим расчётом стоимости';
COMMENT ON FUNCTION update_daily_aggregation IS 'Обновление дневной агрегации';
COMMENT ON FUNCTION check_budget_limits IS 'Проверка лимитов и генерация алертов';

