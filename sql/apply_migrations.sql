-- ================================
-- TRAFFIC DASHBOARD MIGRATIONS
-- Project: pjmvxecykysfrzppdcto (Tripwire DB)
-- Apply via: Supabase Dashboard → SQL Editor
-- ================================

-- MIGRATION 1: traffic_teams
-- =============================
-- Создать таблицу команд
CREATE TABLE IF NOT EXISTS traffic_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  direction TEXT NOT NULL,
  fb_ad_account_id TEXT,
  color TEXT DEFAULT '#00FF88',
  emoji TEXT DEFAULT '📊',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traffic_teams_name ON traffic_teams(name);
CREATE INDEX IF NOT EXISTS idx_traffic_teams_company ON traffic_teams(company);

CREATE OR REPLACE FUNCTION update_traffic_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_traffic_teams_updated_at ON traffic_teams;
CREATE TRIGGER trigger_update_traffic_teams_updated_at
  BEFORE UPDATE ON traffic_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_traffic_teams_updated_at();

INSERT INTO traffic_teams (name, company, direction, color, emoji) VALUES
  ('Kenesary', 'Nutcab', 'nutcab_tripwire', '#00FF88', '👑'),
  ('Arystan', 'Arystan', 'arystan', '#3B82F6', '⚡'),
  ('Muha', 'OnAI', 'onai_zapusk', '#F59E0B', '🚀'),
  ('Traf4', 'ProfTest', 'proftest', '#8B5CF6', '🎯')
ON CONFLICT (name) DO NOTHING;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'traffic_users' AND column_name = 'team_id'
  ) THEN
    ALTER TABLE traffic_users ADD COLUMN team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL;
    CREATE INDEX idx_traffic_users_team_id ON traffic_users(team_id);
  END IF;
END $$;

UPDATE traffic_users u
SET team_id = (
  SELECT t.id 
  FROM traffic_teams t 
  WHERE t.name = u.team_name
  LIMIT 1
)
WHERE team_id IS NULL AND team_name IS NOT NULL;

CREATE OR REPLACE VIEW traffic_teams_with_users AS
SELECT 
  t.*,
  COUNT(u.id) as user_count,
  STRING_AGG(u.email, ', ') as user_emails
FROM traffic_teams t
LEFT JOIN traffic_users u ON u.team_id = t.id
GROUP BY t.id
ORDER BY t.created_at DESC;


-- MIGRATION 2: traffic_user_sessions
-- =============================
CREATE TABLE IF NOT EXISTS traffic_user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  team_name TEXT NOT NULL,
  role TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  ip_country TEXT,
  ip_city TEXT,
  user_agent TEXT NOT NULL,
  device_type TEXT,
  browser_name TEXT,
  browser_version TEXT,
  os_name TEXT,
  os_version TEXT,
  device_fingerprint TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER,
  is_suspicious BOOLEAN DEFAULT FALSE,
  suspicious_reason TEXT,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES traffic_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON traffic_user_sessions(user_id);
CREATE INDEX idx_sessions_email ON traffic_user_sessions(email);
CREATE INDEX idx_sessions_ip ON traffic_user_sessions(ip_address);
CREATE INDEX idx_sessions_login_at ON traffic_user_sessions(login_at DESC);
CREATE INDEX idx_sessions_suspicious ON traffic_user_sessions(is_suspicious);

CREATE OR REPLACE VIEW traffic_suspicious_activity AS
SELECT 
  u.email,
  u.team_name,
  COUNT(DISTINCT s.ip_address) as unique_ips,
  COUNT(DISTINCT s.device_fingerprint) as unique_devices,
  COUNT(*) as total_logins,
  MAX(s.login_at) as last_login,
  STRING_AGG(DISTINCT s.ip_address, ', ') as all_ips
FROM traffic_users u
LEFT JOIN traffic_user_sessions s ON u.id = s.user_id
WHERE s.login_at > NOW() - INTERVAL '7 days'
GROUP BY u.email, u.team_name
HAVING COUNT(DISTINCT s.ip_address) > 3
ORDER BY unique_ips DESC;


-- MIGRATION 3: onboarding_progress
-- =============================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step)
);

CREATE INDEX idx_onboarding_user_id ON onboarding_progress(user_id);
CREATE INDEX idx_onboarding_completed ON onboarding_progress(completed);


-- MIGRATION 4: targetologist_settings  
-- =============================
CREATE TABLE IF NOT EXISTS targetologist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES traffic_users(id) ON DELETE CASCADE,
  fb_ad_accounts JSONB DEFAULT '[]'::jsonb,
  fb_access_token TEXT,
  tracked_campaigns JSONB DEFAULT '[]'::jsonb,
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT DEFAULT 'cpc',
  utm_templates JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_targetologist_settings_user_id ON targetologist_settings(user_id);


-- NOTE: all_sales_tracking не включена т.к. это большая миграция (200+ строк)
-- Применить отдельно из: supabase/migrations/20251219_create_all_sales_tracking.sql


-- =============================
-- ПРОВЕРКА РЕЗУЛЬТАТА
-- =============================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('traffic_teams', 'traffic_user_sessions', 'onboarding_progress', 'targetologist_settings', 'all_sales_tracking')
ORDER BY table_name;

-- Проверить команды
SELECT name, company, emoji FROM traffic_teams ORDER BY name;

