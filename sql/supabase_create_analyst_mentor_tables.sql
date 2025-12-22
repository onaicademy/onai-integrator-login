-- =====================================================
-- CREATE TABLES FOR AI-ANALYST & AI-MENTOR
-- =====================================================

-- ============================================
-- AI-ANALYST TABLES (отчёты администратору)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analyst_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  openai_thread_id TEXT UNIQUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyst_threads_user_id ON public.ai_analyst_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyst_threads_is_archived ON public.ai_analyst_threads(is_archived);

COMMENT ON TABLE public.ai_analyst_threads IS 'AI-Analyst threads - отчёты администратору';

-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analyst_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_analyst_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- OpenAI metadata
  openai_message_id TEXT,
  openai_run_id TEXT,
  
  -- Analytics metadata
  response_time_ms INTEGER,
  token_count INTEGER,
  model_used TEXT,
  
  -- Report metadata
  report_type TEXT, -- 'daily', 'weekly', 'monthly', 'on-demand'
  students_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyst_messages_thread_id ON public.ai_analyst_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyst_messages_user_id ON public.ai_analyst_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_analyst_messages_created_at ON public.ai_analyst_messages(created_at DESC);

COMMENT ON TABLE public.ai_analyst_messages IS 'AI-Analyst messages - отчёты и аналитика';

-- ============================================
-- AI-MENTOR TABLES (мотивационные сообщения студентам)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_mentor_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  openai_thread_id TEXT UNIQUE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_threads_user_id ON public.ai_mentor_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_mentor_threads_is_archived ON public.ai_mentor_threads(is_archived);

COMMENT ON TABLE public.ai_mentor_threads IS 'AI-Mentor threads - мотивационные сообщения студентам';

-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_mentor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.ai_mentor_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- OpenAI metadata
  openai_message_id TEXT,
  openai_run_id TEXT,
  
  -- Message metadata
  response_time_ms INTEGER,
  token_count INTEGER,
  model_used TEXT,
  
  -- Mentor-specific metadata
  message_type TEXT, -- 'motivation', 'reminder', 'congratulation', 'nudge'
  triggered_by TEXT, -- 'inactive', 'achievement', 'stuck_on_lesson', 'scheduled'
  
  -- Telegram metadata
  telegram_message_id INTEGER,
  sent_via_telegram BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mentor_messages_thread_id ON public.ai_mentor_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_ai_mentor_messages_user_id ON public.ai_mentor_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_mentor_messages_created_at ON public.ai_mentor_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_mentor_messages_message_type ON public.ai_mentor_messages(message_type);

COMMENT ON TABLE public.ai_mentor_messages IS 'AI-Mentor messages - мотивационные сообщения через Telegram';

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- AI-ANALYST THREADS
ALTER TABLE public.ai_analyst_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analyst threads"
ON public.ai_analyst_threads FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create analyst threads"
ON public.ai_analyst_threads FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- AI-ANALYST MESSAGES
ALTER TABLE public.ai_analyst_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analyst messages"
ON public.ai_analyst_messages FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Authenticated users can create analyst messages"
ON public.ai_analyst_messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- AI-MENTOR THREADS
ALTER TABLE public.ai_mentor_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their mentor threads"
ON public.ai_mentor_threads FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their mentor threads"
ON public.ai_mentor_threads FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- AI-MENTOR MESSAGES
ALTER TABLE public.ai_mentor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their mentor messages"
ON public.ai_mentor_messages FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their mentor messages"
ON public.ai_mentor_messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'AI-Analyst and AI-Mentor tables created successfully!' AS result;

