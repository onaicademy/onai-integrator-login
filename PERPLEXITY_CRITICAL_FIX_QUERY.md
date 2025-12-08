# 🔍 PERPLEXITY QUERY: Как исправить 3 критические ошибки в Node.js/PostgreSQL/React приложении?

## КОНТЕКСТ

Мы разрабатываем образовательную платформу на **Node.js + Express + PostgreSQL (Supabase) + React + TypeScript**.

У нас **Multi-Database Architecture**:
- **Main Platform** (`arqhkacellqbhjhbebfh.supabase.co`) - основная платформа
- **Tripwire** (`pjmvxecykysfrzppdcto.supabase.co`) - отдельный продукт для лид-магнита

При тестировании функции "Завершить урок" обнаружены **3 фатальные ошибки**.

---

## 🔴 ПРОБЛЕМА #1: PostgreSQL Error 42P10 при INSERT...ON CONFLICT

### Симптомы:
```javascript
// Backend Log:
[TRANSACTION ERROR] Rolling back... {
  message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
  code: '42P10'
}
```

### Проблемный код (Backend):
```typescript
// backend/src/routes/tripwire-lessons.ts
const progressResult = await client.query(`
  INSERT INTO student_progress (
    user_id, module_id, lesson_id, status, completed_at, updated_at
  )
  VALUES ($1::uuid, $2::integer, $3::integer, 'completed', NOW(), NOW())
  ON CONFLICT (user_id, module_id, lesson_id)  -- ❌ ERROR 42P10 HERE!
  DO UPDATE SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  RETURNING *
`, [tripwire_user_id, module_id, lesson_id]);
```

### Фактическая схема БД:
```sql
-- Таблица student_progress:
CREATE TABLE student_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id integer NOT NULL,
  lesson_id integer NOT NULL,
  status text NOT NULL,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT NOW(),
  
  -- ✅ Constraint СУЩЕСТВУЕТ, но на ДРУГИХ колонках!
  CONSTRAINT student_progress_user_id_lesson_id_key 
    UNIQUE (user_id, lesson_id)  -- БЕЗ module_id!
);
```

### Вопросы для Perplexity:
1. **Почему PostgreSQL выдает 42P10?** Constraint `(user_id, lesson_id)` существует, но код использует `(user_id, module_id, lesson_id)`. Это РАЗНЫЕ наборы колонок!
2. **Какое решение правильное?**
   - **Вариант А**: Изменить SQL на `ON CONFLICT (user_id, lesson_id)`
   - **Вариант Б**: Добавить второй UNIQUE constraint на `(user_id, module_id, lesson_id)`
   - **Вариант В**: Удалить старый constraint и создать новый
3. **Какие есть Best Practices** для multi-column UNIQUE constraints в PostgreSQL?
4. **Влияние на performance**: Если добавить второй constraint - не замедлит ли это INSERT/UPDATE?
5. **Data Integrity**: Может ли студент проходить ОДИН урок в РАЗНЫХ модулях? (Lesson 67 в Module 16 и Lesson 67 в Module 17?)

---

## 🔴 ПРОБЛЕМА #2: React Hook сохраняет прогресс видео на НЕПРАВИЛЬНУЮ БД

### Симптомы:
```javascript
// Frontend Console:
fetch.ts:15  POST https://arqhkacellqbhjhbebfh.supabase.co/rest/v1/video_tracking 400 (Bad Request)
useHonestVideoTracking.ts:228 ❌ [HonestTracking] Save error: {
  code: '22023', 
  message: 'cannot extract elements from a scalar'
}
```

### Проблемный код (Frontend):
```typescript
// src/hooks/useHonestVideoTracking.ts
import { supabase } from '@/lib/supabase';  // ❌ WRONG DATABASE!

export const useHonestVideoTracking = (lessonId: number, userId: string) => {
  // ...
  const saveProgress = async () => {
    // ❌ Запрос идет на Main Platform вместо Tripwire!
    const { error } = await supabase
      .from('video_tracking')
      .upsert({
        user_id: userId,
        lesson_id: lessonId,
        // ...
      });
  };
};
```

### Архитектура:
```typescript
// У нас есть ДВА Supabase клиента:

// 1. Main Platform (arqhkacellqbhjhbebfh.supabase.co)
import { supabase } from '@/lib/supabase';

// 2. Tripwire (pjmvxecykysfrzppdcto.supabase.co)
import { tripwireSupabase } from '@/lib/supabase-tripwire';
```

### Context:
- Hook `useHonestVideoTracking` используется на странице `TripwireLesson.tsx` (Tripwire продукт)
- Но импортирует `supabase` (Main Platform) вместо `tripwireSupabase` (Tripwire)
- Результат: **400 Bad Request** потому что схемы таблиц отличаются

### Вопросы для Perplexity:
1. **Как правильно передать нужный Supabase клиент в React Hook?**
   - Вариант А: Передать как параметр `useHonestVideoTracking(lessonId, userId, dbClient)`
   - Вариант Б: Использовать React Context для выбора DB
   - Вариант В: Создать два отдельных хука `useMainVideoTracking` и `useTripwireVideoTracking`
2. **Best Practice для Multi-Database React приложений?** Есть ли паттерны для switch между БД динамически?
3. **Type Safety**: Как типизировать `dbClient` чтобы TypeScript проверял что передается правильный Supabase client?
4. **Performance**: Влияет ли создание двух Supabase клиентов на bundle size и memory?

---

## 🔴 ПРОБЛЕМА #3: UX Bug - Кнопка "Завершить урок" пропадает при откате прогресса

### Симптомы:
1. Студент просматривает **85%** видео → Кнопка "Завершить урок" появляется ✅
2. Студент откатывает прогресс на **70%** → Кнопка **ПРОПАДАЕТ** ❌
3. Студент снова перематывает на **82%** → Кнопка **ПОЯВЛЯЕТСЯ** снова ✅

**Проблема:** Кнопка должна **ОСТАВАТЬСЯ** после первого достижения 80%!

### Текущий код (Frontend):
```typescript
// src/pages/tripwire/TripwireLesson.tsx
const TripwireLesson = () => {
  const [watchedPercentage, setWatchedPercentage] = useState(0);
  
  // ❌ Кнопка появляется только если ТЕКУЩИЙ прогресс > 80%
  const canComplete = watchedPercentage >= 80;
  
  return (
    <div>
      {canComplete ? (
        <Button onClick={handleComplete}>Завершить урок</Button>
      ) : (
        <p>Просмотрите 80% видео</p>
      )}
    </div>
  );
};
```

### Hook для отслеживания:
```typescript
// src/hooks/useHonestVideoTracking.ts
export const useHonestVideoTracking = (lessonId: number, userId: string) => {
  const [segments, setSegments] = useState<WatchedSegment[]>([]);
  
  // ✅ Уже вычисляет уникальный прогресс через сегменты
  const watchedPercentage = calculateUniqueProgress(segments, duration);
  
  // ❌ Но НЕ СОХРАНЯЕТ флаг "qualified for completion" в БД!
  if (watchedPercentage >= 80) {
    console.log('🎉 [HonestTracking] Qualified for completion!');
    // TODO: Save to DB: video_qualified_for_completion = true
  }
  
  return { watchedPercentage, canComplete: watchedPercentage >= 80 };
};
```

### Требуемое поведение:
```typescript
// ✅ Правильная логика:
const canComplete = hasEverReached80Percent || currentProgress >= 80;

// Даже если студент откатит прогресс на 70% - кнопка ОСТАЕТСЯ!
```

### Вопросы для Perplexity:
1. **Где хранить флаг "qualified for completion"?**
   - Вариант А: В БД (таблица `tripwire_progress`, колонка `video_qualified_for_completion: boolean`)
   - Вариант Б: В localStorage (но теряется при очистке кэша)
   - Вариант В: В React Context (но теряется при перезагрузке страницы)
2. **Когда сбрасывать флаг?** Если студент завершил урок, потом решил пересмотреть видео - должна ли кнопка быть активна сразу?
3. **Best Practice для "Once Achieved, Always Enabled" UI паттерна?** Есть ли стандартные решения в React/Material-UI?
4. **Database Schema**: Нужна ли отдельная колонка `video_qualified_for_completion` или можно вычислять из `watch_time_seconds`?
5. **Edge Case**: Что если студент досмотрел 80% в Session 1, но в Session 2 заходит с другого устройства? Флаг должен sync через БД?

---

## 🛠️ TECHNICAL STACK

- **Backend**: Node.js 20, Express 4.x, TypeScript 5.x
- **Database**: PostgreSQL 17.6 (via Supabase)
- **Frontend**: React 18, TypeScript, Vite, React Router v6
- **ORM**: `pg` (direct queries), Supabase Client SDK
- **Video Player**: Plyr + HLS.js

---

## 🎯 ЗАПРОС ДЛЯ PERPLEXITY

**Требуется детальный Best Practice гайд по следующим вопросам:**

### 1. PostgreSQL ON CONFLICT с Multi-Column UNIQUE Constraints:
- Как правильно использовать `ON CONFLICT` когда есть несколько UNIQUE constraints?
- Какие есть Best Practices для выбора колонок в constraint?
- Примеры кода для миграции constraint без downtime

### 2. Multi-Database Architecture в React приложениях:
- Как правильно управлять несколькими Supabase клиентами в React?
- Паттерны для передачи DB клиента в hooks
- Type Safety и TypeScript best practices
- Performance considerations

### 3. "Once Achieved, Always Enabled" UI Pattern:
- Где хранить флаг "qualified for completion"? (DB vs localStorage vs Context)
- Когда и как сбрасывать флаг?
- Best Practices для sync состояния между sessions/devices
- Примеры database schema для video progress tracking

### 4. ACID Transactions в PostgreSQL для Lesson Completion:
- Как правильно структурировать transaction для:
  1. Проверить если уже completed (idempotency)
  2. Mark lesson as completed
  3. Check if module is completed
  4. Unlock next module
  5. Create achievement
- Rollback стратегии при ошибках
- Deadlock prevention

---

## 📚 ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ

### Схемы таблиц:

```sql
-- Tripwire Database Schema:

-- 1. student_progress (для завершения уроков)
CREATE TABLE student_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id integer NOT NULL,
  lesson_id integer NOT NULL,
  status text NOT NULL,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT NOW(),
  CONSTRAINT student_progress_user_id_lesson_id_key 
    UNIQUE (user_id, lesson_id)
);

-- 2. tripwire_progress (для video tracking)
CREATE TABLE tripwire_progress (
  id uuid PRIMARY KEY,
  tripwire_user_id uuid NOT NULL,
  module_id integer NOT NULL,
  lesson_id integer NOT NULL,
  is_completed boolean DEFAULT false,
  watch_time_seconds integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
  -- ❌ MISSING: video_qualified_for_completion boolean
);

-- 3. module_unlocks (для разблокировки модулей)
CREATE TABLE module_unlocks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id integer NOT NULL,
  unlocked_at timestamptz DEFAULT NOW(),
  animation_shown boolean DEFAULT false,
  UNIQUE (user_id, module_id)
);

-- 4. user_achievements (для достижений)
CREATE TABLE user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  current_value integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE (user_id, achievement_id)
);
```

### Business Logic:
- **Tripwire** имеет ровно **3 модуля**: Module 16, 17, 18
- Каждый модуль имеет ровно **1 урок**: Lesson 67, 68, 69 соответственно
- Студент должен посмотреть **80%** видео чтобы завершить урок
- При завершении модуля → разблокируется следующий модуль + создается achievement

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ ОТ PERPLEXITY

1. **Конкретные SQL миграции** для исправления constraint mismatch
2. **Код примеры** для правильного использования multi-database в React hooks
3. **Database schema changes** для добавления `video_qualified_for_completion`
4. **Best Practices** для каждой из 3 проблем
5. **Ссылки на документацию** PostgreSQL, React, TypeScript
6. **Edge cases и их решения**

---

**Приоритет:** P0 - CRITICAL  
**Дедлайн:** ASAP (Production Broken)  
**Вопрос задан:** 2025-12-07
