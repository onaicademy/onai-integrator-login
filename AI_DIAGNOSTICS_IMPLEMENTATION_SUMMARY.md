# 🤖 AI-Диагност: Резюме реализации

## 📅 Дата реализации: 4 ноября 2025

---

## 🎯 Что было реализовано

Полноценная система **AI-диагностики обучения пользователей** на базе Supabase Edge Functions.

### ✅ Основные компоненты:

1. **Edge Function `diagnose-user`** - анализирует данные обучения пользователя
2. **База данных** - 2 новые таблицы + обновление существующей
3. **Скрипты деплоя** - автоматизация развертывания
4. **Документация** - полная инструкция по использованию

---

## 🏗️ Архитектура

### 1. База данных

#### Таблица `daily_activity` (новая)
```sql
CREATE TABLE daily_activity (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  date date NOT NULL,
  minutes integer DEFAULT 0,
  lessons_watched integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  UNIQUE(user_id, date)
);
```

**Назначение:** Хранит ежедневную активность пользователя для расчёта streak и метрик.

#### Таблица `diagnostics_log` (новая)
```sql
CREATE TABLE diagnostics_log (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  data_json jsonb NOT NULL,
  created_at timestamptz,
  UNIQUE(user_id, created_at)
);
```

**Назначение:** Логирует результаты AI-диагностики в JSON формате.

#### Обновление таблицы `progress`
```sql
ALTER TABLE progress ADD COLUMN seconds_watched integer DEFAULT 0;
```

**Назначение:** Трекает время просмотра каждого урока.

### 2. Edge Function

**Файл:** `supabase/functions/diagnose-user/index.ts`

**Логика работы:**

```typescript
1. Получение user_id → Запрос
2. Анализ прогресса → Запрос к таблице progress
   ├─ Подсчёт завершённых уроков
   ├─ Определение "застрявших" уроков (>3 дней без обновления)
   └─ Суммирование времени просмотра
3. Анализ активности → Запрос к таблице daily_activity (7 дней)
   ├─ Расчёт среднего времени обучения в день
   └─ Расчёт текущего стрика (дни подряд с занятиями)
4. Оценка вовлечённости → Логика
   └─ flag_low_engagement = (streak < 4 ИЛИ avg_minutes < 15)
5. Генерация рекомендации → Простое правило (можно заменить на GPT)
6. Проверка дубликатов → Запрос к diagnostics_log
7. Сохранение результата → INSERT в diagnostics_log
8. Возврат ответа → JSON с результатами
```

---

## 📊 Структура данных диагностики

### JSON в поле `data_json`:

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

### Поля:

| Поле | Тип | Описание |
|------|-----|----------|
| `lessons_completed` | number | Количество завершённых уроков |
| `avg_minutes_per_day` | number | Среднее время обучения (мин/день) за 7 дней |
| `current_streak` | number | Дни подряд с активностью |
| `flag_low_engagement` | boolean | Флаг низкой вовлечённости |
| `stuck_lessons` | string[] | UUID уроков, не завершённых > 3 дней |
| `recommendation` | string | Персонализированная рекомендация |

---

## 🛠️ Созданные файлы

### 1. База данных
```
supabase/migrations/20251104_add_diagnostics_tables.sql
```
**Содержит:**
- Создание таблиц `daily_activity` и `diagnostics_log`
- Добавление поля `seconds_watched` в `progress`
- Row Level Security (RLS) политики
- Индексы для оптимизации
- Триггеры для автообновления `updated_at`

### 2. Edge Function
```
supabase/functions/diagnose-user/index.ts
```
**Основные функции:**
- `generateDiagnostics(userId)` - генерация диагностики
- `Deno.serve()` - HTTP обработчик

### 3. Скрипты деплоя
```bash
deploy-diagnose-function.sh    # Деплой функции
test-diagnose-function.sh      # Тестирование функции
```

### 4. Документация
```
DIAGNOSTICS_QUICK_START.md     # Быстрый старт за 5 минут
DIAGNOSTICS_SETUP_GUIDE.md     # Полная документация
AI_DIAGNOSTICS_IMPLEMENTATION_SUMMARY.md  # Этот файл
```

---

## 🚀 Как использовать

### Шаг 1: Применить миграцию

#### Вариант A - Supabase Dashboard:
1. Откройте https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx
2. SQL Editor → New Query
3. Скопируйте содержимое `supabase/migrations/20251104_add_diagnostics_tables.sql`
4. Run

#### Вариант B - CLI:
```bash
supabase db push
```

### Шаг 2: Развернуть функцию

```bash
./deploy-diagnose-function.sh
```

Или вручную:
```bash
supabase functions deploy diagnose-user --no-verify-jwt
```

### Шаг 3: Использовать в коде

```typescript
import { supabase } from '@/lib/supabase';

// Запустить диагностику
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

## 📡 API Reference

### Endpoint
```
POST https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user
```

### Параметры

**Query String:**
```
?user_id=abc-123-def-456
```

**Body (JSON):**
```json
{
  "user_id": "abc-123-def-456"
}
```

### Ответы

#### Успех (новая диагностика):
```json
{
  "status": "success",
  "message": "Diagnosis created successfully",
  "data": { /* результаты диагностики */ }
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

## 🔄 Интеграция с приложением

### Вариант 1: Ручной запуск
```typescript
// В компоненте профиля
<button onClick={() => runDiagnosis(userId)}>
  Запустить диагностику
</button>
```

### Вариант 2: Автоматический запуск при входе
```typescript
useEffect(() => {
  const runDiagnosisOnLogin = async () => {
    const { data } = await supabase.functions.invoke('diagnose-user', {
      body: { user_id: user.id }
    });
    
    if (data?.data?.flag_low_engagement) {
      // Показать мотивационное сообщение
      toast({
        title: "Мы скучаем по тебе! 😊",
        description: data.data.recommendation
      });
    }
  };
  
  runDiagnosisOnLogin();
}, [user.id]);
```

### Вариант 3: Cron Job (ежедневно для всех)
```sql
-- В Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
  'daily-user-diagnosis',
  '0 0 * * *',  -- Каждый день в полночь UTC
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

## 🔧 Расширение функционала

### 1. Интеграция GPT-4o-mini

Замените статическую генерацию рекомендаций:

```typescript
// В функции generateDiagnostics, замените:
let recommendation = flagLowEngagement 
  ? 'Ты учишься нерегулярно...' 
  : 'Отличная регулярность!';

// На:
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
      content: 'Ты AI-куратор образовательной платформы. Дай короткую мотивирующую рекомендацию на русском.'
    }, {
      role: 'user',
      content: `Анализ: ${lessonsCompleted} уроков завершено, стрик ${currentStreak} дней, среднее ${avgMinutesPerDay} минут в день. ${stuckLessons.length} уроков не завершены более 3 дней.`
    }],
    max_tokens: 150,
    temperature: 0.7
  })
});

const gptData = await gptResponse.json();
recommendation = gptData.choices[0].message.content;
```

**Не забудьте добавить в Supabase:**
```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### 2. Push-уведомления

```typescript
// После генерации диагностики
if (flagLowEngagement) {
  // Отправить push через веб-сокет или email
  await sendPushNotification(userId, {
    title: 'Мы скучаем по тебе! 😊',
    body: recommendation,
    icon: '/notification-icon.png'
  });
}
```

### 3. Детальная аналитика

Добавьте дополнительные метрики:
```typescript
return {
  ...diagnostics,
  
  // Новые метрики:
  completion_rate: (lessonsCompleted / totalLessons) * 100,
  study_days_this_month: activeDaysThisMonth,
  avg_session_duration: totalSecondsWatched / lessonsCompleted,
  predicted_completion_date: calculatePredictedDate(...)
};
```

---

## 🧪 Тестирование

### Ручное тестирование
```bash
# Через скрипт
./test-diagnose-function.sh YOUR_USER_ID

# Через curl
curl -X POST 'https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{"user_id": "YOUR_USER_ID"}'
```

### Юнит-тесты (TODO)
```typescript
describe('generateDiagnostics', () => {
  it('should return low engagement flag for inactive user', async () => {
    const result = await generateDiagnostics('test-user-id');
    expect(result.flag_low_engagement).toBe(true);
  });
  
  it('should calculate correct streak', async () => {
    const result = await generateDiagnostics('active-user-id');
    expect(result.current_streak).toBeGreaterThan(0);
  });
});
```

---

## 📈 Метрики успеха

Система считается успешной, если:

- ✅ Функция запускается без ошибок для всех пользователей
- ✅ Диагностика генерируется < 3 секунд
- ✅ Точность флага `flag_low_engagement` > 85%
- ✅ Пользователи реагируют на рекомендации (↑ engagement)

---

## 🐛 Известные ограничения

1. **Статические рекомендации**
   - Сейчас: простое правило (if/else)
   - Решение: интегрировать GPT-4o-mini

2. **Только последние 7 дней**
   - Сейчас: анализ за неделю
   - Решение: добавить параметр `days_back`

3. **Нет проактивных уведомлений**
   - Сейчас: только по запросу
   - Решение: добавить cron job + push уведомления

4. **Нет A/B тестирования рекомендаций**
   - Сейчас: одна версия для всех
   - Решение: добавить таблицу experiments

---

## 📝 Roadmap

### Фаза 1: MVP ✅ (Готово)
- [x] Базовая диагностика
- [x] Статические рекомендации
- [x] Защита от дубликатов

### Фаза 2: AI-улучшения
- [ ] Интеграция GPT-4o-mini
- [ ] Персонализация по истории
- [ ] Предиктивная аналитика (когда пользователь завершит курс)

### Фаза 3: Автоматизация
- [ ] Cron Job для ежедневного запуска
- [ ] Push/Email уведомления
- [ ] Интеграция с Telegram bot

### Фаза 4: Аналитика
- [ ] Dashboard для мониторинга
- [ ] A/B тестирование рекомендаций
- [ ] Метрики эффективности

---

## 🎓 Примеры использования

### Пример 1: React компонент

```tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function UserDiagnostics({ userId }: { userId: string }) {
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('diagnose-user', {
        body: { user_id: userId }
      });
      setDiagnosis(data.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">AI-Диагностика</h3>
      
      <Button onClick={runDiagnosis} disabled={loading}>
        {loading ? 'Анализ...' : 'Запустить диагностику'}
      </Button>
      
      {diagnosis && (
        <div className="mt-4 space-y-2">
          <p>✅ Завершено уроков: <strong>{diagnosis.lessons_completed}</strong></p>
          <p>⏱️ Среднее время: <strong>{diagnosis.avg_minutes_per_day} мин/день</strong></p>
          <p>🔥 Стрик: <strong>{diagnosis.current_streak} дней</strong></p>
          
          {diagnosis.stuck_lessons.length > 0 && (
            <p className="text-yellow-600">
              ⚠️ Застряли на {diagnosis.stuck_lessons.length} уроках
            </p>
          )}
          
          <div className="mt-4 p-4 bg-blue-50 rounded">
            <p className="font-semibold">💡 Рекомендация:</p>
            <p>{diagnosis.recommendation}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
```

### Пример 2: Server-side вызов

```typescript
// В Supabase Edge Function
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Запуск диагностики для всех активных пользователей
const { data: users } = await supabase
  .from('users')
  .select('id')
  .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

for (const user of users) {
  await fetch('https://capdjvokjdivxjfdddmx.supabase.co/functions/v1/diagnose-user', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: user.id })
  });
}
```

---

## ✅ Checklist для деплоя

- [ ] Миграция БД применена (`supabase db push`)
- [ ] Edge Function развёрнута (`supabase functions deploy diagnose-user`)
- [ ] Переменные окружения настроены (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- [ ] Тестовый запрос выполнен успешно
- [ ] Документация прочитана
- [ ] (Опционально) Cron Job настроен
- [ ] (Опционально) GPT-4o-mini интегрирован

---

## 🤝 Contributing

Если хотите улучшить систему:

1. Добавьте новые метрики в `generateDiagnostics()`
2. Улучшите алгоритм расчёта стрика
3. Интегрируйте реальный AI (GPT-4o-mini)
4. Добавьте тесты
5. Создайте PR

---

## 📞 Поддержка

**Документация:**
- [DIAGNOSTICS_QUICK_START.md](./DIAGNOSTICS_QUICK_START.md) - Быстрый старт
- [DIAGNOSTICS_SETUP_GUIDE.md](./DIAGNOSTICS_SETUP_GUIDE.md) - Полная документация

**Контакты:**
- GitHub Issues: https://github.com/onaicademy/onai-integrator-login/issues
- Supabase Dashboard: https://supabase.com/dashboard/project/capdjvokjdivxjfdddmx

---

## 🎉 Заключение

Система AI-диагностики полностью реализована и готова к использованию! 

**Что получили:**
- ✅ Автоматический анализ обучения пользователей
- ✅ Персонализированные рекомендации
- ✅ Масштабируемая архитектура
- ✅ Полная документация

**Следующие шаги:**
1. Применить миграцию БД
2. Развернуть Edge Function
3. Протестировать на реальных пользователях
4. Интегрировать GPT-4o-mini
5. Настроить автоматический запуск

**Время реализации:** ~2 часа  
**Статус:** ✅ MVP готов к деплою

---

*Создано: 4 ноября 2025*  
*Автор: AI Assistant (Claude Sonnet 4.5)*  
*Проект: onAI Academy Platform*

