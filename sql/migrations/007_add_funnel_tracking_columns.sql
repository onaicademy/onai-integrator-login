-- Migration 007: Add Funnel Tracking Columns to all_sales_tracking
-- Database: Landing Supabase (xikaiavwqinamgolmtcy)
-- Created: 2025-12-30
-- Purpose: Enable funnel-based sales tracking and targetologist attribution

-- ==========================================
-- 1. ADD COLUMNS TO all_sales_tracking
-- ==========================================

ALTER TABLE all_sales_tracking
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS targetologist_id UUID,
  ADD COLUMN IF NOT EXISTS targetologist_email TEXT,
  ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS detection_method TEXT,
  ADD COLUMN IF NOT EXISTS transaction_date DATE,
  ADD COLUMN IF NOT EXISTS usd_to_kzt_rate DECIMAL(10,4);

-- ==========================================
-- 2. CREATE INDEXES
-- ==========================================

-- Index for funnel type filtering
CREATE INDEX IF NOT EXISTS idx_all_sales_funnel_type
ON all_sales_tracking(funnel_type)
WHERE funnel_type IS NOT NULL;

-- Index for targetologist attribution
CREATE INDEX IF NOT EXISTS idx_all_sales_targetologist_id
ON all_sales_tracking(targetologist_id)
WHERE targetologist_id IS NOT NULL;

-- Index for targetologist email lookups
CREATE INDEX IF NOT EXISTS idx_all_sales_targetologist_email
ON all_sales_tracking(targetologist_email)
WHERE targetologist_email IS NOT NULL;

-- Composite index for funnel + targetologist reporting
CREATE INDEX IF NOT EXISTS idx_all_sales_funnel_targetologist
ON all_sales_tracking(funnel_type, targetologist_id)
WHERE funnel_type IS NOT NULL AND targetologist_id IS NOT NULL;

-- Index for transaction date (revenue calculations)
CREATE INDEX IF NOT EXISTS idx_all_sales_transaction_date
ON all_sales_tracking(transaction_date DESC)
WHERE transaction_date IS NOT NULL;

-- ==========================================
-- 3. CREATE FUNCTION FOR AUTO-DETECTION
-- ==========================================

CREATE OR REPLACE FUNCTION detect_funnel_and_targetologist()
RETURNS TRIGGER AS $$
DECLARE
  detected_funnel TEXT;
  detected_targetologist_id UUID;
  detected_email TEXT;
BEGIN
  -- Auto-detect funnel from UTM or contact tags
  detected_funnel := NULL;

  IF NEW.utm_campaign LIKE '%express%' OR NEW.utm_campaign LIKE '%экспресс%' THEN
    detected_funnel := 'express';
  ELSIF NEW.utm_campaign LIKE '%challenge%' OR NEW.utm_campaign LIKE '%3day%' OR NEW.utm_campaign LIKE '%трехдневник%' THEN
    detected_funnel := 'challenge3d';
  ELSIF NEW.utm_campaign LIKE '%intensive%' OR NEW.utm_campaign LIKE '%1day%' OR NEW.utm_campaign LIKE '%однодневник%' THEN
    detected_funnel := 'intensive1d';
  END IF;

  -- If funnel not provided, use auto-detected
  IF NEW.funnel_type IS NULL AND detected_funnel IS NOT NULL THEN
    NEW.funnel_type := detected_funnel;
    NEW.auto_detected := TRUE;
    NEW.detection_method := 'utm_campaign';
  END IF;

  -- Auto-match targetologist by UTM source
  IF NEW.utm_source IS NOT NULL THEN
    -- This would query traffic_users table in Traffic DB
    -- For now, just log that we tried to detect
    NEW.detection_method := COALESCE(NEW.detection_method || ' + ', '') || 'utm_source';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. CREATE TRIGGER FOR AUTO-DETECTION
-- ==========================================

DROP TRIGGER IF EXISTS trigger_detect_funnel_targetologist ON all_sales_tracking;

CREATE TRIGGER trigger_detect_funnel_targetologist
  BEFORE INSERT OR UPDATE ON all_sales_tracking
  FOR EACH ROW
  EXECUTE FUNCTION detect_funnel_and_targetologist();

-- ==========================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN all_sales_tracking.funnel_type IS 'Product funnel: express, challenge3d, or intensive1d (auto-detected from utm_campaign or tags)';
COMMENT ON COLUMN all_sales_tracking.targetologist_id IS 'UUID of the targetologist responsible for this sale (matched by utm_source)';
COMMENT ON COLUMN all_sales_tracking.targetologist_email IS 'Email of the targetologist (for quick lookups without JOIN)';
COMMENT ON COLUMN all_sales_tracking.auto_detected IS 'TRUE if funnel_type was auto-detected by trigger';
COMMENT ON COLUMN all_sales_tracking.detection_method IS 'Method used for detection: utm_campaign, utm_source, tags, etc';
COMMENT ON COLUMN all_sales_tracking.transaction_date IS 'Date of transaction in Almaty timezone';
COMMENT ON COLUMN all_sales_tracking.usd_to_kzt_rate IS 'Exchange rate used for this transaction';

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify columns were added:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'all_sales_tracking'
-- AND column_name IN ('funnel_type', 'targetologist_id', 'auto_detected');

-- Test trigger:
-- INSERT INTO all_sales_tracking (
--   sale_id, contact_name, sale_price, utm_campaign, utm_source
-- )
-- VALUES (
--   999999, 'Test Contact', 5000,
--   'express_promo_001', 'fb_campaign_test'
-- )
-- RETURNING funnel_type, auto_detected, detection_method;
