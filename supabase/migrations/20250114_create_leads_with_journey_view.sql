-- Migration: Create leads_with_journey VIEW
-- Created: 2025-01-14
-- Purpose: Combine landing_leads with their journey_stages for admin dashboard

-- ============================================
-- CREATE VIEW: leads_with_journey
-- ============================================
-- This view combines landing_leads with their journey stages
-- to show full customer journey in admin dashboard

CREATE OR REPLACE VIEW public.leads_with_journey AS
SELECT 
  ll.id,
  ll.name,
  ll.email,
  ll.phone,
  ll.source,
  ll.created_at,
  ll.updated_at,
  ll.email_sent,
  ll.sms_sent,
  ll.email_clicked,
  ll.email_clicked_at,
  ll.sms_clicked,
  ll.sms_clicked_at,
  ll.click_count,
  ll.metadata,
  ll.amocrm_lead_id,
  ll.amocrm_synced,
  ll.amocrm_contact_id,
  -- ✅ Aggregate journey_stages as JSONB array
  COALESCE(
    json_agg(
      json_build_object(
        'id', js.id,
        'stage', js.stage,
        'source', js.source,
        'metadata', js.metadata,
        'created_at', js.created_at
      ) ORDER BY js.created_at ASC
    ) FILTER (WHERE js.id IS NOT NULL),
    '[]'::json
  ) as journey_stages
FROM public.landing_leads ll
LEFT JOIN public.journey_stages js ON ll.id = js.lead_id
GROUP BY 
  ll.id,
  ll.name,
  ll.email,
  ll.phone,
  ll.source,
  ll.created_at,
  ll.updated_at,
  ll.email_sent,
  ll.sms_sent,
  ll.email_clicked,
  ll.email_clicked_at,
  ll.sms_clicked,
  ll.sms_clicked_at,
  ll.click_count,
  ll.metadata,
  ll.amocrm_lead_id,
  ll.amocrm_synced,
  ll.amocrm_contact_id
ORDER BY ll.created_at DESC;

-- ============================================
-- GRANT ACCESS
-- ============================================
-- Allow service_role and authenticated users to read view
GRANT SELECT ON public.leads_with_journey TO service_role;
GRANT SELECT ON public.leads_with_journey TO authenticated;
GRANT SELECT ON public.leads_with_journey TO anon;

-- Add comment to view
COMMENT ON VIEW public.leads_with_journey IS 'View combining landing_leads with their journey_stages for admin dashboard';
