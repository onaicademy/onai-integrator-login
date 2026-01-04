-- ============================================================================
-- Migration 015 (PART 1): Export Historical Leads from Landing DB
-- ============================================================================
-- Database: Landing Supabase (xikaiavwqinamgolmtcy)
-- Purpose: Prepare historical leads data for import to Traffic DB
-- Created: 2026-01-04
--
-- ВАЖНО: Выполнить этот скрипт В LANDING DB первым!
-- ============================================================================

-- ============================================================================
-- STEP 1: Create temporary export view with UTM extraction
-- ============================================================================

CREATE OR REPLACE VIEW temp_leads_for_export AS
SELECT
  -- Lead ID (preserve for reference)
  ll.id as landing_lead_id,

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

  -- Preserve full metadata for reference
  ll.metadata as original_metadata,

  -- Timestamps
  ll.created_at,
  ll.updated_at

FROM public.landing_leads ll
WHERE ll.created_at >= '2024-01-01' -- Adjust date range as needed
ORDER BY ll.created_at ASC;

-- ============================================================================
-- STEP 2: Export data as CSV
-- ============================================================================

-- Run this query in Supabase SQL Editor to get export data:
-- Copy the results and save as CSV file for import to Traffic DB

SELECT
  landing_lead_id,
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
  original_metadata::text as original_metadata,
  created_at,
  updated_at
FROM temp_leads_for_export;

-- ============================================================================
-- STEP 3: Statistics and validation
-- ============================================================================

-- Total leads to export
SELECT
  'Total leads to export' as metric,
  COUNT(*) as value
FROM temp_leads_for_export

UNION ALL

-- Leads with UTM source
SELECT
  'Leads with utm_source',
  COUNT(*)
FROM temp_leads_for_export
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

-- Leads by funnel type
SELECT
  'Funnel: ' || funnel_type,
  COUNT(*)
FROM temp_leads_for_export
GROUP BY funnel_type

UNION ALL

-- Leads by source
SELECT
  'Source: ' || source,
  COUNT(*)
FROM temp_leads_for_export
GROUP BY source

UNION ALL

-- Leads with AmoCRM ID
SELECT
  'Synced to AmoCRM',
  COUNT(*)
FROM temp_leads_for_export
WHERE amocrm_lead_id IS NOT NULL;

-- ============================================================================
-- STEP 4: Sample output (first 10 leads)
-- ============================================================================

SELECT * FROM temp_leads_for_export LIMIT 10;

-- ============================================================================
-- CLEANUP (optional - run after successful export)
-- ============================================================================

-- DROP VIEW temp_leads_for_export;

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. Run this script in Landing DB (xikaiavwqinamgolmtcy)
-- 2. Export results to CSV or save output
-- 3. Run PART 2 script in Traffic DB (oetodaexnjcunklkdlkv) with the data
-- ============================================================================
