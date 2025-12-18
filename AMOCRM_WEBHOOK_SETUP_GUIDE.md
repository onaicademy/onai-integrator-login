# 🔗 AmoCRM WEBHOOK - ПОЛНАЯ ИНСТРУКЦИЯ

**Дата**: 19 декабря 2025  
**Версия**: 2.0 - Расширенный трекинг всех UTM-меток

---

## 🎯 ЧТО ДЕЛАЕТ WEBHOOK

Автоматически отправляет данные о каждой продаже из AmoCRM в твою систему:
- ✅ Сумма продажи
- ✅ UTM-метки (source, medium, campaign, content, term)
- ✅ Контактные данные клиента
- ✅ Информация о сделке
- ✅ Автоматическое определение таргетолога

---

## 📡 WEBHOOK URL

### Production:
```
https://api.onai.academy/api/amocrm/sales-webhook
```

### Local (для тестирования):
```
http://localhost:3000/api/amocrm/sales-webhook
```

**Метод**: POST  
**Content-Type**: application/json

---

## 🔧 НАСТРОЙКА В AMOCRM

### Шаг 1: Зайти в настройки webhooks

1. Открой AmoCRM
2. Настройки → Интеграции → Webhooks
3. Нажми "+ Добавить webhook"

### Шаг 2: Настроить webhook

**URL**: `https://api.onai.academy/api/amocrm/sales-webhook`  
**Метод**: POST  
**События для отслеживания**:
- ✅ Сделка закрыта (Closed/Won)
- ✅ Статус сделки изменён (на "Оплачено" или аналогичный)

### Шаг 3: Добавить custom fields

В AmoCRM нужно создать custom fields для сделок, чтобы передавать UTM-метки:

1. Настройки → Поля → Сделки
2. Добавить текстовые поля:
   - `utm_source` (Источник)
   - `utm_medium` (Канал)
   - `utm_campaign` (Кампания)
   - `utm_content` (Контент)
   - `utm_term` (Ключевое слово)

### Шаг 4: Настроить передачу данных

В webhook настройках укажи, какие поля отправлять:

```json
{
  "lead_id": "{{lead.id}}",
  "lead_name": "{{lead.name}}",
  "contact_name": "{{lead.contact.name}}",
  "contact_phone": "{{lead.contact.phone}}",
  "contact_email": "{{lead.contact.email}}",
  "sale_amount": "{{lead.price}}",
  "product_name": "{{lead.custom_fields.product_name}}",
  "pipeline_id": "{{lead.pipeline_id}}",
  "status_id": "{{lead.status_id}}",
  "responsible_user_id": "{{lead.responsible_user_id}}",
  "responsible_user_name": "{{lead.responsible_user.name}}",
  "currency": "KZT",
  "utm_source": "{{lead.custom_fields.utm_source}}",
  "utm_medium": "{{lead.custom_fields.utm_medium}}",
  "utm_campaign": "{{lead.custom_fields.utm_campaign}}",
  "utm_content": "{{lead.custom_fields.utm_content}}",
  "utm_term": "{{lead.custom_fields.utm_term}}"
}
```

---

## 📝 ФОРМАТ ДАННЫХ (для разработчиков)

### Минимальный запрос:
```json
{
  "lead_id": "12345",
  "sale_amount": 5000,
  "utm_campaign": "tripwire_campaign_17dec"
}
```

### Полный запрос (рекомендуется):
```json
{
  "lead_id": "12345",
  "lead_name": "Заявка с лендинга",
  "contact_name": "Иван Иванов",
  "contact_phone": "+77771234567",
  "contact_email": "ivan@example.com",
  "sale_amount": 5000,
  "product_name": "Tripwire Course",
  "currency": "KZT",
  "pipeline_id": "10350882",
  "status_id": "142",
  "responsible_user_id": "1234",
  "responsible_user_name": "Менеджер Петр",
  "utm_source": "facebook",
  "utm_medium": "cpc",
  "utm_campaign": "tripwire_campaign_17dec",
  "utm_content": "video_creative_1",
  "utm_term": "online_courses",
  "utm_id": "fb_campaign_123",
  "referrer": "https://facebook.com",
  "landing_page": "https://tripwire.onai.academy",
  "device_type": "mobile",
  "browser": "Chrome",
  "os": "iOS",
  "country": "Kazakhstan",
  "city": "Almaty"
}
```

---

## 🔍 АВТОМАТИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ТАРГЕТОЛОГА

Система автоматически определяет таргетолога по UTM-меткам:

### Kenesary 👑
- utm_campaign содержит: `tripwire`, `nutcab`, `kenesary`, `kenji`
- utm_source содержит: `kenji`, `kenesary`

### Arystan ⚡
- utm_campaign содержит: `arystan`
- utm_source содержит: `arystan`

### Muha 🚀
- utm_campaign содержит: `on ai`, `onai`, `запуск`, `muha`
- utm_source содержит: `yourmarketolog`

### Traf4 🎯
- utm_campaign содержит: `alex`, `traf4`, `proftest`
- utm_source содержит: `pb_agency`

**Если ничего не совпало** → `Unknown`

---

## 🧪 ТЕСТИРОВАНИЕ WEBHOOK

### Вариант 1: Curl (из терминала)

```bash
curl -X POST https://api.onai.academy/api/amocrm/sales-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": "test_12345",
    "lead_name": "Тестовая сделка",
    "contact_name": "Тестовый клиент",
    "contact_phone": "+77771234567",
    "sale_amount": 5000,
    "product_name": "Tripwire",
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "tripwire_test_campaign",
    "utm_content": "video_1"
  }'
```

### Вариант 2: Postman

1. **Method**: POST
2. **URL**: `https://api.onai.academy/api/amocrm/sales-webhook`
3. **Headers**:
   - `Content-Type: application/json`
4. **Body** (raw JSON):
   ```json
   {
     "lead_id": "test_12345",
     "sale_amount": 5000,
     "utm_campaign": "tripwire_test"
   }
   ```

### Вариант 3: Через AmoCRM Test (встроенный тестер)

1. В настройках webhook нажми "Тест"
2. AmoCRM отправит тестовый запрос
3. Проверь логи: должен быть 200 OK

---

## ✅ ЧТО ПРОИСХОДИТ ПОСЛЕ ОТПРАВКИ

1. **Webhook получен** → Логируется в backend logs
2. **Данные сохраняются**:
   - В таблицу `sales_notifications` (старая, для обратной совместимости)
   - В таблицу `all_sales_tracking` (новая, расширенная)
3. **Определяется таргетолог** (автоматически по UTM)
4. **Отправляется уведомление в Telegram**:
   ```
   🎉 НОВАЯ ПРОДАЖА!
   
   👑 Таргетолог: Kenesary
   👤 Клиент: Иван Иванов
   💰 Сумма: ₸5,000
   📦 Продукт: Tripwire
   🏷️ Кампания: tripwire_test_campaign
   
   Kenesary, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ! 🔥
   ```

5. **Данные доступны в админке**:
   - Traffic Dashboard → Traffic Stats
   - Админ панель → Источники продаж (новая!)

---

## 📊 ПРОВЕРКА РАБОТЫ

### 1. Проверка в базе данных

Зайди в Supabase Tripwire DB → SQL Editor:

```sql
-- Последние 10 продаж
SELECT 
  id,
  lead_id,
  contact_name,
  sale_amount,
  utm_source,
  utm_campaign,
  targetologist,
  sale_date
FROM all_sales_tracking
ORDER BY sale_date DESC
LIMIT 10;
```

### 2. Проверка через API

```bash
# Получить статистику по всем UTM источникам
curl https://api.onai.academy/api/utm-analytics/overview?days=30

# Топ источников
curl https://api.onai.academy/api/utm-analytics/top-sources?limit=10

# Топ кампаний
curl https://api.onai.academy/api/utm-analytics/top-campaigns?limit=10

# Продажи без UTM (требуют внимания)
curl https://api.onai.academy/api/utm-analytics/without-utm
```

### 3. Проверка в админке

```
URL: https://traffic.onai.academy/admin/utm-sources
Логин: admin@onai.academy
Пароль: admin123
```

---

## 🚨 TROUBLESHOOTING

### Проблема: Webhook не получен
**Решение**:
1. Проверь URL: `https://api.onai.academy/api/amocrm/sales-webhook`
2. Проверь что backend запущен: `pm2 status onai-backend`
3. Проверь логи: `pm2 logs onai-backend | grep "Sales Webhook"`

### Проблема: Таргетолог определён как "Unknown"
**Решение**:
1. Проверь UTM-метки в запросе
2. Убедись что utm_campaign или utm_source содержат ключевые слова:
   - Kenesary: `tripwire`, `nutcab`, `kenji`
   - Arystan: `arystan`
   - Muha: `onai`, `запуск`
   - Traf4: `alex`, `proftest`

### Проблема: Продажи не отображаются в админке
**Решение**:
1. Проверь что миграция применена:
   ```sql
   SELECT * FROM all_sales_tracking LIMIT 1;
   ```
2. Если таблицы нет → примени миграцию:
   ```bash
   # Выполни SQL из файла:
   # supabase/migrations/20251219_create_all_sales_tracking.sql
   ```

### Проблема: Не приходят Telegram уведомления
**Решение**:
1. Проверь статус в БД:
   ```sql
   SELECT notification_status FROM sales_notifications 
   ORDER BY created_at DESC LIMIT 10;
   ```
2. Проверь Telegram bot:
   ```bash
   pm2 logs onai-backend | grep "Telegram"
   ```

---

## 📌 ВАЖНЫЕ ЗАМЕЧАНИЯ

### 1. UTM-метки обязательны!
Без UTM-меток система не сможет определить источник продажи и таргетолога.

### 2. Формат UTM-меток
Рекомендуется использовать:
- **utm_source**: откуда (facebook, instagram, google, direct)
- **utm_medium**: тип трафика (cpc, cpm, organic)
- **utm_campaign**: название кампании (tripwire_dec_17, arystan_winter)
- **utm_content**: креатив (video_1, image_2)

### 3. Lead ID должен быть уникальным
Система использует `lead_id` как уникальный идентификатор. Повторные продажи с одним lead_id будут игнорироваться.

### 4. Формат суммы
`sale_amount` должен быть числом (не строкой):
- ✅ Правильно: `"sale_amount": 5000`
- ❌ Неправильно: `"sale_amount": "5000 тенге"`

---

## 🎯 API ENDPOINTS (для разработчиков)

### 1. Webhook (POST)
```
POST /api/amocrm/sales-webhook
```

### 2. UTM Analytics (GET)
```
GET /api/utm-analytics/overview?days=30
GET /api/utm-analytics/top-sources?limit=10
GET /api/utm-analytics/top-campaigns?limit=10
GET /api/utm-analytics/without-utm
GET /api/utm-analytics/daily-stats?days=30
GET /api/utm-analytics/search?utm_campaign=tripwire
GET /api/utm-analytics/source-details/:source
```

### 3. Legacy (старые endpoints)
```
GET /api/amocrm/sales-history?targetologist=Kenesary
GET /api/amocrm/sales-stats?start=2024-12-01&end=2024-12-31
POST /api/amocrm/test-sale-notification
```

---

## 📞 КОНТАКТЫ

**Техническая поддержка**:
- Backend: PM2 logs → `pm2 logs onai-backend`
- Database: Supabase Tripwire
- Admin Panel: https://traffic.onai.academy/admin

**Документация**:
- Этот файл: `AMOCRM_WEBHOOK_SETUP_GUIDE.md`
- Security: `TRAFFIC_SECURITY_TRACKING_GUIDE.md`
- Traffic V2: `TRAFFIC_DASHBOARD_V2_COMPLETE.md`

---

**Создано**: 19 декабря 2025  
**Автор**: AI Assistant  
**Версия**: 2.0  

🚀 **Webhook готов к работе!** 🎯
