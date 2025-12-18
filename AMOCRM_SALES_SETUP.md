# 🎉 AMOCRM SALES NOTIFICATIONS - Настройка

## 🎯 ЧТО ДЕЛАЕТ:

### Real-time уведомления в Telegram при продажах:
- ✅ Webhook получает данные об оплате из AmoCRM
- ✅ Определяет таргетолога по UTM меткам
- ✅ Отправляет уведомление в Telegram группу:
  ```
  🎉 НОВАЯ ПРОДАЖА!
  
  👑 Таргетолог: Kenesary
  👤 Клиент: Иван Иванов
  💰 Сумма: 5 000 ₸
  📦 Продукт: Tripwire
  🏷️ Кампания: tripwire_17.12
  
  Kenesary, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ! 🔥
  ```
- ✅ Сохраняет историю в БД для аналитики

---

## 📋 SETUP ИНСТРУКЦИЯ:

### 1️⃣ **Создать таблицу в Supabase Tripwire**

**Зайди в:** https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto

**SQL Editor → New Query:**

```sql
-- Скопируй и выполни весь SQL из:
backend/database/sales_notifications.sql
```

Или используй короткую версию:

```sql
CREATE TABLE IF NOT EXISTS sales_notifications (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  lead_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  sale_amount DECIMAL(10, 2) NOT NULL,
  product_name TEXT,
  targetologist TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  sale_date TIMESTAMPTZ NOT NULL,
  notified_at TIMESTAMPTZ,
  notification_status TEXT DEFAULT 'pending',
  pipeline_id BIGINT,
  status_id BIGINT,
  responsible_user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_notifications_lead_id ON sales_notifications(lead_id);
CREATE INDEX idx_sales_notifications_targetologist ON sales_notifications(targetologist);
CREATE INDEX idx_sales_notifications_sale_date ON sales_notifications(sale_date DESC);
```

---

### 2️⃣ **Настроить Webhook в AmoCRM**

#### Шаг 1: Зайди в настройки AmoCRM
```
Настройки → API → Webhooks
```

#### Шаг 2: Создай новый webhook
- **URL:** `https://api.onai.academy/api/amocrm/sales-webhook`
- **Событие:** "Сделка - статус изменен" на "Успешно реализовано" или "Оплачено"
- **Метод:** `POST`

#### Шаг 3: Настрой передачу данных
AmoCRM должен отправлять JSON:

```json
{
  "lead_id": 12345678,
  "lead_name": "Tripwire - Иван Иванов",
  "contact_name": "Иван Иванов",
  "contact_phone": "+77771234567",
  "sale_amount": 5000,
  "product_name": "Tripwire",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "tripwire_17.12",
  "utm_content": "video_ad",
  "utm_term": "обучение",
  "pipeline_id": 123,
  "status_id": 456,
  "responsible_user_id": 789
}
```

**ВАЖНО:** UTM метки должны передаваться из custom fields сделки!

---

### 3️⃣ **Тестирование**

#### A) Тестовое уведомление:
```bash
curl -X POST https://api.onai.academy/api/amocrm/test-sale-notification \
  -H "Content-Type: application/json" \
  -d '{
    "targetologist": "Kenesary",
    "contact_name": "Иван Тестовый",
    "sale_amount": 5000,
    "product_name": "Tripwire"
  }'
```

Должно прийти уведомление в Telegram группу!

#### B) Полный тест с сохранением в БД:
```bash
curl -X POST https://api.onai.academy/api/amocrm/sales-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": 99999999,
    "lead_name": "ТЕСТ - Иван Иванов",
    "contact_name": "Иван Иванов",
    "contact_phone": "+77771234567",
    "sale_amount": 5000,
    "product_name": "Tripwire",
    "utm_source": "facebook",
    "utm_campaign": "tripwire_17.12"
  }'
```

---

## 📊 API ENDPOINTS:

### 1. **POST /api/amocrm/sales-webhook**
Основной webhook для получения продаж

**Request:**
```json
{
  "lead_id": 12345678,
  "contact_name": "Иван Иванов",
  "sale_amount": 5000,
  "utm_campaign": "tripwire_17.12"
}
```

**Response:**
```json
{
  "success": true,
  "sale_id": 123,
  "targetologist": "Kenesary"
}
```

---

### 2. **GET /api/amocrm/sales-history**
История продаж по таргетологу

**Query params:**
- `targetologist` - фильтр по таргетологу (Kenesary/Arystan/Muha/Traf4)
- `start` - начало периода (YYYY-MM-DD)
- `end` - конец периода (YYYY-MM-DD)

**Example:**
```bash
GET /api/amocrm/sales-history?targetologist=Kenesary&start=2024-12-01&end=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_sales": 45,
    "total_revenue": 225000,
    "avg_sale": 5000
  },
  "sales": [...]
}
```

---

### 3. **GET /api/amocrm/sales-stats**
Статистика по всем таргетологам

**Query params:**
- `start` - начало периода
- `end` - конец периода

**Example:**
```bash
GET /api/amocrm/sales-stats?start=2024-12-01&end=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "period": {
    "start": "2024-12-01",
    "end": "2024-12-31"
  },
  "stats": [
    {
      "targetologist": "Kenesary",
      "sales_count": 45,
      "total_revenue": 225000,
      "avg_sale": 5000,
      "emoji": "👑"
    },
    {
      "targetologist": "Arystan",
      "sales_count": 38,
      "total_revenue": 190000,
      "avg_sale": 5000,
      "emoji": "🦁"
    }
  ]
}
```

---

### 4. **POST /api/amocrm/test-sale-notification**
Тестовая отправка уведомления

**Request:**
```json
{
  "targetologist": "Kenesary",
  "contact_name": "Иван Тестовый",
  "sale_amount": 5000,
  "product_name": "Tripwire"
}
```

---

## 🎯 МАППИНГ ТАРГЕТОЛОГОВ:

Таргетолог определяется автоматически по UTM кампании:

| Таргетолог | UTM patterns | Emoji |
|------------|-------------|-------|
| **Kenesary** | tripwire, nutcab | 👑 |
| **Arystan** | arystan | 🦁 |
| **Muha** | on ai, onai, запуск | 🚀 |
| **Traf4** | alex, traf4, proftest | ⚡ |

**Примеры:**
- `utm_campaign=tripwire_17.12` → **Kenesary** 👑
- `utm_campaign=arystan_16.12` → **Arystan** 🦁
- `utm_campaign=Запуск на On AI 15.12` → **Muha** 🚀
- `utm_campaign=alex/11.12` → **Traf4** ⚡

---

## 📊 ИСТОРИЯ ПРОДАЖ:

### SQL запросы:

#### 1. Последние 10 продаж:
```sql
SELECT 
  targetologist,
  contact_name,
  sale_amount,
  product_name,
  utm_campaign,
  sale_date
FROM sales_notifications
ORDER BY sale_date DESC
LIMIT 10;
```

#### 2. Статистика по таргетологу за декабрь:
```sql
SELECT 
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue,
  AVG(sale_amount) as avg_sale
FROM sales_notifications
WHERE targetologist = 'Kenesary'
  AND sale_date BETWEEN '2024-12-01' AND '2024-12-31';
```

#### 3. Топ таргетологов по продажам:
```sql
SELECT 
  targetologist,
  COUNT(*) as sales_count,
  SUM(sale_amount) as total_revenue
FROM sales_notifications
WHERE sale_date >= '2024-12-01'
GROUP BY targetologist
ORDER BY sales_count DESC;
```

---

## ✅ CHECKLIST:

- [ ] Создана таблица `sales_notifications` в Supabase
- [ ] Настроен Webhook в AmoCRM
- [ ] UTM метки передаются из AmoCRM
- [ ] Telegram бот активирован (код 2134)
- [ ] Тестовое уведомление прошло успешно
- [ ] Полный тест с сохранением в БД работает

---

## 🚀 ГОТОВО!

После настройки:
1. ✅ При каждой оплате в AmoCRM
2. ✅ Автоматически определяется таргетолог
3. ✅ Уведомление летит в Telegram группу
4. ✅ Все сохраняется в БД для аналитики
5. ✅ МОТИВАЦИЯ КОМАНДЫ! 🔥

---

**SQL файл:** `backend/database/sales_notifications.sql`
**Backend код:** `backend/src/routes/amocrm-sales-webhook.ts`
