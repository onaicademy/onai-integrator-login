# 🚀 AI-Диагност: Быстрый старт

## За 5 минут запустить AI-диагностику пользователей

### Шаг 1: Примените миграцию БД (1 мин)

#### Через Supabase Dashboard:
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx)
2. **SQL Editor** → **New Query**
3. Скопируйте содержимое файла:
   ```
   supabase/migrations/20251104_add_diagnostics_tables.sql
   ```
4. **Run** → Готово! ✅

#### Или через CLI:
```bash
cd "/Users/miso/Documents/MVP onAI Academy Platform/onai-integrator-login"
supabase db push
```

---

### Шаг 2: Разверните Edge Function (2 мин)

```bash
# Используйте готовый скрипт
./deploy-diagnose-function.sh
```

Или вручную:
```bash
supabase link --project-ref capdjvokjdivxjfdddmx
supabase functions deploy diagnose-user --no-verify-jwt
```

---

### Шаг 3: Протестируйте (1 мин)

```bash
# Используйте готовый скрипт тестирования
./test-diagnose-function.sh YOUR_USER_ID
```

Или вручную через curl:
```bash
curl -X POST 'https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "YOUR_USER_ID"}'
```

---

### Шаг 4: Используйте в коде (1 мин)

```typescript
import { supabase } from '@/lib/supabase';

// Запустить диагностику для текущего пользователя
const { data, error } = await supabase.functions.invoke('diagnose-user', {
  body: { user_id: user.id }
});

console.log('Результат:', data.data);
// {
//   lessons_completed: 8,
//   avg_minutes_per_day: 14,
//   current_streak: 3,
//   flag_low_engagement: true,
//   stuck_lessons: [...],
//   recommendation: "Ты учишься нерегулярно..."
// }
```

---

## 🎯 Что дальше?

### 1. Автоматический запуск по расписанию

Настройте Cron Job в Supabase Dashboard:
```sql
-- Каждый день в полночь для всех активных пользователей
SELECT cron.schedule(
  'daily-user-diagnosis',
  '0 0 * * *',
  $$
  SELECT 
    net.http_post(
      url := 'https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
      body := json_build_object('user_id', id)::text
    )
  FROM users 
  WHERE created_at > now() - interval '30 days'
  $$
);
```

### 2. Интегрируйте GPT-4o-mini

Замените статические рекомендации на AI-генерируемые:
```typescript
// В supabase/functions/diagnose-user/index.ts
const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Ты AI-куратор. Дай мотивирующую рекомендацию.'
    }, {
      role: 'user',
      content: `Пользователь: ${lessonsCompleted} уроков, streak ${currentStreak}, ${avgMinutesPerDay} мин/день`
    }],
    max_tokens: 150
  })
});
```

### 3. Добавьте уведомления

Отправляйте push/email при низкой вовлечённости:
```typescript
if (flagLowEngagement) {
  await sendNotification(userId, {
    title: 'Мы скучаем по тебе! 😊',
    message: recommendation
  });
}
```

---

## 📊 Структура данных

### Таблица `diagnostics_log`
```sql
id          | uuid
user_id     | uuid
data_json   | jsonb  -- результаты анализа
created_at  | timestamp
```

### Пример записи
```json
{
  "lessons_completed": 8,
  "avg_minutes_per_day": 14,
  "current_streak": 3,
  "flag_low_engagement": true,
  "stuck_lessons": ["uuid-1", "uuid-2"],
  "recommendation": "Ты учишься нерегулярно. Попробуй ставить цель: 2 урока в день."
}
```

---

## 🔍 Troubleshooting

### Проблема: "user_id is required"
**Решение:** Передайте user_id в теле или query параметре

### Проблема: "Permission denied"
**Решение:** Убедитесь что `SUPABASE_SERVICE_ROLE_KEY` настроен

### Проблема: Пустые данные
**Решение:** Заполните таблицу `daily_activity` тестовыми данными

---

## 📖 Полная документация

Смотрите [DIAGNOSTICS_SETUP_GUIDE.md](./DIAGNOSTICS_SETUP_GUIDE.md) для:
- Детальной архитектуры
- API Reference
- Примеров интеграции
- Настройки Cron Jobs
- GPT-4o-mini интеграции

---

**Готово! 🎉**

*Последнее обновление: 4 ноября 2025*

