-- ================================================================
-- FIX CRITICAL ISSUES FOR CHALLENGE3D INTEGRATION
-- Execute in Landing Supabase SQL Editor
-- Date: 2026-01-02
-- ================================================================

-- ================================================================
-- FIX #1: Add UNIQUE constraint on landing_leads.amocrm_lead_id
-- Required for: challenge3d-lead webhook upsert
-- ================================================================

-- First, check for duplicates and remove them if any
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT amocrm_lead_id, COUNT(*)
    FROM landing_leads
    WHERE amocrm_lead_id IS NOT NULL
    GROUP BY amocrm_lead_id
    HAVING COUNT(*) > 1
  ) dups;

  IF duplicate_count > 0 THEN
    RAISE NOTICE 'Found % duplicate amocrm_lead_id entries. Cleaning up...', duplicate_count;

    -- Keep only the latest entry for each amocrm_lead_id
    DELETE FROM landing_leads a
    USING landing_leads b
    WHERE a.amocrm_lead_id = b.amocrm_lead_id
      AND a.amocrm_lead_id IS NOT NULL
      AND a.created_at < b.created_at;

    RAISE NOTICE 'Duplicates removed.';
  ELSE
    RAISE NOTICE 'No duplicates found.';
  END IF;
END $$;

-- Add UNIQUE constraint
ALTER TABLE landing_leads
  ADD CONSTRAINT landing_leads_amocrm_lead_id_unique
  UNIQUE (amocrm_lead_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_landing_leads_amocrm_lead_id
  ON landing_leads(amocrm_lead_id)
  WHERE amocrm_lead_id IS NOT NULL;

-- Add index on source column for filtering
CREATE INDEX IF NOT EXISTS idx_landing_leads_source
  ON landing_leads(source);

-- ================================================================
-- FIX #2: Create challenge3d_sales table
-- Required for: challenge3d-sale webhook
-- ================================================================

CREATE TABLE IF NOT EXISTS public.challenge3d_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- AmoCRM identification
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT NOT NULL,
  status_id BIGINT NOT NULL,

  -- Sales data
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'KZT',
  package_type TEXT,
  prepaid BOOLEAN DEFAULT FALSE,

  -- UTM Attribution
  utm_source VARCHAR(100),
  utm_campaign VARCHAR(255),
  utm_medium VARCHAR(100),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),
  utm_referrer TEXT,
  fbclid VARCHAR(255),

  -- Customer data
  customer_id BIGINT,
  customer_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),

  -- Original UTM (phone-based attribution)
  original_utm_source VARCHAR(100),
  original_utm_campaign VARCHAR(255),
  original_utm_medium VARCHAR(100),
  attribution_source VARCHAR(50),
  related_deal_id BIGINT,

  -- Timestamps
  sale_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  webhook_received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  -- Raw data for debugging
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_deal_id ON public.challenge3d_sales(deal_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_pipeline ON public.challenge3d_sales(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_status ON public.challenge3d_sales(status_id);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_source ON public.challenge3d_sales(utm_source);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_campaign ON public.challenge3d_sales(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_phone ON public.challenge3d_sales(phone);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_date ON public.challenge3d_sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_prepaid ON public.challenge3d_sales(prepaid);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_created_at ON public.challenge3d_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenge3d_sales_utm_date ON public.challenge3d_sales(utm_source, sale_date DESC);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_challenge3d_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_challenge3d_sales_updated_at ON public.challenge3d_sales;
CREATE TRIGGER trigger_update_challenge3d_sales_updated_at
  BEFORE UPDATE ON public.challenge3d_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_challenge3d_sales_updated_at();

-- ================================================================
-- VERIFICATION
-- ================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  -- Check landing_leads constraint
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'landing_leads_amocrm_lead_id_unique'
  ) INTO constraint_exists;

  -- Check challenge3d_sales table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'challenge3d_sales'
  ) INTO table_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS:';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'landing_leads.amocrm_lead_id UNIQUE: %',
    CASE WHEN constraint_exists THEN '✅ OK' ELSE '❌ FAILED' END;
  RAISE NOTICE 'challenge3d_sales table: %',
    CASE WHEN table_exists THEN '✅ OK' ELSE '❌ FAILED' END;
  RAISE NOTICE '========================================';

  IF constraint_exists AND table_exists THEN
    RAISE NOTICE '✅ ALL FIXES APPLIED SUCCESSFULLY!';
  ELSE
    RAISE NOTICE '❌ SOME FIXES FAILED - CHECK ERRORS ABOVE';
  END IF;
END $$;
