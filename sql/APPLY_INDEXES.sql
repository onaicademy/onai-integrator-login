-- ⚡ ПРИМЕНИТЬ ЭТОТ SQL В SUPABASE DASHBOARD
-- https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- 
-- Скопируйте весь этот файл и вставьте в SQL Editor, затем нажмите RUN

-- ============================================
-- LANDING_LEADS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_landing_leads_email ON landing_leads(email);
CREATE INDEX IF NOT EXISTS idx_landing_leads_phone ON landing_leads(phone);
CREATE INDEX IF NOT EXISTS idx_landing_leads_created_at ON landing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_leads_amocrm_lead_id ON landing_leads(amocrm_lead_id) WHERE amocrm_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_landing_leads_email_tracking ON landing_leads(email, email_sent, email_clicked);
CREATE INDEX IF NOT EXISTS idx_landing_leads_sms_tracking ON landing_leads(phone, sms_sent, sms_clicked);
CREATE INDEX IF NOT EXISTS idx_landing_leads_source ON landing_leads(source);

-- ============================================
-- SCHEDULED_NOTIFICATIONS TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_lead_id ON scheduled_notifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(scheduled_for, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_for);

-- ============================================
-- UNIFIED_LEAD_TRACKING TABLE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_source_lead_id ON unified_lead_tracking(source_lead_id);
CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_email ON unified_lead_tracking(email);
CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_phone ON unified_lead_tracking(phone);
CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_source ON unified_lead_tracking(source, source_campaign);
CREATE INDEX IF NOT EXISTS idx_unified_lead_tracking_conversion ON unified_lead_tracking(email_sent, sms_sent, email_clicked, sms_clicked);

-- ============================================
-- UPDATE STATISTICS
-- ============================================

ANALYZE landing_leads;
ANALYZE scheduled_notifications;
ANALYZE unified_lead_tracking;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('landing_leads', 'scheduled_notifications', 'unified_lead_tracking')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Ожидается: 15 индексов
