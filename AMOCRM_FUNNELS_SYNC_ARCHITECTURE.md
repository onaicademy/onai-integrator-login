# 📊 AmoCRM Воронки и Синхронизация с Supabase

**Дата создания**: 2025-12-27
**Статус**: ✅ Активно работает

---

## 🎯 Обзор системы

Система интегрирует AmoCRM с тремя Supabase базами данных для отслеживания лидов, продаж и аналитики таргетологов.

---

## 📍 Воронки AmoCRM

### 1️⃣ **Express Course** (Экспресс-курс - 5,000 ₸)

**URL**: https://onaiagencykz.amocrm.ru/leads/pipeline/10350882
**Pipeline ID**: `10350882`
**Цена**: 5,000 KZT

#### Статусы воронки:

```javascript
STAGES: {
  НЕРАЗОБРАННОЕ: 81854574,           // Неразобранное
  ЗАЯВКА_С_ПРОФТЕСТА: 81856842,      // заявка с профтеста
  НАЖАЛ_КАСПИ_ОПЛАТА: 82174958,      // нажал "каспи оплата"
  НАЖАЛ_ПРОДАМУС: 81854578,          // Нажал "продамус"
  НАЖАЛ_ЧАТ_С_МЕНЕДЖЕРОМ: 81854582,  // Нажал "Чат с менеджером"
  ПРОШЕЛ_1Й_УРОК: 82174962,          // Прошел 1й урок
  ПРОШЕЛ_2Й_УРОК: 81854586,          // Прошел 2й урок
  ПРОШЕЛ_3Й_УРОК: 81854614,          // прошел 3й урок
  ПОСМОТРЕЛ_ВЕБИНАР: 81854618,       // посмотрел вебинар
  УСПЕШНО_РЕАЛИЗОВАНО: 142,          // ✅ Успешно реализовано (ПРОДАЖА)
  ЗАКРЫТО_И_НЕ_РЕАЛИЗОВАНО: 143      // ❌ Закрыто и не реализовано
}
```

**Важно**: Статус **142** (Успешно реализовано) = подтвержденная продажа 5,000 ₸

**Текущая статистика**:
- Успешных продаж: **91 лид**

---

### 2️⃣ **Flagship Course** (Integrator Flagman - 490,000 ₸)

**URL**: https://onaiagencykz.amocrm.ru/leads/pipeline/10418746
**Pipeline ID**: `10418746`
**Цена**: 490,000 KZT

#### Статусы воронки:

```javascript
STAGES: {
  УСПЕШНО_РЕАЛИЗОВАНО: 142,          // ✅ Успешно реализовано (ПРОДАЖА)
  ЗАКРЫТО_И_НЕ_РЕАЛИЗОВАНО: 143      // ❌ Закрыто и не реализовано
}
```

**Важно**: Статус **142** = подтвержденная продажа 490,000 ₸

---

### 3️⃣ **Другие воронки** (для справки)

Найдены в системе, но не используются в основном функционале:

- **Тестирование КЦ2**: ID `9965766`
- **КЦ**: ID `9777626`
- **ОП**: ID `9430994`
- **Однодневник**: ID `9820886`

---

## 🗄️ Структура баз данных Supabase

### 🔵 **TRAFFIC DB** (Traffic Dashboard)

**URL**: `https://oetodaexnjcunklkdlkv.supabase.co`
**Назначение**: Отслеживание UTM-трафика таргетологов и аналитика

#### Основные таблицы:

1. **`all_sales_tracking`** - Все продажи с UTM атрибуцией
   ```sql
   CREATE TABLE all_sales_tracking (
     id UUID PRIMARY KEY,
     lead_id TEXT NOT NULL UNIQUE,
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
     targetologist TEXT,  -- Определяется по UTM (Kenesary, Arystan, Muha, Traf4)
     pipeline_id BIGINT,
     status_id INT,
     sale_date DATE,
     created_at TIMESTAMP
   );
   ```

2. **`traffic_teams`** - Команды таргетологов
   ```sql
   CREATE TABLE traffic_teams (
     id UUID PRIMARY KEY,
     name TEXT UNIQUE NOT NULL,
     direction TEXT,
     color TEXT DEFAULT '#00FF88',
     emoji TEXT DEFAULT '📊',
     utm_source TEXT,
     utm_medium TEXT
   );
   ```

3. **`traffic_sales_stats`** - Агрегированная статистика продаж
   ```sql
   CREATE TABLE traffic_sales_stats (
     id UUID PRIMARY KEY,
     team_name TEXT,
     date DATE,
     sales_count INT,
     total_revenue NUMERIC,
     utm_source TEXT,
     created_at TIMESTAMP
   );
   ```

---

### 🟢 **LANDING DB** (Landing & Express Course)

**URL**: `https://xikaiavwqinamgolmtcy.supabase.co`
**Назначение**: Лиды с лендинга и продажи Express Course

#### Основные таблицы:

1. **`landing_leads`** - Лиды с лендинга (профтест)
   ```sql
   CREATE TABLE landing_leads (
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

     -- AmoCRM синхронизация
     amocrm_lead_id TEXT,
     amocrm_synced BOOLEAN DEFAULT FALSE,

     -- Email отправка
     email_sent BOOLEAN DEFAULT FALSE,
     email_sent_at TIMESTAMP,
     email_opened_at TIMESTAMP,
     email_clicked BOOLEAN DEFAULT FALSE,
     email_error TEXT,

     -- SMS отправка
     sms_sent BOOLEAN DEFAULT FALSE,
     sms_sent_at TIMESTAMP,
     sms_clicked BOOLEAN DEFAULT FALSE,
     sms_error TEXT,

     source TEXT,  -- Откуда пришел лид
     created_at TIMESTAMP
   );
   ```

2. **`express_course_sales`** - Продажи экспресс-курса (5,000 ₸)
   ```sql
   CREATE TABLE express_course_sales (
     id UUID PRIMARY KEY,
     deal_id BIGINT UNIQUE NOT NULL,  -- AmoCRM Lead ID
     pipeline_id BIGINT,               -- 10350882
     status_id INT,                    -- 142 = успешная продажа
     amount NUMERIC DEFAULT 5000,      -- 5,000 KZT

     -- UTM параметры
     utm_source TEXT,
     utm_campaign TEXT,
     utm_medium TEXT,
     utm_content TEXT,
     utm_term TEXT,

     sale_date TIMESTAMP,
     webhook_received_at TIMESTAMP,
     raw_data JSONB
   );
   ```

3. **`main_product_sales`** - Продажи флагманского курса (490,000 ₸)
   ```sql
   CREATE TABLE main_product_sales (
     id UUID PRIMARY KEY,
     deal_id BIGINT UNIQUE NOT NULL,  -- AmoCRM Lead ID
     pipeline_id BIGINT,               -- 10418746
     status_id INT,                    -- 142 = успешная продажа
     amount NUMERIC DEFAULT 490000,    -- 490,000 KZT

     -- UTM параметры
     utm_source TEXT,
     utm_campaign TEXT,
     utm_medium TEXT,
     utm_content TEXT,
     utm_term TEXT,

     sale_date TIMESTAMP,
     webhook_received_at TIMESTAMP,
     raw_data JSONB
   );
   ```

---

### 🟣 **TRIPWIRE DB** (Tripwire система)

**URL**: `https://pjmvxecykysfrzppdcto.supabase.co`
**Назначение**: Tripwire пользователи и их прогресс

**Примечание**: Эта база не связана с AmoCRM воронками напрямую.

---

## 🔄 Webhooks и синхронизация

### 1️⃣ **Express Course Sales Webhook**

**Endpoint**: `POST /api/amocrm/funnel-sale`
**Файл**: `backend/src/routes/amocrm-funnel-webhook.ts`

**Когда срабатывает**:
- При переходе лида в статус **142** (Успешно реализовано) в воронке **10350882**

**Что делает**:
1. Получает webhook от AmoCRM с данными лида
2. Извлекает UTM метки из custom fields AmoCRM
3. Определяет таргетолога по UTM (Kenesary, Arystan, Muha, Traf4)
4. Сохраняет в **Landing DB** → `express_course_sales`
5. Использует deduplication для предотвращения дубликатов

**AmoCRM Custom Fields (UTM)**:
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

**Настройка в AmoCRM**:
```
URL: https://onai.academy/api/amocrm/funnel-sale
Событие: Изменение статуса сделки → Успешно реализовано (142)
Воронка: Express Course (10350882)
```

---

### 2️⃣ **All Sales Tracking Webhook**

**Endpoint**: `POST /api/amocrm/sales-webhook`
**Файл**: `backend/src/routes/amocrm-sales-webhook.ts`

**Когда срабатывает**:
- При любой продаже в AmoCRM (любая воронка)

**Что делает**:
1. Получает webhook от AmoCRM
2. Определяет таргетолога по UTM маппингу:
   ```javascript
   TARGETOLOGIST_MAPPING = {
     'Kenesary': ['tripwire', 'nutcab'],
     'Arystan': ['arystan'],
     'Muha': ['on ai', 'onai', 'запуск'],
     'Traf4': ['alex', 'traf4', 'proftest']
   }
   ```
3. Сохраняет в **Traffic DB** → `all_sales_tracking`
4. Отправляет уведомление в Telegram:
   ```
   🎉 НОВАЯ ПРОДАЖА!

   👑 Таргетолог: Kenesary
   👤 Клиент: Иван Иванов
   💰 Сумма: 5,000 ₸
   📦 Продукт: Express Course
   🏷️ Кампания: tripwire_test_1

   Kenesary, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ! 🔥
   ```

**Настройка в AmoCRM**:
```
URL: https://onai.academy/api/amocrm/sales-webhook
Событие: Изменение статуса сделки
Воронка: Все воронки
```

---

### 3️⃣ **Landing Leads Sync**

**Endpoint**: `POST /api/admin/landing/sync-amocrm`
**Файл**: `backend/src/routes/landing-sync-amocrm.ts`

**Назначение**: Обратная синхронизация лидов из AmoCRM в Landing DB

**Что делает**:
1. Получает последние 500 лидов из AmoCRM (pipeline `10350882`)
2. Сопоставляет с лидами в `landing_leads` по email/phone
3. Обновляет `amocrm_lead_id` и `amocrm_synced` флаг
4. Возвращает статистику:
   - Сколько лидов синхронизировано
   - Сколько лидов не найдено в AmoCRM
   - Статус email/SMS отправки

**Использование**:
```bash
curl -X POST https://onai.academy/api/admin/landing/sync-amocrm
```

---

## 🎯 UTM Attribution Engine

**Файл**: `backend/src/services/traffic-utm-attribution.ts`

**Как работает**:
1. Получает UTM параметры из лида/продажи
2. Ищет соответствующую команду в `traffic_teams` по `utm_source`
3. Если не находит точное совпадение, использует fuzzy matching (паттерн `fb_<team_name>`)
4. Возвращает результат с confidence level:
   - `high` - точное совпадение utm_source
   - `medium` - fuzzy match по имени команды
   - `low` - атрибуция не найдена

**Пример**:
```javascript
const attribution = await utmEngine.attribute({
  utm_source: 'fb_kenesary',
  utm_campaign: 'tripwire_test_1',
  utm_medium: 'cpc'
});

// Результат:
{
  team_name: 'Kenesary',
  team_id: 'uuid-123',
  utm_source: 'fb_kenesary',
  utm_medium: 'cpc',
  confidence: 'high'
}
```

---

## 📊 Admin Панели

### 1️⃣ **Traffic Dashboard** (`/traffic/admin`)

**URL**: https://onai.academy/traffic/admin

**Функционал**:
- Просмотр статистики продаж по командам
- UTM Sources анализ
- API Integrations мониторинг
- Team Constructor

**Данные из**: **Traffic DB** (`all_sales_tracking`, `traffic_teams`, `traffic_sales_stats`)

---

### 2️⃣ **Landing Admin** (`/integrator/admin/leads`)

**URL**: https://expresscourse.onai.academy/admin/leads

**Функционал**:
- Просмотр лидов с лендинга
- Статус email/SMS отправки
- Синхронизация с AmoCRM
- Фильтрация по UTM меткам

**Данные из**: **Landing DB** (`landing_leads`, `express_course_sales`, `main_product_sales`)

---

## 🔗 Схема потока данных

```
┌─────────────────────────────────────────────────────────────────┐
│                        AmoCRM                                    │
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │ Express Course   │         │ Flagship Course  │             │
│  │ Pipeline 10350882│         │ Pipeline 10418746│             │
│  │ 5,000 ₸          │         │ 490,000 ₸        │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │                             │                        │
│           │ Status → 142 (Успешно)      │ Status → 142          │
│           │                             │                        │
└───────────┼─────────────────────────────┼────────────────────────┘
            │                             │
            │ Webhook                     │ Webhook
            ▼                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend Express Server                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ /api/amocrm/funnel-sale                                    │ │
│  │ - Извлекает UTM метки                                      │ │
│  │ - Определяет таргетолога                                   │ │
│  │ - Deduplication check                                      │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│  ┌────────────────┴───────────────────────────────────────────┐ │
│  │ /api/amocrm/sales-webhook                                  │ │
│  │ - Определяет таргетолога по маппингу                       │ │
│  │ - Отправляет Telegram уведомление                          │ │
│  └────────────────┬───────────────────────────────────────────┘ │
└───────────────────┼──────────────────────────────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│   Landing DB     │    │   Traffic DB     │
│                  │    │                  │
│ - landing_leads  │    │ - all_sales_     │
│ - express_       │    │   tracking       │
│   course_sales   │    │ - traffic_teams  │
│ - main_product_  │    │ - traffic_sales_ │
│   sales          │    │   stats          │
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

## 🔧 Конфигурация (.env)

```bash
# AmoCRM
AMOCRM_DOMAIN=onaiagencykz
AMOCRM_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...
AMOCRM_CLIENT_SECRET=UkUwckQ4Y6lqqcZ0NH15PLI2OoYwYQBO...
AMOCRM_CLIENT_ID=2944ad66-36f6-4833-9bdc-946e8fe5ef87

# Traffic Dashboard Supabase
TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
TRAFFIC_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Landing Supabase
LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
LANDING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Tripwire Supabase
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📝 Важные endpoints

### API для мониторинга

```bash
# 1. Проверить статус AmoCRM API
GET https://onai.academy/api/integrations/amocrm

# 2. Получить историю продаж таргетолога
GET https://onai.academy/api/amocrm/sales-history?targetologist=Kenesary&start=2024-12-01&end=2024-12-31

# 3. Статистика по таргетологам
GET https://onai.academy/api/amocrm/sales-stats?start=2024-12-01&end=2024-12-31

# 4. Синхронизация лидов с AmoCRM
POST https://onai.academy/api/admin/landing/sync-amocrm

# 5. Тестовая отправка уведомления
POST https://onai.academy/api/amocrm/test-sale-notification
{
  "targetologist": "Kenesary",
  "contact_name": "Тестовый Клиент",
  "sale_amount": 5000,
  "product_name": "Express Course"
}
```

---

## 🎯 Таргетологи и их UTM паттерны

### Kenesary 👑
**UTM паттерны**: `tripwire`, `nutcab`, `kenesary`, `nutrients`, `kab3`, `1day`, `pb_agency`, `kenji`, `kenes`

### Arystan 🦁
**UTM паттерны**: `arystan`, `ar_`, `ast_`, `rm almaty`, `rm_almaty`

### Muha 🚀
**UTM паттерны**: `onai`, `on ai`, `запуск`, `muha`, `yourmarketolog`, `maqtakyz`, `residence`, `yourteam`, `tima`

### Traf4 ⚡
**UTM паттерны**: `alex`, `traf4`, `proftest`, `pb_agency`, `smmmcwin`, `3-1`

---

## ⚠️ Критические моменты

### 1. Deduplication webhooks
- Используется кэш на 5 минут
- Предотвращает дубликаты при retry от AmoCRM
- Всегда возвращает `200 OK` чтобы остановить retry loop

### 2. AmoCRM timeout
- Установлен на **20 секунд** для health check
- **30 секунд** для sync операций
- AmoCRM может медленно отвечать

### 3. UTM Custom Fields
- В AmoCRM есть дубликаты UTM полей с разными ID
- Используем основные ID (434xxx)
- Webhook должен правильно извлекать данные

### 4. Token expiration
- AmoCRM токен истекает: **2028-07-01** (916+ дней)
- Тип: Long-lived JWT token
- `AMOCRM_REFRESH_TOKEN=LONG_LIVED_NO_REFRESH_NEEDED`

---

## 📈 Следующие шаги

### Рекомендации по улучшению:

1. **Автоматическая синхронизация**
   - Добавить cron job для регулярной синхронизации `landing_leads` с AmoCRM
   - Частота: каждые 6 часов

2. **Webhook для Flagship Course**
   - Создать отдельный webhook для pipeline `10418746`
   - Сохранять в `main_product_sales`

3. **Dashboard аналитики**
   - Добавить графики конверсии по воронкам
   - ROI по таргетологам
   - Динамика продаж по неделям/месяцам

4. **Сохранить Pipeline IDs в конфиг**
   - Добавить в `amocrm-config.ts`:
   ```javascript
   PIPELINES: {
     EXPRESS_COURSE: 10350882,
     FLAGSHIP_COURSE: 10418746
   }
   ```

5. **IP Whitelist проверка**
   - Убедиться что IP сервера добавлен в AmoCRM whitelist
   - Текущая ошибка 403 Forbidden может быть из-за этого

---

## 📞 Поддержка

**API Health Check**: https://onai.academy/api/integrations/all

**Контакты**:
- Backend: Express.js на `https://onai.academy`
- AmoCRM: `https://onaiagencykz.amocrm.ru`

---

**Документ актуален на**: 2025-12-27
**Версия**: 1.0
