-- Migration: Make email optional in landing_leads table
-- Date: 2025-12-13
-- Reason: Landing page "Kaspi Auto-pay" doesn't require email (only name + phone)

-- Remove NOT NULL constraint from email column
ALTER TABLE public.landing_leads 
ALTER COLUMN email DROP NOT NULL;

-- Update comment
COMMENT ON COLUMN public.landing_leads.email IS 'User email address (optional - some landing pages collect only name + phone)';

-- Add check constraint to ensure at least email OR phone is provided
-- (This is already satisfied by phone being NOT NULL, but makes intention clearer)
ALTER TABLE public.landing_leads 
ADD CONSTRAINT landing_leads_contact_check 
CHECK (phone IS NOT NULL OR email IS NOT NULL);
