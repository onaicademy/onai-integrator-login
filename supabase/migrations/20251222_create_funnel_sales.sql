-- Migration: Funnel Sales Tracking
-- Date: 2025-12-22
-- Purpose: Track sales from AmoCRM for funnel metrics

-- Table to track all funnel sales
CREATE TABLE IF NOT EXISTS funnel_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- AmoCRM data
  amocrm_lead_id BIGINT UNIQUE NOT NULL,
  status_id INTEGER NOT NULL,
  pipeline_id INTEGER NOT NULL,
  
  -- Targetologist
  targetologist TEXT NOT NULL,
  
  -- UTM attribution
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Product & amount
  product TEXT NOT NULL, -- 'express_course', 'tripwire', 'main_490k', etc
  amount INTEGER NOT NULL, -- in KZT
  
  -- Funnel stage
  funnel_stage TEXT NOT NULL, -- 'proftest', 'express', 'payment', 'tripwire', 'main'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_funnel_sales_targetologist 
  ON funnel_sales(targetologist);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_funnel_stage 
  ON funnel_sales(funnel_stage);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_product 
  ON funnel_sales(product);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_created_at 
  ON funnel_sales(created_at);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_amocrm_lead_id 
  ON funnel_sales(amocrm_lead_id);

-- Add RLS policies
ALTER TABLE funnel_sales ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all to read
CREATE POLICY "Allow all to read funnel sales"
  ON funnel_sales
  FOR SELECT
  USING (true);

-- Policy: Allow system to insert
CREATE POLICY "Allow system to insert funnel sales"
  ON funnel_sales
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE funnel_sales IS 'Tracks all sales through the funnel from AmoCRM webhooks';
