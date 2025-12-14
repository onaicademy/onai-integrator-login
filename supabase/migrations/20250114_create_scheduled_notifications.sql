-- ============================================
-- Create scheduled_notifications table
-- For tracking email/SMS notification status
-- ============================================

CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.landing_leads(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email', 'sms', 'both')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes for performance
-- ============================================

-- Index for querying by lead_id
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_lead_id 
  ON public.scheduled_notifications(lead_id);

-- Index for querying pending notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status_scheduled 
  ON public.scheduled_notifications(status, scheduled_for) 
  WHERE status = 'pending';

-- ============================================
-- Updated_at trigger
-- ============================================

CREATE OR REPLACE FUNCTION update_scheduled_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_notifications_updated_at
  BEFORE UPDATE ON public.scheduled_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_notifications_updated_at();

-- ============================================
-- RLS Policies (allow all for now, restrict later)
-- ============================================

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (temporary - restrict in production)
CREATE POLICY "Allow all operations on scheduled_notifications"
  ON public.scheduled_notifications
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE public.scheduled_notifications IS 'Tracks scheduled email and SMS notifications for leads with 10-minute delay';
COMMENT ON COLUMN public.scheduled_notifications.lead_id IS 'Foreign key to landing_leads table';
COMMENT ON COLUMN public.scheduled_notifications.notification_type IS 'Type of notification: email, sms, or both';
COMMENT ON COLUMN public.scheduled_notifications.scheduled_for IS 'When the notification should be sent (typically created_at + 10 minutes)';
COMMENT ON COLUMN public.scheduled_notifications.status IS 'Current status: pending, sent, failed, cancelled';
COMMENT ON COLUMN public.scheduled_notifications.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN public.scheduled_notifications.metadata IS 'Additional metadata (email/SMS details, delivery info, etc)';
