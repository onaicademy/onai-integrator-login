-- Migration: Create landing_leads table for collecting leads from /twland
-- Created: 2025-01-08

-- Create landing_leads table
CREATE TABLE IF NOT EXISTS public.landing_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'twland',
  amocrm_lead_id TEXT,
  amocrm_synced BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS landing_leads_email_idx ON public.landing_leads(email);
CREATE INDEX IF NOT EXISTS landing_leads_created_at_idx ON public.landing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS landing_leads_amocrm_synced_idx ON public.landing_leads(amocrm_synced);

-- Enable RLS
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role full access
CREATE POLICY "Service role has full access to landing_leads"
  ON public.landing_leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Allow anon to insert only
CREATE POLICY "Allow anon to insert landing_leads"
  ON public.landing_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_landing_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_landing_leads_updated_at ON public.landing_leads;
CREATE TRIGGER update_landing_leads_updated_at
  BEFORE UPDATE ON public.landing_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_landing_leads_updated_at();

-- Add comment to table
COMMENT ON TABLE public.landing_leads IS 'Stores leads collected from landing page /twland';
COMMENT ON COLUMN public.landing_leads.email IS 'User email address';
COMMENT ON COLUMN public.landing_leads.name IS 'User full name';
COMMENT ON COLUMN public.landing_leads.phone IS 'User phone number';
COMMENT ON COLUMN public.landing_leads.source IS 'Landing page source (default: twland)';
COMMENT ON COLUMN public.landing_leads.amocrm_lead_id IS 'AmoCRM lead/deal ID after sync';
COMMENT ON COLUMN public.landing_leads.amocrm_synced IS 'Whether lead was synced to AmoCRM';
COMMENT ON COLUMN public.landing_leads.metadata IS 'Additional metadata (UTM params, device info, etc)';
