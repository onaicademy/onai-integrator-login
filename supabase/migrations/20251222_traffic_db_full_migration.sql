-- =====================================================
-- TRAFFIC DASHBOARD FULL MIGRATION
-- From: Tripwire DB → To: Traffic DB
-- Date: 2025-12-22
-- Description: Complete migration of all Traffic Dashboard tables
-- =====================================================

-- 1. DROP existing tables (clean slate)
DROP TABLE IF EXISTS traffic_onboarding_step_tracking CASCADE;
DROP TABLE IF EXISTS traffic_user_sessions CASCADE;
DROP TABLE IF EXISTS traffic_onboarding_progress CASCADE;
DROP TABLE IF EXISTS traffic_targetologist_settings CASCADE;
DROP TABLE IF EXISTS traffic_weekly_plans CASCADE;
DROP TABLE IF EXISTS traffic_admin_settings CASCADE;
DROP TABLE IF EXISTS traffic_users CASCADE;
DROP TABLE IF EXISTS traffic_teams CASCADE;
DROP TABLE IF EXISTS sales_notifications CASCADE;
DROP TABLE IF EXISTS all_sales_tracking CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;

-- 2. CREATE traffic_teams table
CREATE TABLE traffic_teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  direction TEXT NOT NULL,
  fb_ad_account_id TEXT,
  color TEXT DEFAULT '#00FF88',
  emoji TEXT DEFAULT '📊',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE traffic_teams IS 'Команды траффиков (таргетологов)';

-- 3. CREATE traffic_users table
CREATE TABLE traffic_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  team_name TEXT NOT NULL CHECK (team_name IN ('Kenesary', 'Arystan', 'Traf4', 'Muha')),
  role TEXT NOT NULL DEFAULT 'targetologist' CHECK (role IN ('targetologist', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  team_id UUID REFERENCES traffic_teams(id)
);

-- 4. CREATE traffic_weekly_plans
CREATE TABLE traffic_weekly_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_name TEXT NOT NULL CHECK (team_name IN ('Kenesary', 'Arystan', 'Traf4', 'Muha')),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  prev_week_revenue NUMERIC DEFAULT 0,
  prev_week_sales INTEGER DEFAULT 0,
  prev_week_spend NUMERIC DEFAULT 0,
  prev_week_roas NUMERIC DEFAULT 0,
  prev_week_cpa NUMERIC DEFAULT 0,
  plan_revenue NUMERIC NOT NULL,
  plan_sales INTEGER NOT NULL,
  plan_spend NUMERIC NOT NULL,
  plan_roas NUMERIC NOT NULL,
  plan_cpa NUMERIC NOT NULL,
  actual_revenue NUMERIC DEFAULT 0,
  actual_sales INTEGER DEFAULT 0,
  actual_spend NUMERIC DEFAULT 0,
  actual_roas NUMERIC DEFAULT 0,
  actual_cpa NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  completion_percentage NUMERIC DEFAULT 0,
  ai_generated_plan TEXT,
  ai_recommendations TEXT,
  growth_percentage NUMERIC DEFAULT 10.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CREATE traffic_admin_settings
CREATE TABLE traffic_admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. CREATE traffic_targetologist_settings
CREATE TABLE traffic_targetologist_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES traffic_users(id),
  fb_ad_accounts JSONB DEFAULT '[]',
  fb_access_token TEXT,
  tracked_campaigns JSONB DEFAULT '[]',
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT DEFAULT 'cpc',
  utm_templates JSONB DEFAULT '{}',
  notification_email TEXT,
  notification_telegram BIGINT,
  report_frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. CREATE traffic_user_sessions
CREATE TABLE traffic_user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES traffic_users(id),
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
  login_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  logout_at TIMESTAMP WITH TIME ZONE,
  session_duration_seconds INTEGER,
  is_suspicious BOOLEAN DEFAULT false,
  suspicious_reason TEXT
);

COMMENT ON TABLE traffic_user_sessions IS 'История всех входов в систему Traffic Dashboard';

-- 8. CREATE traffic_onboarding_progress
CREATE TABLE traffic_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_step_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  view_count INTEGER DEFAULT 1,
  skip_count INTEGER DEFAULT 0,
  tour_type TEXT CHECK (tour_type IN ('targetologist', 'admin')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  device_type TEXT,
  browser TEXT,
  settings_tour_completed BOOLEAN DEFAULT false,
  main_tour_completed BOOLEAN DEFAULT false
);

COMMENT ON TABLE traffic_onboarding_progress IS 'Прогресс прохождения обучения';

-- 9. CREATE traffic_onboarding_step_tracking
CREATE TABLE traffic_onboarding_step_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES traffic_users(id),
  tour_type TEXT NOT NULL CHECK (tour_type IN ('main', 'settings', 'admin')),
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'next', 'prev', 'skip', 'complete')),
  time_spent_seconds INTEGER DEFAULT 0,
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  screen_width INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE traffic_onboarding_step_tracking IS 'Детальная аналитика онбординга';

-- 10. CREATE sales_notifications
CREATE TABLE sales_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id BIGINT UNIQUE,
  lead_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  product_name TEXT,
  targetologist TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  usd_to_kzt_rate DECIMAL(10,4),
  pipeline_id BIGINT,
  status_id BIGINT,
  responsible_user_id BIGINT,
  notification_status TEXT DEFAULT 'pending',
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. CREATE all_sales_tracking
CREATE TABLE all_sales_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id TEXT NOT NULL UNIQUE,
  lead_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  sale_amount NUMERIC NOT NULL,
  product_name TEXT,
  currency TEXT DEFAULT 'KZT',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  utm_id TEXT,
  referrer TEXT,
  landing_page TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  pipeline_id TEXT,
  status_id TEXT,
  responsible_user_id TEXT,
  responsible_user_name TEXT,
  targetologist TEXT,
  sale_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  usd_to_kzt_rate DECIMAL(10,4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_webhook_data JSONB
);

-- 12. CREATE exchange_rates
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  usd_to_kzt DECIMAL(10,4) NOT NULL,
  source VARCHAR(50) DEFAULT 'exchangerate-api',
  fetched_at TIMESTAMP DEFAULT now(),
  CONSTRAINT exchange_rates_date_unique UNIQUE (date)
);

CREATE INDEX idx_exchange_rates_date ON exchange_rates (date DESC);

-- 13. CREATE indexes for performance
CREATE INDEX idx_traffic_users_email ON traffic_users(email);
CREATE INDEX idx_traffic_users_team_id ON traffic_users(team_id);
CREATE INDEX idx_traffic_user_sessions_user_id ON traffic_user_sessions(user_id);
CREATE INDEX idx_traffic_onboarding_step_tracking_user_id ON traffic_onboarding_step_tracking(user_id);
CREATE INDEX idx_sales_notifications_lead_id ON sales_notifications(lead_id);
CREATE INDEX idx_all_sales_tracking_lead_id ON all_sales_tracking(lead_id);

-- ======================================================
-- DATA MIGRATION
-- ======================================================

-- INSERT traffic_teams (4 teams)
INSERT INTO traffic_teams (id, name, company, direction, fb_ad_account_id, color, emoji, created_at, updated_at) VALUES
('51e0e842-c9a2-4023-ae8c-a7ffc51431b0', 'Kenesary', 'Nutcab', 'nutcab_tripwire', '1296178948690331', '#00FF88', '👑', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('a6dae756-db51-45e1-92fc-9c80d0d0fd24', 'Arystan', 'Arystan', 'arystan', '1296178948690331', '#3B82F6', '⚡', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('b302434f-a9b1-4a00-a33e-7b4269a503ad', 'Muha', 'OnAI', 'onai_zapusk', '1296178948690331', '#F59E0B', '🚀', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00'),
('059175a1-88f9-414d-ba8a-4557f08c83d2', 'Traf4', 'ProfTest', 'proftest', '1296178948690331', '#8B5CF6', '🎯', '2025-12-19 17:03:10.933472+00', '2025-12-19 19:50:33.13874+00');

-- INSERT traffic_users (5 users)
INSERT INTO traffic_users (id, email, password_hash, full_name, team_name, role, avatar_url, is_active, last_login_at, created_at, updated_at, team_id) VALUES
('97524c98-c193-4d0d-b9ce-8a8011366a63', 'kenesary@onai.academy', '$2b$10$rIz9tS53OX36M5OM49ea1uOe5hgHIL1EUlVzeLKsnJ8c6F9.B.XLq', 'Kenesary', 'Kenesary', 'targetologist', NULL, TRUE, '2025-12-20 07:10:29.411+00', '2025-12-18 21:10:37.862154+00', '2025-12-20 07:10:29.499972+00', '51e0e842-c9a2-4023-ae8c-a7ffc51431b0'),
('eeb3a79d-9a57-4744-8911-7644fba7e1ca', 'arystan@onai.academy', '$2b$10$.OvN5CUMlbxMjycUTSFxjObZsIKimCsf6adrvXSXCgEpPFN05f7zO', 'Arystan', 'Arystan', 'targetologist', NULL, TRUE, '2025-12-19 18:18:41.86+00', '2025-12-18 21:10:38.23498+00', '2025-12-19 18:18:42.137058+00', 'a6dae756-db51-45e1-92fc-9c80d0d0fd24'),
('d0df5c95-11d5-42ea-92e0-4eaddce09b6c', 'traf4@onai.academy', '$2b$10$6lfqPDCVfR57rQuxNGjsW.DYGY5j.V8wce0NdNJ.6r2jhbXz4W96m', 'Traf4', 'Traf4', 'targetologist', NULL, TRUE, '2025-12-19 17:41:30.935+00', '2025-12-18 21:10:38.541498+00', '2025-12-19 18:16:51.840908+00', '059175a1-88f9-414d-ba8a-4557f08c83d2'),
('a34efd2e-7d82-49de-afff-d223c9622ee5', 'muha@onai.academy', '$2b$10$rvwEG4gvthxFu4/juJNXp.wfhm2zFyluQcwR2NSmn9m5gAZgXfitK', 'Muha', 'Muha', 'targetologist', NULL, TRUE, '2025-12-19 17:41:33.907+00', '2025-12-18 21:10:38.875319+00', '2025-12-19 18:16:51.840908+00', 'b302434f-a9b1-4a00-a33e-7b4269a503ad'),
('4609fee5-6627-4e78-92ed-8702e8c18c88', 'admin@onai.academy', '$2b$10$TYcxJZjoeUpESHWjbA0K3.aa3M9qPPUvVtvACZPTDGhJWWJY6IxEm', 'Александр', 'Kenesary', 'admin', NULL, TRUE, '2025-12-19 20:01:36.379+00', '2025-12-18 21:10:39.219159+00', '2025-12-19 20:01:36.457908+00', '51e0e842-c9a2-4023-ae8c-a7ffc51431b0');

-- INSERT exchange_rates (1 rate)
INSERT INTO exchange_rates (id, date, usd_to_kzt, source, fetched_at) VALUES
('1a7da6e6-59bd-4760-869f-b72312295965', '2025-12-22', 475.2500, 'exchangerate-api', '2025-12-22 06:16:48.076942');

-- INSERT sales_notifications (1 sale)
INSERT INTO sales_notifications (id, lead_id, lead_name, contact_name, sale_amount, product_name, targetologist, utm_source, utm_campaign, sale_date, pipeline_id, status_id, notification_status, created_at, updated_at) VALUES
('2ab56cc1-4008-4c7c-ae6c-cfe8516de927', 99999999, 'Test Deal with UTM', 'Test Deal with UTM', 50000, 'Main Product (VAMUS RM)', 'Kenesary', 'kenesary_test', 'tripwire_test', '2025-12-20 13:18:06.566+00', 10418746, 142, 'pending', '2025-12-20 13:18:06.641615+00', '2025-12-20 13:18:06.641615+00');

-- ✅ Migration Complete!
