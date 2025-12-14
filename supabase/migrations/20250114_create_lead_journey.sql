-- Migration: Create lead journey tracking system
-- Purpose: Track stages and prevent duplicate lead entries
-- Created: 2025-12-14

-- ============================================
-- 1. Add phone_normalized column for deduplication
-- ============================================
ALTER TABLE public.landing_leads 
ADD COLUMN IF NOT EXISTS phone_normalized TEXT;

-- Create function to normalize phone numbers (strip all non-digits except leading +)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT) 
RETURNS TEXT AS $$
BEGIN
  -- Remove all spaces, dashes, parentheses
  RETURN regexp_replace(phone, '[^0-9+]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing phone_normalized values
UPDATE public.landing_leads 
SET phone_normalized = normalize_phone(phone) 
WHERE phone_normalized IS NULL;

-- Create index for phone deduplication
CREATE INDEX IF NOT EXISTS landing_leads_phone_normalized_idx ON public.landing_leads(phone_normalized);

-- ============================================
-- 2. Create lead_journey table for stage tracking
-- ============================================
CREATE TABLE IF NOT EXISTS public.lead_journey (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.landing_leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL, -- 'proftest_submitted', 'expresscourse_clicked', 'expresscourse_submitted', 'payment_kaspi', 'payment_card', 'payment_manager'
  source TEXT, -- proftest_arystan, proftest_kenesary, expresscourse
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lead_journey_lead_id_idx ON public.lead_journey(lead_id);
CREATE INDEX IF NOT EXISTS lead_journey_stage_idx ON public.lead_journey(stage);
CREATE INDEX IF NOT EXISTS lead_journey_created_at_idx ON public.lead_journey(created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_journey ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role full access
CREATE POLICY "Service role has full access to lead_journey"
  ON public.lead_journey
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.lead_journey IS 'Tracks lead progression through different stages (proftest → expresscourse → payment)';
COMMENT ON COLUMN public.lead_journey.stage IS 'Stage identifier (proftest_submitted, expresscourse_clicked, expresscourse_submitted, payment_*)';
COMMENT ON COLUMN public.lead_journey.source IS 'Source page/campaign that triggered this stage';
COMMENT ON COLUMN public.lead_journey.metadata IS 'Additional stage-specific data (answers, payment method, UTM, etc)';

-- ============================================
-- 3. Create helper function to find or create unified lead
-- ============================================
CREATE OR REPLACE FUNCTION public.find_or_create_unified_lead(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
  v_phone_normalized TEXT;
BEGIN
  -- Normalize phone
  v_phone_normalized := normalize_phone(p_phone);
  
  -- Try to find existing lead by phone OR email (phone priority)
  SELECT id INTO v_lead_id
  FROM public.landing_leads
  WHERE phone_normalized = v_phone_normalized
     OR (p_email IS NOT NULL AND email = p_email)
  ORDER BY created_at ASC -- Get the OLDEST (first) lead
  LIMIT 1;
  
  -- If found, update name/email if newer info provided
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.landing_leads
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone_normalized = v_phone_normalized,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_lead_id;
    
    RETURN v_lead_id;
  END IF;
  
  -- If not found, create new lead
  INSERT INTO public.landing_leads (email, name, phone, phone_normalized, source, metadata)
  VALUES (p_email, p_name, p_phone, v_phone_normalized, p_source, p_metadata)
  RETURNING id INTO v_lead_id;
  
  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Create view for admin panel (lead with journey)
-- ============================================
CREATE OR REPLACE VIEW public.leads_with_journey AS
SELECT 
  l.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', lj.id,
        'stage', lj.stage,
        'source', lj.source,
        'metadata', lj.metadata,
        'created_at', lj.created_at
      ) ORDER BY lj.created_at ASC
    ) FILTER (WHERE lj.id IS NOT NULL),
    '[]'::json
  ) as journey_stages
FROM public.landing_leads l
LEFT JOIN public.lead_journey lj ON lj.lead_id = l.id
GROUP BY l.id
ORDER BY l.created_at DESC;

-- Grant access to service role
GRANT SELECT ON public.leads_with_journey TO service_role;

COMMENT ON VIEW public.leads_with_journey IS 'Combines landing_leads with their journey stages for admin panel display';
