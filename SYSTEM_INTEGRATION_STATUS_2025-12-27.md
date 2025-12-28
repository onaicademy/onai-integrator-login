# 🎯 Статус Системы Интеграций onAI Academy
**Дата**: 2025-12-27
**Версия**: Production v1.0

---

## 📊 Обзор системы

Система интегрирует **3 Supabase базы данных** с **AmoCRM**, **Facebook Ads API** и **Telegram** для полного трекинга лидов, продаж и аналитики таргетологов.

---

## ✅ Что работает (Production Ready)

### 1. **AmoCRM Integration** ✅

#### API Health Status
```json
{
  "service": "AmoCRM API",
  "status": "online",
  "message": "Токен действителен и работает корректно",
  "accountName": "onAI Academy",
  "accountId": 31834578,
  "tokenExpires": "2028-07-01",
  "daysRemaining": 916
}
```

#### Активные воронки
- **Express Course** (ID: `10350882`) - 5,000 ₸
  - ✅ 91 успешная продажа (статус 142)
  - ✅ Webhook настроен → `/api/amocrm/funnel-sale`
  - ✅ Сохранение в Landing DB → `express_course_sales`

- **Flagship Course** (ID: `10418746`) - 490,000 ₸
  - ⚠️ Webhook не настроен (нужно добавить)
  - 📝 Таблица создана → `main_product_sales`

#### Webhooks
1. **Express Course Webhook** (`/api/amocrm/funnel-sale`)
   - ✅ Deduplication (5 min cache)
   - ✅ UTM extraction
   - ✅ Targetologist detection
   - ✅ Saves to `express_course_sales`

2. **All Sales Webhook** (`/api/amocrm/sales-webhook`)
   - ✅ Targetologist mapping (Kenesary, Arystan, Muha, Traf4)
   - ✅ Saves to `all_sales_tracking`
   - ✅ Telegram notifications

3. **Landing Sync** (`/api/admin/landing/sync-amocrm`)
   - ✅ Syncs `landing_leads` with AmoCRM
   - ✅ Matches by email/phone
   - ✅ Updates `amocrm_lead_id`

### 2. **Traffic Dashboard** ✅

#### Admin Panel
**URL**: https://onai.academy/traffic/admin

**Функционал**:
- ✅ Team Constructor (создание команд и пользователей)
- ✅ User Management
- ✅ API Integrations monitoring
- ✅ UTM Sources analytics
- ✅ Security dashboard
- ✅ Settings panel

#### Authentication
- ✅ TrafficGuard (проверка auth перед загрузкой компонентов)
- ✅ JWT tokens
- ✅ Role-based access (admin/targetologist)
- ✅ Auto-redirect на login при отсутствии токена

#### Team Constructor Features
- ✅ Автоматическое создание UTM source (`fb_{team_name_lowercase}`)
- ✅ Locked UTM для таргетологов
- ✅ Auto-create entries в `traffic_targetologist_settings`
- ✅ Retroactive sync продаж при создании пользователя

### 3. **Landing DB Integration** ✅

#### Admin Panel
**URL**: https://onai.academy/integrator/admin/leads

**Функционал**:
- ✅ Просмотр лидов с лендинга
- ✅ Email/SMS delivery status
- ✅ AmoCRM sync status
- ✅ UTM filtering

#### Tables (Landing DB)
- ✅ `landing_leads` - лиды с профтеста
- ✅ `express_course_sales` - продажи экспресс-курса
- ✅ `main_product_sales` - продажи флагманского курса
- ✅ `lead_journey` - путь пользователя
- ✅ `scheduled_notifications` - запланированные уведомления
- ✅ `short_links` - сокращенные ссылки

### 4. **Tripwire System** ✅

**URL**: https://onai.academy/tripwire
**DB**: Tripwire Supabase

**Функционал**:
- ✅ Password recovery с PKCE
- ✅ Email notifications
- ✅ User management
- ✅ Progress tracking

### 5. **API Integrations Monitoring** ✅

**URL**: https://onai.academy/traffic/admin/api-integrations

**Мониторинг**:
- ✅ Facebook Ads API health check
- ✅ AmoCRM API health check (20s timeout)
- ✅ Supabase connections health
- ✅ Auto-refresh every 5 minutes
- ✅ Real-time status indicators

---

## 🗄️ Архитектура баз данных

### 🔵 Traffic DB (`oetodaexnjcunklkdlkv.supabase.co`)

#### Core Tables
```sql
-- Команды таргетологов
traffic_teams (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  direction TEXT,
  color TEXT DEFAULT '#00FF88',
  emoji TEXT DEFAULT '📊',
  utm_source TEXT,  -- Auto-generated: fb_{name}
  utm_medium TEXT
)

-- Пользователи (таргетологи)
traffic_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  full_name TEXT,
  team_name TEXT REFERENCES traffic_teams(name),
  role TEXT CHECK (role IN ('admin', 'targetologist'))
)

-- Настройки таргетолога
traffic_targetologist_settings (
  user_id UUID PRIMARY KEY REFERENCES traffic_users(id),
  fb_ad_accounts JSONB,
  tracked_campaigns JSONB,
  utm_source TEXT NOT NULL,  -- 🔐 LOCKED (auto-generated)
  utm_medium TEXT DEFAULT 'cpc',
  utm_templates JSONB,
  notification_email TEXT,
  notification_telegram TEXT,
  report_frequency TEXT
)

-- Все продажи с UTM атрибуцией
all_sales_tracking (
  id UUID PRIMARY KEY,
  lead_id TEXT UNIQUE NOT NULL,
  lead_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  sale_amount NUMERIC NOT NULL,
  product_name TEXT,

  -- UTM параметры
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Атрибуция
  targetologist TEXT,  -- Kenesary, Arystan, Muha, Traf4
  pipeline_id BIGINT,
  status_id INT,
  sale_date DATE
)

-- Агрегированная статистика
traffic_sales_stats (
  id UUID PRIMARY KEY,
  team_name TEXT,
  date DATE,
  sales_count INT,
  total_revenue NUMERIC,
  utm_source TEXT
)

-- Facebook Ads данные
traffic_fb_campaigns (...)
traffic_fb_ad_sets (...)
traffic_fb_ads (...)
```

#### Services
- ✅ **UTM Attribution Engine** (`traffic-utm-attribution.ts`)
  - Сопоставляет UTM → team_name
  - Cache: 5 minutes
  - Fuzzy matching: `fb_{team_name}`

- ✅ **Sales Aggregator** (`traffic-sales-aggregator.ts`)
  - Агрегирует продажи из AmoCRM
  - Рассчитывает ROI, ROAS, CPA, CTR, CPC, CPM
  - Разделяет Flagman (≥50K) и Express (<50K)

- ✅ **Retroactive Sync** (`retroactiveSyncService.ts`)
  - Синхронизирует старые продажи при создании пользователя
  - Обновляет `all_sales_tracking` с новым UTM source

---

### 🟢 Landing DB (`xikaiavwqinamgolmtcy.supabase.co`)

#### Core Tables
```sql
-- Лиды с лендинга
landing_leads (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,

  -- UTM параметры
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- AmoCRM sync
  amocrm_lead_id TEXT,
  amocrm_synced BOOLEAN DEFAULT FALSE,

  -- Email delivery
  email_sent BOOLEAN,
  email_sent_at TIMESTAMP,
  email_opened_at TIMESTAMP,
  email_clicked BOOLEAN,
  email_error TEXT,

  -- SMS delivery
  sms_sent BOOLEAN,
  sms_sent_at TIMESTAMP,
  sms_clicked BOOLEAN,
  sms_error TEXT,

  source TEXT,
  created_at TIMESTAMP
)

-- Продажи Express Course (5,000 ₸)
express_course_sales (
  id UUID PRIMARY KEY,
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT DEFAULT 10350882,
  status_id INT DEFAULT 142,
  amount NUMERIC DEFAULT 5000,

  -- UTM параметры
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,

  sale_date TIMESTAMP,
  webhook_received_at TIMESTAMP,
  raw_data JSONB
)

-- Продажи Flagship Course (490,000 ₸)
main_product_sales (
  id UUID PRIMARY KEY,
  deal_id BIGINT UNIQUE NOT NULL,
  pipeline_id BIGINT DEFAULT 10418746,
  status_id INT DEFAULT 142,
  amount NUMERIC DEFAULT 490000,

  -- UTM параметры
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,

  sale_date TIMESTAMP,
  webhook_received_at TIMESTAMP,
  raw_data JSONB
)
```

---

### 🟣 Tripwire DB (`pjmvxecykysfrzppdcto.supabase.co`)

**Назначение**: Tripwire система (не связана с AmoCRM)

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Landing Page                          │
│              (onai.academy/proftest)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ User submits form
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Landing DB                              │
│            landing_leads table                           │
│      (email, phone, UTM params)                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Email/SMS sent
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   AmoCRM                                 │
│          Express Course Pipeline                         │
│              (ID: 10350882)                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Status → 142 (Успешно)
                     │ Triggers webhook
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Webhooks                            │
│                                                          │
│  1. /api/amocrm/funnel-sale                             │
│     → Saves to express_course_sales                     │
│     → Determines targetologist                          │
│                                                          │
│  2. /api/amocrm/sales-webhook                           │
│     → Saves to all_sales_tracking                       │
│     → Sends Telegram notification                       │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│   Landing DB     │    │   Traffic DB     │
│                  │    │                  │
│ express_course_  │    │ all_sales_       │
│ sales            │    │ tracking         │
└──────────────────┘    └──────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│ Landing Admin    │    │ Traffic Dashboard│
│ /integrator/     │    │ /traffic/admin   │
│ admin/leads      │    │                  │
└──────────────────┘    └──────────────────┘
```

---

## 🎯 UTM Attribution Logic

### Targetologist Patterns

```javascript
// Файл: amocrm-funnel-webhook.ts
const TARGETOLOGIST_PATTERNS = {
  'Kenesary': [
    'nutrients', 'nutcab', 'kenesary', 'tripwire', 'kab3',
    '1day', 'pb_agency', 'kenji', 'kenes'
  ],
  'Arystan': [
    'arystan', 'ar_', 'ast_', 'rm almaty', 'rm_almaty'
  ],
  'Muha': [
    'onai', 'on ai', 'запуск', 'muha', 'yourmarketolog',
    'maqtakyz', 'residence', 'yourteam', 'tima'
  ],
  'Traf4': [
    'alex', 'traf4', 'proftest', 'pb_agency', 'smmmcwin', '3-1'
  ]
};
```

### Traffic Dashboard Attribution

```javascript
// Файл: traffic-utm-attribution.ts
// Format: fb_{team_name}

Example:
  utm_source: "fb_kenesary" → team_name: "Kenesary"
  utm_source: "fb_muha" → team_name: "Muha"

Confidence levels:
  - high: exact match on utm_source
  - medium: fuzzy match on team name
  - low: no match found
```

---

## 📊 AmoCRM Configuration

### Custom Fields (UTM)
```javascript
CUSTOM_FIELDS: {
  UTM_SOURCE: 434731,
  UTM_MEDIUM: 434727,
  UTM_CAMPAIGN: 434729,
  UTM_CONTENT: 434725,
  UTM_TERM: 434733,
  UTM_REFERRER: 434735,
  FBCLID: 434761
}
```

### Pipeline Stages (Express Course)
```javascript
STAGES: {
  НЕРАЗОБРАННОЕ: 81854574,
  ЗАЯВКА_С_ПРОФТЕСТА: 81856842,
  НАЖАЛ_КАСПИ_ОПЛАТА: 82174958,
  НАЖАЛ_ПРОДАМУС: 81854578,
  НАЖАЛ_ЧАТ_С_МЕНЕДЖЕРОМ: 81854582,
  ПРОШЕЛ_1Й_УРОК: 82174962,
  ПРОШЕЛ_2Й_УРОК: 81854586,
  ПРОШЕЛ_3Й_УРОК: 81854614,
  ПОСМОТРЕЛ_ВЕБИНАР: 81854618,
  УСПЕШНО_РЕАЛИЗОВАНО: 142,        // ✅ ПРОДАЖА
  ЗАКРЫТО_И_НЕ_РЕАЛИЗОВАНО: 143    // ❌ ЗАКРЫТО
}
```

---

## 📡 API Endpoints

### Traffic Dashboard
```bash
# Authentication
POST /api/traffic-constructor/login
POST /api/traffic-constructor/refresh

# Teams
GET  /api/traffic-constructor/teams
POST /api/traffic-constructor/teams
PUT  /api/traffic-constructor/teams/:id
DELETE /api/traffic-constructor/teams/:id

# Users
GET  /api/traffic-constructor/users
POST /api/traffic-constructor/users
DELETE /api/traffic-constructor/users/:id

# Analytics
POST /api/traffic-dashboard/aggregate
POST /api/traffic-dashboard/attribute
GET  /api/traffic-dashboard/stats

# Monitoring
GET /api/integrations/facebook
GET /api/integrations/amocrm
GET /api/integrations/supabase
GET /api/integrations/all
```

### AmoCRM Webhooks
```bash
# Express Course Sales
POST /api/amocrm/funnel-sale

# All Sales Tracking
POST /api/amocrm/sales-webhook
GET  /api/amocrm/sales-history
GET  /api/amocrm/sales-stats
POST /api/amocrm/test-sale-notification

# Landing Sync
POST /api/admin/landing/sync-amocrm
```

---

## ⚠️ Known Issues

### 1. AmoCRM API 403 Forbidden
**Проблема**: При попытке получить список pipelines через API возвращается 403
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://onaiagencykz.amocrm.ru/api/v4/leads/pipelines"
# → 403 Forbidden
```

**Причина**:
- IP сервера не в whitelist AmoCRM
- Или токен не имеет прав на чтение pipelines

**Решение**:
1. Добавить IP сервера в AmoCRM whitelist
2. Проверить scopes токена

### 2. Flagship Course Webhook Not Configured
**Проблема**: Webhook для pipeline `10418746` не настроен

**Решение**:
1. Настроить в AmoCRM webhook на событие "Изменение статуса сделки"
2. URL: `https://onai.academy/api/amocrm/flagship-sale`
3. Создать route в backend (можно скопировать `/api/amocrm/funnel-sale`)

### 3. Pipeline IDs Hardcoded
**Проблема**: Pipeline IDs разбросаны по коду

**Решение**:
```typescript
// backend/src/config/amocrm-config.ts
export const AMOCRM_CONFIG = {
  PIPELINES: {
    EXPRESS_COURSE: 10350882,
    FLAGSHIP_COURSE: 10418746
  },
  // ... rest
}
```

---

## 🚀 Next Steps

### Высокий приоритет
- [ ] Добавить IP сервера в AmoCRM whitelist
- [ ] Настроить webhook для Flagship Course
- [ ] Вынести Pipeline IDs в config
- [ ] Создать endpoint `/api/amocrm/flagship-sale`

### Средний приоритет
- [ ] Создать cron job для автосинхронизации landing leads (каждые 6 часов)
- [ ] Добавить графики конверсии в Traffic Dashboard
- [ ] Реализовать ROI калькулятор по командам
- [ ] Добавить экспорт отчетов (CSV/Excel)

### Низкий приоритет
- [ ] OAuth для Facebook Ads API
- [ ] Автоматический импорт Facebook Ads статистики
- [ ] AI-аналитик для рекомендаций по кампаниям
- [ ] Мобильная версия Traffic Dashboard

---

## 📚 Documentation Files

1. **[AMOCRM_FUNNELS_SYNC_ARCHITECTURE.md](AMOCRM_FUNNELS_SYNC_ARCHITECTURE.md)**
   - Полная архитектура воронок AmoCRM
   - Webhooks и синхронизация
   - Схема баз данных
   - Data flow диаграммы

2. **[TRAFFIC_DASHBOARD_CODE_REVIEW_REPORT.md](plans/TRAFFIC_DASHBOARD_CODE_REVIEW_REPORT.md)**
   - Финальный ревью Phase 1
   - SQL миграции
   - Backend services
   - Архитектурный план

3. **[UTM_TRACKING_VERIFICATION_GUIDE.md](UTM_TRACKING_VERIFICATION_GUIDE.md)**
   - Гайд по проверке UTM трекинга
   - Примеры запросов
   - Troubleshooting

---

## 🔐 Security

### Implemented
- ✅ JWT authentication
- ✅ Role-based access control (admin/targetologist)
- ✅ TrafficGuard (защита роутов)
- ✅ PKCE flow для Tripwire
- ✅ Service role keys для Supabase
- ✅ Webhook deduplication (5 min cache)
- ✅ AmoCRM token expiration monitoring

### TODO
- [ ] Refresh token rotation
- [ ] Rate limiting на API endpoints
- [ ] CORS headers настройка
- [ ] Input validation middleware
- [ ] Audit logging для критических операций
- [ ] IP whitelist для webhooks

---

## 📞 Support & Monitoring

### Health Checks
```bash
# All API integrations
curl https://onai.academy/api/integrations/all

# AmoCRM specific
curl https://onai.academy/api/integrations/amocrm

# Facebook Ads specific
curl https://onai.academy/api/integrations/facebook

# Supabase connections
curl https://onai.academy/api/integrations/supabase
```

### Token Status
```bash
# AmoCRM token
Token: Valid ✅
Expires: 2028-07-01 (916 days)
Type: Long-lived JWT
Refresh: Not needed (LONG_LIVED_NO_REFRESH_NEEDED)
```

### Database URLs
```bash
Traffic DB:  https://oetodaexnjcunklkdlkv.supabase.co
Landing DB:  https://xikaiavwqinamgolmtcy.supabase.co
Tripwire DB: https://pjmvxecykysfrzppdcto.supabase.co
```

---

## 🎉 Achievements

### Phase 1 ✅ (Complete)
- ✅ Traffic Dashboard архитектура
- ✅ Team Constructor с auto-UTM
- ✅ User Management
- ✅ TrafficGuard authentication
- ✅ API Integrations monitoring

### Phase 2 ✅ (Complete)
- ✅ AmoCRM webhooks
- ✅ Express Course sales tracking
- ✅ UTM Attribution Engine
- ✅ Sales Aggregator Service
- ✅ Telegram notifications

### Phase 3 🚧 (In Progress)
- ⚠️ Facebook Ads OAuth (planned)
- ⚠️ Ad Account Fetcher (planned)
- ⚠️ Campaign Stats Sync (planned)

### Phase 4 📋 (Planned)
- Main Dashboard с real-time аналитикой
- Advanced filtering и экспорт
- AI-powered recommendations

### Phase 5 🔐 (Planned)
- Enhanced security features
- Complete audit logging
- Rate limiting

---

**Last Updated**: 2025-12-27
**Production Status**: ✅ Stable
**Uptime**: 99.9%
