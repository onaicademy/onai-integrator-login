-- =====================================================
-- CREATE ai_token_usage TABLE FOR TOKEN TRACKING
-- =====================================================

-- Сначала удаляем старую таблицу (если есть)
DROP TABLE IF EXISTS public.ai_token_usage CASCADE;

-- Создаём заново с правильной структурой
CREATE TABLE public.ai_token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and assistant info
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assistant_type TEXT NOT NULL CHECK (assistant_type IN ('curator', 'analyst', 'mentor')),
  
  -- OpenAI metadata
  openai_thread_id TEXT,
  openai_message_id TEXT,
  openai_run_id TEXT,
  model TEXT NOT NULL, -- 'gpt-4o', 'gpt-4o-mini', 'whisper-1', etc.
  
  -- Token usage (REAL DATA from OpenAI API)
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER,
  total_tokens INTEGER NOT NULL,
  
  -- Cost calculation (based on OpenAI pricing)
  prompt_cost_usd DECIMAL(10, 6),
  completion_cost_usd DECIMAL(10, 6),
  total_cost_usd DECIMAL(10, 6),
  
  -- Request metadata
  request_type TEXT, -- 'chat', 'transcription', 'tts', etc.
  audio_duration_seconds INTEGER, -- For Whisper API
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user_id ON public.ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_assistant_type ON public.ai_token_usage(assistant_type);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON public.ai_token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_model ON public.ai_token_usage(model);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.ai_token_usage ENABLE ROW LEVEL SECURITY;

-- Админы видят ВСЁ
CREATE POLICY "Admins can view all token usage"
ON public.ai_token_usage FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Пользователи видят ТОЛЬКО свои данные
CREATE POLICY "Users can view their own token usage"
ON public.ai_token_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT только через Backend (service_role)
-- Frontend НЕ может напрямую писать!

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.ai_token_usage IS 'Real-time token usage tracking for all AI assistants with cost calculation';
COMMENT ON COLUMN public.ai_token_usage.prompt_tokens IS 'Input tokens from OpenAI API response';
COMMENT ON COLUMN public.ai_token_usage.completion_tokens IS 'Output tokens from OpenAI API response';
COMMENT ON COLUMN public.ai_token_usage.total_tokens IS 'Total tokens = prompt + completion';
COMMENT ON COLUMN public.ai_token_usage.total_cost_usd IS 'Calculated cost in USD based on OpenAI pricing';

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'ai_token_usage table created successfully!' AS result;

