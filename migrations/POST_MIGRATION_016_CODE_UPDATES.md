# 🔧 Post-Migration 016: Обновление кода приложения

## 📋 Checklist обновлений после консолидации БД

После успешного применения Migration 016 необходимо обновить код приложения для использования только Traffic DB.

---

## ✅ Шаг 1: Обновить конфигурацию Supabase клиентов

### **backend/src/config/supabase.ts** (или аналогичный файл)

**Было:**
```typescript
import { createClient } from '@supabase/supabase-js';

// Landing DB
export const landingSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Traffic DB
export const trafficAdminSupabase = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SUPABASE_SERVICE_KEY!
);
```

**Стало:**
```typescript
import { createClient } from '@supabase/supabase-js';

// ✅ Unified Traffic DB (используется для всего)
export const trafficAdminSupabase = createClient(
  process.env.TRAFFIC_SUPABASE_URL!,
  process.env.TRAFFIC_SUPABASE_SERVICE_KEY!
);

// ⚠️ Legacy Landing DB (deprecated, удалить после проверки)
// export const landingSupabase = ...
```

---

## ✅ Шаг 2: Обновить routes для лидов

### **backend/src/routes/landing.ts** → **Удалить или объединить с traffic routes**

**Было:**
```typescript
import { landingSupabase } from '../config/supabase.js';

router.get('/api/leads', async (req, res) => {
  const { data } = await landingSupabase
    .from('landing_leads')
    .select('*');

  res.json({ leads: data });
});
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

router.get('/api/leads', async (req, res) => {
  const { data } = await trafficAdminSupabase
    .from('traffic_leads')  // ← ИЗМЕНЕНО
    .select('*');

  res.json({ leads: data });
});
```

---

## ✅ Шаг 3: Обновить вебхуки

### **backend/src/routes/webhooks/facebook-leads.ts**

**Было:**
```typescript
import { landingSupabase } from '../config/supabase.js';

router.post('/webhook/facebook/leads', async (req, res) => {
  const { leadgen_id, field_data } = req.body.entry[0].changes[0].value;

  // Сохранить в Landing DB
  const { data, error } = await landingSupabase
    .from('landing_leads')
    .insert({
      email: field_data.find(f => f.name === 'email')?.values[0],
      name: field_data.find(f => f.name === 'full_name')?.values[0],
      phone: field_data.find(f => f.name === 'phone_number')?.values[0],
      source: 'facebook',
      metadata: { fb_lead_id: leadgen_id }
    });

  res.sendStatus(200);
});
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

router.post('/webhook/facebook/leads', async (req, res) => {
  const { leadgen_id, field_data } = req.body.entry[0].changes[0].value;

  // ✅ Сохранить в Traffic DB
  const { data, error } = await trafficAdminSupabase
    .from('traffic_leads')  // ← ИЗМЕНЕНО
    .insert({
      email: field_data.find(f => f.name === 'email')?.values[0],
      name: field_data.find(f => f.name === 'full_name')?.values[0],
      phone: field_data.find(f => f.name === 'phone_number')?.values[0],
      source: 'facebook',
      fb_lead_id: leadgen_id,  // ← Теперь отдельная колонка
      metadata: { fb_form_id: req.body.entry[0].id }
    });

  res.sendStatus(200);
});
```

---

## ✅ Шаг 4: Обновить journey tracking

### **backend/src/routes/landing/proftest.ts** (или аналогичный)

**Было:**
```typescript
import { landingSupabase } from '../config/supabase.js';

router.post('/api/proftest/submit', async (req, res) => {
  const { email, name, phone, answers } = req.body;

  // Создать или найти лида
  const { data: lead } = await landingSupabase.rpc('find_or_create_unified_lead', {
    p_email: email,
    p_name: name,
    p_phone: phone,
    p_source: 'proftest'
  });

  // Добавить journey stage
  await landingSupabase.from('lead_journey').insert({
    lead_id: lead.id,
    stage: 'proftest_submitted',
    source: 'proftest_arystan',
    metadata: { answers }
  });

  res.json({ success: true });
});
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

router.post('/api/proftest/submit', async (req, res) => {
  const { email, name, phone, answers } = req.body;

  // ✅ Использовать функцию в Traffic DB
  const { data: lead } = await trafficAdminSupabase.rpc('find_or_create_unified_lead', {
    p_email: email,
    p_name: name,
    p_phone: phone,
    p_source: 'proftest'
  });

  // ✅ Добавить journey stage в Traffic DB
  await trafficAdminSupabase.from('traffic_lead_journey').insert({  // ← ИЗМЕНЕНО
    lead_id: lead.id,
    stage: 'proftest_submitted',
    source: 'proftest_arystan',
    metadata: { answers }
  });

  res.json({ success: true });
});
```

---

## ✅ Шаг 5: Обновить admin panel routes

### **backend/src/routes/admin/leads.ts**

**Было:**
```typescript
import { landingSupabase } from '../config/supabase.js';

router.get('/api/admin/leads', authenticateToken, async (req, res) => {
  const { data } = await landingSupabase
    .from('leads_with_journey')  // View из Landing DB
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  res.json({ leads: data });
});
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

router.get('/api/admin/leads', authenticateToken, async (req, res) => {
  const { data } = await trafficAdminSupabase
    .from('v_traffic_leads_with_journey')  // ← ИЗМЕНЕНО: новый view в Traffic DB
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  res.json({ leads: data });
});
```

---

## ✅ Шаг 6: Обновить environment variables

### **.env** (production)

**Было:**
```bash
# Landing DB
SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Traffic DB
TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
TRAFFIC_SUPABASE_SERVICE_KEY=eyJ...
```

**Стало:**
```bash
# ✅ Unified Traffic DB (используется для всего)
TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
TRAFFIC_SUPABASE_SERVICE_KEY=eyJ...

# ⚠️ Legacy Landing DB (deprecated, удалить после верификации)
# SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_KEY=...
```

---

## ✅ Шаг 7: Обновить frontend (если применимо)

### **frontend/src/services/api.ts**

Если фронтенд обращается напрямую к Supabase:

**Было:**
```typescript
import { createClient } from '@supabase/supabase-js';

const landingClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Получить лиды
const { data } = await landingClient
  .from('landing_leads')
  .select('*');
```

**Стало:**
```typescript
import { createClient } from '@supabase/supabase-js';

// ✅ Unified Traffic DB client
const trafficClient = createClient(
  process.env.NEXT_PUBLIC_TRAFFIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_TRAFFIC_SUPABASE_ANON_KEY!
);

// Получить лиды
const { data } = await trafficClient
  .from('traffic_leads')  // ← ИЗМЕНЕНО
  .select('*');
```

---

## ✅ Шаг 8: Обновить scheduled jobs / cron

### **backend/src/jobs/email-notifications.ts**

**Было:**
```typescript
import { landingSupabase } from '../config/supabase.js';

async function sendScheduledEmails() {
  const { data: notifications } = await landingSupabase
    .from('scheduled_notifications')
    .select('*, landing_leads(*)')
    .eq('sent', false)
    .lte('scheduled_at', new Date().toISOString());

  // Отправить emails...
}
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../config/supabase-traffic.js';

async function sendScheduledEmails() {
  // ✅ Если вы мигрировали scheduled_notifications в Traffic DB:
  const { data: notifications } = await trafficAdminSupabase
    .from('traffic_scheduled_notifications')  // ← ИЗМЕНЕНО
    .select('*, traffic_leads(*)')  // ← ИЗМЕНЕНО
    .eq('sent', false)
    .lte('scheduled_at', new Date().toISOString());

  // Отправить emails...
}
```

---

## ✅ Шаг 9: Обновить тесты

### **tests/leads.test.ts**

**Было:**
```typescript
import { landingSupabase } from '../src/config/supabase';

describe('Leads API', () => {
  it('should create a lead', async () => {
    const { data } = await landingSupabase
      .from('landing_leads')
      .insert({ email: 'test@test.com', name: 'Test', phone: '+1234567890' });

    expect(data).toBeDefined();
  });
});
```

**Стало:**
```typescript
import { trafficAdminSupabase } from '../src/config/supabase-traffic';

describe('Leads API', () => {
  it('should create a lead', async () => {
    const { data } = await trafficAdminSupabase
      .from('traffic_leads')  // ← ИЗМЕНЕНО
      .insert({ email: 'test@test.com', name: 'Test', phone: '+1234567890' });

    expect(data).toBeDefined();
  });
});
```

---

## 📊 Верификация после обновления

### **1. Проверить, что лиды создаются**

```bash
# Отправить тестовый запрос на создание лида
curl -X POST http://localhost:3000/api/proftest/submit \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","phone":"+1234567890","answers":{}}'

# Проверить в Traffic DB
SELECT * FROM traffic_leads WHERE email = 'test@example.com';
```

### **2. Проверить вебхуки**

```bash
# Симулировать Facebook Lead webhook
curl -X POST http://localhost:3000/webhook/facebook/leads \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json

# Проверить в Traffic DB
SELECT * FROM traffic_leads WHERE fb_lead_id IS NOT NULL ORDER BY created_at DESC LIMIT 1;
```

### **3. Проверить admin panel**

```bash
# Открыть Traffic Dashboard
open http://localhost:3000/admin/traffic

# Проверить:
# ✅ Лиды отображаются
# ✅ Атрибуция к таргетологам работает
# ✅ Journey stages показываются
# ✅ Фильтры работают
```

### **4. Проверить производительность**

```sql
-- Запрос должен выполняться < 50ms
EXPLAIN ANALYZE
SELECT * FROM v_traffic_leads_with_journey
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🚨 Rollback план (если что-то пошло не так)

### **Если после обновления возникли проблемы:**

1. **Восстановить старый код:**
   ```bash
   git revert HEAD
   npm run build
   pm2 restart all
   ```

2. **Landing DB всё ещё работает:**
   - Данные в Landing DB не были удалены
   - Можно вернуться к использованию двух БД
   - Миграция 016 не удаляет данные из Landing DB

3. **Traffic DB содержит импортированные данные:**
   - Можно продолжить использовать Traffic DB
   - Исправить ошибки в коде
   - Повторно задеплоить

---

## ✅ Финальный checklist

- [ ] Обновлен конфиг Supabase клиентов
- [ ] Обновлены все routes (landing_leads → traffic_leads)
- [ ] Обновлены вебхуки (Facebook, AmoCRM)
- [ ] Обновлены journey tracking endpoints
- [ ] Обновлены admin panel routes
- [ ] Обновлены environment variables
- [ ] Обновлен frontend (если применимо)
- [ ] Обновлены scheduled jobs
- [ ] Обновлены тесты
- [ ] Прошли все тесты
- [ ] Проверена работа в dev
- [ ] Проверена работа в production
- [ ] Верифицирована производительность
- [ ] Создан backup Landing DB (на случай rollback)
- [ ] Документация обновлена

---

## 🎉 После успешной верификации

### **Можно деактивировать Landing DB instance:**

1. Экспортировать финальный backup Landing DB
2. Приостановить Landing DB instance в Supabase
3. Удалить неиспользуемые environment variables
4. Удалить `landingSupabase` клиент из кода
5. **Экономия: ~$25/месяц** 💰

---

**Статус:** ✅ Готово к применению

**Дата:** 2026-01-04

**Автор:** Claude Code (Sonnet 4.5)
