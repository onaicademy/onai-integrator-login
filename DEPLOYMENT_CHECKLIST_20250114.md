# ✅ ЧЕКЛИСТ ДЕПЛОЯ - 14 ЯНВАРЯ 2025

## 🎯 ЧТО БЫЛО ИСПРАВЛЕНО

### 4 Критические ошибки в Admin панели:
1. ✅ **404 Error** - `leads_with_journey` table not found
2. ✅ **406 Error** - `scheduled_notifications` зацикливается
3. ✅ **405 Error** - AmoCRM sync не работает
4. ✅ **Multiple GoTrueClient** warning

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС

### ⚡ Шаг 1: Применить SQL миграцию (5 минут)

1. **Открой Landing Database:**
   - URL: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy
   - Это LANDING база (где хранятся leads)

2. **Открой SQL Editor:**
   - Левое меню → SQL Editor
   - Нажми "New Query"

3. **Скопируй и выполни SQL:**

```sql
-- Migration: Create leads_with_journey VIEW
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
  ll.id, ll.name, ll.email, ll.phone, ll.source, ll.created_at, ll.updated_at,
  ll.email_sent, ll.sms_sent, ll.email_clicked, ll.email_clicked_at,
  ll.sms_clicked, ll.sms_clicked_at, ll.click_count, ll.metadata,
  ll.amocrm_lead_id, ll.amocrm_synced, ll.amocrm_contact_id
ORDER BY ll.created_at DESC;

GRANT SELECT ON public.leads_with_journey TO service_role;
GRANT SELECT ON public.leads_with_journey TO authenticated;
GRANT SELECT ON public.leads_with_journey TO anon;
```

4. **Проверь что работает:**

```sql
SELECT COUNT(*) FROM public.leads_with_journey;
```

Должно вернуть количество лидов.

---

### ⚡ Шаг 2: Деплой на Production (2 минуты)

```bash
# Сохрани все изменения
git add .
git commit -m "fix: исправлены критические ошибки админ панели (404, 406, 405, multiple clients)"
git push origin main
```

**Frontend (Vercel):** Задеплоится автоматически через 60-90 секунд

**Backend:** НЕ требует изменений (все фиксы на frontend)

---

### ⚡ Шаг 3: Проверка (3 минуты)

#### 1. Открой админку:
https://onai.academy/integrator/leads-admin

#### 2. Открой Developer Console (F12):

**Должно быть:**
- ✅ Нет ошибок 404 (`leads_with_journey`)
- ✅ Нет ошибок 406 (`scheduled_notifications`)
- ✅ Нет warning "Multiple GoTrueClient instances"

**НЕ должно быть:**
- ❌ `GET ...leads_with_journey 404`
- ❌ `GET ...scheduled_notifications 406`
- ❌ `Multiple GoTrueClient instances detected`

#### 3. Проверь AmoCRM синхронизацию:

1. Найди любой лид в таблице
2. Нажми кнопку **"Выгрузить в AmoCRM"**
3. Должен показаться alert: **"✅ Сделка создана в AmoCRM (ID: 12345)"**
4. Открой AmoCRM и проверь что сделка действительно там

---

## 📊 ЧТО ИЗМЕНИЛОСЬ В КОДЕ

### Новые файлы:

```
src/lib/supabase-landing.ts               ← Singleton Landing Supabase клиент
supabase/migrations/...view.sql           ← SQL миграция
MIGRATION_INSTRUCTIONS_...md              ← Инструкция миграции
FIXES_ADMIN_PANEL_ERRORS.md               ← Документация фиксов
DEPLOYMENT_CHECKLIST_20250114.md          ← Этот файл
```

### Изменённые файлы:

```
src/pages/tripwire/admin/LeadsAdmin.tsx
  - Использует singleton вместо нового клиента
  - .single() → .maybeSingle() (fix 406)
  - Все API запросы используют VITE_API_URL (fix 405)
```

---

## 🎉 РЕЗУЛЬТАТ

### Было:
- ❌ 404 Error каждую секунду
- ❌ 406 Error зацикливается бесконечно
- ❌ 405 Error при клике на "Выгрузить в AmoCRM"
- ⚠️ Multiple GoTrueClient warning

### Стало:
- ✅ VIEW `leads_with_journey` существует
- ✅ Запросы к `scheduled_notifications` работают корректно
- ✅ AmoCRM синхронизация работает
- ✅ Только один инстанс Landing Supabase клиента

---

## 💰 ВАЖНО

После того как пользователь прошел ProfTest, лид автоматически выгружается в AmoCRM через:
- Backend endpoint: `/api/landing/proftest`
- Автоматически создается сделка в AmoCRM
- Отправляется Email + SMS с результатами

**ЭТО ДОЛЖНО РАБОТАТЬ АВТОМАТИЧЕСКИ!**

Кнопка "Выгрузить в AmoCRM" в админке - только для РУЧНОЙ повторной выгрузки (если что-то пошло не так).

---

## 🔍 КАК ДЕБАЖИТЬ ЕСЛИ ЧТО-ТО НЕ РАБОТАЕТ

### Если 404 ошибка не исчезла:

1. Проверь что миграция применилась:
```sql
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' AND table_name = 'leads_with_journey';
```

2. Если VIEW не существует - примени миграцию заново

---

### Если 406 ошибка не исчезла:

1. Проверь что код задеплоился:
   - Открой https://onai.academy
   - Открой DevTools → Sources
   - Найди файл `LeadsAdmin.tsx` в бандле
   - Проверь что там есть `.maybeSingle()` а не `.single()`

---

### Если 405 ошибка не исчезла:

1. Проверь что в .env есть `VITE_API_URL`:
   - Production: `VITE_API_URL=https://api.onai.academy`
   - Localhost: `VITE_API_URL=http://localhost:5000`

2. Проверь в Network tab что запрос идет на `api.onai.academy`, а не на `onai.academy`

---

## ⏱️ ТАЙМИНГ

- Шаг 1 (SQL миграция): **5 минут**
- Шаг 2 (Деплой): **2 минуты**
- Шаг 3 (Проверка): **3 минуты**

**Итого: 10 минут**

---

**Удачи!** 🚀

