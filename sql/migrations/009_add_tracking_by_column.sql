-- Migration 009: Add tracking_by column
-- Purpose: Enable selection between utm_source and utm_medium tracking
-- Run this in Traffic Supabase project

ALTER TABLE traffic_targetologist_settings
ADD COLUMN IF NOT EXISTS tracking_by TEXT DEFAULT 'utm_source';

COMMENT ON COLUMN traffic_targetologist_settings.tracking_by IS
'Determines tracking field: utm_source (team-based) or utm_medium (traffic type)';

-- Update existing rows to use utm_source by default
UPDATE traffic_targetologist_settings
SET tracking_by = 'utm_source'
WHERE tracking_by IS NULL;
