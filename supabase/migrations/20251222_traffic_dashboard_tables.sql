-- =====================================================
-- TRAFFIC DASHBOARD DATABASE SCHEMA
-- Migration: Initial tables setup
-- Date: 2025-12-22
-- =====================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TRAFFIC TARGETOLOGISTS (Users/Team Members)
-- =====================================================
CREATE TABLE IF NOT EXISTS traffic_targetologists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  team TEXT NOT NULL,  -- 'Kenesary', 'Aidar', 'Sasha', 'Dias'
  role TEXT DEFAULT 'targetologist' CHECK (role IN ('targetologist', 'admin', 'manager')),
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_email ON traffic_targetologists(email);
CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_team ON traffic_targetologists(team);
CREATE INDEX IF NOT EXISTS idx_traffic_targetologists_user_id ON traffic_targetologists(user_id);

-- =====================================================
-- 2. TRAFFIC TARGETOLOGIST SETTINGS (Ad Accounts + Campaigns)
-- =====================================================
CREATE TABLE IF NOT EXISTS traffic_targetologist_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Can be either traffic_targetologists.id OR team name (flexible)
  fb_ad_accounts JSONB DEFAULT '[]'::jsonb,  -- [{id, name, status, currency}]
  tracked_campaigns JSONB DEFAULT '[]'::jsonb,  -- [{id, name, ad_account_id, status}]
  utm_source TEXT DEFAULT 'facebook',
  utm_medium TEXT DEFAULT 'cpc',
  utm_campaign_template TEXT,
  utm_templates JSONB DEFAULT '{}'::jsonb,
  facebook_connected BOOLEAN DEFAULT false,
  facebook_connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_traffic_settings_user_id ON traffic_targetologist_settings(user_id);

-- =====================================================
-- 3. TRAFFIC ONBOARDING PROGRESS
-- =====================================================
CREATE TABLE IF NOT EXISTS traffic_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Team name (e.g., 'Kenesary') or UUID
  tour_type TEXT DEFAULT 'targetologist' CHECK (tour_type IN ('targetologist', 'admin', 'manager')),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  steps_completed JSONB DEFAULT '[]'::jsonb,  -- [1, 2, 3, ...]
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tour_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_traffic_onboarding_user_id ON traffic_onboarding_progress(user_id);

-- =====================================================
-- 4. TRAFFIC STATS (Daily ROI Data per Team)
-- =====================================================
CREATE TABLE IF NOT EXISTS traffic_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team TEXT NOT NULL,  -- 'Kenesary', 'Aidar', 'Sasha', 'Dias'
  date DATE NOT NULL,
  
  -- Facebook Ads Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend_usd NUMERIC(12,2) DEFAULT 0,
  ctr NUMERIC(5,2) DEFAULT 0,  -- Click-through rate
  cpc NUMERIC(10,2) DEFAULT 0,  -- Cost per click
  
  -- Conversion Metrics
  registrations INTEGER DEFAULT 0,
  express_sales INTEGER DEFAULT 0,
  main_sales INTEGER DEFAULT 0,
  
  -- Revenue Metrics
  revenue_express_usd NUMERIC(12,2) DEFAULT 0,
  revenue_main_usd NUMERIC(12,2) DEFAULT 0,
  revenue_total_usd NUMERIC(12,2) DEFAULT 0,
  
  -- ROI Calculation
  profit_usd NUMERIC(12,2) DEFAULT 0,
  roi_percent NUMERIC(10,2) DEFAULT 0,
  
  -- Currency Exchange
  usd_to_kzt_rate NUMERIC(10,4),
  spend_kzt NUMERIC(12,2) DEFAULT 0,
  revenue_kzt NUMERIC(12,2) DEFAULT 0,
  profit_kzt NUMERIC(12,2) DEFAULT 0,
  
  -- Campaign IDs (for tracking)
  campaign_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(team, date)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_traffic_stats_team ON traffic_stats(team);
CREATE INDEX IF NOT EXISTS idx_traffic_stats_date ON traffic_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_stats_team_date ON traffic_stats(team, date DESC);

-- =====================================================
-- 5. EXCHANGE RATES (Historical USD/KZT Rates)
-- =====================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  usd_to_kzt NUMERIC(10,4) NOT NULL,
  source TEXT DEFAULT 'exchangerate-api',
  fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster date lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date DESC);

-- =====================================================
-- 6. AMOCRM SALES (Sales from AmoCRM webhook)
-- =====================================================
CREATE TABLE IF NOT EXISTS amocrm_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team TEXT NOT NULL,  -- Derived from UTM source
  deal_id TEXT UNIQUE NOT NULL,
  contact_id TEXT,
  
  -- Sale Details
  amount_usd NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  product_type TEXT,  -- 'express', 'main', 'vip'
  
  -- UTM Tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Customer Info
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Exchange Rate (at time of sale)
  usd_to_kzt_rate NUMERIC(10,4),
  amount_kzt NUMERIC(12,2),
  
  -- Timestamps
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_amocrm_sales_team ON amocrm_sales(team);
CREATE INDEX IF NOT EXISTS idx_amocrm_sales_date ON amocrm_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_amocrm_sales_deal_id ON amocrm_sales(deal_id);

-- =====================================================
-- 7. FACEBOOK CAMPAIGNS (Cached campaign data)
-- =====================================================
CREATE TABLE IF NOT EXISTS facebook_campaigns (
  id TEXT PRIMARY KEY,  -- Facebook Campaign ID
  ad_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT,
  objective TEXT,
  effective_status TEXT,
  
  -- Assigned Targetologist
  assigned_team TEXT,
  
  -- Performance Metrics (cached)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend NUMERIC(12,2) DEFAULT 0,
  
  -- Sync Metadata
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_ad_account ON facebook_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_facebook_campaigns_team ON facebook_campaigns(assigned_team);

-- =====================================================
-- SEED DATA: Insert 4 Targetologists
-- =====================================================

-- Note: Password hash should be properly generated in production
-- For now, using bcrypt hash of 'onai2024'
-- Generated with: bcrypt.hash('onai2024', 10)

INSERT INTO traffic_targetologists (email, full_name, team, role, password_hash, is_active) VALUES
  ('kenesary@onai.academy', 'Kenesary', 'Kenesary', 'targetologist', '$2b$10$YourHashHere', true),
  ('aidar@onai.academy', 'Aidar', 'Aidar', 'targetologist', '$2b$10$YourHashHere', true),
  ('sasha@onai.academy', 'Sasha', 'Sasha', 'targetologist', '$2b$10$YourHashHere', true),
  ('dias@onai.academy', 'Dias', 'Dias', 'targetologist', '$2b$10$YourHashHere', true)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  team = EXCLUDED.team,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Create empty settings for each targetologist
INSERT INTO traffic_targetologist_settings (user_id, fb_ad_accounts, tracked_campaigns, facebook_connected) 
SELECT 
  team,  -- Using team name as user_id for flexibility
  '[]'::jsonb,
  '[]'::jsonb,
  false
FROM traffic_targetologists 
WHERE team IN ('Kenesary', 'Aidar', 'Sasha', 'Dias')
ON CONFLICT (user_id) DO NOTHING;

-- Insert current exchange rate (approximate)
INSERT INTO exchange_rates (date, usd_to_kzt, source) VALUES
  (CURRENT_DATE, 475.25, 'manual_seed')
ON CONFLICT (date) DO UPDATE SET
  usd_to_kzt = EXCLUDED.usd_to_kzt,
  fetched_at = now();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE traffic_targetologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_targetologist_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE amocrm_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE facebook_campaigns ENABLE ROW LEVEL SECURITY;

-- Policies (allowing service_role to bypass, authenticated users to read their own data)

-- traffic_targetologists: Users can read their own data
CREATE POLICY "Users can read own data" ON traffic_targetologists
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- traffic_targetologist_settings: Users can read/update their own settings
CREATE POLICY "Users can manage own settings" ON traffic_targetologist_settings
  FOR ALL USING (auth.role() = 'service_role');

-- traffic_onboarding_progress: Users can manage their own progress
CREATE POLICY "Users can manage own progress" ON traffic_onboarding_progress
  FOR ALL USING (auth.role() = 'service_role');

-- traffic_stats: Read-only for authenticated users
CREATE POLICY "Authenticated users can read stats" ON traffic_stats
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- exchange_rates: Public read access
CREATE POLICY "Public read access" ON exchange_rates
  FOR SELECT USING (true);

-- amocrm_sales: Service role only
CREATE POLICY "Service role full access" ON amocrm_sales
  FOR ALL USING (auth.role() = 'service_role');

-- facebook_campaigns: Service role only
CREATE POLICY "Service role full access" ON facebook_campaigns
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TRIGGERS: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_traffic_targetologists_updated_at BEFORE UPDATE ON traffic_targetologists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_settings_updated_at BEFORE UPDATE ON traffic_targetologist_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_onboarding_updated_at BEFORE UPDATE ON traffic_onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_traffic_stats_updated_at BEFORE UPDATE ON traffic_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_amocrm_sales_updated_at BEFORE UPDATE ON amocrm_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_campaigns_updated_at BEFORE UPDATE ON facebook_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Verify tables were created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name LIKE 'traffic_%' OR table_name IN ('exchange_rates', 'amocrm_sales', 'facebook_campaigns')
ORDER BY table_name;
