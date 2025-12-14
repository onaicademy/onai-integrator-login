# 🤖 AI-Диагност: Настройка и использование

## 📋 Содержание

1. [Что это такое](#что-это-такое)
2. [Архитектура](#архитектура)
3. [Установка](#установка)
4. [Использование](#использование)
5. [API Reference](#api-reference)
6. [Примеры](#примеры)

---

## 🎯 Что это такое

**AI-Диагност** - Edge Function под названием `diagnose-user`, которая анализирует данные обучения пользователя и создаёт диагностический отчёт с персонализированными рекомендациями.

### Что анализирует:

- ✅ Завершённые уроки
- ✅ Среднее время обучения в день
- ✅ Текущий "стрик" (дни подряд с занятиями)
- ✅ "Застрявшие" уроки (не завершены > 3 дней)
- ✅ Флаг низкой вовлечённости
- ✅ Персонализированные рекомендации

---

## 🏗️ Архитектура

### Таблицы в базе данных:

#### 1. `daily_activity` - Ежедневная активность
```sql
- id (uuid, PK)
- user_id (uuid, FK → users)
- date (date) - дата активности
- minutes (integer) - минут обучения за день
- lessons_watched (integer) - просмотрено уроков
- xp_earned (integer) - заработано XP
- created_at, updated_at (timestamp)
```

#### 2. `diagnostics_log` - Лог диагностики
```sql
- id (uuid, PK)
- user_id (uuid, FK → users)
- data_json (jsonb) - результаты анализа
- created_at (timestamp)
```

#### 3. Обновлена таблица `progress`
Добавлено поле:
```sql
- seconds_watched (integer) - секунды просмотра урока
```

---

## 🚀 Установка

### Шаг 1: Применить миграцию базы данных

#### Вариант A: Через Supabase Dashboard

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите проект **capdjvokjdivxjfdddmx**
3. Перейдите в **SQL Editor**
4. Откройте файл `supabase/migrations/20251104_add_diagnostics_tables.sql`
5. Скопируйте содержимое и выполните

#### Вариант B: Через Supabase CLI

```bash
# Убедитесь что Supabase CLI установлен
npm install -g supabase

# Линкуйте проект
supabase link --project-ref capdjvokjdivxjfdddmx

# Примените миграцию
supabase db push
```

### Шаг 2: Развернуть Edge Function

```bash
# Деплой функции diagnose-user
supabase functions deploy diagnose-user

# Или через скрипт
./deploy-supabase-function.sh diagnose-user
```

### Шаг 3: Проверка установки

```bash
# Проверьте что функция развёрнута
supabase functions list

# Должна появиться:
# - diagnose-user (active)
```

---

## 💻 Использование

### 1. Вызов через HTTP

```bash
# Для конкретного пользователя
curl -X POST 'https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "abc-123-def-456"}'
```

### 2. Вызов из JavaScript/TypeScript

```typescript
import { supabase } from '@/lib/supabase';

async function runDiagnosis(userId: string) {
  const { data, error } = await supabase.functions.invoke('diagnose-user', {
    body: { user_id: userId }
  });
  
  if (error) {
    console.error('Diagnosis error:', error);
    return;
  }
  
  console.log('Diagnosis result:', data);
  return data;
}

// Использование
const result = await runDiagnosis('user-id-here');
```

### 3. Автоматический запуск по расписанию (Cron)

Настройте в Supabase Dashboard → Database → Cron Jobs:

```sql
-- Запускать каждый день в 00:00 UTC для всех активных пользователей
SELECT cron.schedule(
  'daily-user-diagnosis',
  '0 0 * * *',  -- каждый день в полночь
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

---

## 📘 API Reference

### Endpoint

```
POST /functions/v1/diagnose-user
```

### Параметры запроса

#### Query параметры:
```
?user_id=abc-123-def-456
```

#### Тело запроса (JSON):
```json
{
  "user_id": "abc-123-def-456"
}
```

### Ответы

#### Успешный запуск (новая диагностика):
```json
{
  "status": "success",
  "message": "Diagnosis created successfully",
  "data": {
    "lessons_completed": 8,
    "avg_minutes_per_day": 14,
    "current_streak": 3,
    "flag_low_engagement": true,
    "stuck_lessons": ["lesson-3-uuid", "lesson-5-uuid"],
    "recommendation": "Ты учишься нерегулярно. Попробуй ставить цель: 2 урока в день."
  }
}
```

#### Пропущен (уже есть за сегодня):
```json
{
  "status": "skipped",
  "message": "Diagnosis already exists for today",
  "data": { /* результаты диагностики */ }
}
```

#### Ошибка:
```json
{
  "error": "user_id is required"
}
```

---

## 📊 Структура данных диагностики

### Поля в `data_json`:

| Поле | Тип | Описание |
|------|-----|----------|
| `lessons_completed` | number | Количество завершённых уроков |
| `avg_minutes_per_day` | number | Среднее время обучения (минут/день) за 7 дней |
| `current_streak` | number | Текущий стрик (дни подряд с активностью) |
| `flag_low_engagement` | boolean | Флаг низкой вовлечённости (streak < 4 ИЛИ avg < 15 мин) |
| `stuck_lessons` | string[] | UUID уроков, не завершённых > 3 дней |
| `recommendation` | string | Персонализированная рекомендация |

---

## 🧪 Примеры

### Пример 1: Анализ активного пользователя

**Запрос:**
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/diagnose-user' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{"user_id": "user-123"}'
```

**Ответ:**
```json
{
  "status": "success",
  "data": {
    "lessons_completed": 15,
    "avg_minutes_per_day": 45,
    "current_streak": 7,
    "flag_low_engagement": false,
    "stuck_lessons": [],
    "recommendation": "Отличная регулярность! Продолжай в том же духе."
  }
}
```

### Пример 2: Пользователь с низкой вовлечённостью

**Ответ:**
```json
{
  "status": "success",
  "data": {
    "lessons_completed": 3,
    "avg_minutes_per_day": 8,
    "current_streak": 1,
    "flag_low_engagement": true,
    "stuck_lessons": ["lesson-uuid-1", "lesson-uuid-2"],
    "recommendation": "Ты учишься нерегулярно. Попробуй ставить цель: 2 урока в день."
  }
}
```

### Пример 3: Использование в React компоненте

```tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function DiagnosisButton({ userId }: { userId: string }) {
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('diagnose-user', {
        body: { user_id: userId }
      });
      
      if (error) throw error;
      setDiagnosis(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={runDiagnosis} disabled={loading}>
        {loading ? 'Анализ...' : 'Запустить диагностику'}
      </button>
      
      {diagnosis && (
        <div className="mt-4 p-4 border rounded">
          <h3>Результаты диагностики:</h3>
          <p>Завершено уроков: {diagnosis.lessons_completed}</p>
          <p>Среднее время: {diagnosis.avg_minutes_per_day} мин/день</p>
          <p>Стрик: {diagnosis.current_streak} дней</p>
          <p className="mt-2 font-bold">{diagnosis.recommendation}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Доработка и расширение

### Добавление GPT-4o-mini для генерации рекомендаций

Замените статическую генерацию рекомендаций на AI:

```typescript
// В функции generateDiagnostics:

// Вместо:
let recommendation = flagLowEngagement 
  ? 'Ты учишься нерегулярно...' 
  : 'Отличная регулярность!';

// Используйте:
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
      content: 'Ты AI-куратор образовательной платформы. Дай короткую мотивирующую рекомендацию.'
    }, {
      role: 'user',
      content: `Пользователь: ${lessonsCompleted} уроков, streak ${currentStreak}, среднее ${avgMinutesPerDay} мин/день. ${stuckLessons.length} застрявших уроков.`
    }],
    max_tokens: 150
  })
});

const gptData = await gptResponse.json();
recommendation = gptData.choices[0].message.content;
```

### Добавление уведомлений

Интегрируйте отправку уведомлений при низкой вовлечённости:

```typescript
if (flagLowEngagement) {
  // Отправить email/push уведомление
  await sendNotification(userId, {
    title: 'Мы скучаем по тебе! 😊',
    message: recommendation
  });
}
```

---

## 📝 Troubleshooting

### Проблема: "user_id is required"

**Причина:** Не передан user_id  
**Решение:** Убедитесь что передаёте user_id в теле или query параметре

### Проблема: "Permission denied"

**Причина:** Недостаточно прав доступа  
**Решение:** Функция использует service_role_key, убедитесь что он настроен в Supabase

### Проблема: Функция не находит данные

**Причина:** Таблицы не созданы  
**Решение:** Примените миграцию `20251104_add_diagnostics_tables.sql`

---

## ✅ Checklist

- [ ] Миграция базы данных применена
- [ ] Edge Function развёрнута
- [ ] Service role key настроен
- [ ] Тестовый запрос выполнен успешно
- [ ] (Опционально) Настроен Cron для автозапуска
- [ ] (Опционально) Интегрирован GPT-4o-mini

---

*Последнее обновление: 4 ноября 2025*  
*Статус: ✅ Готово к использованию*

