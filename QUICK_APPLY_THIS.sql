-- ============================================
-- 📱 TELEGRAM GROUPS TABLE
-- Хранит активные группы для отправки уведомлений
-- ============================================

CREATE TABLE IF NOT EXISTS public.telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  chat_title TEXT,
  group_type TEXT NOT NULL DEFAULT 'leads', -- 'leads', 'admin', 'notifications'
  is_active BOOLEAN DEFAULT true,
  activated_by TEXT, -- Telegram username кто активировал
  activated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_telegram_groups_chat_id ON public.telegram_groups(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_groups_type_active ON public.telegram_groups(group_type, is_active) WHERE is_active = true;

-- Комментарии
COMMENT ON TABLE public.telegram_groups IS 'Хранит активные Telegram группы для уведомлений';
COMMENT ON COLUMN public.telegram_groups.group_type IS 'Тип группы: leads (лиды), admin (админ), notifications (уведомления)';
COMMENT ON COLUMN public.telegram_groups.is_active IS 'Активна ли группа для отправки сообщений';

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_telegram_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS trigger_telegram_groups_updated_at ON public.telegram_groups;
CREATE TRIGGER trigger_telegram_groups_updated_at
  BEFORE UPDATE ON public.telegram_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_groups_updated_at();

-- RLS политики (отключены для service role)
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;

-- Service role имеет полный доступ
CREATE POLICY "Service role has full access to telegram_groups"
  ON public.telegram_groups
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.telegram_groups TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- Первоначальная запись (если нужна)
-- INSERT INTO public.telegram_groups (chat_id, chat_title, group_type, is_active)
-- VALUES ('-1001234567890', 'Тестовая группа', 'leads', false)
-- ON CONFLICT (chat_id) DO NOTHING;

