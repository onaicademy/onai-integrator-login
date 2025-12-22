-- Быстрое создание таблицы telegram_groups
CREATE TABLE IF NOT EXISTS public.telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  chat_title TEXT,
  group_type TEXT NOT NULL DEFAULT 'leads',
  is_active BOOLEAN DEFAULT true,
  activated_by TEXT,
  activated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_groups_chat_id ON public.telegram_groups(chat_id);

ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role has full access to telegram_groups"
  ON public.telegram_groups FOR ALL TO service_role
  USING (true) WITH CHECK (true);

GRANT ALL ON public.telegram_groups TO service_role;
