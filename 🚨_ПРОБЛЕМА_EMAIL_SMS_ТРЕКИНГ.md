# 🚨 КРИТИЧЕСКАЯ ПРОБЛЕМА: Email/SMS не отслеживаются

## 📊 ФАКТЫ:

### ✅ 4 реальных лида получены сегодня (13 декабря 2025):

1. **Гулали** - gulalikamalov0@gmail.com, +7 (705) 904-44-67, 12:07
2. **Нурсагила** - nurs0762@mail.ru, +7 (476) 891-15-2, 12:39
3. **Нурали** - Nurali.tor1@gmail.com, +7 (702) 294-49-99, 14:36
4. **Даурен** - dkkmv1991@mail.ru, +7 (777) 281-90-81, 15:09

### ⏰ Прошло времени:
- Даурен: 55 минут (должны были отправиться Email+SMS)
- Нурали: 1 час 28 минут (должны были отправиться Email+SMS)
- Нурсагила: ~3+ часа (должны были отправиться Email+SMS)
- Гулали: ~4+ часа (должны были отправиться Email+SMS)

---

## 🔍 КАК РАБОТАЕТ СИСТЕМА СЕЙЧАС:

### Шаг 1: Пользователь проходит профтест
```
POST /api/landing/proftest
Body: { name, email, phone, answers, ... }
```

### Шаг 2: Данные сохраняются в базу `landing_leads`
```typescript
// backend/src/routes/landing.ts:609
const { data: supabaseLead } = await landingSupabase
  .from('landing_leads')
  .insert({ name, email, phone, source: 'proftest_...' })
```

### Шаг 3: Запланирована отправка Email+SMS через 10 минут
```typescript
// backend/src/routes/landing.ts:701
scheduleProftestNotifications({
  name, email, phone, leadId: supabaseLead.id
});
```

### Шаг 4: Через 10 минут должна произойти отправка
```typescript
// backend/src/services/scheduledNotifications.ts:34
setTimeout(async () => {
  await sendProftestEmail(name, email);      // Email через Resend
  await sendProftestResultSMS(phone);        // SMS через Mobizon
}, 10 * 60 * 1000); // 10 минут
```

---

## ❌ ПРОБЛЕМЫ:

### 1. НЕТ ОТСЛЕЖИВАНИЯ статусов
Таблица `landing_leads` **НЕ ХРАНИТ**:
- ❌ Был ли отправлен Email
- ❌ Был ли отправлен SMS
- ❌ Были ли ошибки при отправке
- ❌ Когда были отправлены

**Текущая структура:**
```sql
CREATE TABLE landing_leads (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
  -- ❌ НЕТ полей для статусов!
);
```

### 2. НЕТ ЛОГОВ отправки
- Логи backend пустые (analyst-run.log не содержит записей об отправке)
- Невозможно проверить были ли отправки
- Неизвестно были ли ошибки

### 3. ОТПРАВКА ТОЛЬКО В ПАМЯТИ
```typescript
// backend/src/services/scheduledNotifications.ts:18
const scheduledNotifications = new Map<string, NodeJS.Timeout>();
```

**Проблема:** При перезапуске backend все запланированные отправки **ТЕРЯЮТСЯ**!

### 4. НЕТ СВЯЗИ С lead_tracking
- Таблица `lead_tracking` пустая (0 записей)
- Данные из `landing_leads` НЕ синхронизируются с `lead_tracking`
- Дашборд `/target` не показывает этих 4 лидов

---

## 🎯 ЧТО НУЖНО ИСПРАВИТЬ:

### Задача 1: Добавить поля отслеживания в `landing_leads`
```sql
ALTER TABLE landing_leads 
ADD COLUMN email_sent BOOLEAN DEFAULT false,
ADD COLUMN email_sent_at TIMESTAMPTZ,
ADD COLUMN email_error TEXT,
ADD COLUMN sms_sent BOOLEAN DEFAULT false,
ADD COLUMN sms_sent_at TIMESTAMPTZ,
ADD COLUMN sms_error TEXT;
```

### Задача 2: Обновлять статусы после отправки
```typescript
// После успешной отправки Email:
await landingSupabase
  .from('landing_leads')
  .update({ 
    email_sent: true, 
    email_sent_at: new Date().toISOString() 
  })
  .eq('id', leadId);

// После успешной отправки SMS:
await landingSupabase
  .from('landing_leads')
  .update({ 
    sms_sent: true, 
    sms_sent_at: new Date().toISOString() 
  })
  .eq('id', leadId);
```

### Задача 3: Синхронизировать с `lead_tracking`
После сохранения в `landing_leads` сразу создать запись в `lead_tracking`:
```typescript
await tripwireSupabase
  .from('lead_tracking')
  .insert({
    full_name: name,
    email,
    phone,
    source: 'proftest',
    metadata: { landing_lead_id: leadId }
  });
```

### Задача 4: Добавить логирование
```typescript
console.log(`📧 Sending Email to ${email} for lead ${leadId}...`);
const emailResult = await sendProftestEmail(name, email);
if (emailResult.success) {
  console.log(`✅ Email sent successfully to ${email}`);
} else {
  console.error(`❌ Email failed for ${email}:`, emailResult.error);
}
```

### Задача 5: Использовать очередь задач (BullMQ/Redis)
Вместо `setTimeout` использовать надежную очередь:
```typescript
import { Queue } from 'bullmq';

const notificationQueue = new Queue('proftest-notifications', {
  connection: { host: 'localhost', port: 6379 }
});

// Добавить в очередь
await notificationQueue.add('send-notifications', {
  leadId, name, email, phone
}, {
  delay: 10 * 60 * 1000 // 10 минут
});
```

---

## 🔧 ГОТОВОЕ РЕШЕНИЕ (код для копирования):

### 1. Миграция базы данных:
```sql
-- Добавить поля в landing_leads
ALTER TABLE landing_leads 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sms_error TEXT;

-- Добавить индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_landing_leads_email_sent 
ON landing_leads(email_sent);

CREATE INDEX IF NOT EXISTS idx_landing_leads_sms_sent 
ON landing_leads(sms_sent);
```

### 2. Обновить scheduledNotifications.ts:
```typescript
import { createClient } from '@supabase/supabase-js';

const landingSupabase = createClient(
  process.env.LANDING_SUPABASE_URL!,
  process.env.LANDING_SUPABASE_SERVICE_KEY!
);

const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!
);

async function sendProftestEmail(name: string, email: string, leadId: string): Promise<void> {
  try {
    console.log(`📧 [Lead ${leadId}] Sending Email to ${email}...`);
    
    const htmlContent = generateProftestResultEmail(name, PRODUCT_URL);
    const result = await resend.emails.send({
      from: 'OnAI Academy <noreply@onai.academy>',
      to: email,
      subject: 'Тест пройден. Получить продукт',
      html: htmlContent,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    // ✅ ОБНОВИТЬ СТАТУС В БАЗЕ
    await landingSupabase
      .from('landing_leads')
      .update({ 
        email_sent: true, 
        email_sent_at: new Date().toISOString() 
      })
      .eq('id', leadId);

    // ✅ ОБНОВИТЬ В lead_tracking
    await tripwireSupabase
      .from('lead_tracking')
      .update({ 
        email_sent: true, 
        email_sent_at: new Date().toISOString() 
      })
      .eq('email', email);

    console.log(`✅ [Lead ${leadId}] Email sent and tracked: ${result.data?.id}`);
  } catch (error: any) {
    console.error(`❌ [Lead ${leadId}] Email error:`, error.message);
    
    // ✅ СОХРАНИТЬ ОШИБКУ В БАЗЕ
    await landingSupabase
      .from('landing_leads')
      .update({ email_error: error.message })
      .eq('id', leadId);

    throw error;
  }
}

async function sendProftestSMS(phone: string, leadId: string): Promise<void> {
  try {
    console.log(`📱 [Lead ${leadId}] Sending SMS to ${phone}...`);
    
    const success = await sendProftestResultSMS(phone);
    
    if (!success) {
      throw new Error('SMS sending failed');
    }

    // ✅ ОБНОВИТЬ СТАТУС В БАЗЕ
    await landingSupabase
      .from('landing_leads')
      .update({ 
        sms_sent: true, 
        sms_sent_at: new Date().toISOString() 
      })
      .eq('id', leadId);

    // ✅ ОБНОВИТЬ В lead_tracking
    await tripwireSupabase
      .from('lead_tracking')
      .update({ 
        sms_sent: true, 
        sms_sent_at: new Date().toISOString() 
      })
      .eq('phone', phone);

    console.log(`✅ [Lead ${leadId}] SMS sent and tracked`);
  } catch (error: any) {
    console.error(`❌ [Lead ${leadId}] SMS error:`, error.message);
    
    // ✅ СОХРАНИТЬ ОШИБКУ В БАЗЕ
    await landingSupabase
      .from('landing_leads')
      .update({ sms_error: error.message })
      .eq('id', leadId);

    throw error;
  }
}

export function scheduleProftestNotifications(data: ScheduledNotification): void {
  const { name, email, phone, leadId } = data;

  console.log(`⏰ [Lead ${leadId}] Scheduling notifications:`);
  console.log(`   - Email: ${email}`);
  console.log(`   - Phone: ${phone}`);
  console.log(`   - Delay: 10 minutes`);

  // ✅ СОЗДАТЬ ЗАПИСЬ В lead_tracking СРАЗУ
  (async () => {
    try {
      await tripwireSupabase
        .from('lead_tracking')
        .insert({
          full_name: name,
          email,
          phone,
          source: 'proftest',
          metadata: { landing_lead_id: leadId }
        });
      console.log(`✅ [Lead ${leadId}] Added to lead_tracking`);
    } catch (error) {
      console.error(`❌ [Lead ${leadId}] Failed to add to lead_tracking:`, error);
    }
  })();

  const timeoutId = setTimeout(async () => {
    console.log(`📬 [Lead ${leadId}] Sending scheduled notifications...`);

    try {
      await sendProftestEmail(name, email, leadId);
      await sendProftestSMS(phone, leadId);
      
      scheduledNotifications.delete(leadId);
      console.log(`🎉 [Lead ${leadId}] All notifications sent\n`);
    } catch (error) {
      console.error(`❌ [Lead ${leadId}] Notification error:`, error);
    }
  }, NOTIFICATION_DELAY_MS);

  scheduledNotifications.set(leadId, timeoutId);
}
```

### 3. Добавить API endpoint для проверки статусов:
```typescript
// backend/src/routes/landing.ts

router.get('/leads/:leadId/status', async (req: Request, res: Response) => {
  const { leadId } = req.params;

  const { data: lead } = await landingSupabase
    .from('landing_leads')
    .select('name, email, phone, email_sent, email_sent_at, sms_sent, sms_sent_at, email_error, sms_error, created_at')
    .eq('id', leadId)
    .single();

  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  return res.json({
    success: true,
    lead,
    notifications: {
      email: {
        sent: lead.email_sent,
        sent_at: lead.email_sent_at,
        error: lead.email_error
      },
      sms: {
        sent: lead.sms_sent,
        sent_at: lead.sms_sent_at,
        error: lead.sms_error
      }
    }
  });
});
```

---

## 🔍 КАК ПРОВЕРИТЬ БЫЛИ ЛИ ОТПРАВКИ:

### Вариант 1: Проверить базу данных (после миграции)
```sql
SELECT 
  name,
  email,
  phone,
  email_sent,
  email_sent_at,
  sms_sent,
  sms_sent_at,
  email_error,
  sms_error,
  created_at
FROM landing_leads
WHERE name IN ('Даурен', 'Нурали', 'Нурсагила', 'Гулали')
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;
```

### Вариант 2: Проверить через Resend Dashboard
1. Открыть https://resend.com/emails
2. Проверить последние отправки
3. Искать email'ы: dkkmv1991@mail.ru, Nurali.tor1@gmail.com и т.д.

### Вариант 3: Проверить через Mobizon Dashboard
1. Открыть https://mobizon.kz/
2. Войти в аккаунт
3. Проверить историю SMS на номера: +7 (777) 281-90-81 и т.д.

### Вариант 4: Проверить логи backend
```bash
# На сервере
cd /var/www/onai-integrator-login
pm2 logs backend | grep -E "Email|SMS|lead"
```

---

## 🎯 ПЛАН ДЕЙСТВИЙ (для AI архитектора):

### Шаг 1: Применить миграцию базы данных ✅
```sql
-- Выполнить в Supabase SQL Editor (landing база)
ALTER TABLE landing_leads ADD COLUMN ...
```

### Шаг 2: Обновить код scheduledNotifications.ts ✅
- Добавить обновление статусов в базе
- Добавить логирование
- Добавить создание записи в lead_tracking

### Шаг 3: Обновить код landing.ts ✅
- Добавить API endpoint для проверки статусов

### Шаг 4: Деплой на продакшн ✅
```bash
git add .
git commit -m "feat: add email/sms tracking for proftest leads"
git push origin main

# На сервере
cd /var/www/onai-integrator-login
git pull
pm2 restart backend
```

### Шаг 5: Проверка ✅
- Пройти тестовый профтест
- Через 10 минут проверить базу
- Проверить что статусы обновились
- Проверить что данные появились в дашборде `/target`

### Шаг 6: Повторная отправка для 4 лидов (опционально) ✅
Если выяснится что Email/SMS НЕ были отправлены, можно:
```typescript
// Создать скрипт для повторной отправки
const leadsToResend = [
  { id: '...', name: 'Даурен', email: 'dkkmv1991@mail.ru', phone: '+7 (777) 281-90-81' },
  { id: '...', name: 'Нурали', email: 'Nurali.tor1@gmail.com', phone: '+7 (702) 294-49-99' },
  { id: '...', name: 'Нурсагила', email: 'nurs0762@mail.ru', phone: '+7 (476) 891-15-2' },
  { id: '...', name: 'Гулали', email: 'gulalikamalov0@gmail.com', phone: '+7 (705) 904-44-67' }
];

for (const lead of leadsToResend) {
  await sendProftestEmail(lead.name, lead.email, lead.id);
  await sendProftestSMS(lead.phone, lead.id);
}
```

---

## 📝 ЗАПРОС ДЛЯ AI АРХИТЕКТОРА:

```
Контекст:
Платформа onai.academy, Node.js + Express backend, React frontend.

Проблема:
После прохождения профтеста пользователям должны отправляться Email (через Resend) 
и SMS (через Mobizon) через 10 минут. Но нет отслеживания статусов отправки.

4 реальных лида получены сегодня, прошло >10 минут, но неизвестно были ли отправки.

Текущая реализация:
- scheduledNotifications.ts использует setTimeout (данные в памяти)
- landing_leads таблица не хранит статусы email_sent/sms_sent
- Нет логирования отправок
- При перезапуске backend все запланированные отправки теряются

Технологии:
- Backend: Node.js 18, Express, TypeScript
- Database: Supabase (PostgreSQL)  
- Email: Resend API
- SMS: Mobizon API
- Deploy: PM2 на VPS

Задача:
1. Добавить поля email_sent, sms_sent в таблицу landing_leads
2. Обновлять статусы после отправки
3. Добавить логирование всех отправок
4. Синхронизировать данные с таблицей lead_tracking
5. Проверить были ли отправки для 4 лидов
6. Если не были - отправить повторно

Файлы:
- backend/src/services/scheduledNotifications.ts (отправка)
- backend/src/routes/landing.ts (endpoint /proftest)
- backend/src/services/mobizon.ts (SMS)

Вопросы:
1. Как правильно добавить отслеживание статусов?
2. Как проверить были ли отправки (Resend/Mobizon dashboard)?
3. Как сделать систему надежной (не терять отправки при рестарте)?
4. Нужна ли очередь задач (BullMQ/Redis)?

Дай готовое решение с кодом и SQL миграцией.
```

---

**Создано:** 13 декабря 2025, 21:05  
**Статус:** 🚨 КРИТИЧНО - нужно исправить  
**Приоритет:** ВЫСОКИЙ - 4 реальных лида ждут Email/SMS















