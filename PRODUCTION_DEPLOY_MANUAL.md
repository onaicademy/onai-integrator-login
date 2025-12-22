# 🚀 PRODUCTION DEPLOYMENT - ПОШАГОВАЯ ИНСТРУКЦИЯ

**Дата:** 22 декабря 2025, 23:10 MSK

---

## STEP 1: DEPLOY BACKEND (через терминал)

```bash
# Открой терминал и выполни:
cd /Users/miso/onai-integrator-login

# Deploy backend files
rsync -avz --exclude='node_modules' --exclude='*.log' \
  backend/src/ \
  root@89.23.100.220:/root/onai-integrator-login/backend/src/

# Restart backend
ssh root@89.23.100.220 "cd /root/onai-integrator-login/backend && pm2 restart onai-backend"

# Check logs
ssh root@89.23.100.220 "pm2 logs onai-backend --lines 20"
```

**Проверь что видишь:**
```
✅ Backend API запущен на http://localhost:3000
✅ Telegram Bot polling started
```

---

## STEP 2: ПРИМЕНИТЬ МИГРАЦИИ В SUPABASE

### Открой Supabase Dashboard:
```
https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql
```

### Выполни МИГРАЦИЮ 1 (если ещё не делал):

```sql
-- Campaign → Targetologist Mapping
CREATE TABLE IF NOT EXISTS campaign_targetologist_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  fb_campaign_id TEXT UNIQUE NOT NULL,
  fb_campaign_name TEXT NOT NULL,
  fb_account_id TEXT NOT NULL,
  
  targetologist TEXT NOT NULL,
  confidence TEXT DEFAULT 'manual',
  
  detected_utms JSONB,
  detected_patterns JSONB,
  
  manually_verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_campaign_map_fb_campaign_id 
  ON campaign_targetologist_map(fb_campaign_id);
  
CREATE INDEX IF NOT EXISTS idx_campaign_map_targetologist 
  ON campaign_targetologist_map(targetologist);

ALTER TABLE campaign_targetologist_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin to read all campaign mappings"
  ON campaign_targetologist_map
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin to manage campaign mappings"
  ON campaign_targetologist_map
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

**Нажми RUN** ✅

---

### Выполни МИГРАЦИЮ 2 (ВАЖНО для воронки):

```sql
-- Funnel Sales Tracking
CREATE TABLE IF NOT EXISTS funnel_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- AmoCRM data
  amocrm_lead_id BIGINT UNIQUE NOT NULL,
  status_id INTEGER NOT NULL,
  pipeline_id INTEGER NOT NULL,
  
  -- Targetologist
  targetologist TEXT NOT NULL,
  
  -- UTM attribution
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Product & amount
  product TEXT NOT NULL,
  amount INTEGER NOT NULL,
  
  -- Funnel stage
  funnel_stage TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_sales_targetologist 
  ON funnel_sales(targetologist);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_funnel_stage 
  ON funnel_sales(funnel_stage);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_product 
  ON funnel_sales(product);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_created_at 
  ON funnel_sales(created_at);
  
CREATE INDEX IF NOT EXISTS idx_funnel_sales_amocrm_lead_id 
  ON funnel_sales(amocrm_lead_id);

ALTER TABLE funnel_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to read funnel sales"
  ON funnel_sales
  FOR SELECT
  USING (true);

CREATE POLICY "Allow system to insert funnel sales"
  ON funnel_sales
  FOR INSERT
  WITH CHECK (true);
```

**Нажми RUN** ✅

---

## STEP 3: ПРОВЕРИТЬ ЧТО WEBHOOK РАБОТАЕТ

```bash
# В терминале:
curl https://api.onai.academy/api/amocrm/funnel-sale/health
```

**Должен вернуть:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "amocrm-funnel-webhook",
  "timestamp": "2025-12-22T..."
}
```

✅ **Если видишь это - ГОТОВО!**

---

## STEP 4: НАСТРОИТЬ WEBHOOK В AMOCRM

### Открой AmoCRM Webhooks:
```
https://onaiagencykz.amocrm.ru/settings/webhooks/
```

### Добавь новый webhook:

**URL:**
```
https://api.onai.academy/api/amocrm/funnel-sale
```

**Настройки:**
- Метод: `POST`
- Событие: `Изменение этапа сделки`
- Воронка: `Leads`
- Pipeline ID: `10350882`
- Выбери этап: `Успешно реализована`

**Поля для отправки:**
- Lead ID ✅
- Status ID ✅
- Pipeline ID ✅
- Custom Fields:
  - UTM Source
  - UTM Campaign
  - UTM Medium
  - UTM Content

**Сохрани!**

---

## STEP 5: СОЗДАТЬ ТЕСТОВУЮ СДЕЛКУ

### Получи AmoCRM API токен

**Открой:**
```
https://onaiagencykz.amocrm.ru/settings/dev/
```

**Скопируй:**
- Access Token
- Account ID

### Создай сделку через API:

```bash
curl -X POST "https://onaiagencykz.amocrm.ru/api/v4/leads" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TEST SALE - Funnel Integration",
    "price": 490000,
    "pipeline_id": 10350882,
    "custom_fields_values": [
      {
        "field_id": YOUR_UTM_SOURCE_FIELD_ID,
        "values": [{"value": "fb_kenesary"}]
      },
      {
        "field_id": YOUR_UTM_CAMPAIGN_FIELD_ID,
        "values": [{"value": "nutrients_test_funnel"}]
      }
    ]
  }'
```

**Сохрани Lead ID из ответа!**

---

## STEP 6: ПЕРЕВЕСТИ В "УСПЕШНО РЕАЛИЗОВАНА"

```bash
curl -X PATCH "https://onaiagencykz.amocrm.ru/api/v4/leads/LEAD_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status_id": SUCCESSFUL_STATUS_ID
  }'
```

**Webhook автоматически сработает!**

---

## STEP 7: ПРОВЕРИТЬ ДАШБОРД

### Открой Production Dashboard:
```
https://onai.academy/#/traffic/cabinet/kenesary
```

**Прокрути до "Main Product (490k)"**

**Должен увидеть:**
- ✅ Conversions: +1 (было 142, стало 143)
- ✅ Revenue: +490,000 KZT
- ✅ Timestamp обновился

---

## АЛЬТЕРНАТИВА: ЧЕРЕЗ AMOCRM UI

**Проще всего:**

1. Открой AmoCRM: https://onaiagencykz.amocrm.ru/leads/list/
2. Создай новую сделку:
   - Название: "TEST SALE - Funnel"
   - Сумма: 490,000 KZT
   - Воронка: 10350882
   - UTM Source: `fb_kenesary`
   - UTM Campaign: `nutrients_test_funnel`
3. Переведи в "Успешно реализована"
4. Webhook сработает автоматически!
5. Проверь дашборд

---

## ✅ CHECKLIST

- [ ] Backend задеплоен
- [ ] pm2 restart выполнен
- [ ] Миграции применены в Supabase
- [ ] Webhook health check OK
- [ ] Webhook настроен в AmoCRM
- [ ] Тестовая сделка создана
- [ ] Сделка переведена в "Успешно реализована"
- [ ] Данные появились в дашборде

---

## 🔗 ВАЖНЫЕ ССЫЛКИ

**Production:**
- Backend: https://api.onai.academy
- Webhook: https://api.onai.academy/api/amocrm/funnel-sale
- Dashboard: https://onai.academy/#/traffic/cabinet/kenesary
- Funnel API: https://api.onai.academy/api/traffic-dashboard/funnel

**AmoCRM:**
- Webhooks: https://onaiagencykz.amocrm.ru/settings/webhooks/
- Pipeline: https://onaiagencykz.amocrm.ru/settings/pipeline/leads/10350882
- Leads: https://onaiagencykz.amocrm.ru/leads/list/

**Supabase:**
- SQL Editor: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql
- Tables: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/editor

---

**ГОТОВО! СЛЕДУЙ ШАГАМ!** ✅
