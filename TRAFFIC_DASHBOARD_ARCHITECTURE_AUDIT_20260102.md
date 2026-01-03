# Traffic Dashboard Architecture Audit Report
**Date:** 2026-01-02
**Auditor:** Claude System Architect

---

## Executive Summary

Проведен полный аудит архитектуры Traffic Dashboard с фокусом на интеграцию Challenge3D (3х дневник). Обнаружено **2 критических проблемы** и **2 потенциальных проблемы**.

---

## 1. Архитектура системы

### 1.1 Webhook Endpoints

| Endpoint | Назначение | Статус |
|----------|-----------|--------|
| `POST /api/amocrm/challenge3d-sale` | Продажи Challenge3D (status 142) | ✅ Код готов |
| `POST /api/amocrm/challenge3d-lead` | ВСЕ заявки Challenge3D | ✅ Код готов |
| `GET /api/amocrm/challenge3d-sale/health` | Health check продаж | ✅ Код готов |
| `GET /api/amocrm/challenge3d-lead/health` | Health check заявок | ✅ Код готов |

### 1.2 Pipelines

- **9777626** — КЦ (Короткий Курс)
- **9430994** — ОП (Основные Продукты)
- Status **142** = "Успешно реализовано"

### 1.3 Data Flow

```
Tilda Form → AmoCRM Lead → Webhook → Supabase (Landing DB)
                 ↓
          challenge3d-lead webhook
                 ↓
          landing_leads table (source='challenge3d')

AmoCRM Sale (status=142) → challenge3d-sale webhook → challenge3d_sales table
```

---

## 2. КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 🔴 ISSUE #1: Missing UNIQUE constraint on `landing_leads.amocrm_lead_id`

**Файл:** [amocrm-challenge3d-leads-webhook.ts](backend/src/routes/amocrm-challenge3d-leads-webhook.ts#L340)

**Проблема:**
```typescript
// Webhook использует upsert с onConflict
const { error } = await landingSupabase
  .from('landing_leads')
  .upsert({...}, {
    onConflict: 'amocrm_lead_id',  // ❌ НЕТ UNIQUE constraint!
  });
```

Таблица `landing_leads` НЕ ИМЕЕТ UNIQUE constraint на `amocrm_lead_id`. Это вызовет:
- Ошибку PostgreSQL при upsert
- Или создание дубликатов вместо обновления

**FIX SQL (Landing DB):**
```sql
-- Добавить UNIQUE constraint
ALTER TABLE landing_leads
  ADD CONSTRAINT landing_leads_amocrm_lead_id_unique
  UNIQUE (amocrm_lead_id);

-- Или создать unique index
CREATE UNIQUE INDEX CONCURRENTLY idx_landing_leads_amocrm_lead_id_unique
  ON landing_leads(amocrm_lead_id)
  WHERE amocrm_lead_id IS NOT NULL;
```

---

### 🔴 ISSUE #2: Migration 010 NOT APPLIED to Landing DB

**Файл:** [sql/migrations/010_create_challenge3d_sales.sql](sql/migrations/010_create_challenge3d_sales.sql)

**Проблема:**
Миграция для таблицы `challenge3d_sales` создана, но НЕ ПРИМЕНЕНА к Landing Supabase.
Webhook `challenge3d-sale` будет падать с ошибкой "relation challenge3d_sales does not exist".

**FIX:**
Выполнить SQL из файла `sql/migrations/010_create_challenge3d_sales.sql` в Landing Supabase:
1. Открыть Landing Supabase Dashboard
2. SQL Editor
3. Выполнить весь скрипт

---

## 3. ПОТЕНЦИАЛЬНЫЕ ПРОБЛЕМЫ

### 🟡 ISSUE #3: Fake Email Generation

**Файл:** [amocrm-challenge3d-leads-webhook.ts:317](backend/src/routes/amocrm-challenge3d-leads-webhook.ts#L317)

```typescript
email: leadData.email || `lead_${leadData.deal_id}@unknown.com`,
```

Webhook генерирует фейковый email когда он отсутствует. Это работает, но засоряет БД.

**Рекомендация:** Сделать email nullable или использовать NULL вместо фейкового значения.

---

### 🟡 ISSUE #4: Backend Not Deployed

Webhooks возвращают 404 потому что бэкенд не был перезапущен с новыми роутами.

**FIX:**
```bash
# На сервере:
cd /var/www/onai-integrator-login-main
git pull origin main
npm run build:backend
pm2 restart all
```

---

## 4. ПРОВЕРЕНО И РАБОТАЕТ КОРРЕКТНО

### ✅ Server.ts Registration

**Файл:** [server.ts:420-433](backend/src/server.ts#L420)

```typescript
// Body parsers ДО роутов - ПРАВИЛЬНО
app.use('/api/amocrm/challenge3d-sale', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/challenge3d-sale', express.json({ limit: '10mb' }));
app.use('/api/amocrm/challenge3d-lead', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/challenge3d-lead', express.json({ limit: '10mb' }));

// Routes - ПРАВИЛЬНО
app.use('/api/amocrm', amocrmChallenge3dWebhookRouter);
app.use('/api/amocrm', amocrmChallenge3dLeadsWebhookRouter);
```

### ✅ Combined Analytics Endpoint

**Файл:** [traffic-stats.ts:1232-1244](backend/src/routes/traffic-stats.ts#L1232)

Challenge3D данные корректно включены:
- Продажи из `challenge3d_sales`
- Лиды из `landing_leads` где `source='challenge3d'`

### ✅ Targetologist Detection

**Файл:** [traffic-stats.ts:327-385](backend/src/routes/traffic-stats.ts#L327)

UTM patterns для таргетологов настроены корректно:
- **Kenesary:** kenji, kenjifb, tripwire, nutcab
- **Arystan:** arystan, fbarystan, ar_, ast_
- **Muha:** onai, yourmarketolog, muha
- **Traf4:** alex, pb_agency, proftest, traf4

### ✅ Deduplication

Оба webhook имеют защиту от дублирования:
- 5-минутное окно
- Cache по webhook ID
- Автоматическая очистка каждые 60 секунд

### ✅ Original UTM Attribution

Phone-based attribution работает через `getOriginalUTM()`:
1. Извлекает телефон из сделки
2. Ищет первую сделку с этим телефоном
3. Получает оригинальные UTM метки (first touch)

---

## 5. ПЛАН ДЕЙСТВИЙ

### Немедленно (сегодня):

1. **[CRITICAL]** Применить миграцию `010_create_challenge3d_sales.sql` в Landing Supabase
2. **[CRITICAL]** Добавить UNIQUE constraint на `landing_leads.amocrm_lead_id`
3. **[IMPORTANT]** Деплой бэкенда на production

### SQL для выполнения в Landing Supabase:

```sql
-- 1. Создать таблицу challenge3d_sales (скопировать из 010_create_challenge3d_sales.sql)

-- 2. Добавить UNIQUE constraint для landing_leads
ALTER TABLE landing_leads
  ADD CONSTRAINT landing_leads_amocrm_lead_id_unique
  UNIQUE (amocrm_lead_id);
```

### После деплоя:

1. Проверить health endpoints:
   - `curl https://onai.academy/api/amocrm/challenge3d-sale/health`
   - `curl https://onai.academy/api/amocrm/challenge3d-lead/health`

2. Настроить webhooks в AmoCRM:
   - **Продажи:** `https://onai.academy/api/amocrm/challenge3d-sale`
     - Pipeline: 9777626, 9430994
     - Event: status changed to 142
   - **Заявки:** `https://onai.academy/api/amocrm/challenge3d-lead`
     - Pipeline: 9777626, 9430994
     - Event: lead created / updated

---

## 6. ФАЙЛЫ ДЛЯ ДЕПЛОЯ

Файлы которые нужно закоммитить и задеплоить:

```
backend/src/routes/amocrm-challenge3d-webhook.ts      # Sales webhook
backend/src/routes/amocrm-challenge3d-leads-webhook.ts # Leads webhook
backend/src/routes/traffic-stats.ts                    # Combined analytics
backend/src/server.ts                                  # Route registration
sql/migrations/010_create_challenge3d_sales.sql        # DB migration
```

---

## 7. ПРОВЕРКА ПОСЛЕ ФИКСА

```bash
# 1. Health check продаж
curl -s https://onai.academy/api/amocrm/challenge3d-sale/health | jq

# Ожидаемый ответ:
# {
#   "status": "ok",
#   "service": "Challenge3D Sales Webhook",
#   "pipelines": [9777626, 9430994],
#   "targetStatus": 142
# }

# 2. Health check заявок
curl -s https://onai.academy/api/amocrm/challenge3d-lead/health | jq

# 3. Проверить combined analytics
curl -s "https://onai.academy/api/traffic/combined-analytics?preset=7d" | jq '.totals'
```

---

**Report End**
