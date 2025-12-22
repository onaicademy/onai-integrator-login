-- Migration: Campaign → Targetologist Mapping
-- Date: 2025-12-22
-- Purpose: Track which targetologist owns which Facebook campaign

-- Table to track campaign → targetologist mapping
CREATE TABLE IF NOT EXISTS campaign_targetologist_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Facebook campaign identifiers
  fb_campaign_id TEXT UNIQUE NOT NULL,
  fb_campaign_name TEXT NOT NULL,
  fb_account_id TEXT NOT NULL,
  
  -- Targetologist assignment
  targetologist TEXT NOT NULL,  -- 'Kenesary', 'Arystan', 'Muha', 'Traf4'
  confidence TEXT DEFAULT 'manual',  -- 'manual' | 'utm' | 'pattern' | 'database'
  
  -- For audit trail
  detected_utms JSONB,  -- {"utm_source": "...", "utm_campaign": "..."}
  detected_patterns JSONB,  -- ["nutrients", "kenesary"]
  
  -- Manual verification
  manually_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Notes
  notes TEXT
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_campaign_map_fb_campaign_id 
  ON campaign_targetologist_map(fb_campaign_id);
  
CREATE INDEX IF NOT EXISTS idx_campaign_map_targetologist 
  ON campaign_targetologist_map(targetologist);
  
CREATE INDEX IF NOT EXISTS idx_campaign_map_fb_account_id 
  ON campaign_targetologist_map(fb_account_id);

-- Add RLS policies (if needed)
ALTER TABLE campaign_targetologist_map ENABLE ROW LEVEL SECURITY;

-- Policy: Allow admin to read all
CREATE POLICY "Allow admin to read all campaign mappings"
  ON campaign_targetologist_map
  FOR SELECT
  USING (true);

-- Policy: Allow admin to insert/update
CREATE POLICY "Allow admin to manage campaign mappings"
  ON campaign_targetologist_map
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE campaign_targetologist_map IS 'Maps Facebook campaigns to targetologists using hybrid detection (DB > UTM > Pattern > Manual)';
