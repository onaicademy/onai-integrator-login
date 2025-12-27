-- ============================================
-- Создание отсутствующих таблиц для Traffic Dashboard
-- Phase 1 - Критические исправления
-- ============================================

-- ============================================
-- sales_activity_log - Лог активности продаж
-- ============================================
CREATE TABLE IF NOT EXISTS sales_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES all_sales_tracking(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'updated', 'attributed', 'deleted')),
  team_name TEXT,
  user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_sale_id ON sales_activity_log(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_team_name ON sales_activity_log(team_name);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_created_at ON sales_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_activity_log_user_id ON sales_activity_log(user_id);

-- RLS Policies
ALTER TABLE sales_activity_log ENABLE ROW LEVEL SECURITY;

-- Admins могут видеть все логи
CREATE POLICY "Admins can view all activity logs" ON sales_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins могут создавать логи
CREATE POLICY "Admins can insert activity logs" ON sales_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- lead_tracking - Трекинг лидов по UTM
-- ============================================
CREATE TABLE IF NOT EXISTS lead_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES landing_leads(id) ON DELETE CASCADE,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  team_name TEXT,
  attributed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_lead_tracking_lead_id ON lead_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_utm_source ON lead_tracking(utm_source);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_team_name ON lead_tracking(team_name);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_created_at ON lead_tracking(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_tracking_attributed_at ON lead_tracking(attributed_at DESC);

-- RLS Policies
ALTER TABLE lead_tracking ENABLE ROW LEVEL SECURITY;

-- Admins могут видеть все трекинг лидов
CREATE POLICY "Admins can view all lead tracking" ON lead_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins могут создавать записи
CREATE POLICY "Admins can insert lead tracking" ON lead_tracking
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Targetologists могут видеть только свои команды
CREATE POLICY "Targetologists can view their team lead tracking" ON lead_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() 
        AND team_name = traffic_users.team_name
        AND role = 'targetologist'
    )
  );

-- ============================================
-- audit_log - Лог аудита действий
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES traffic_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- RLS Policies
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admins могут видеть все логи аудита
CREATE POLICY "Admins can view all audit logs" ON audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins могут создавать записи
CREATE POLICY "Admins can insert audit logs" ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM traffic_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- Результаты
-- ============================================

-- Показать созданные таблицы
SELECT 'Созданные таблицы:' as info;
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sales_activity_log', 'lead_tracking', 'audit_log')
ORDER BY table_name;

-- Показать индексы
SELECT 'Созданные индексы:' as info;
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales_activity_log', 'lead_tracking', 'audit_log')
ORDER BY tablename, indexname;

-- Показать RLS policies
SELECT 'Созданные RLS policies:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('sales_activity_log', 'lead_tracking', 'audit_log')
ORDER BY tablename, policyname;
