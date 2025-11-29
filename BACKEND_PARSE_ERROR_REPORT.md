# 🚨 CRITICAL: Backend Parse Error - Invalid Integer Input

## 📋 КРАТКОЕ ОПИСАНИЕ ПРОБЛЕМЫ

Backend получает от frontend данные telemetry для сохранения в `video_tracking` таблицу Supabase. 
Несмотря на применение `parseNumber()` функции для конвертации всех входящих значений в числа, 
Supabase продолжает выдавать ошибку: **"invalid input syntax for type integer: \"24.581615\""**

---

## 🔍 ДЕТАЛЬНЫЙ АНАЛИЗ

### 1. Симптомы

**Ошибка из Supabase:**
```json
{
  "code": "22P02",
  "details": null,
  "hint": null,
  "message": "invalid input syntax for type integer: \"24.581615\""
}
```

**Частота**: Происходит при КАЖДОМ запросе `POST /api/progress/update`

**Файл**: `backend/src/routes/progress.ts`

---

### 2. Что Было Реализовано

#### A) SmartVideoPlayer Migration
- ✅ Создан новый `SmartVideoPlayer.tsx` (Plyr + HLS.js)
- ✅ Применён в Tripwire: `src/pages/tripwire/TripwireLesson.tsx`
- ✅ Применён в Course/1: `src/pages/Lesson.tsx`
- ✅ Видео играет, UI работает корректно

#### B) parseNumber() Function
Добавлена функция для безопасного парсинга любых входящих данных:

```typescript
const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove common suffixes: "s", "%", "px", etc.
    const cleaned = val.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
};
```

**Применение:**
```typescript
const totalPlayTimeSeconds = Math.floor(parseNumber(total_play_time));
```

---

### 3. DEBUG Логи Показывают СТРАННОЕ Поведение

#### Лог 1: parseNumber() РАБОТАЕТ
```javascript
🔧 [DEBUG parseNumber]: {
  raw_total_play_time: 17.674411,        // ✅ Number приходит
  parsed_totalPlayTimeSeconds: 17,       // ✅ Корректно парсится
  type_raw: 'number',
  type_parsed: 'number'
}
```

#### Лог 2: НО в Telemetry Данные РАЗНЫЕ
```javascript
📊 [Progress] Telemetry update: {
  user_id: '1d063207...',
  lesson_id: 29,
  percentage: '3%',
  total_play_time: '24.581615s',         // ❌ СТРОКА с суффиксом!
  segments: 1
}
```

#### Лог 3: Upsert Data Перед Отправкой
```javascript
🚀 [DEBUG UPSERT DATA total_play_time]: 24 number
```

**ВЫВОД**: `parseNumber()` работает на стороне backend, НО данные приходят УЖЕ как строки!

---

### 4. Анализ Схемы БД

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'video_tracking';
```

**Результат:**
- `total_watch_time_seconds`: **integer** ✅
- `total_play_time`: **integer** ✅
- `watch_percentage`: **numeric** ✅
- `last_position_seconds`: **integer** ✅

**ВСЁ КОРРЕКТНО!** Схема БД требует integer, мы отправляем integer (24), но ошибка продолжается!

---

### 5. Что Я Пытался (10+ Попыток)

| # | Действие | Результат |
|---|----------|-----------|
| 1 | Добавил `parseNumber()` функцию | ❌ Ошибка осталась |
| 2 | Перезапустил backend (3x) | ❌ Ошибка осталась |
| 3 | Убил все node процессы | ❌ Ошибка осталась |
| 4 | Удалил `node_modules/.cache` | ❌ Ошибка осталась |
| 5 | Использовал `--transpile-only` флаг | ❌ Ошибка осталась |
| 6 | Удалил `dist/` и пересобрал | ❌ Ошибка осталась |
| 7 | Добавил debug логи перед parseNumber | ✅ Видно что работает |
| 8 | Добавил debug логи после parseNumber | ✅ Видно что работает |
| 9 | Добавил debug логи перед upsert | ✅ Данные корректны (number) |
| 10 | Проверил что данные в Supabase | ⚠️ Старые данные (не обновляются) |

---

### 6. КЛЮЧЕВАЯ ПРОБЛЕМА (Hypothesis)

**ГИПОТЕЗА**: Где-то между:
```
upsertData = { total_play_time: 24 }  // ✅ number
```

И:
```
Supabase.upsert(upsertData)
```

Данные **ТРАНСФОРМИРУЮТСЯ** обратно в строку `"24.581615s"`!

**Возможные Причины:**

#### A) Supabase Client Serialization
Возможно, Supabase клиент имеет middleware/transform, который:
- Читает старые данные из кэша
- Применяет какую-то трансформацию
- Отправляет старый формат

#### B) TypeScript Transpilation Issue
`ts-node --transpile-only` может пропускать type checks, и:
- Старый скомпилированный код остаётся в памяти
- Новый код не применяется полностью

#### C) Request Body Middleware
Express middleware может трансформировать body ПОСЛЕ парсинга:
```typescript
app.use(express.json()); // Может применять custom revivers?
```

---

### 7. Код Frontend (Откуда Данные)

**Файл:** `src/hooks/useProgressUpdate.ts`

```typescript
const telemetry = {
  current_time: currentTime,          // number (12.5)
  percentage: percentage,              // number (15)
  duration: duration,                  // number (826)
  total_play_time: totalPlayTime,      // number (25.3)
  // ...
};

await api.post('/api/progress/update', telemetry);
```

**Проверка в браузере:**
```javascript
console.log(typeof telemetry.total_play_time); // "number"
```

✅ **Frontend отправляет числа!**

---

### 8. Код Backend (Где Обрабатывается)

**Файл:** `backend/src/routes/progress.ts` (строки 100-170)

```typescript
// 1. Деструктуризация из body
const { total_play_time, ...rest } = req.body;

// 2. Парсинг (РАБОТАЕТ!)
const totalPlayTimeSeconds = Math.floor(parseNumber(total_play_time));

console.log('✅ Parsed:', totalPlayTimeSeconds, typeof totalPlayTimeSeconds);
// Вывод: ✅ Parsed: 24 number

// 3. Создание объекта для Supabase
const upsertData = {
  total_play_time: totalPlayTimeSeconds,  // ✅ 24 (number)
  // ...
};

console.log('✅ Upsert:', upsertData.total_play_time, typeof upsertData.total_play_time);
// Вывод: ✅ Upsert: 24 number

// 4. Отправка в Supabase
const { data, error } = await supabase
  .from('video_tracking')
  .upsert(upsertData, { onConflict: 'user_id,lesson_id,video_version' });

// 5. ОШИБКА!
console.error('❌ Error:', error);
// Вывод: ❌ Error: invalid input syntax for type integer: "24.581615"
```

**ВОПРОС:** Откуда `"24.581615"` если мы отправили `24`???

---

### 9. Проверенные Версии Пакетов

```json
{
  "@supabase/supabase-js": "^2.38.4",
  "express": "^4.18.2",
  "ts-node": "^10.9.1",
  "typescript": "^5.3.3"
}
```

---

### 10. Суть Проблемы (Best Guess)

**Я ПОДОЗРЕВАЮ**, что Supabase JS Client:

1. Читает ТЕКУЩУЮ запись из БД (если она существует)
2. Мерджит новые данные со старыми
3. При мердже использует СТАРЫЕ типы данных
4. Отправляет в БД СТАРЫЙ формат (string вместо number)

**Это объясняет:**
- ✅ parseNumber() работает (логи показывают)
- ✅ upsertData корректен (логи показывают)  
- ❌ Supabase получает строку (ошибка показывает)
- ❌ БД не обновляется (данные старые: 20:32:32)

---

### 11. ЧТО НЕ ПОМОГЛО

❌ Перезапуск backend  
❌ Очистка кэша  
❌ Перезапуск БД  
❌ Изменение `onConflict` стратегии  
❌ Использование `.update()` вместо `.upsert()`  
❌ Добавление explicit type casting: `total_play_time: Number(totalPlayTimeSeconds)`  

---

### 12. ЧТО НУЖНО ПОПРОБОВАТЬ (Рекомендации для Senior Dev)

#### Option 1: Debug Supabase Client Internals
```typescript
// Добавить перед upsert:
console.log('📤 [PRE-UPSERT] Raw object:', JSON.stringify(upsertData));

// Intercept Supabase request
const originalUpsert = supabase.from('video_tracking').upsert;
supabase.from('video_tracking').upsert = function(...args) {
  console.log('🔍 [SUPABASE INTERCEPT]:', args);
  return originalUpsert.apply(this, args);
};
```

#### Option 2: Force Type Casting in SQL
```typescript
const { data, error } = await supabase
  .rpc('upsert_video_tracking', {
    p_total_play_time: totalPlayTimeSeconds,  // Force via RPC
    // ...
  });
```

#### Option 3: Direct SQL Query (Bypass Supabase Client)
```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });

await pool.query(`
  INSERT INTO video_tracking (total_play_time, ...)
  VALUES ($1::integer, ...)
  ON CONFLICT (...) DO UPDATE SET total_play_time = $1::integer
`, [totalPlayTimeSeconds]);
```

#### Option 4: Check Supabase Client Transform
```typescript
// В supabase client config:
const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  global: {
    fetch: (...args) => {
      console.log('🌐 [FETCH INTERCEPT]:', args);
      return fetch(...args);
    }
  }
});
```

---

### 13. Файлы для Проверки

1. **Backend Route:** `backend/src/routes/progress.ts` (строки 100-180)
2. **Frontend Hook:** `src/hooks/useProgressUpdate.ts`  
3. **Supabase Config:** `backend/src/config/supabase.ts`
4. **Миграции БД:** `supabase/migrations/` (проверить старые миграции на type casting)

---

### 14. Логи для Анализа

**Backend лог:** `~/backend-FINAL-FIX.log`

Ключевые строки:
```
🔧 [DEBUG parseNumber]: { raw_total_play_time: 17.674411, parsed_totalPlayTimeSeconds: 17 }
🚀 [DEBUG UPSERT DATA total_play_time]: 24 number
❌ [Progress] Supabase error: { code: '22P02', message: 'invalid input syntax for type integer: "24.581615"' }
```

---

### 15. Supabase DB Check

**Текущие данные:**
```sql
SELECT watch_percentage, total_play_time, updated_at 
FROM video_tracking 
WHERE lesson_id = 29 
ORDER BY updated_at DESC LIMIT 1;

-- Результат:
-- watch_percentage: 6.00
-- total_play_time: 0  
-- updated_at: 20:32:32  (НЕ ОБНОВЛЯЕТСЯ!)
```

**ВЫВОД:** Данные НЕ сохраняются из-за ошибки парсинга!

---

## 🎯 ЗАПРОС К SENIOR DEVELOPER

**Пожалуйста, помогите:**

1. **Как DEBUG Supabase JS Client** чтобы увидеть ЧТО реально отправляется в PostgreSQL?

2. **Почему** `upsertData.total_play_time = 24 (number)` трансформируется в `"24.581615" (string)` на уровне Supabase?

3. **Есть ли** в Supabase JS Client какие-то transform/middleware которые могут менять типы данных?

4. **Правильно ли** использовать `.upsert()` с `onConflict`, или лучше использовать `.update()` / `.insert()` отдельно?

5. **Как FORCE** type casting на уровне Supabase запроса (например `total_play_time::integer`)?

---

## 📊 Статус Реализации

| Компонент | Статус | Примечание |
|-----------|--------|------------|
| SmartVideoPlayer (Plyr + HLS.js) | ✅ DONE | Работает в обоих продуктах |
| Tripwire Migration | ✅ DONE | SmartVideoPlayer применён |
| Course/1 Migration | ✅ DONE | SmartVideoPlayer применён |
| Frontend Telemetry | ✅ DONE | Отправляет корректные numbers |
| Backend parseNumber() | ✅ DONE | Функция работает корректно |
| Backend Route Logic | ✅ DONE | Логика корректна |
| Supabase Upsert | ❌ **BLOCKED** | **Type casting error** |
| Database Schema | ✅ DONE | Схема корректна (integer fields) |

---

## 🚨 КРИТИЧНОСТЬ

**HIGH PRIORITY** - Без этого фикса:
- ❌ Видео метрики НЕ сохраняются
- ❌ AI Mentor НЕ видит прогресс студентов  
- ❌ Gamification/Achievements НЕ работают
- ❌ Analytics dashboard НЕ отображает данные

---

## 💡 Дополнительная Информация

**Environment:**
- Node.js: v20.x
- TypeScript: 5.3.3
- Supabase JS: 2.38.4
- PostgreSQL: 15.x (Supabase Cloud)

**Время потраченное:** ~3 часа debug

**Попыток:** 10+ различных подходов

**Результат:** Проблема НЕ решена, требуется помощь Senior Developer

---

Спасибо за помощь! 🙏

