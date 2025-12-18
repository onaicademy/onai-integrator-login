-- 🎯 TRAFFIC TARGETOLOGIST SETTINGS
-- Настройки таргетологов: FB кабинеты, кампании, UTM метки

-- Таблица настроек таргетолога
CREATE TABLE IF NOT EXISTS traffic_targetologist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  
  -- Facebook настройки
  fb_ad_accounts JSONB DEFAULT '[]'::jsonb, -- [{ id: "123", name: "Account 1", enabled: true }]
  fb_access_token TEXT, -- Персональный токен таргетолога (опционально)
  
  -- Отслеживаемые кампании
  tracked_campaigns JSONB DEFAULT '[]'::jsonb, -- [{ id: "456", name: "Campaign 1", ad_account_id: "123", enabled: true }]
  
  -- UTM настройки
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT DEFAULT 'cpc',
  utm_templates JSONB DEFAULT '{}'::jsonb, -- { "campaign": "{campaign_name}", "content": "{ad_name}" }
  
  -- Настройки отчетности
  notification_email TEXT,
  notification_telegram BIGINT,
  report_frequency TEXT DEFAULT 'daily' CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Уникальность по пользователю
  UNIQUE(user_id)
);

-- Индексы
CREATE INDEX idx_targetologist_settings_user_id ON traffic_targetologist_settings(user_id);

-- Функция для автообновления updated_at
CREATE OR REPLACE FUNCTION update_targetologist_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер
DROP TRIGGER IF EXISTS trigger_update_targetologist_settings_updated_at ON traffic_targetologist_settings;
CREATE TRIGGER trigger_update_targetologist_settings_updated_at
  BEFORE UPDATE ON traffic_targetologist_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_targetologist_settings_updated_at();

-- View для удобного просмотра настроек с информацией о юзере
CREATE OR REPLACE VIEW traffic_targetologist_settings_view AS
SELECT
  s.*,
  u.email,
  u.full_name,
  u.team_name,
  jsonb_array_length(s.fb_ad_accounts) as ad_accounts_count,
  jsonb_array_length(s.tracked_campaigns) as campaigns_count
FROM traffic_targetologist_settings s
JOIN traffic_users u ON u.id = s.user_id
ORDER BY s.updated_at DESC;

-- Комментарии
COMMENT ON TABLE traffic_targetologist_settings IS 'Настройки таргетологов: FB кабинеты, кампании, UTM';
COMMENT ON COLUMN traffic_targetologist_settings.user_id IS 'ID таргетолога из traffic_users';
COMMENT ON COLUMN traffic_targetologist_settings.fb_ad_accounts IS 'Массив подключенных FB рекламных кабинетов';
COMMENT ON COLUMN traffic_targetologist_settings.tracked_campaigns IS 'Массив отслеживаемых кампаний';
COMMENT ON COLUMN traffic_targetologist_settings.utm_templates IS 'Шаблоны UTM меток с динамическими переменными';
COMMENT ON COLUMN traffic_targetologist_settings.fb_access_token IS 'Персональный FB токен (если есть)';
