-- ============================================================================
-- Migration 015 (PART 3): Import Historical Leads via Foreign Data Wrapper
-- ============================================================================
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Purpose: Automatically import historical leads from Landing DB using postgres_fdw
-- Created: 2026-01-04
--
-- АЛЬТЕРНАТИВНОЕ РЕШЕНИЕ: Использует Foreign Data Wrapper для прямого доступа
-- ============================================================================

-- ============================================================================
-- PREREQUISITES
-- ============================================================================
-- 1. postgres_fdw extension must be available (usually enabled by default in Supabase)
-- 2. You need connection credentials for Landing DB
-- 3. Network access between databases must be allowed
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable postgres_fdw extension
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- ============================================================================
-- STEP 2: Create foreign server connection to Landing DB
-- ============================================================================

-- IMPORTANT: Replace with actual Landing DB credentials
-- Format: host.supabase.co (NOT pooler!)

DO $$
BEGIN
  -- Drop existing server if exists
  IF EXISTS (SELECT 1 FROM pg_foreign_server WHERE srvname = 'landing_db') THEN
    DROP SERVER landing_db CASCADE;
  END IF;

  -- Create foreign server
  CREATE SERVER landing_db
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
      host 'aws-0-eu-central-1.pooler.supabase.com',  -- Replace with actual Landing DB host
      port '6543',                                     -- Supabase pooler port
      dbname 'postgres',                               -- Database name
      sslmode 'require'
    );
END $$;

-- ============================================================================
-- STEP 3: Create user mapping for authentication
-- ============================================================================

-- IMPORTANT: Replace with actual Landing DB credentials
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER landing_db
  OPTIONS (
    user 'postgres.xikaiavwqinamgolmtcy',  -- Replace with actual Landing DB user
    password 'YOUR_LANDING_DB_PASSWORD'     -- Replace with actual password
  );

-- ============================================================================
-- STEP 4: Import foreign table schema
-- ============================================================================

-- Option A: Import specific table
CREATE FOREIGN TABLE IF NOT EXISTS landing_leads_fdw (
  id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  source TEXT,
  amocrm_lead_id TEXT,
  amocrm_contact_id TEXT,
  amocrm_synced BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN,
  sms_sent BOOLEAN,
  email_clicked BOOLEAN,
  email_clicked_at TIMESTAMP WITH TIME ZONE,
  sms_clicked BOOLEAN,
  sms_clicked_at TIMESTAMP WITH TIME ZONE,
  click_count INTEGER
)
SERVER landing_db
OPTIONS (schema_name 'public', table_name 'landing_leads');

-- ============================================================================
-- STEP 5: Test connection
-- ============================================================================

-- Test if we can read from landing_leads
SELECT
  'Connection successful!' as status,
  COUNT(*) as total_leads_in_landing_db
FROM landing_leads_fdw;

-- Sample data
SELECT * FROM landing_leads_fdw LIMIT 5;

-- ============================================================================
-- STEP 6: Import historical leads with transformation
-- ============================================================================

-- This INSERT will import all historical leads from Landing DB
-- with proper UTM extraction and funnel type detection

INSERT INTO public.traffic_leads (
  id,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  funnel_type,
  status,
  phone,
  email,
  name,
  source,
  fb_lead_id,
  fb_form_id,
  fb_ad_id,
  fb_adset_id,
  fb_campaign_id,
  amocrm_lead_id,
  amocrm_contact_id,
  metadata,
  created_at,
  updated_at
)
SELECT
  ll.id,

  -- Extract UTM parameters from metadata JSONB
  COALESCE(ll.metadata->>'utm_source', ll.metadata->>'utmSource') as utm_source,
  COALESCE(ll.metadata->>'utm_campaign', ll.metadata->>'utmCampaign') as utm_campaign,
  COALESCE(ll.metadata->>'utm_medium', ll.metadata->>'utmMedium') as utm_medium,
  COALESCE(ll.metadata->>'utm_content', ll.metadata->>'utmContent') as utm_content,
  COALESCE(ll.metadata->>'utm_term', ll.metadata->>'utmTerm') as utm_term,

  -- Determine funnel type from source or metadata
  CASE
    WHEN ll.source ILIKE '%challenge%' OR ll.metadata->>'funnel_type' = 'challenge3d' THEN 'challenge3d'
    WHEN ll.source ILIKE '%intensive%' OR ll.metadata->>'funnel_type' = 'intensive1d' THEN 'intensive1d'
    WHEN ll.source ILIKE '%express%' OR ll.metadata->>'funnel_type' = 'express' THEN 'express'
    WHEN ll.metadata->>'funnel_type' IS NOT NULL THEN ll.metadata->>'funnel_type'
    ELSE 'express' -- default
  END as funnel_type,

  -- Lead status (default to 'new')
  'new' as status,

  -- Contact information
  ll.phone,
  ll.email,
  ll.name,

  -- Lead source
  CASE
    WHEN ll.source = 'twland' THEN 'direct'
    WHEN ll.source ILIKE '%facebook%' THEN 'facebook'
    WHEN ll.source ILIKE '%tiktok%' THEN 'tiktok'
    WHEN ll.source ILIKE '%google%' THEN 'google'
    ELSE COALESCE(ll.source, 'direct')
  END as source,

  -- Facebook data (if available)
  ll.metadata->>'fb_lead_id' as fb_lead_id,
  ll.metadata->>'fb_form_id' as fb_form_id,
  ll.metadata->>'fb_ad_id' as fb_ad_id,
  ll.metadata->>'fb_adset_id' as fb_adset_id,
  ll.metadata->>'fb_campaign_id' as fb_campaign_id,

  -- AmoCRM integration
  CASE
    WHEN ll.amocrm_lead_id ~ '^[0-9]+$' THEN ll.amocrm_lead_id::BIGINT
    ELSE NULL
  END as amocrm_lead_id,
  CASE
    WHEN ll.amocrm_contact_id ~ '^[0-9]+$' THEN ll.amocrm_contact_id::BIGINT
    ELSE NULL
  END as amocrm_contact_id,

  -- Preserve full metadata
  ll.metadata,

  -- Timestamps
  ll.created_at,
  ll.updated_at

FROM landing_leads_fdw ll
WHERE ll.created_at >= '2024-01-01' -- Adjust date range as needed
ON CONFLICT (id) DO NOTHING; -- Skip duplicates if re-running

-- ============================================================================
-- STEP 7: Verify import
-- ============================================================================

SELECT
  'Total leads imported from Landing DB' as metric,
  COUNT(*) as count
FROM public.traffic_leads

UNION ALL

SELECT
  'Leads with utm_source',
  COUNT(*)
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

SELECT
  'Leads attributed to targetologists',
  COUNT(DISTINCT tl.id)
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE tl.utm_source IS NOT NULL;

-- ============================================================================
-- STEP 8: Attribution breakdown by targetologist and date
-- ============================================================================

-- This query shows leads per targetologist per day
CREATE OR REPLACE VIEW v_leads_by_targetologist_daily AS
SELECT
  DATE(tl.created_at) as date,
  u.id as user_id,
  u.full_name as targetologist,
  u.team_name,
  uus.utm_source,
  tl.funnel_type,
  COUNT(tl.id) as leads_count,
  COUNT(DISTINCT tl.id) as unique_leads
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
JOIN public.traffic_users u ON uus.user_id = u.id
WHERE u.is_active = TRUE
  AND uus.is_active = TRUE
GROUP BY DATE(tl.created_at), u.id, u.full_name, u.team_name, uus.utm_source, tl.funnel_type
ORDER BY date DESC, leads_count DESC;

COMMENT ON VIEW v_leads_by_targetologist_daily IS 'Daily leads breakdown by targetologist with UTM attribution';

-- ============================================================================
-- STEP 9: Team-level aggregation (for traffic_teams binding)
-- ============================================================================

-- This view shows leads per team using team bindings
CREATE OR REPLACE VIEW v_leads_by_team_daily AS
SELECT
  DATE(tl.created_at) as date,
  COALESCE(u.team_name, 'Unassigned') as team_name,
  tl.funnel_type,
  COUNT(tl.id) as leads_count
FROM public.traffic_leads tl
LEFT JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
LEFT JOIN public.traffic_users u ON uus.user_id = u.id
WHERE tl.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(tl.created_at), u.team_name, tl.funnel_type
ORDER BY date DESC, team_name, funnel_type;

COMMENT ON VIEW v_leads_by_team_daily IS 'Daily leads breakdown by team';

-- ============================================================================
-- STEP 10: Ad Account attribution (via traffic_ad_account_bindings)
-- ============================================================================

-- This view links leads to ad accounts through campaigns
CREATE OR REPLACE VIEW v_leads_by_ad_account AS
SELECT
  tl.id as lead_id,
  tl.created_at,
  tl.utm_source,
  tl.utm_campaign,
  tl.funnel_type,
  tl.fb_campaign_id,
  -- Try to match ad account via campaign metadata
  -- This requires fb_campaign_id to be linked to ad accounts
  NULL::VARCHAR(50) as ad_account_id,  -- TODO: Join with facebook_ad_spend when available
  NULL::VARCHAR(100) as team_name      -- TODO: Join via traffic_ad_account_bindings
FROM public.traffic_leads tl
WHERE tl.fb_campaign_id IS NOT NULL
ORDER BY tl.created_at DESC;

COMMENT ON VIEW v_leads_by_ad_account IS 'Leads attribution to ad accounts (requires facebook_ad_spend data)';

-- ============================================================================
-- STEP 11: Cleanup (optional)
-- ============================================================================

-- Drop foreign table after import (to save resources)
-- Uncomment if you don't need ongoing sync
-- DROP FOREIGN TABLE IF EXISTS landing_leads_fdw;

-- ============================================================================
-- STEP 12: Create incremental sync function
-- ============================================================================

-- Function to sync only new leads (run periodically)
CREATE OR REPLACE FUNCTION sync_leads_from_landing_db()
RETURNS TABLE(new_leads_count BIGINT) AS $$
DECLARE
  v_new_leads BIGINT;
BEGIN
  -- Get the latest lead timestamp in traffic_leads
  WITH latest_sync AS (
    SELECT COALESCE(MAX(created_at), '2024-01-01'::timestamptz) as last_sync
    FROM public.traffic_leads
  )
  INSERT INTO public.traffic_leads (
    id, utm_source, utm_campaign, utm_medium, utm_content, utm_term,
    funnel_type, status, phone, email, name, source,
    fb_lead_id, fb_form_id, fb_ad_id, fb_adset_id, fb_campaign_id,
    amocrm_lead_id, amocrm_contact_id, metadata, created_at, updated_at
  )
  SELECT
    ll.id,
    COALESCE(ll.metadata->>'utm_source', ll.metadata->>'utmSource'),
    COALESCE(ll.metadata->>'utm_campaign', ll.metadata->>'utmCampaign'),
    COALESCE(ll.metadata->>'utm_medium', ll.metadata->>'utmMedium'),
    COALESCE(ll.metadata->>'utm_content', ll.metadata->>'utmContent'),
    COALESCE(ll.metadata->>'utm_term', ll.metadata->>'utmTerm'),
    CASE
      WHEN ll.source ILIKE '%challenge%' OR ll.metadata->>'funnel_type' = 'challenge3d' THEN 'challenge3d'
      WHEN ll.source ILIKE '%intensive%' OR ll.metadata->>'funnel_type' = 'intensive1d' THEN 'intensive1d'
      WHEN ll.source ILIKE '%express%' OR ll.metadata->>'funnel_type' = 'express' THEN 'express'
      ELSE 'express'
    END,
    'new',
    ll.phone, ll.email, ll.name,
    CASE
      WHEN ll.source = 'twland' THEN 'direct'
      WHEN ll.source ILIKE '%facebook%' THEN 'facebook'
      ELSE COALESCE(ll.source, 'direct')
    END,
    ll.metadata->>'fb_lead_id',
    ll.metadata->>'fb_form_id',
    ll.metadata->>'fb_ad_id',
    ll.metadata->>'fb_adset_id',
    ll.metadata->>'fb_campaign_id',
    CASE WHEN ll.amocrm_lead_id ~ '^[0-9]+$' THEN ll.amocrm_lead_id::BIGINT END,
    CASE WHEN ll.amocrm_contact_id ~ '^[0-9]+$' THEN ll.amocrm_contact_id::BIGINT END,
    ll.metadata,
    ll.created_at,
    ll.updated_at
  FROM landing_leads_fdw ll
  CROSS JOIN latest_sync
  WHERE ll.created_at > latest_sync.last_sync
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_new_leads = ROW_COUNT;

  RETURN QUERY SELECT v_new_leads;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_leads_from_landing_db() IS 'Incrementally sync new leads from Landing DB';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '✅ Migration 015 PART 3 (FDW): Historical leads import completed!' as status;

-- Show attribution summary
SELECT
  'Total leads' as metric,
  COUNT(*) as count
FROM public.traffic_leads

UNION ALL

SELECT
  'Targetologist: ' || u.full_name,
  COUNT(DISTINCT tl.id)
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
JOIN public.traffic_users u ON uus.user_id = u.id
WHERE u.is_active = TRUE AND uus.is_active = TRUE
GROUP BY u.full_name
ORDER BY COUNT(DISTINCT tl.id) DESC;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*
-- Example 1: Get leads per targetologist for last 30 days
SELECT * FROM v_leads_by_targetologist_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, leads_count DESC;

-- Example 2: Get leads per team
SELECT * FROM v_leads_by_team_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, leads_count DESC;

-- Example 3: Run incremental sync (manually or via cron)
SELECT sync_leads_from_landing_db();
*/
