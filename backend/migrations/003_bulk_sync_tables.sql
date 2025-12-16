-- ================================================
-- BULK SYNC TABLES
-- Tables for tracking bulk AmoCRM synchronization operations
-- ================================================

-- Table: bulk_syncs
-- Tracks bulk synchronization operations
CREATE TABLE IF NOT EXISTS public.bulk_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_leads INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk_syncs
CREATE INDEX IF NOT EXISTS idx_bulk_syncs_status ON public.bulk_syncs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_syncs_started_at ON public.bulk_syncs(started_at DESC);

-- Table: bulk_sync_results
-- Tracks individual lead sync results within a bulk operation
CREATE TABLE IF NOT EXISTS public.bulk_sync_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id UUID NOT NULL REFERENCES public.bulk_syncs(id) ON DELETE CASCADE,
    lead_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    contact_id BIGINT,
    deal_id BIGINT,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk_sync_results
CREATE INDEX IF NOT EXISTS idx_bulk_sync_results_sync_id ON public.bulk_sync_results(sync_id);
CREATE INDEX IF NOT EXISTS idx_bulk_sync_results_lead_id ON public.bulk_sync_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_bulk_sync_results_status ON public.bulk_sync_results(status);
CREATE INDEX IF NOT EXISTS idx_bulk_sync_results_created_at ON public.bulk_sync_results(created_at DESC);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_bulk_sync_results_sync_status ON public.bulk_sync_results(sync_id, status);

-- ================================================
-- UPDATE LANDING_LEADS TABLE
-- Add columns for AmoCRM sync tracking
-- ================================================

-- Add amocrm_sync_status column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_leads' 
        AND column_name = 'amocrm_sync_status'
    ) THEN
        ALTER TABLE public.landing_leads 
        ADD COLUMN amocrm_sync_status VARCHAR(50);
    END IF;
END $$;

-- Add amocrm_sync_attempts column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_leads' 
        AND column_name = 'amocrm_sync_attempts'
    ) THEN
        ALTER TABLE public.landing_leads 
        ADD COLUMN amocrm_sync_attempts INT DEFAULT 0;
    END IF;
END $$;

-- Add amocrm_sync_last_error column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_leads' 
        AND column_name = 'amocrm_sync_last_error'
    ) THEN
        ALTER TABLE public.landing_leads 
        ADD COLUMN amocrm_sync_last_error TEXT;
    END IF;
END $$;

-- Add amocrm_contact_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'landing_leads' 
        AND column_name = 'amocrm_contact_id'
    ) THEN
        ALTER TABLE public.landing_leads 
        ADD COLUMN amocrm_contact_id VARCHAR(50);
    END IF;
END $$;

-- Create index for sync status queries
CREATE INDEX IF NOT EXISTS idx_landing_leads_amocrm_sync_status 
ON public.landing_leads(amocrm_sync_status) 
WHERE amocrm_sync_status IS NOT NULL;

-- Create index for failed syncs
CREATE INDEX IF NOT EXISTS idx_landing_leads_failed_syncs 
ON public.landing_leads(amocrm_sync_status, amocrm_sync_attempts) 
WHERE amocrm_sync_status = 'failed';

-- ================================================
-- TRIGGERS FOR UPDATED_AT
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for bulk_syncs
DROP TRIGGER IF EXISTS update_bulk_syncs_updated_at ON public.bulk_syncs;
CREATE TRIGGER update_bulk_syncs_updated_at
    BEFORE UPDATE ON public.bulk_syncs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for bulk_sync_results
DROP TRIGGER IF EXISTS update_bulk_sync_results_updated_at ON public.bulk_sync_results;
CREATE TRIGGER update_bulk_sync_results_updated_at
    BEFORE UPDATE ON public.bulk_sync_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- COMMENTS
-- ================================================

COMMENT ON TABLE public.bulk_syncs IS 'Tracks bulk AmoCRM synchronization operations';
COMMENT ON TABLE public.bulk_sync_results IS 'Individual lead sync results within bulk operations';

COMMENT ON COLUMN public.bulk_syncs.status IS 'Status: pending, in_progress, completed, failed';
COMMENT ON COLUMN public.bulk_sync_results.status IS 'Status: success, failed, retrying';
COMMENT ON COLUMN public.landing_leads.amocrm_sync_status IS 'Last sync status: synced, failed, retrying';
COMMENT ON COLUMN public.landing_leads.amocrm_sync_attempts IS 'Number of sync attempts made';

-- ================================================
-- DONE
-- ================================================
-- Migration completed successfully

