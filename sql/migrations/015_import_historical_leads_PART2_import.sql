-- ============================================================================
-- Migration 015 (PART 2): Import Historical Leads to Traffic DB
-- ============================================================================
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Purpose: Import historical leads from Landing DB with targetologist attribution
-- Created: 2026-01-04
--
-- ВАЖНО: Выполнить ПОСЛЕ PART 1 в Traffic DB!
-- ============================================================================

-- ============================================================================
-- STEP 1: Create temporary staging table for import
-- ============================================================================

CREATE TEMPORARY TABLE IF NOT EXISTS temp_leads_import (
  landing_lead_id UUID,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  funnel_type TEXT,
  status TEXT,
  phone TEXT,
  email TEXT,
  name TEXT,
  source TEXT,
  fb_lead_id TEXT,
  fb_form_id TEXT,
  fb_ad_id TEXT,
  fb_adset_id TEXT,
  fb_campaign_id TEXT,
  amocrm_lead_id BIGINT,
  amocrm_contact_id BIGINT,
  original_metadata TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- STEP 2: Load data from CSV export
-- ============================================================================

-- OPTION A: If you have CSV file, use COPY command:
-- \COPY temp_leads_import FROM '/path/to/exported_leads.csv' WITH (FORMAT csv, HEADER true);

-- OPTION B: If manual insert, use this format:
-- INSERT INTO temp_leads_import VALUES
-- ('uuid-here', 'utm_source', 'utm_campaign', ...),
-- ('uuid-here', 'utm_source', 'utm_campaign', ...);

-- ============================================================================
-- STEP 3: Import leads with targetologist attribution
-- ============================================================================

-- This INSERT will:
-- 1. Import historical leads
-- 2. Automatically attribute to targetologists via traffic_user_utm_sources
-- 3. Skip duplicates (if any exist)

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
  tli.landing_lead_id as id, -- Preserve original ID
  tli.utm_source,
  tli.utm_campaign,
  tli.utm_medium,
  tli.utm_content,
  tli.utm_term,
  tli.funnel_type,
  tli.status,
  tli.phone,
  tli.email,
  tli.name,
  tli.source,
  tli.fb_lead_id,
  tli.fb_form_id,
  tli.fb_ad_id,
  tli.fb_adset_id,
  tli.fb_campaign_id,
  tli.amocrm_lead_id,
  tli.amocrm_contact_id,
  COALESCE(tli.original_metadata::jsonb, '{}'::jsonb) as metadata,
  tli.created_at,
  tli.updated_at
FROM temp_leads_import tli
ON CONFLICT (id) DO NOTHING; -- Skip duplicates if re-running

-- ============================================================================
-- STEP 4: Verify import and attribution
-- ============================================================================

-- Total leads imported
SELECT
  'Total leads imported' as metric,
  COUNT(*) as count
FROM public.traffic_leads

UNION ALL

-- Leads by funnel type
SELECT
  'Funnel: ' || funnel_type,
  COUNT(*)
FROM public.traffic_leads
GROUP BY funnel_type

UNION ALL

-- Leads with UTM source
SELECT
  'With utm_source',
  COUNT(*)
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

-- Leads attributed to targetologists
SELECT
  'Attributed to targetologists',
  COUNT(DISTINCT tl.id)
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE tl.utm_source IS NOT NULL

UNION ALL

-- Leads without attribution
SELECT
  'NOT attributed (no matching UTM)',
  COUNT(*)
FROM public.traffic_leads tl
LEFT JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE tl.utm_source IS NOT NULL AND uus.id IS NULL;

-- ============================================================================
-- STEP 5: Check attribution breakdown by targetologist
-- ============================================================================

SELECT
  u.full_name as targetologist,
  u.team_name,
  uus.utm_source,
  uus.funnel_type,
  COUNT(tl.id) as leads_count,
  MIN(tl.created_at) as first_lead,
  MAX(tl.created_at) as last_lead
FROM public.traffic_user_utm_sources uus
JOIN public.traffic_users u ON uus.user_id = u.id
LEFT JOIN public.traffic_leads tl ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
WHERE uus.is_active = TRUE
GROUP BY u.full_name, u.team_name, uus.utm_source, uus.funnel_type
ORDER BY u.team_name, u.full_name, leads_count DESC;

-- ============================================================================
-- STEP 6: Daily leads breakdown
-- ============================================================================

SELECT
  DATE(tl.created_at) as date,
  tl.funnel_type,
  COUNT(*) as leads_count,
  COUNT(DISTINCT tl.utm_source) as unique_sources
FROM public.traffic_leads tl
WHERE tl.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(tl.created_at), tl.funnel_type
ORDER BY date DESC, funnel_type;

-- ============================================================================
-- STEP 7: Leads without UTM (need manual attribution)
-- ============================================================================

SELECT
  id,
  name,
  email,
  phone,
  source,
  funnel_type,
  created_at
FROM public.traffic_leads
WHERE (utm_source IS NULL OR utm_source = '')
ORDER BY created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 8: CLEANUP staging table
-- ============================================================================

DROP TABLE IF EXISTS temp_leads_import;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Top UTM sources by leads count
SELECT
  utm_source,
  funnel_type,
  COUNT(*) as leads_count
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''
GROUP BY utm_source, funnel_type
ORDER BY leads_count DESC
LIMIT 20;

-- Query 2: Targetologist performance (leads attributed)
SELECT
  u.full_name as targetologist,
  u.team_name,
  COUNT(DISTINCT tl.id) as total_leads,
  COUNT(DISTINCT CASE WHEN tl.funnel_type = 'express' THEN tl.id END) as express_leads,
  COUNT(DISTINCT CASE WHEN tl.funnel_type = 'challenge3d' THEN tl.id END) as challenge3d_leads,
  COUNT(DISTINCT CASE WHEN tl.funnel_type = 'intensive1d' THEN tl.id END) as intensive1d_leads
FROM public.traffic_users u
LEFT JOIN public.traffic_user_utm_sources uus ON u.id = uus.user_id AND uus.is_active = TRUE
LEFT JOIN public.traffic_leads tl ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE u.is_active = TRUE AND u.role = 'targetologist'
GROUP BY u.full_name, u.team_name
ORDER BY total_leads DESC;

-- Query 3: Daily leads with targetologist attribution
SELECT
  DATE(tl.created_at) as date,
  u.full_name as targetologist,
  u.team_name,
  COUNT(*) as leads_count
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
JOIN public.traffic_users u ON uus.user_id = u.id
WHERE tl.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(tl.created_at), u.full_name, u.team_name
ORDER BY date DESC, leads_count DESC;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT
  '✅ Migration 015 PART 2: Historical leads imported successfully!' as status,
  COUNT(*) as total_leads_in_traffic_db
FROM public.traffic_leads;

-- ============================================================================
-- POST-MIGRATION RECOMMENDATIONS
-- ============================================================================

/*
RECOMMENDATIONS after import:

1. **Check unattributed leads** (leads without matching UTM in traffic_user_utm_sources):
   - Review leads without utm_source
   - Add missing UTM sources to traffic_user_utm_sources if needed

2. **Verify targetologist attribution**:
   - Run Query 2 above to see leads per targetologist
   - Ensure all active UTM sources have leads attributed

3. **Set up ongoing sync**:
   - Create a scheduled job to sync new leads from Landing DB to Traffic DB
   - Option: Create a trigger or webhook-based sync

4. **Update dashboards**:
   - Refresh admin panel to see historical leads
   - Verify charts and statistics show correct data

5. **Test date range filters**:
   - Ensure date filters work correctly with historical data
   - Verify team/targetologist filters show correct attribution

6. **Monitor for duplicates**:
   - Check for any duplicate leads (by email/phone)
   - Clean up duplicates if necessary
*/
