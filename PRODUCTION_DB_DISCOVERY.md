# 🎯 PRODUCTION DATABASE DISCOVERY REPORT

**Дата:** 23 декабря 2025, 19:45 Almaty  
**Статус:** ✅ **НАЙДЕНО!**

---

## ✅ КРИТИЧНОЕ ОТКРЫТИЕ

### 688 лидов НАЙДЕНЫ!

**Локация:** Landing DB (production) - `https://xikaiavwqinamgolmtcy.supabase.co`  
**Таблица:** `landing_leads`  
**Количество:** **692 лида** (на 4 больше чем показывалось в админке!)

---

## 📊 ДЕТАЛЬНАЯ СТАТИСТИКА

### Общая статистика
- **Всего лидов:** 692
- **ProfTest лиды:** 452 (65%)
- **Express Course:** 177 (26%)
- **Уникальных источников:** 6
- **Период:** 13 дек 2025 - 23 дек 2025 (10 дней)

### Распределение по источникам

| Источник | Количество | % от общего | Последний лид |
|----------|------------|-------------|---------------|
| proftest_kenesary | 206 | 29.8% | 23 дек 08:44 |
| expresscourse | 177 | 25.6% | 23 дек 11:22 |
| proftest_arystan | 140 | 20.2% | 23 дек 11:40 |
| proftest_muha | 82 | 11.8% | 23 дек 10:58 |
| TF4 | 63 | 9.1% | 23 дек 06:29 |
| proftest_unknown | 24 | 3.5% | 23 дек 09:25 |

### Структура таблицы `landing_leads`

```sql
CREATE TABLE landing_leads (
  -- Основные поля
  id UUID PRIMARY KEY,
  email TEXT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT,
  
  -- AmoCRM интеграция
  amocrm_lead_id TEXT,
  amocrm_contact_id VARCHAR,
  amocrm_synced BOOLEAN,
  amocrm_sync_status VARCHAR,
  amocrm_sync_attempts INTEGER,
  amocrm_sync_last_error TEXT,
  
  -- Email tracking
  email_sent BOOLEAN,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT,
  email_opened_at TIMESTAMPTZ,
  email_clicked BOOLEAN,
  email_clicked_at TIMESTAMPTZ,
  
  -- SMS tracking
  sms_sent BOOLEAN,
  sms_sent_at TIMESTAMPTZ,
  sms_error TEXT,
  sms_message_id TEXT,
  sms_clicked BOOLEAN,
  sms_clicked_at TIMESTAMPTZ,
  
  -- Metadata
  click_count INTEGER,
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

---

## 🔍 ПОЧЕМУ ДАННЫЕ НЕ ОТОБРАЖАЛИСЬ

### Проблема 1: Код использовал неправильную БД
**Файл:** `backend/src/services/funnel-service.ts`  
**Проблема:** Код пытался читать из ЛОКАЛЬНОЙ Landing DB, а не production

### Проблема 2: Разные названия полей
**В коде:** `landing_leads.utm_source`  
**В БД:** `landing_leads.metadata->>'utm_source'` (UTM метки в JSON поле!)

### Проблема 3: Дубликаты таблиц
- `landing_leads` - 692 записи (PRODUCTION, Landing DB)
- `lead_tracking` - 0 записей (Landing DB)
- `unified_lead_tracking` - 31 запись (Landing DB)

---

## 🎯 ПЛАН ДЕЙСТВИЙ (UPDATED)

### ✅ ШАГ 1: BACKUP (КРИТИЧНО!)

Создан скрипт: `scripts/backup-production-dbs.sh`

**Что бэкапится:**
- Landing DB: `landing_leads` (692 записи), `express_course_sales`, `main_product_sales`, full schema
- Traffic DB: полная схема
- Main DB: критичные таблицы (users, lessons, certificates)

**Команда запуска:**
```bash
cd /Users/miso/onai-integrator-login
./scripts/backup-production-dbs.sh
```

### ШАГ 2: НЕ СОЗДАВАТЬ НОВУЮ ТАБЛИЦУ!

**ИЗМЕНЕНИЕ ПЛАНА:**  
Вместо создания `master_leads` - будем использовать СУЩЕСТВУЮЩУЮ `landing_leads`!

**Причины:**
1. ✅ Таблица УЖЕ содержит все 692 лида
2. ✅ Структура подходит (есть все нужные поля)
3. ✅ Избежим риска потери данных при миграции
4. ✅ Админ-панель уже работает с этой таблицей
5. ✅ Нет downtime

### ШАГ 3: Исправить backend код

**Вместо:**
```typescript
// backend/src/services/funnel-service.ts
landingSupabase.from('master_leads')  // НОВАЯ ТАБЛИЦА
```

**Делаем:**
```typescript
// backend/src/services/funnel-service.ts
landingSupabase.from('landing_leads')  // СУЩЕСТВУЮЩАЯ ТАБЛИЦА
```

**И добавить извлечение UTM из metadata:**
```typescript
const { data } = await landingSupabase
  .from('landing_leads')
  .select('id, source, metadata')
  .like('source', 'proftest%');

// UTM source хранится в metadata->utm_source
const leadsWithUTM = data?.map(lead => ({
  ...lead,
  utm_source: lead.metadata?.utm_source || 'unknown'
}));
```

### ШАГ 4: Добавить UTM колонки (опционально)

**Миграция для удобства:**
```sql
-- Добавить отдельные колонки для UTM меток
ALTER TABLE landing_leads 
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT;

-- Извлечь UTM метки из metadata
UPDATE landing_leads
SET 
  utm_source = metadata->>'utm_source',
  utm_campaign = metadata->>'utm_campaign',
  utm_medium = metadata->>'utm_medium',
  utm_content = metadata->>'utm_content',
  utm_term = metadata->>'utm_term'
WHERE metadata IS NOT NULL;

-- Создать индексы
CREATE INDEX IF NOT EXISTS idx_landing_leads_utm_source ON landing_leads(utm_source);
CREATE INDEX IF NOT EXISTS idx_landing_leads_source ON landing_leads(source);
```

---

## 📈 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ

После исправлений воронка покажет:
- **Stage 1 (Затраты):** Facebook Ads данные (если есть в traffic_stats)
- **Stage 2 (ProfTest):** 452 лида из `landing_leads` 
- **Stage 3 (Express):** 3 продажи из `express_course_sales` (тестовые)
- **Stage 4 (Flagman):** 1 продажа из `main_product_sales` (тестовая)

**ROI формула:** `(Express Revenue + Main Revenue - FB Spend) / FB Spend * 100`

---

## 🚨 КРИТИЧНЫЕ ЗАМЕЧАНИЯ

1. **БЕЗ BACKUP НЕ ТРОГАТЬ!** - Данные живые, 692 реальных лида
2. **UTM метки в JSON** - Нужно извлечь или добавить функцию для чтения
3. **Express Course лиды (177)** - Это ТОЖЕ лиды, не продажи! Проверить что это
4. **Админ-панель работает** - Значит API endpoint `/api/lead-tracking/leads` правильный
5. **Не мигрировать сейчас** - Сначала исправить код, потом проверить на production

---

## ✅ NEXT STEPS (ОБНОВЛЁННЫЕ)

1. ✅ Создать backup (скрипт готов)
2. Запустить backup на production
3. Исправить `funnel-service.ts` для чтения из `landing_leads`
4. Добавить извлечение UTM меток из metadata
5. Протестировать на локальном с production данными
6. Deploy на production
7. Проверить что воронка показывает 452 ProfTest лида

---

**ВЫВОД:** Миграция НЕ НУЖНА! Таблица УЖЕ есть и содержит все данные. Нужно только исправить backend код для правильного чтения данных.
