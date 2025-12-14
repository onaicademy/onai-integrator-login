# 🚨 КРИТИЧЕСКАЯ МИГРАЦИЯ: leads_with_journey VIEW

## ❌ Проблема
В production получаем ошибку:
```
Could not find the table 'public.leads_with_journey' in the schema cache
```

Это означает что VIEW не существует в Landing Supabase базе данных (`xikaiavwqinamgolmtcy.supabase.co`).

---

## ✅ Решение: Применить миграцию

### Шаг 1: Открой Supabase Dashboard

1. Открой: **https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy**
2. Залогинься если нужно
3. Это Landing Database (где хранятся landing_leads)

### Шаг 2: Открой SQL Editor

1. В левом меню выбери **SQL Editor**
2. Нажми **New Query**

### Шаг 3: Скопируй и выполни SQL

Скопируй весь код ниже и вставь в SQL Editor, потом нажми **RUN**:

```sql
-- Migration: Create leads_with_journey VIEW
-- Created: 2025-01-14
-- Purpose: Combine landing_leads with their journey_stages for admin dashboard

CREATE OR REPLACE VIEW public.leads_with_journey AS
SELECT 
  ll.id,
  ll.name,
  ll.email,
  ll.phone,
  ll.source,
  ll.created_at,
  ll.updated_at,
  ll.email_sent,
  ll.sms_sent,
  ll.email_clicked,
  ll.email_clicked_at,
  ll.sms_clicked,
  ll.sms_clicked_at,
  ll.click_count,
  ll.metadata,
  ll.amocrm_lead_id,
  ll.amocrm_synced,
  ll.amocrm_contact_id,
  -- Aggregate journey_stages as JSONB array
  COALESCE(
    json_agg(
      json_build_object(
        'id', js.id,
        'stage', js.stage,
        'source', js.source,
        'metadata', js.metadata,
        'created_at', js.created_at
      ) ORDER BY js.created_at ASC
    ) FILTER (WHERE js.id IS NOT NULL),
    '[]'::json
  ) as journey_stages
FROM public.landing_leads ll
LEFT JOIN public.journey_stages js ON ll.id = js.lead_id
GROUP BY 
  ll.id,
  ll.name,
  ll.email,
  ll.phone,
  ll.source,
  ll.created_at,
  ll.updated_at,
  ll.email_sent,
  ll.sms_sent,
  ll.email_clicked,
  ll.email_clicked_at,
  ll.sms_clicked,
  ll.sms_clicked_at,
  ll.click_count,
  ll.metadata,
  ll.amocrm_lead_id,
  ll.amocrm_synced,
  ll.amocrm_contact_id
ORDER BY ll.created_at DESC;

-- Grant access
GRANT SELECT ON public.leads_with_journey TO service_role;
GRANT SELECT ON public.leads_with_journey TO authenticated;
GRANT SELECT ON public.leads_with_journey TO anon;

COMMENT ON VIEW public.leads_with_journey IS 'View combining landing_leads with their journey_stages for admin dashboard';
```

### Шаг 4: Проверь что VIEW создан

Выполни в SQL Editor:

```sql
-- Проверка что VIEW существует
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'leads_with_journey';

-- Проверка что VIEW возвращает данные
SELECT COUNT(*) as total_leads FROM public.leads_with_journey;
```

**Ожидаемый результат:**
- Первый запрос должен вернуть: `leads_with_journey`
- Второй запрос должен вернуть количество лидов (например: `total_leads: 2`)

---

## 📊 Что делает этот VIEW

1. **Объединяет данные:**
   - `landing_leads` - основная таблица лидов
   - `journey_stages` - этапы пути клиента (proftest → email → expresscourse → payment)

2. **Формат journey_stages:**
   ```json
   [
     {
       "id": "uuid",
       "stage": "proftest_submitted",
       "source": "proftest",
       "metadata": {...},
       "created_at": "2025-01-14T12:00:00Z"
     },
     {
       "id": "uuid",
       "stage": "expresscourse_clicked",
       "source": "email",
       "metadata": {...},
       "created_at": "2025-01-14T12:05:00Z"
     }
   ]
   ```

3. **Используется в:**
   - Admin Dashboard (`/integrator/leads-admin`)
   - Lead tracking
   - Analytics

---

## 🔥 После применения миграции

1. ✅ Ошибка 404 исчезнет
2. ✅ В админке появятся "Journey этапы"
3. ✅ Можно будет отследить путь каждого лида: ProfTest → Email → ExpressCourse → Payment

---

## ⚠️ ВАЖНО

Эту миграцию нужно применить **ТОЛЬКО** в Landing Database:
- ✅ **xikaiavwqinamgolmtcy.supabase.co** (Landing DB)
- ❌ **НЕ в arqhkacellqbhjhbebfh** (Main Platform DB)

---

## 📝 Файл миграции

Миграция сохранена в:
```
supabase/migrations/20250114_create_leads_with_journey_view.sql
```

Можно применить автоматически через Supabase CLI (если настроен):
```bash
supabase db push --project-ref xikaiavwqinamgolmtcy
```

Но проще всего через Dashboard (инструкция выше).
