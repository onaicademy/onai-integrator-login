-- ============================================================================
-- MCP Database Migration 015: Import Historical Leads from Landing DB
-- ============================================================================
-- Цель: Импорт исторических данных о лидах из базы данных лендинга
-- База данных SOURCE: Landing Supabase (xikaiavwqinamgolmtcy)
-- База данных TARGET: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Дата: 2026-01-04
-- Статус: ГОТОВО К ВЫПОЛНЕНИЮ
-- ============================================================================

-- ============================================================================
-- ВАЖНО: Этот скрипт состоит из двух частей
-- ============================================================================
-- PART A: Выполнить в Landing DB (xikaiavwqinamgolmtcy) - экспорт данных
-- PART B: Выполнить в Traffic DB (oetodaexnjcunklkdlkv) - импорт данных
-- ============================================================================

-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║                        PART A: LANDING DB                              ║
-- ║           Выполнить в Landing Supabase ПЕРВЫМ                          ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- STEP A1: Создать view для экспорта с трансформацией UTM
-- ============================================================================

CREATE OR REPLACE VIEW temp_leads_export_to_traffic AS
SELECT
  -- Lead ID (preserve for reference)
  ll.id as landing_lead_id,

  -- Extract UTM parameters from metadata JSONB
  COALESCE(ll.metadata->>'utm_source', ll.metadata->>'utmSource') as utm_source,
  COALESCE(ll.metadata->>'utm_campaign', ll.metadata->>'utmCampaign') as utm_campaign,
  COALESCE(ll.metadata->>'utm_medium', ll.metadata->>'utmMedium') as utm_medium,
  COALESCE(ll.metadata->>'utm_content', ll.metadata->>'utmContent') as utm_content,
  COALESCE(ll.metadata->>'utm_term', ll.metadata->>'utmTerm') as utm_term,

  -- Determine funnel type from source or metadata
  CASE
    WHEN ll.source ILIKE '%challenge%' OR ll.metadata->>'funnel_type' = 'challenge3d' THEN 'challenge3d'
    WHEN ll.source ILIKE '%intensive%' OR ll.metadata->>'funnel_type' = 'intensive1d' THEN 'intensive1d'
    WHEN ll.source ILIKE '%express%' OR ll.metadata->>'funnel_type' = 'express' THEN 'express'
    WHEN ll.metadata->>'funnel_type' IS NOT NULL THEN ll.metadata->>'funnel_type'
    ELSE 'express' -- default
  END as funnel_type,

  -- Lead status
  'new' as status,

  -- Contact information
  ll.phone,
  ll.email,
  ll.name,

  -- Lead source
  CASE
    WHEN ll.source = 'twland' THEN 'direct'
    WHEN ll.source ILIKE '%facebook%' THEN 'facebook'
    WHEN ll.source ILIKE '%tiktok%' THEN 'tiktok'
    WHEN ll.source ILIKE '%google%' THEN 'google'
    ELSE COALESCE(ll.source, 'direct')
  END as source,

  -- Facebook data (if available in metadata)
  ll.metadata->>'fb_lead_id' as fb_lead_id,
  ll.metadata->>'fb_form_id' as fb_form_id,
  ll.metadata->>'fb_ad_id' as fb_ad_id,
  ll.metadata->>'fb_adset_id' as fb_adset_id,
  ll.metadata->>'fb_campaign_id' as fb_campaign_id,

  -- AmoCRM integration
  CASE
    WHEN ll.amocrm_lead_id IS NOT NULL AND ll.amocrm_lead_id ~ '^[0-9]+$'
    THEN ll.amocrm_lead_id::BIGINT
    ELSE NULL
  END as amocrm_lead_id,
  CASE
    WHEN ll.amocrm_contact_id IS NOT NULL AND ll.amocrm_contact_id ~ '^[0-9]+$'
    THEN ll.amocrm_contact_id::BIGINT
    ELSE NULL
  END as amocrm_contact_id,

  -- Preserve full metadata
  ll.metadata as original_metadata,

  -- Timestamps
  ll.created_at,
  ll.updated_at

FROM public.landing_leads ll
WHERE ll.created_at >= '2024-01-01'::date  -- Adjust date range as needed
ORDER BY ll.created_at ASC;

-- ============================================================================
-- STEP A2: Статистика экспортируемых данных
-- ============================================================================

SELECT
  '📊 LANDING DB EXPORT STATISTICS' as section,
  '' as metric,
  0 as count

UNION ALL

SELECT
  '',
  'Total leads to export',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic

UNION ALL

SELECT
  '',
  '├─ With utm_source',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

SELECT
  '',
  '├─ Funnel: express',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE funnel_type = 'express'

UNION ALL

SELECT
  '',
  '├─ Funnel: challenge3d',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE funnel_type = 'challenge3d'

UNION ALL

SELECT
  '',
  '├─ Funnel: intensive1d',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE funnel_type = 'intensive1d'

UNION ALL

SELECT
  '',
  '├─ Synced to AmoCRM',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE amocrm_lead_id IS NOT NULL

UNION ALL

SELECT
  '',
  '└─ From Facebook',
  COUNT(*)::INTEGER
FROM temp_leads_export_to_traffic
WHERE source = 'facebook'
ORDER BY section DESC, metric;

-- ============================================================================
-- STEP A3: Показать первые 10 записей для проверки
-- ============================================================================

SELECT
  '📋 SAMPLE DATA (first 10 leads)' as info,
  NULL::UUID as landing_lead_id,
  NULL::TEXT as utm_source,
  NULL::TEXT as funnel_type,
  NULL::TEXT as name,
  NULL::TEXT as email,
  NULL::TIMESTAMP WITH TIME ZONE as created_at

UNION ALL

SELECT
  '',
  landing_lead_id,
  utm_source,
  funnel_type,
  name,
  email,
  created_at
FROM temp_leads_export_to_traffic
LIMIT 10;

-- ============================================================================
-- STEP A4: ЭКСПОРТ ДАННЫХ
-- ============================================================================

-- 🔹 ВАРИАНТ 1: Скопировать результаты этого запроса
SELECT * FROM temp_leads_export_to_traffic;

-- 🔹 ВАРИАНТ 2: Экспорт в CSV (если есть доступ к файловой системе)
-- COPY (SELECT * FROM temp_leads_export_to_traffic) TO '/tmp/leads_export.csv' WITH CSV HEADER;

-- ============================================================================
-- ✅ PART A ЗАВЕРШЕНА: Данные готовы к экспорту
-- ============================================================================
-- Теперь выполните PART B в Traffic DB (oetodaexnjcunklkdlkv)
-- ============================================================================










-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║                        PART B: TRAFFIC DB                              ║
-- ║           Выполнить в Traffic Supabase ВТОРЫМ                          ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- STEP B1: Проверка зависимостей
-- ============================================================================

DO $$
DECLARE
  v_traffic_leads_exists BOOLEAN;
  v_traffic_user_utm_sources_exists BOOLEAN;
  v_traffic_users_exists BOOLEAN;
BEGIN
  -- Check if required tables exist
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'traffic_leads'
  ) INTO v_traffic_leads_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'traffic_user_utm_sources'
  ) INTO v_traffic_user_utm_sources_exists;

  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'traffic_users'
  ) INTO v_traffic_users_exists;

  IF NOT v_traffic_leads_exists THEN
    RAISE EXCEPTION '❌ Table traffic_leads does not exist. Run migration 014 first!';
  END IF;

  IF NOT v_traffic_user_utm_sources_exists THEN
    RAISE EXCEPTION '❌ Table traffic_user_utm_sources does not exist. Run migration 011 first!';
  END IF;

  IF NOT v_traffic_users_exists THEN
    RAISE EXCEPTION '❌ Table traffic_users does not exist!';
  END IF;

  RAISE NOTICE '✅ All required tables exist';
END $$;

-- ============================================================================
-- STEP B2: Создать временную таблицу для импорта
-- ============================================================================

DROP TABLE IF EXISTS temp_leads_import_staging;

CREATE TEMPORARY TABLE temp_leads_import_staging (
  landing_lead_id UUID,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  funnel_type TEXT,
  status TEXT,
  phone TEXT,
  email TEXT,
  name TEXT,
  source TEXT,
  fb_lead_id TEXT,
  fb_form_id TEXT,
  fb_ad_id TEXT,
  fb_adset_id TEXT,
  fb_campaign_id TEXT,
  amocrm_lead_id BIGINT,
  amocrm_contact_id BIGINT,
  original_metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- STEP B3: ЗАГРУЗИТЬ ДАННЫЕ
-- ============================================================================

-- 🔹 ВАРИАНТ 1: Вставить данные вручную из результатов PART A
-- INSERT INTO temp_leads_import_staging VALUES
-- ('uuid-1', 'utm_source', 'utm_campaign', ...),
-- ('uuid-2', 'utm_source', 'utm_campaign', ...);

-- 🔹 ВАРИАНТ 2: Загрузить из CSV файла
-- \COPY temp_leads_import_staging FROM '/tmp/leads_export.csv' WITH (FORMAT csv, HEADER true);

-- 🔹 ВАРИАНТ 3: Использовать postgres_fdw (если настроен)
-- См. файл 015_import_historical_leads_PART3_fdw.sql

-- ⚠️ ВАЖНО: После загрузки данных продолжите к STEP B4

-- ============================================================================
-- STEP B4: Импортировать лиды в traffic_leads
-- ============================================================================

INSERT INTO public.traffic_leads (
  id,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  funnel_type,
  status,
  phone,
  email,
  name,
  source,
  fb_lead_id,
  fb_form_id,
  fb_ad_id,
  fb_adset_id,
  fb_campaign_id,
  amocrm_lead_id,
  amocrm_contact_id,
  metadata,
  created_at,
  updated_at
)
SELECT
  landing_lead_id as id,
  utm_source,
  utm_campaign,
  utm_medium,
  utm_content,
  utm_term,
  funnel_type,
  status,
  phone,
  email,
  name,
  source,
  fb_lead_id,
  fb_form_id,
  fb_ad_id,
  fb_adset_id,
  fb_campaign_id,
  amocrm_lead_id,
  amocrm_contact_id,
  original_metadata as metadata,
  created_at,
  updated_at
FROM temp_leads_import_staging
ON CONFLICT (id) DO NOTHING;  -- Skip duplicates

-- ============================================================================
-- STEP B5: Статистика импорта
-- ============================================================================

SELECT
  '📊 TRAFFIC DB IMPORT STATISTICS' as section,
  '' as metric,
  0 as count

UNION ALL

SELECT
  '',
  'Total leads imported',
  COUNT(*)::INTEGER
FROM public.traffic_leads

UNION ALL

SELECT
  '',
  '├─ With utm_source',
  COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

SELECT
  '',
  '├─ Funnel: express',
  COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE funnel_type = 'express'

UNION ALL

SELECT
  '',
  '├─ Funnel: challenge3d',
  COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE funnel_type = 'challenge3d'

UNION ALL

SELECT
  '',
  '└─ Funnel: intensive1d',
  COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE funnel_type = 'intensive1d'
ORDER BY section DESC, metric;

-- ============================================================================
-- STEP B6: Атрибуция к таргетологам
-- ============================================================================

-- Проверить, сколько лидов атрибутировано к таргетологам
SELECT
  '👥 TARGETOLOGIST ATTRIBUTION' as section,
  '' as targetologist,
  '' as team,
  '' as utm_source,
  0 as leads_count

UNION ALL

SELECT
  '',
  u.full_name,
  u.team_name,
  uus.utm_source,
  COUNT(DISTINCT tl.id)::INTEGER
FROM public.traffic_user_utm_sources uus
JOIN public.traffic_users u ON uus.user_id = u.id
LEFT JOIN public.traffic_leads tl ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
WHERE uus.is_active = TRUE
GROUP BY u.full_name, u.team_name, uus.utm_source
ORDER BY section DESC, leads_count DESC;

-- ============================================================================
-- STEP B7: Лиды без атрибуции (требуют настройки UTM)
-- ============================================================================

SELECT
  '⚠️ LEADS WITHOUT ATTRIBUTION' as section,
  '' as utm_source,
  '' as funnel_type,
  0 as count

UNION ALL

SELECT
  '',
  tl.utm_source,
  tl.funnel_type,
  COUNT(*)::INTEGER
FROM public.traffic_leads tl
LEFT JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE tl.utm_source IS NOT NULL
  AND tl.utm_source != ''
  AND uus.id IS NULL
GROUP BY tl.utm_source, tl.funnel_type
ORDER BY section DESC, count DESC
LIMIT 21;  -- Show top 20 + header

-- ============================================================================
-- STEP B8: Создать аналитические views
-- ============================================================================

-- View: Лиды по таргетологам и датам
CREATE OR REPLACE VIEW v_leads_by_targetologist_daily AS
SELECT
  DATE(tl.created_at) as date,
  u.id as user_id,
  u.full_name as targetologist,
  u.team_name,
  uus.utm_source,
  tl.funnel_type,
  COUNT(tl.id) as leads_count
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
JOIN public.traffic_users u ON uus.user_id = u.id
WHERE u.is_active = TRUE AND uus.is_active = TRUE
GROUP BY DATE(tl.created_at), u.id, u.full_name, u.team_name, uus.utm_source, tl.funnel_type;

COMMENT ON VIEW v_leads_by_targetologist_daily IS 'Ежедневные лиды по таргетологам с UTM атрибуцией';

-- View: Лиды по командам
CREATE OR REPLACE VIEW v_leads_by_team_daily AS
SELECT
  DATE(tl.created_at) as date,
  COALESCE(u.team_name, 'Unassigned') as team_name,
  tl.funnel_type,
  tl.source,
  COUNT(tl.id) as leads_count
FROM public.traffic_leads tl
LEFT JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
LEFT JOIN public.traffic_users u ON uus.user_id = u.id
GROUP BY DATE(tl.created_at), u.team_name, tl.funnel_type, tl.source;

COMMENT ON VIEW v_leads_by_team_daily IS 'Ежедневные лиды по командам';

-- View: ТОП UTM источников по лидам
CREATE OR REPLACE VIEW v_top_utm_sources_by_leads AS
SELECT
  utm_source,
  funnel_type,
  COUNT(*) as total_leads,
  COUNT(DISTINCT DATE(created_at)) as active_days,
  MIN(created_at) as first_lead_date,
  MAX(created_at) as last_lead_date,
  COUNT(*) FILTER (WHERE amocrm_lead_id IS NOT NULL) as synced_to_amocrm
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''
GROUP BY utm_source, funnel_type
ORDER BY total_leads DESC;

COMMENT ON VIEW v_top_utm_sources_by_leads IS 'ТОП UTM источников по количеству лидов';

-- ============================================================================
-- STEP B9: Cleanup
-- ============================================================================

DROP TABLE IF EXISTS temp_leads_import_staging;

-- ============================================================================
-- ✅ MIGRATION 015 COMPLETED!
-- ============================================================================

SELECT
  '✅ Migration 015: Historical leads import completed!' as status,
  COUNT(*) as total_leads_imported
FROM public.traffic_leads;

-- ============================================================================
-- 📊 VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Лиды за последние 30 дней по таргетологам
SELECT * FROM v_leads_by_targetologist_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC, leads_count DESC
LIMIT 20;

-- Query 2: ТОП 10 UTM источников
SELECT * FROM v_top_utm_sources_by_leads
LIMIT 10;

-- Query 3: Ежедневная статистика лидов
SELECT
  date,
  SUM(leads_count) as total_leads,
  COUNT(DISTINCT team_name) as active_teams
FROM v_leads_by_team_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- ============================================================================
-- 🔧 POST-MIGRATION TASKS
-- ============================================================================

/*
TODO после миграции:

1. ✅ Добавить недостающие UTM источники в traffic_user_utm_sources
   Для лидов без атрибуции (см. STEP B7)

2. ✅ Настроить автоматическую синхронизацию
   Создать cronjob или trigger для регулярного импорта новых лидов

3. ✅ Проверить дашборды
   Убедиться, что метрики лидов отображаются корректно

4. ✅ Настроить алерты
   Уведомления о новых лидах без атрибуции

5. ✅ Документировать процесс
   Обновить документацию по работе с лидами
*/
