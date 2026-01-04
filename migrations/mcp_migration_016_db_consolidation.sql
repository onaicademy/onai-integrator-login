-- ============================================================================
-- MCP Database Migration 016: Database Consolidation (Landing → Traffic)
-- ============================================================================
-- Цель: Консолидация всех данных из Landing DB в Traffic DB
-- База данных SOURCE: Landing Supabase (xikaiavwqinamgolmtcy)
-- База данных TARGET: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Дата: 2026-01-04
-- Приоритет: 🔴 КРИТИЧЕСКИЙ
-- ============================================================================

-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║                    PART 1: ПОДГОТОВКА TRAFFIC DB                       ║
-- ║          Выполнить в Traffic DB (oetodaexnjcunklkdlkv)                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- STEP 1.1: Расширить таблицу traffic_leads
-- ============================================================================

-- Добавить колонки из landing_leads, которых нет в traffic_leads
ALTER TABLE public.traffic_leads
  ADD COLUMN IF NOT EXISTS phone_normalized TEXT,
  ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_clicked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_clicked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sms_clicked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_clicked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Создать индекс для phone_normalized (для дедупликации)
CREATE INDEX IF NOT EXISTS idx_traffic_leads_phone_normalized
  ON public.traffic_leads(phone_normalized);

-- ============================================================================
-- STEP 1.2: Создать таблицу traffic_lead_journey
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.traffic_lead_journey (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Связь с лидом
  lead_id UUID NOT NULL REFERENCES public.traffic_leads(id) ON DELETE CASCADE,

  -- Этап воронки
  stage TEXT NOT NULL,
  -- Stages: 'proftest_submitted', 'expresscourse_clicked', 'expresscourse_submitted',
  --         'payment_kaspi', 'payment_card', 'payment_manager'

  -- Источник перехода
  source TEXT,
  -- Sources: 'proftest_arystan', 'proftest_kenesary', 'expresscourse', etc.

  -- Дополнительные данные
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы для traffic_lead_journey
CREATE INDEX IF NOT EXISTS idx_traffic_lead_journey_lead_id
  ON public.traffic_lead_journey(lead_id);

CREATE INDEX IF NOT EXISTS idx_traffic_lead_journey_stage
  ON public.traffic_lead_journey(stage);

CREATE INDEX IF NOT EXISTS idx_traffic_lead_journey_created_at
  ON public.traffic_lead_journey(created_at DESC);

-- Композитный индекс для быстрого поиска последнего stage лида
CREATE INDEX IF NOT EXISTS idx_traffic_lead_journey_lead_stage
  ON public.traffic_lead_journey(lead_id, created_at DESC);

-- Комментарии
COMMENT ON TABLE public.traffic_lead_journey IS 'Отслеживание прогресса лида через этапы воронки (proftest → expresscourse → payment)';
COMMENT ON COLUMN public.traffic_lead_journey.stage IS 'Идентификатор этапа (proftest_submitted, expresscourse_clicked, payment_*)';
COMMENT ON COLUMN public.traffic_lead_journey.source IS 'Источник/кампания, которая привела к этому этапу';
COMMENT ON COLUMN public.traffic_lead_journey.metadata IS 'Дополнительные данные этапа (ответы, метод оплаты, UTM и т.д.)';

-- ============================================================================
-- STEP 1.3: Создать функции для работы с лидами
-- ============================================================================

-- Функция нормализации телефонов
CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Удалить все символы кроме цифр и начального +
  RETURN regexp_replace(phone, '[^0-9+]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_phone IS 'Нормализует телефон для дедупликации (удаляет пробелы, дефисы, скобки)';

-- Функция поиска или создания unified лида
CREATE OR REPLACE FUNCTION public.find_or_create_unified_lead(
  p_email TEXT,
  p_name TEXT,
  p_phone TEXT,
  p_source TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
  v_phone_normalized TEXT;
BEGIN
  -- Нормализовать телефон
  v_phone_normalized := normalize_phone(p_phone);

  -- Попытаться найти существующего лида по телефону ИЛИ email (приоритет телефону)
  SELECT id INTO v_lead_id
  FROM public.traffic_leads
  WHERE phone_normalized = v_phone_normalized
     OR (p_email IS NOT NULL AND email = p_email)
  ORDER BY created_at ASC -- Взять самого СТАРОГО (первого) лида
  LIMIT 1;

  -- Если найден, обновить имя/email если предоставлена новая информация
  IF v_lead_id IS NOT NULL THEN
    UPDATE public.traffic_leads
    SET
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      phone_normalized = v_phone_normalized,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_lead_id;

    RETURN v_lead_id;
  END IF;

  -- Если не найден, создать нового лида
  INSERT INTO public.traffic_leads (email, name, phone, phone_normalized, source, metadata)
  VALUES (p_email, p_name, p_phone, v_phone_normalized, p_source, p_metadata)
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.find_or_create_unified_lead IS 'Находит существующего лида или создает нового, предотвращая дубликаты';

-- ============================================================================
-- STEP 1.4: Создать VIEW для совместимости
-- ============================================================================

-- View: Лиды с их journey (аналог leads_with_journey из Landing DB)
CREATE OR REPLACE VIEW public.v_traffic_leads_with_journey AS
SELECT
  tl.*,
  COALESCE(
    json_agg(
      json_build_object(
        'id', tlj.id,
        'stage', tlj.stage,
        'source', tlj.source,
        'metadata', tlj.metadata,
        'created_at', tlj.created_at
      ) ORDER BY tlj.created_at ASC
    ) FILTER (WHERE tlj.id IS NOT NULL),
    '[]'::json
  ) as journey_stages,

  -- Добавить информацию о таргетологе (атрибуция)
  u.id as targetologist_id,
  u.full_name as targetologist_name,
  u.team_name as targetologist_team,
  uus.utm_source as attributed_utm_source

FROM public.traffic_leads tl
LEFT JOIN public.traffic_lead_journey tlj ON tlj.lead_id = tl.id
LEFT JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
  AND (uus.funnel_type IS NULL OR tl.funnel_type = uus.funnel_type)
LEFT JOIN public.traffic_users u ON uus.user_id = u.id AND u.is_active = TRUE
GROUP BY tl.id, u.id, u.full_name, u.team_name, uus.utm_source
ORDER BY tl.created_at DESC;

COMMENT ON VIEW public.v_traffic_leads_with_journey IS 'Лиды с этапами journey и атрибуцией к таргетологу';

-- View: Последний этап каждого лида
CREATE OR REPLACE VIEW public.v_traffic_leads_last_stage AS
SELECT DISTINCT ON (lead_id)
  lead_id,
  stage as last_stage,
  source as last_source,
  created_at as last_stage_at
FROM public.traffic_lead_journey
ORDER BY lead_id, created_at DESC;

COMMENT ON VIEW public.v_traffic_leads_last_stage IS 'Последний этап воронки для каждого лида';

-- ============================================================================
-- ✅ PART 1 ЗАВЕРШЕНА: Traffic DB подготовлена
-- ============================================================================

SELECT '✅ PART 1 COMPLETED: Traffic DB schema extended' as status;










-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║              PART 2: ЭКСПОРТ ИЗ LANDING DB                             ║
-- ║          Выполнить в Landing DB (xikaiavwqinamgolmtcy)                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- STEP 2.1: Создать view для экспорта landing_leads
-- ============================================================================

CREATE OR REPLACE VIEW temp_export_landing_leads AS
SELECT
  id,
  email,
  name,
  phone,
  normalize_phone(phone) as phone_normalized,
  source,
  metadata,
  amocrm_lead_id,
  amocrm_contact_id,
  amocrm_synced,
  email_sent,
  sms_sent,
  email_clicked,
  email_clicked_at,
  sms_clicked,
  sms_clicked_at,
  click_count,
  created_at,
  updated_at,

  -- Извлечь UTM из metadata для удобства
  COALESCE(metadata->>'utm_source', metadata->>'utmSource') as utm_source,
  COALESCE(metadata->>'utm_campaign', metadata->>'utmCampaign') as utm_campaign,
  COALESCE(metadata->>'utm_medium', metadata->>'utmMedium') as utm_medium,

  -- Определить funnel_type
  CASE
    WHEN source ILIKE '%challenge%' OR metadata->>'funnel_type' = 'challenge3d' THEN 'challenge3d'
    WHEN source ILIKE '%intensive%' OR metadata->>'funnel_type' = 'intensive1d' THEN 'intensive1d'
    WHEN source ILIKE '%express%' OR metadata->>'funnel_type' = 'express' THEN 'express'
    ELSE 'express'
  END as funnel_type

FROM public.landing_leads
WHERE created_at >= '2024-01-01'::date
ORDER BY created_at ASC;

-- ============================================================================
-- STEP 2.2: Создать view для экспорта lead_journey
-- ============================================================================

CREATE OR REPLACE VIEW temp_export_lead_journey AS
SELECT
  id,
  lead_id,
  stage,
  source,
  metadata,
  created_at
FROM public.lead_journey
WHERE created_at >= '2024-01-01'::date
ORDER BY lead_id, created_at ASC;

-- ============================================================================
-- STEP 2.3: Статистика экспорта
-- ============================================================================

SELECT
  '📊 LANDING DB EXPORT STATISTICS' as section,
  '' as metric,
  0 as count

UNION ALL

SELECT '', 'Total leads to export', COUNT(*)::INTEGER
FROM temp_export_landing_leads

UNION ALL

SELECT '', '├─ With UTM source', COUNT(*)::INTEGER
FROM temp_export_landing_leads
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

SELECT '', '├─ Synced to AmoCRM', COUNT(*)::INTEGER
FROM temp_export_landing_leads
WHERE amocrm_synced = TRUE

UNION ALL

SELECT '', '└─ With email sent', COUNT(*)::INTEGER
FROM temp_export_landing_leads
WHERE email_sent = TRUE

UNION ALL

SELECT '', 'Total journey stages', COUNT(*)::INTEGER
FROM temp_export_lead_journey

ORDER BY section DESC, metric;

-- ============================================================================
-- STEP 2.4: ЭКСПОРТ ДАННЫХ
-- ============================================================================

-- 🔹 Экспортировать лиды
SELECT * FROM temp_export_landing_leads;

-- 🔹 Экспортировать journey stages
SELECT * FROM temp_export_lead_journey;

-- ============================================================================
-- ✅ PART 2 ЗАВЕРШЕНА: Данные экспортированы из Landing DB
-- ============================================================================

SELECT '✅ PART 2 COMPLETED: Data exported from Landing DB' as status;

-- Скопируйте результаты и перейдите к PART 3 в Traffic DB










-- ╔════════════════════════════════════════════════════════════════════════╗
-- ║              PART 3: ИМПОРТ В TRAFFIC DB                               ║
-- ║          Выполнить в Traffic DB (oetodaexnjcunklkdlkv)                 ║
-- ╚════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- STEP 3.1: Создать staging таблицы для импорта
-- ============================================================================

DROP TABLE IF EXISTS temp_import_leads_staging;
DROP TABLE IF EXISTS temp_import_journey_staging;

CREATE TEMPORARY TABLE temp_import_leads_staging (
  id UUID,
  email TEXT,
  name TEXT,
  phone TEXT,
  phone_normalized TEXT,
  source TEXT,
  metadata JSONB,
  amocrm_lead_id TEXT,
  amocrm_contact_id TEXT,
  amocrm_synced BOOLEAN,
  email_sent BOOLEAN,
  sms_sent BOOLEAN,
  email_clicked BOOLEAN,
  email_clicked_at TIMESTAMP WITH TIME ZONE,
  sms_clicked BOOLEAN,
  sms_clicked_at TIMESTAMP WITH TIME ZONE,
  click_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  funnel_type TEXT
);

CREATE TEMPORARY TABLE temp_import_journey_staging (
  id UUID,
  lead_id UUID,
  stage TEXT,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- STEP 3.2: ЗАГРУЗИТЬ ДАННЫЕ
-- ============================================================================

-- 🔹 ВАРИАНТ 1: Вставить данные вручную из PART 2
-- INSERT INTO temp_import_leads_staging VALUES (...);
-- INSERT INTO temp_import_journey_staging VALUES (...);

-- 🔹 ВАРИАНТ 2: Загрузить из CSV
-- \COPY temp_import_leads_staging FROM '/tmp/landing_leads_export.csv' WITH (FORMAT csv, HEADER true);
-- \COPY temp_import_journey_staging FROM '/tmp/lead_journey_export.csv' WITH (FORMAT csv, HEADER true);

-- ⚠️ ВАЖНО: После загрузки данных продолжите к STEP 3.3

-- ============================================================================
-- STEP 3.3: Импортировать лиды в traffic_leads
-- ============================================================================

INSERT INTO public.traffic_leads (
  id,
  email,
  name,
  phone,
  phone_normalized,
  source,
  metadata,
  amocrm_lead_id,
  amocrm_contact_id,
  email_sent,
  sms_sent,
  email_clicked,
  email_clicked_at,
  sms_clicked,
  sms_clicked_at,
  click_count,
  utm_source,
  utm_campaign,
  utm_medium,
  funnel_type,
  status,
  created_at,
  updated_at
)
SELECT
  s.id,
  s.email,
  s.name,
  s.phone,
  s.phone_normalized,
  CASE
    WHEN s.source = 'twland' THEN 'direct'
    WHEN s.source ILIKE '%facebook%' THEN 'facebook'
    ELSE COALESCE(s.source, 'direct')
  END as source,
  s.metadata,
  CASE
    WHEN s.amocrm_lead_id IS NOT NULL AND s.amocrm_lead_id ~ '^[0-9]+$'
    THEN s.amocrm_lead_id::BIGINT
    ELSE NULL
  END as amocrm_lead_id,
  CASE
    WHEN s.amocrm_contact_id IS NOT NULL AND s.amocrm_contact_id ~ '^[0-9]+$'
    THEN s.amocrm_contact_id::BIGINT
    ELSE NULL
  END as amocrm_contact_id,
  COALESCE(s.email_sent, FALSE),
  COALESCE(s.sms_sent, FALSE),
  COALESCE(s.email_clicked, FALSE),
  s.email_clicked_at,
  COALESCE(s.sms_clicked, FALSE),
  s.sms_clicked_at,
  COALESCE(s.click_count, 0),
  s.utm_source,
  s.utm_campaign,
  s.utm_medium,
  s.funnel_type,
  'new' as status, -- Статус по умолчанию
  s.created_at,
  s.updated_at
FROM temp_import_leads_staging s
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  phone_normalized = EXCLUDED.phone_normalized,
  source = EXCLUDED.source,
  metadata = EXCLUDED.metadata,
  amocrm_lead_id = EXCLUDED.amocrm_lead_id,
  amocrm_contact_id = EXCLUDED.amocrm_contact_id,
  email_sent = EXCLUDED.email_sent,
  sms_sent = EXCLUDED.sms_sent,
  email_clicked = EXCLUDED.email_clicked,
  email_clicked_at = EXCLUDED.email_clicked_at,
  sms_clicked = EXCLUDED.sms_clicked,
  sms_clicked_at = EXCLUDED.sms_clicked_at,
  click_count = EXCLUDED.click_count,
  utm_source = EXCLUDED.utm_source,
  utm_campaign = EXCLUDED.utm_campaign,
  utm_medium = EXCLUDED.utm_medium,
  funnel_type = EXCLUDED.funnel_type,
  updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- STEP 3.4: Импортировать journey stages
-- ============================================================================

INSERT INTO public.traffic_lead_journey (
  id,
  lead_id,
  stage,
  source,
  metadata,
  created_at
)
SELECT
  s.id,
  s.lead_id,
  s.stage,
  s.source,
  s.metadata,
  s.created_at
FROM temp_import_journey_staging s
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 3.5: Статистика импорта
-- ============================================================================

SELECT
  '📊 TRAFFIC DB IMPORT STATISTICS' as section,
  '' as metric,
  0 as count

UNION ALL

SELECT '', 'Total leads imported', COUNT(*)::INTEGER
FROM public.traffic_leads

UNION ALL

SELECT '', '├─ With UTM source', COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE utm_source IS NOT NULL AND utm_source != ''

UNION ALL

SELECT '', '├─ Attributed to targetologists', COUNT(DISTINCT tl.id)::INTEGER
FROM public.traffic_leads tl
JOIN public.traffic_user_utm_sources uus ON LOWER(tl.utm_source) = LOWER(uus.utm_source)

UNION ALL

SELECT '', '├─ Synced to AmoCRM', COUNT(*)::INTEGER
FROM public.traffic_leads
WHERE amocrm_lead_id IS NOT NULL

UNION ALL

SELECT '', '└─ With journey stages', COUNT(DISTINCT lead_id)::INTEGER
FROM public.traffic_lead_journey

UNION ALL

SELECT '', 'Total journey stages', COUNT(*)::INTEGER
FROM public.traffic_lead_journey

ORDER BY section DESC, metric;

-- ============================================================================
-- STEP 3.6: Верификация атрибуции
-- ============================================================================

SELECT
  '👥 TARGETOLOGIST ATTRIBUTION' as section,
  '' as targetologist,
  '' as team,
  0 as leads_count

UNION ALL

SELECT
  '',
  u.full_name,
  u.team_name,
  COUNT(DISTINCT tl.id)::INTEGER
FROM public.traffic_user_utm_sources uus
JOIN public.traffic_users u ON uus.user_id = u.id
LEFT JOIN public.traffic_leads tl ON LOWER(tl.utm_source) = LOWER(uus.utm_source)
WHERE uus.is_active = TRUE
GROUP BY u.full_name, u.team_name
ORDER BY section DESC, leads_count DESC;

-- ============================================================================
-- STEP 3.7: Очистка staging таблиц
-- ============================================================================

DROP TABLE IF EXISTS temp_import_leads_staging;
DROP TABLE IF EXISTS temp_import_journey_staging;

-- ============================================================================
-- ✅ PART 3 ЗАВЕРШЕНА: Данные импортированы в Traffic DB
-- ============================================================================

SELECT
  '✅ MIGRATION 016 COMPLETED: Database consolidation successful!' as status,
  COUNT(DISTINCT tl.id) as total_leads,
  COUNT(tlj.id) as total_journey_stages
FROM public.traffic_leads tl
LEFT JOIN public.traffic_lead_journey tlj ON tlj.lead_id = tl.id;

-- ============================================================================
-- 📊 VERIFICATION QUERIES
-- ============================================================================

-- Query 1: Лиды с journey и атрибуцией
SELECT * FROM v_traffic_leads_with_journey
LIMIT 10;

-- Query 2: Последний этап каждого лида
SELECT
  tl.name,
  tl.email,
  tl.phone,
  tl.utm_source,
  tl.funnel_type,
  ls.last_stage,
  ls.last_stage_at,
  tl.targetologist_name,
  tl.targetologist_team
FROM v_traffic_leads_with_journey tl
LEFT JOIN v_traffic_leads_last_stage ls ON ls.lead_id = tl.id
ORDER BY tl.created_at DESC
LIMIT 20;

-- Query 3: Воронка конверсии
SELECT
  tlj.stage,
  COUNT(DISTINCT tlj.lead_id) as leads_count,
  ROUND(COUNT(DISTINCT tlj.lead_id) * 100.0 / (SELECT COUNT(DISTINCT lead_id) FROM traffic_lead_journey WHERE stage = 'proftest_submitted'), 2) as conversion_rate
FROM public.traffic_lead_journey tlj
GROUP BY tlj.stage
ORDER BY leads_count DESC;

-- ============================================================================
-- 🎉 КОНСОЛИДАЦИЯ ЗАВЕРШЕНА!
-- ============================================================================

/*
ЧТО ДАЛЕЕ:

1. ✅ Обновить backend код:
   - Заменить landingSupabase → trafficAdminSupabase
   - Заменить landing_leads → traffic_leads
   - Заменить lead_journey → traffic_lead_journey

2. ✅ Обновить вебхуки:
   - Перенаправить на traffic_leads вместо landing_leads

3. ✅ Протестировать Traffic Dashboard:
   - Проверить отображение лидов
   - Проверить атрибуцию к таргетологам
   - Проверить фильтры и аналитику

4. ⚠️ (Опционально) Отключить Landing DB:
   - После успешной верификации можно деактивировать Landing DB instance
   - Экономия: ~$25/месяц
*/
