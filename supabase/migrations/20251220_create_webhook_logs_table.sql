-- Create webhook_logs table for debugging AmoCRM webhook processing
-- Migration: create_webhook_logs_table
-- Database: Tripwire (pjmvxecykysfrzppdcto)

CREATE TABLE IF NOT EXISTS webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'amocrm',
  pipeline_id BIGINT,
  lead_id BIGINT,
  deal_data JSONB,
  utm_source TEXT,
  utm_campaign TEXT,
  routing_decision TEXT, -- 'referral', 'traffic', 'both', 'unknown'
  processing_status TEXT, -- 'success', 'error', 'partial'
  error_message TEXT,
  processed_at TIMESTAMPTZ
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_lead_id ON webhook_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_routing_decision ON webhook_logs(routing_decision);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processing_status ON webhook_logs(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_pipeline_id ON webhook_logs(pipeline_id);

-- Add comments for documentation
COMMENT ON TABLE webhook_logs IS 'Log of all AmoCRM webhook calls for debugging and audit trail';
COMMENT ON COLUMN webhook_logs.source IS 'Webhook source (amocrm, facebook, etc.)';
COMMENT ON COLUMN webhook_logs.routing_decision IS 'Where webhook was routed: referral, traffic, both, unknown';
COMMENT ON COLUMN webhook_logs.processing_status IS 'Processing result: success, error, partial';
COMMENT ON COLUMN webhook_logs.deal_data IS 'Full JSON payload from AmoCRM for debugging';
COMMENT ON COLUMN webhook_logs.error_message IS 'Error details if processing_status = error';
