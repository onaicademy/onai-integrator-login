-- Migration 012: Traffic Weekly Plans and Teams Tables
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2026-01-04
-- Purpose: Create tables for AI-generated weekly plans and dynamic teams management

-- ============================================================================
-- 1. TABLE: traffic_teams (dynamic teams management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  description TEXT,
  leader_user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,

  -- Settings
  is_active BOOLEAN DEFAULT TRUE,
  color VARCHAR(7) DEFAULT '#00FF88',  -- Hex color for UI

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================================================
-- 2. TABLE: traffic_weekly_plans (AI-generated plans)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_weekly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Team identification
  team_name VARCHAR(100) NOT NULL,
  team_id UUID REFERENCES traffic_teams(id) ON DELETE SET NULL,

  -- Week period
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,

  -- Previous week data (actual results)
  prev_week_revenue NUMERIC(12, 2) DEFAULT 0,
  prev_week_sales INTEGER DEFAULT 0,
  prev_week_spend NUMERIC(10, 2) DEFAULT 0,
  prev_week_roas NUMERIC(5, 2) DEFAULT 0,
  prev_week_cpa NUMERIC(10, 2) DEFAULT 0,

  -- Current week plan (targets)
  plan_revenue NUMERIC(12, 2) DEFAULT 0,
  plan_sales INTEGER DEFAULT 0,
  plan_spend NUMERIC(10, 2) DEFAULT 0,
  plan_roas NUMERIC(5, 2) DEFAULT 0,
  plan_cpa NUMERIC(10, 2) DEFAULT 0,

  -- Current week actual (updated daily)
  actual_revenue NUMERIC(12, 2) DEFAULT 0,
  actual_sales INTEGER DEFAULT 0,
  actual_spend NUMERIC(10, 2) DEFAULT 0,
  actual_roas NUMERIC(5, 2) DEFAULT 0,
  actual_cpa NUMERIC(10, 2) DEFAULT 0,

  -- Completion tracking
  completion_percentage INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),

  -- AI metadata
  ai_generated_plan JSONB DEFAULT '{}'::jsonb,
  ai_recommendations TEXT,
  growth_percentage NUMERIC(5, 2) DEFAULT 10.0,
  ai_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',

  -- Admin notes
  admin_notes TEXT,
  adjusted_by UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Unique constraint: one plan per team per week
  UNIQUE(team_name, week_start)
);

-- ============================================================================
-- 3. INDEXES for performance
-- ============================================================================

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_traffic_teams_active ON traffic_teams(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_traffic_teams_name ON traffic_teams(name);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_team ON traffic_weekly_plans(team_name);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_week ON traffic_weekly_plans(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_status ON traffic_weekly_plans(status);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_year_week ON traffic_weekly_plans(year, week_number);
CREATE INDEX IF NOT EXISTS idx_traffic_weekly_plans_current ON traffic_weekly_plans(team_name, week_start DESC) WHERE status = 'in_progress';

-- ============================================================================
-- 4. TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_traffic_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_traffic_teams_updated_at
  BEFORE UPDATE ON public.traffic_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

CREATE TRIGGER trigger_update_traffic_weekly_plans_updated_at
  BEFORE UPDATE ON public.traffic_weekly_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_traffic_tables_updated_at();

-- ============================================================================
-- 5. SEED DATA: Initial teams from traffic_users
-- ============================================================================

-- Insert teams based on existing users' team_name
INSERT INTO traffic_teams (name, display_name, is_active)
SELECT DISTINCT
  team_name,
  team_name,
  TRUE
FROM traffic_users
WHERE team_name IS NOT NULL
  AND team_name != ''
  AND is_active = TRUE
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. VIEW: Current week plans with completion status
-- ============================================================================

CREATE OR REPLACE VIEW v_current_week_plans AS
SELECT
  p.*,
  t.display_name as team_display_name,
  t.color as team_color,
  CASE
    WHEN p.plan_revenue > 0 THEN ROUND((p.actual_revenue / p.plan_revenue) * 100)
    ELSE 0
  END as revenue_completion,
  CASE
    WHEN p.plan_sales > 0 THEN ROUND((p.actual_sales::numeric / p.plan_sales) * 100)
    ELSE 0
  END as sales_completion
FROM traffic_weekly_plans p
LEFT JOIN traffic_teams t ON t.name = p.team_name
WHERE p.week_start <= CURRENT_DATE
  AND p.week_end >= CURRENT_DATE;

-- ============================================================================
-- 7. VIEW: All teams with user counts
-- ============================================================================

CREATE OR REPLACE VIEW v_teams_with_stats AS
SELECT
  t.id,
  t.name,
  t.display_name,
  t.description,
  t.is_active,
  t.color,
  t.created_at,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'targetologist') as targetologist_count,
  MAX(u.last_login_at) as last_active
FROM traffic_teams t
LEFT JOIN traffic_users u ON u.team_name = t.name AND u.is_active = TRUE
GROUP BY t.id, t.name, t.display_name, t.description, t.is_active, t.color, t.created_at
ORDER BY t.name;

-- ============================================================================
-- 8. COMMENTS for documentation
-- ============================================================================

COMMENT ON TABLE public.traffic_teams IS 'Dynamic teams management - replaces hardcoded team list';
COMMENT ON TABLE public.traffic_weekly_plans IS 'AI-generated weekly KPI plans for targetologist teams';
COMMENT ON VIEW v_current_week_plans IS 'Current week plans with completion percentages';
COMMENT ON VIEW v_teams_with_stats IS 'Teams with aggregated user statistics';

-- ============================================================================
-- VALIDATION
-- ============================================================================

SELECT 'Migration 012: traffic_weekly_plans and traffic_teams created successfully!' AS status;
SELECT 'Teams created: ' || COUNT(*) FROM traffic_teams;
