# 🚨 CRITICAL: RPC Function Error - Senior Developer Required

## 📋 СТАТУС: ЧАСТИЧНОЕ РЕШЕНИЕ, НОВАЯ ПРОБЛЕМА

**Дата:** 29 ноября 2025, 21:00  
**Разработчик:** AI Assistant (Claude Sonnet 4.5)  
**Время на Debug:** 4+ часа  
**Попыток решения:** 15+

---

## ✅ ЧТО БЫЛО РЕШЕНО

### 1. Исходная Проблема
```
ERROR: invalid input syntax for type integer: "24.581615"
```

**Причина:** Supabase JS Client трансформировал данные при `.upsert()` операции.

### 2. Применённое Решение
Создана **RPC функция** для обхода JS client serialization:

```sql
CREATE OR REPLACE FUNCTION upsert_video_progress(
  p_user_id UUID,
  p_lesson_id INT,
  p_video_id TEXT,
  p_play_time NUMERIC,
  p_percentage NUMERIC,
  p_current_position NUMERIC,
  p_max_position NUMERIC,
  p_duration NUMERIC,
  p_segments JSONB,
  p_seek_forward INT DEFAULT 0,
  p_seek_backward INT DEFAULT 0,
  p_playback_speed NUMERIC DEFAULT 1.0
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO video_tracking (...)
  VALUES (
    p_user_id, 
    p_lesson_id, 
    p_video_id,
    FLOOR(p_play_time)::INTEGER,  -- ✅ Force type conversion
    ...
  )
  ON CONFLICT (user_id, lesson_id, video_version)
  DO UPDATE SET ...;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Тестирование RPC Напрямую

**SQL тест:**
```sql
SELECT upsert_video_progress(
  '1d063207-02ca-41e9-b17b-bf83830e66ca'::UUID,
  29,
  'test-video-id',
  100.555,  -- ✅ Decimal
  50.123,   -- ✅ Decimal
  45.678,   -- ✅ Decimal
  50.111,   -- ✅ Decimal
  200.999,  -- ✅ Decimal
  '[]'::JSONB,
  0, 0, 1.0
);
```

**Результат:** ✅ **УСПЕХ!** Данные сохранились корректно!

**Проверка:**
```sql
SELECT watch_percentage, total_play_time, last_position_seconds
FROM video_tracking WHERE lesson_id = 29;

-- Результат:
-- watch_percentage: 50
-- total_play_time: 100
-- last_position_seconds: 45
-- ✅ ВСЁ КОРРЕКТНО!
```

---

## ❌ НОВАЯ ПРОБЛЕМА: RPC через JS Client

### Backend Code (TypeScript)

```typescript
// backend/src/routes/progress.ts

const { data, error } = await supabase
  .rpc('upsert_video_progress', {
    p_user_id: user_id,              // UUID
    p_lesson_id: lesson_id,          // number (29)
    p_video_id: video_id || null,    // string | null
    p_play_time: totalPlayTimeSeconds,     // number (100)
    p_percentage: progressPercent,         // number (50)
    p_current_position: currentTimeSeconds, // number (45)
    p_max_position: maxPositionSeconds,     // number (50)
    p_duration: videoDurationSeconds,       // number (200)
    p_segments: watched_segments || [],     // array
    p_seek_forward: seekForwardCount,       // number (0)
    p_seek_backward: seekBackwardCount,     // number (0)
    p_playback_speed: playbackSpeedAverage  // number (1.0)
  });

if (error) {
  console.error('❌ [Progress] Supabase error:', error);
  // ❌ ERROR OCCURS HERE!
}
```

### Error в Backend Log

```javascript
🚀 [RPC CALL] Using upsert_video_progress function
❌ [Progress] Supabase error: {
  code: '22P02',
  details: null,
  hint: null,
  message: 'invalid input syntax for type integer: "55.126144"'
}
```

---

## 🔍 АНАЛИЗ ПРОБЛЕМЫ

### Факты

1. ✅ **RPC функция РАБОТАЕТ** при прямом SQL вызове
2. ✅ **parseNumber() РАБОТАЕТ** - логи показывают корректные numbers
3. ✅ **Backend передаёт числа** - `totalPlayTimeSeconds: 100 (type: number)`
4. ❌ **Supabase JS Client ТРАНСФОРМИРУЕТ** данные перед отправкой
5. ❌ **Ошибка та же** - `"55.126144"` (string вместо integer)

### Гипотеза

**Supabase JS Client (`supabase.rpc()`)** выполняет какую-то **внутреннюю serialization/transformation** которая:

1. Читает ДРУГИЕ параметры (не те что мы передаём)
2. ИЛИ мерджит параметры с какими-то старыми данными
3. ИЛИ имеет bug в type conversion для RPC calls

---

## 🎯 ЧТО НУЖНО ОТ SENIOR DEVELOPER

### Вопрос 1: Debug Supabase RPC Call

Как **intercept** или **log** РЕАЛЬНЫЕ данные которые `supabase.rpc()` отправляет в PostgreSQL?

**Пробовал:**
```typescript
// ❌ НЕ РАБОТАЕТ
console.log('Before RPC:', { p_play_time: totalPlayTimeSeconds });
// Output: Before RPC: { p_play_time: 100 }

const { error } = await supabase.rpc('upsert_video_progress', {...});
// Error: "55.126144" ❌ ОТКУДА???
```

### Вопрос 2: Альтернатива RPC?

Может ли быть проблема в том что:
- RPC функция принимает `NUMERIC`, но JS client отправляет `string`?
- Нужно ли явно кастить типы ПЕРЕД вызовом RPC?

**Пример:**
```typescript
const { error } = await supabase.rpc('upsert_video_progress', {
  p_play_time: parseFloat(totalPlayTimeSeconds),  // Force JS number?
  // OR
  p_play_time: Number(totalPlayTimeSeconds),
  // OR
  p_play_time: totalPlayTimeSeconds.toString(),  // Send as string?
});
```

### Вопрос 3: Direct PostgreSQL Connection?

Может лучше использовать `pg` library напрямую?

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL
});

await pool.query(
  'SELECT upsert_video_progress($1, $2, $3, ...)',
  [user_id, lesson_id, totalPlayTimeSeconds, ...]
);
```

**Плюсы:**
- ✅ Полный контроль над типами
- ✅ Нет JS client serialization
- ✅ Прямой SQL запрос

**Минусы:**
- ❌ Нужен connection string с правами
- ❌ Bypass RLS (Row Level Security)

---

## 📊 ПОЛНЫЙ КОНТЕКСТ

### Переменные в Backend

```javascript
// DEBUG LOG показывает:
{
  raw_total_play_time: 17.674411,        // ✅ number (исходные данные)
  parsed_totalPlayTimeSeconds: 17,       // ✅ number (после parseNumber)
  type_raw: 'number',
  type_parsed: 'number'
}

// RPC PARAMS показывает:
{
  p_play_time: 17,  // ✅ number
  p_percentage: 3,  // ✅ number
  ...
}

// SUPABASE ERROR показывает:
{
  message: 'invalid input syntax for type integer: "24.581615"'  // ❌ string!
}
```

**ВОПРОС:** Откуда `"24.581615"` если мы передали `17`???

### Файлы для Анализа

1. **Backend Route:** `/Users/miso/onai-integrator-login/backend/src/routes/progress.ts`
   - Строки 160-185 (RPC call)
   - Строки 100-150 (parseNumber logic)

2. **RPC Function:** Migration `create_upsert_video_progress_rpc`

3. **Frontend Hook:** `/Users/miso/onai-integrator-login/src/hooks/useProgressUpdate.ts`

4. **Supabase Config:** `/Users/miso/onai-integrator-login/backend/src/config/supabase.ts`

---

## 🔥 КРИТИЧЕСКИЕ ВОПРОСЫ

### 1. Откуда Старые Значения?

Ошибка показывает `"24.581615"`, `"55.126144"` и т.д.

Это **НЕ те значения** которые мы передаём в RPC!

**Возможно:**
- Supabase JS Client читает старые данные из БД?
- Где-то есть кэш параметров?
- RPC функция получает НЕ те параметры?

### 2. Type Mismatch в RPC?

RPC функция ожидает:
```sql
p_play_time NUMERIC
```

Но внутри делает:
```sql
FLOOR(p_play_time)::INTEGER
```

**Может быть проблема:**
- Supabase передаёт string вместо numeric?
- `FLOOR()` не может обработать string?
- Нужен промежуточный `::NUMERIC` cast?

### 3. JS Client Version Issue?

```json
{
  "@supabase/supabase-js": "^2.38.4"
}
```

Может это **bug в версии 2.38.4**?
- Попробовать downgrade/upgrade?
- Есть ли known issues с RPC type casting?

---

## 💡 ПРЕДЛОЖЕНИЯ РЕШЕНИЙ

### Option 1: Cast в RPC Function

```sql
CREATE OR REPLACE FUNCTION upsert_video_progress(
  p_play_time NUMERIC,
  ...
)
RETURNS VOID AS $$
BEGIN
  -- Добавить explicit cast ДО использования
  DECLARE
    v_play_time INTEGER := FLOOR(p_play_time::NUMERIC)::INTEGER;
  BEGIN
    INSERT INTO video_tracking (total_play_time, ...)
    VALUES (v_play_time, ...)
    ...
  END;
END;
$$;
```

### Option 2: Accept String в RPC

```sql
CREATE OR REPLACE FUNCTION upsert_video_progress(
  p_play_time TEXT,  -- ✅ Accept string!
  ...
)
RETURNS VOID AS $$
DECLARE
  v_play_time INTEGER;
BEGIN
  -- Clean and convert
  v_play_time := FLOOR(
    regexp_replace(p_play_time, '[^0-9.-]', '', 'g')::NUMERIC
  )::INTEGER;
  
  INSERT INTO video_tracking (total_play_time, ...)
  VALUES (v_play_time, ...)
  ...
END;
$$;
```

### Option 3: Pre-process в Backend

```typescript
// Force string cleanup BEFORE RPC
const cleanNumber = (val: any): string => {
  const num = parseFloat(String(val).replace(/[^\d.-]/g, ''));
  return Math.floor(num).toString();
};

const { error } = await supabase.rpc('upsert_video_progress', {
  p_play_time: cleanNumber(totalPlayTimeSeconds),
  p_percentage: cleanNumber(progressPercent),
  ...
});
```

### Option 4: Bypass Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

// Вместо:
await supabase.rpc('upsert_video_progress', {...});

// Использовать:
const pool = new Pool({ connectionString: DB_URL });
await pool.query(
  'SELECT upsert_video_progress($1::UUID, $2::INT, $3::TEXT, $4::NUMERIC, ...)',
  [user_id, lesson_id, video_id, totalPlayTimeSeconds, ...]
);
```

---

## 📈 СТАТИСТИКА DEBUG

| Попытка | Подход | Результат |
|---------|--------|-----------|
| 1-5 | parseNumber() в backend | ❌ Не помогло |
| 6-8 | Перезапуск backend | ❌ Не помогло |
| 9-10 | Очистка кэша | ❌ Не помогло |
| 11 | Создание RPC функции | ✅ Функция работает |
| 12 | Тест RPC через SQL | ✅ Данные сохраняются |
| 13 | RPC через JS client | ❌ **BLOCKED HERE** |

---

## 🎯 ЗАПРОС К SENIOR

**Пожалуйста помогите:**

1. Как debug/intercept Supabase RPC call чтобы увидеть РЕАЛЬНЫЕ параметры?
2. Почему RPC работает через SQL но НЕ работает через JS client?
3. Откуда берутся старые значения (`"24.581615"`) в ошибке?
4. Какой правильный способ передачи numeric параметров в RPC через JS?
5. Стоит ли использовать `pg` library вместо Supabase client?

---

## 🚨 КРИТИЧНОСТЬ: **BLOCKING**

Без этого фикса:
- ❌ Video tracking НЕ работает
- ❌ AI Mentor НЕ видит прогресс
- ❌ Gamification НЕ работает
- ❌ Analytics НЕ работает
- ❌ **PRODUCTION BLOCKED**

---

## 📝 ENVIRONMENT

```
Node.js: v20.x
TypeScript: 5.3.3
@supabase/supabase-js: 2.38.4
PostgreSQL: 15.x (Supabase Cloud)
Backend: Express + ts-node
```

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- `BACKEND_PARSE_ERROR_REPORT.md` - Исходный отчёт
- `backend/src/routes/progress.ts` - Backend route
- `~/backend-ULTIMATE-FIX.log` - Текущие логи
- Миграция: `create_upsert_video_progress_rpc.sql`

---

Спасибо за помощь! 🙏 Это hardcore проблема которая требует deep knowledge Supabase RPC механизма.














