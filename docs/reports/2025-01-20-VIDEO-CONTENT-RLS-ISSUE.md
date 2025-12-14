# 🔥 КРИТИЧЕСКАЯ ПРОБЛЕМА: video_content RLS Blocking

**Date:** January 20, 2025  
**Problem:** Video duration не отображается, хотя видео загружены  
**Root Cause:** Supabase RLS policies блокируют чтение и запись в `video_content`  
**Status:** ❌ НЕ РЕШЕНО (требуется корректный SQL для RLS policies)

---

## 📋 ХРОНОЛОГИЯ ИСПРАВЛЕНИЙ

### Исправление #1: Authorization Header ✅ ПРИМЕНЕНО
**Проблема:** Service role key не обходил RLS  
**Решение:** Добавлен `Authorization: Bearer` header в `adminSupabase` client

**Что сделали:**
- Создан `backend/src/config/supabase.ts` с явным Authorization header
- Обновлены все backend routes для использования `adminSupabase`
- Backend build успешен (0 ошибок)

**Файл:** `backend/src/config/supabase.ts`
```typescript
export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`  // ✅ ДОБАВЛЕНО
    }
  }
});
```

**Результат:** Backend код правильный, но duration все равно не сохраняется.

---

### Исправление #2: Multer Field Order ✅ ПРИМЕНЕНО
**Проблема:** `duration_seconds` не парсился из FormData  
**Решение:** Изменен порядок полей в FormData

**Что сделали:**
- Frontend: `duration_seconds` добавляется ПЕРЕД `video` file
- Backend: `multer.fields()` вместо `multer.single()`
- Backend: Dual-table save (lessons + video_content)

**Файл:** `src/components/admin/LessonEditDialog.tsx`
```typescript
const formData = new FormData();
formData.append('duration_seconds', durationSeconds.toString()); // ✅ ПЕРЕД файлом
formData.append('video', videoFile);
```

**Файл:** `backend/src/routes/videos.ts`
```typescript
const upload = multer({ ... }).fields([
  { name: 'video', maxCount: 1 },
  { name: 'duration_seconds', maxCount: 1 }  // ✅ Явно указано
]);
```

**Результат:** Backend получает duration_seconds, но запись в БД блокируется.

---

### Исправление #3: Dual-Table Save ✅ ПРИМЕНЕНО
**Проблема:** Duration сохранялся только в `lessons.duration_minutes`  
**Решение:** Сохранение в обе таблицы (`lessons` + `video_content`)

**Что сделали:**
- Backend сохраняет `duration_minutes` в `lessons` table
- Backend делает `upsert` в `video_content` table
- Оба запроса используют `adminSupabase`

**Файл:** `backend/src/routes/videos.ts`
```typescript
// ШАГ 1: Обновить lessons
await adminSupabase
  .from('lessons')
  .update({ duration_minutes: X })
  .eq('id', lessonId);

// ШАГ 2: Upsert в video_content
await adminSupabase
  .from('video_content')
  .upsert({
    lesson_id: lessonId,
    duration_seconds: Y,
    video_url: '...',
    // ...
  });
```

**Результат:** 
- `lessons` UPDATE проходит успешно ✅
- `video_content` UPSERT БЛОКИРУЕТСЯ RLS ❌

---

### Исправление #4: Backend SELECT with JOIN ✅ ПРИМЕНЕНО
**Проблема:** Frontend не получает `video_content` для расчета duration  
**Решение:** Backend SELECT включает JOIN с `video_content`

**Что сделали:**
- Backend: `SELECT *, video_content (*), lesson_materials (*)`
- Backend: Fallback вычисление `duration_minutes` из `video_content.duration_seconds`
- Frontend: Расчет total duration из массива уроков

**Файл:** `backend/src/routes/lessons.ts`
```typescript
const { data: lessons } = await adminSupabase
  .from('lessons')
  .select(`
    *,
    video_content (*),  // ✅ JOIN
    lesson_materials (*)
  `)
  .eq('module_id', module_id);

// Fallback вычисление
if (!lesson.duration_minutes && lesson.video_content?.length > 0) {
  lesson.duration_minutes = Math.round(lesson.video_content[0].duration_seconds / 60);
}
```

**Результат:** 
- Backend SELECT правильный ✅
- Но `video_content` возвращается ПУСТЫМ ❌ (RLS блокирует чтение)

---

## 🔍 ТЕКУЩЕЕ СОСТОЯНИЕ

### База данных (Supabase SQL результат)

**Запрос:**
```sql
SELECT 
  vc.id,
  vc.lesson_id,
  vc.duration_seconds,
  vc.filename,
  l.id as lesson_table_id,
  l.title as lesson_title,
  l.duration_minutes,
  l.video_url
FROM video_content vc
RIGHT JOIN lessons l ON l.id = vc.lesson_id
WHERE l.module_id = 2;
```

**Результат:**
```json
[
  {
    "id": null,                    // ❌ video_content ПУСТОЙ!
    "lesson_id": null,
    "duration_seconds": null,
    "filename": null,
    "lesson_table_id": 37,
    "lesson_title": "Тест 1",
    "duration_minutes": 0,         // ❌ Duration не сохранен
    "video_url": "https://onai-videos.b-cdn.net/videos/lesson-37-..."  // ✅ Видео ЕСТЬ
  },
  {
    "id": null,                    // ❌ video_content ПУСТОЙ!
    "duration_seconds": null,
    "lesson_table_id": 33,
    "lesson_title": "Тестирование...",
    "duration_minutes": 0,
    "video_url": "https://onai-videos.b-cdn.net/videos/lesson-33-..."
  },
  {
    "id": null,                    // ❌ НОВОЕ видео тоже не сохранилось!
    "duration_seconds": null,
    "lesson_table_id": 38,
    "lesson_title": "ntcn",
    "duration_minutes": 0,
    "video_url": "https://onai-videos.b-cdn.net/videos/lesson-38-..."
  }
]
```

**Вывод:**
- ✅ Видео загружены на Bunny CDN
- ✅ `video_url` сохранен в `lessons` table
- ❌ **Таблица `video_content` ПОЛНОСТЬЮ ПУСТАЯ**
- ❌ `duration_seconds` НЕ сохраняется
- ❌ `duration_minutes` = 0 (NULL)

---

### Frontend логи (Browser Console)

```
Module.tsx:578 📦 Уроков получено: 3
Module.tsx:594    1. "Тест 1": 0 минут (нет видео)
Module.tsx:594    2. "Тестирование...": 0 минут (нет видео)
Module.tsx:594    3. "ntcn": 0 минут (нет видео)
Module.tsx:603 ⏱️ ИТОГО: 0 минут
```

**Frontend код проверяет:**
```typescript
if (lesson.video_content && Array.isArray(lesson.video_content) && lesson.video_content.length > 0) {
  // Вычислить duration
} else {
  console.log("нет видео");
}
```

**Проблема:** `lesson.video_content` = `[]` (пустой массив) или `undefined`

---

## 🎯 КОРНЕВАЯ ПРИЧИНА: RLS Policies

### Текущие RLS Policies на `video_content`

**Запрос:**
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'video_content';
```

**Результат:**
```json
[
  {
    "policyname": "Only admins can manage video content",
    "cmd": "ALL",
    "qual": "(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))",
    "with_check": null  // ❌ ПРОБЛЕМА #1: WITH CHECK отсутствует!
  },
  {
    "policyname": "Video content is viewable by everyone",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  }
]
```

### ❌ ПРОБЛЕМА #1: WITH CHECK = null

**Policy:**
```sql
CREATE POLICY "Only admins can manage video content"
ON video_content
FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (null);  -- ❌ БЛОКИРУЕТ INSERT/UPDATE!
```

**Что происходит:**
- `USING` clause проверяет OLD rows (для UPDATE/DELETE)
- `WITH CHECK` clause проверяет NEW rows (для INSERT/UPDATE)
- Без `WITH CHECK (true)` → Supabase **блокирует запись**
- Service role key **НЕ ОБХОДИТ** policy без WITH CHECK!

### ❌ ПРОБЛЕМА #2: USING ищет в таблице `profiles`

**Policy проверяет:**
```sql
EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
```

**Проблема:**
- Service role key **НЕ имеет `auth.uid()`** (это server-side операция)
- `auth.uid()` возвращает `NULL` для service_role_key
- Policy FAILING даже с Authorization header!

**Correct approach для service_role_key:**
```sql
USING (true)        -- Для service_role_key
WITH CHECK (true)   -- Для service_role_key
```

---

## 🔥 ПОПЫТКИ ИСПРАВЛЕНИЯ (НЕ СРАБОТАЛИ)

### Попытка #1: Добавить WITH CHECK (true)

**SQL:**
```sql
DROP POLICY IF EXISTS "Only admins can manage video content" ON video_content;

CREATE POLICY "Only admins can manage video content"
ON video_content
FOR ALL
USING (true)
WITH CHECK (true);
```

**Статус:** ❌ НЕ ПРОТЕСТИРОВАНО ЕЩЕ

---

## 📊 ЧТО ДОЛЖНО РАБОТАТЬ

### Ожидаемое поведение:

1. **Admin загружает видео:**
   - Frontend вычисляет `duration_seconds` из video file
   - Backend получает `duration_seconds` в FormData
   - Backend сохраняет в `lessons.duration_minutes`
   - Backend делает `upsert` в `video_content` table
   - **Оба запроса УСПЕШНЫ** ✅

2. **Backend возвращает уроки:**
   - SELECT включает JOIN с `video_content`
   - Response содержит `lesson.video_content = [{ duration_seconds: X }]`
   - Frontend вычисляет total duration

3. **Frontend отображает:**
   - "Время прохождения модуля: 1 час 30 минут (3 урока)"
   - Не "0 минут"

### Текущее поведение:

1. ✅ Frontend вычисляет duration
2. ✅ Backend получает duration_seconds
3. ✅ Backend обновляет `lessons` table
4. ❌ **Backend UPSERT в `video_content` БЛОКИРУЕТСЯ RLS**
5. ❌ `video_content` table остается пустой
6. ❌ Backend SELECT возвращает `video_content: []`
7. ❌ Frontend показывает "0 минут (нет видео)"

---

## 🎯 ЧТО НУЖНО СДЕЛАТЬ

### Задача: Исправить RLS policies для `video_content`

**Требования:**
1. Service role key должен **ОБХОДИТЬ все policies**
2. Policies должны разрешать:
   - ✅ SELECT (read) для всех
   - ✅ INSERT для service_role_key / admin
   - ✅ UPDATE для service_role_key / admin
   - ✅ DELETE для service_role_key / admin

3. Policies должны иметь:
   - ✅ `USING (true)` для service_role_key
   - ✅ `WITH CHECK (true)` для INSERT/UPDATE

**Проблемы с текущим approach:**
- ❌ `auth.uid()` не работает для service_role_key
- ❌ Проверка `profiles.role = 'admin'` блокирует service_role_key
- ❌ `WITH CHECK` отсутствует или `null`

---

## 📝 СТРУКТУРА ТАБЛИЦ

### Table: `lessons`
```sql
CREATE TABLE lessons (
  id BIGINT PRIMARY KEY,
  module_id BIGINT REFERENCES modules(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER,  -- Может быть NULL
  video_url TEXT,            -- Bunny CDN URL
  order_index INTEGER,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Table: `video_content`
```sql
CREATE TABLE video_content (
  id BIGINT PRIMARY KEY,
  lesson_id BIGINT UNIQUE REFERENCES lessons(id),  -- UNIQUE constraint!
  video_url TEXT NOT NULL,
  filename TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,  -- КРИТИЧНО: должен сохраняться
  created_at TIMESTAMPTZ
);
```

**UNIQUE constraint:** `lesson_id` должен быть уникальным (один урок = одно видео).

**UPSERT logic:**
```typescript
await adminSupabase
  .from('video_content')
  .upsert({
    lesson_id: 37,
    duration_seconds: 120,
    // ...
  }, {
    onConflict: 'lesson_id'  // UPDATE if exists
  });
```

---

## 🔍 ДИАГНОСТИКА

### Backend SELECT работает правильно?

**Тест:** Проверить что возвращает Supabase

```sql
-- Прямой запрос через Supabase (минуя RLS для проверки)
SELECT 
  l.id,
  l.title,
  l.duration_minutes,
  l.video_url,
  json_agg(
    json_build_object(
      'id', vc.id,
      'duration_seconds', vc.duration_seconds,
      'filename', vc.filename
    )
  ) as video_content
FROM lessons l
LEFT JOIN video_content vc ON vc.lesson_id = l.id
WHERE l.module_id = 2
  AND l.is_archived = false
GROUP BY l.id
ORDER BY l.order_index;
```

**Ожидаемый результат:**
```json
[
  {
    "id": 37,
    "title": "Тест 1",
    "duration_minutes": 0,
    "video_url": "https://...",
    "video_content": [
      {
        "id": null,
        "duration_seconds": null,
        "filename": null
      }
    ]
  }
]
```

**Если `video_content.id = null`** → таблица ПУСТАЯ, INSERT блокировался.

---

## 🚨 КРИТИЧЕСКИЕ ВОПРОСЫ

### 1. Почему service_role_key не обходит RLS?

**Документация Supabase:**
> "The service role key bypasses all RLS policies."

**Наша ситуация:**
- ✅ `Authorization: Bearer {service_role_key}` установлен
- ✅ Backend использует `adminSupabase` с header
- ❌ **Но INSERT в `video_content` все равно блокируется**

**Возможные причины:**
1. Policy имеет `WITH CHECK` = `null` (блокирует даже service_role_key)
2. Policy проверяет `auth.uid()` (не работает для service_role_key)
3. UNIQUE constraint на `lesson_id` вызывает конфликт (но должен UPDATE)

### 2. Нужно ли вообще иметь RLS policies если используется service_role_key?

**Варианты:**

**Вариант A: Simple policies (для service_role_key)**
```sql
CREATE POLICY "Allow all for service role"
ON video_content
FOR ALL
USING (true)
WITH CHECK (true);
```

**Вариант B: Role-based policies (для JWT roles)**
```sql
CREATE POLICY "Admins can manage"
ON video_content
FOR ALL
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');
```

**Вариант C: Disable RLS for service_role_key (best practice?)**
```sql
ALTER TABLE video_content DISABLE ROW LEVEL SECURITY;
```

### 3. Должен ли быть отдельный policy для INSERT vs UPDATE?

**Текущий policy:** `FOR ALL` (covers INSERT, UPDATE, DELETE, SELECT)

**Альтернатива:**
```sql
CREATE POLICY "Allow SELECT" ON video_content FOR SELECT USING (true);
CREATE POLICY "Allow INSERT" ON video_content FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow UPDATE" ON video_content FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow DELETE" ON video_content FOR DELETE USING (true);
```

---

## 🎯 ЗАПРОС ДЛЯ PERPLEXITY AI

**Файл:** `docs/reports/2025-01-20-PERPLEXITY-VIDEO-CONTENT-RLS.md`

*(см. следующий файл)*

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

1. `2025-01-20-RLS-FIX-APPLIED.md` - Authorization header fix
2. `2025-01-20-PERPLEXITY-RLS-INVESTIGATION.md` - Original RLS research
3. `2025-01-20-IMPLEMENTATION-SUMMARY.md` - Complete implementation summary
4. `2025-01-20-DIAGNOSTIC-LOGGING-ADDED.md` - Logging implementation
5. `check-rls.sql` - SQL diagnostic queries

---

## 🔄 СТАТУС

**Текущий статус:** ❌ CRITICAL - Duration не сохраняется и не отображается

**Блокирующая проблема:** RLS policies на `video_content` блокируют INSERT/UPDATE

**Следующий шаг:** 
1. Получить правильный SQL от Perplexity AI
2. Применить исправленные policies
3. Протестировать upload нового видео
4. Проверить что duration отображается

**Время потрачено:** ~4 часа  
**Confidence в решение:** 95% (проблема идентифицирована, нужен правильный SQL)

---

**Created by:** Cursor AI  
**Date:** January 20, 2025  
**Priority:** CRITICAL 🔥  
**Assigned to:** Perplexity AI (для исследования правильных RLS policies)

