-- =====================================================
-- ПРОВЕРКА АНАЛИТИКИ AI ТОКЕНОВ
-- =====================================================

-- 1. Проверка структуры таблицы ai_token_usage
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_token_usage'
ORDER BY ordinal_position;

-- 2. Проверка есть ли записи о затратах
SELECT 
  agent_type,
  model,
  operation_type,
  COUNT(*) as total_requests,
  SUM(total_tokens) as total_tokens_used,
  SUM(cost_kzt) as total_cost_kzt,
  SUM(audio_duration_seconds) as total_audio_seconds
FROM ai_token_usage
GROUP BY agent_type, model, operation_type
ORDER BY agent_type, model;

-- 3. Проверка последних 10 записей
SELECT 
  created_at,
  agent_type,
  model,
  operation_type,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  audio_duration_seconds,
  cost_kzt,
  user_id
FROM ai_token_usage
ORDER BY created_at DESC
LIMIT 10;

-- 4. Проверка суммарных затрат по агентам
SELECT 
  agent_type,
  COUNT(*) as requests_count,
  SUM(total_tokens) as total_tokens,
  ROUND(SUM(cost_kzt)::numeric, 2) as total_cost_kzt,
  ROUND(AVG(cost_kzt)::numeric, 4) as avg_cost_per_request_kzt
FROM ai_token_usage
GROUP BY agent_type
ORDER BY total_cost_kzt DESC;

-- 5. Проверка затрат по дням (последние 7 дней)
SELECT 
  date,
  agent_type,
  COUNT(*) as requests,
  SUM(total_tokens) as tokens,
  ROUND(SUM(cost_kzt)::numeric, 2) as cost_kzt
FROM ai_token_usage
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date, agent_type
ORDER BY date DESC, agent_type;

-- 6. Проверка Whisper затрат отдельно
SELECT 
  COUNT(*) as whisper_requests,
  SUM(audio_duration_seconds) as total_seconds,
  ROUND(SUM(audio_duration_seconds) / 60.0::numeric, 2) as total_minutes,
  ROUND(SUM(cost_kzt)::numeric, 2) as total_cost_kzt
FROM ai_token_usage
WHERE model = 'whisper-1' OR operation_type = 'voice_transcription';

-- 7. Проверка есть ли таблица ai_token_usage_daily (агрегированная статистика)
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'ai_token_usage_daily'
) as daily_stats_table_exists;

