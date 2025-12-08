# 🚀 Полная Настройка Landing + DB + AmoCRM

## ✅ Что сделано:

1. ✅ Создана таблица `landing_leads` в новой БД Supabase
2. ✅ Создан API endpoint `/api/landing/submit` для приема заявок
3. ✅ Создан компонент формы `LeadForm` с красивым дизайном
4. ✅ Интегрирована форма на лендинг `/twland`
5. ✅ Настроена интеграция с AmoCRM (создание сделок)

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС:

### 1️⃣ Применить миграцию в новой БД

**Вариант А: Через Supabase Dashboard (Рекомендуется)**

1. Открой: https://xikaiavwqinamgolmtcy.supabase.co
2. Перейди в **SQL Editor**
3. Скопируй весь код из файла: `supabase/migrations/20250108_create_landing_leads.sql`
4. Вставь в SQL Editor и нажми **RUN**

**Вариант Б: Через SQL Editor - Quick SQL**

Скопируй и выполни:

```sql
-- Создать таблицу landing_leads
CREATE TABLE IF NOT EXISTS public.landing_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'twland',
  amocrm_lead_id TEXT,
  amocrm_synced BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Индексы
CREATE INDEX IF NOT EXISTS landing_leads_email_idx ON public.landing_leads(email);
CREATE INDEX IF NOT EXISTS landing_leads_created_at_idx ON public.landing_leads(created_at DESC);

-- RLS
ALTER TABLE public.landing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON public.landing_leads FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon to insert"
  ON public.landing_leads FOR INSERT TO anon
  WITH CHECK (true);
```

---

### 2️⃣ Добавить переменные окружения

#### **Backend `.env`** (добавь в конец файла):

```bash
# ============================================
# LANDING PAGE DATABASE (New Supabase Project)
# ============================================
LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
LANDING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDg1MzIyMSwiZXhwIjoyMDgwNDI5MjIxfQ.eP7ake2RkWqCaLTKv0jI3vWMkBjDySKsAdToKIgb7fA
LANDING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ

# ============================================
# AMOCRM INTEGRATION
# ============================================
AMOCRM_DOMAIN=yourdomain.amocrm.ru
AMOCRM_CLIENT_ID=your-client-id
AMOCRM_CLIENT_SECRET=your-client-secret
AMOCRM_ACCESS_TOKEN=your-access-token
AMOCRM_REFRESH_TOKEN=your-refresh-token
AMOCRM_PIPELINE_ID=your-pipeline-id
AMOCRM_STATUS_ID=your-status-id
```

#### **Frontend `.env`** (если нужно, но пока не обязательно):

```bash
# Landing Page Database (Public Key)
VITE_LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
VITE_LANDING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ
```

---

### 3️⃣ Настроить AmoCRM (Обязательно!)

1. Зайди в AmoCRM: **Settings → Integrations → API**
2. Создай новую интеграцию
3. Получи:
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `ACCESS_TOKEN`
   - `REFRESH_TOKEN`
4. Найди ID воронки и статуса:
   - Зайди в нужную воронку
   - В URL будет: `...pipeline/12345/...` - это `PIPELINE_ID`
   - Статус можно найти через API или DevTools
5. Добавь всё в `.env` backend

**📚 Гайд по AmoCRM API:**
https://www.amocrm.ru/developers/content/crm_platform/platform-api

---

### 4️⃣ Перезапустить backend

```bash
cd backend
npm run dev
```

Проверь что в консоли нет ошибок про `LANDING_SUPABASE_*` переменные.

---

### 5️⃣ Проверить что всё работает

#### **Test 1: Health Check**

```bash
curl http://localhost:3000/api/landing/health
```

Ожидаемый ответ:
```json
{
  "database": true,
  "amocrm": true,
  "timestamp": "2025-01-08T..."
}
```

#### **Test 2: Submit Lead**

```bash
curl -X POST http://localhost:3000/api/landing/submit \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Тестовый Пользователь",
    "phone": "+77001234567"
  }'
```

Ожидаемый ответ:
```json
{
  "success": true,
  "leadId": "uuid-here",
  "amocrmLeadId": "12345",
  "message": "Заявка успешно отправлена!"
}
```

#### **Test 3: Проверить в Supabase**

1. Открой: https://xikaiavwqinamgolmtcy.supabase.co
2. Перейди в **Table Editor → landing_leads**
3. Увидишь тестовую заявку

#### **Test 4: Проверить в AmoCRM**

1. Открой AmoCRM
2. Перейди в нужную воронку
3. Увидишь сделку "Заявка с лендинга: Тестовый Пользователь"

---

## 🎨 Как работает форма на лендинге:

1. Пользователь нажимает **"ЗАНЯТЬ МЕСТО"**
2. Открывается красивое модальное окно с формой
3. Поля с placeholder'ами (примеры):
   - Email: `ivan@example.com`
   - Имя: `Иван Иванов`
   - Телефон: `+7 (700) 123-45-67`
4. После отправки:
   - ✅ Данные сохраняются в Supabase
   - ✅ Создается контакт в AmoCRM
   - ✅ Создается сделка в AmoCRM
   - ✅ Показывается успешное уведомление
   - ✅ Форма закрывается через 2 секунды

---

## 📊 Мониторинг заявок

### В Supabase:

```sql
-- Все заявки
SELECT * FROM landing_leads 
ORDER BY created_at DESC;

-- Статистика
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE amocrm_synced = true) as synced,
  COUNT(*) FILTER (WHERE amocrm_synced = false) as pending
FROM landing_leads;
```

### Через API:

```bash
curl http://localhost:3000/api/landing/stats
```

---

## 🔒 Безопасность

✅ **Service Role Key** - ТОЛЬКО на backend (в `.env`)  
✅ **Anon Key** - можно на frontend (публичный)  
✅ **RLS включен** - анонимы могут только INSERT  
✅ **AmoCRM токены** - ТОЛЬКО на backend  
✅ **Форма валидирует** email формат  

---

## 🎯 Roadmap (что дальше):

1. ✅ Сбор заявок - **ГОТОВО**
2. ⏳ SMS уведомления (через SMS.ru или Twilio)
3. ⏳ Email рассылка (через Resend)
4. ⏳ WhatsApp сообщения (через WhatsApp Business API)
5. ⏳ Автоматическая квалификация лидов

---

## 🆘 Troubleshooting

### Ошибка: "LANDING SUPABASE CREDENTIALS NOT CONFIGURED"

**Решение:** Добавь переменные в `backend/.env` и перезапусти backend

### Ошибка: "Failed to save lead to database"

**Решение:** Проверь что миграция применена (таблица существует)

### Ошибка: "AmoCRM not configured"

**Решение:** Это warning, не критично. Данные всё равно сохранятся в БД. Настрой AmoCRM для полной интеграции.

### Форма не открывается

**Решение:** Проверь консоль браузера (F12) на ошибки. Возможно нужно перезапустить frontend.

---

## 📞 Контакты

Если что-то не работает - пиши, разберемся! 🚀
