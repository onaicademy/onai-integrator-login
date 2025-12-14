# 📋 TODO: Миграции для видео (БЕЗ тестовых данных и аналитики)

**Дата:** 15 ноября 2025  
**Статус:** Проверка миграций

---

## 🎯 ЭТАП 1: ПРОВЕРКА БАЗОВЫХ МИГРАЦИЙ (СЕЙЧАС!)

### ✅ ШАГ 1.1: Проверить какие таблицы уже есть

**SQL команда:**
```sql
-- Список всех таблиц курсов
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'courses',
  'modules', 
  'lessons',
  'video_content',
  'lesson_materials',
  'student_progress',
  'module_progress'
)
ORDER BY table_name;
```

**Ожидаемый результат:**
```
courses              ✅
lesson_materials     ✅
lessons              ✅
module_progress      ✅
modules              ✅
student_progress     ✅
video_content        ✅
```

**Статус:** ⏳ Нужно выполнить

---

### ✅ ШАГ 1.2: Проверить структуру таблицы `courses`

**SQL команда:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'courses'
ORDER BY ordinal_position;
```

**Ожидаемые колонки:**
- `id` (integer или uuid)
- `name` (text)
- `slug` (text)
- `description` (text)
- `level` (character varying)
- `is_published` (boolean)
- `is_active` (boolean)
- `price` (numeric)
- `order_index` (integer)
- `thumbnail_url` (text)
- `instructor_id` (uuid)
- `duration_hours` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Статус:** ⏳ Нужно выполнить

---

### ✅ ШАГ 1.3: Проверить структуру таблицы `lessons`

**SQL команда:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'lessons'
ORDER BY ordinal_position;
```

**Обязательные колонки:**
- `id` (uuid)
- `module_id` (uuid) ← FOREIGN KEY
- `title` (text)
- `description` (text)
- `content` (text)
- `lesson_type` (character varying) ← 'video', 'text', 'quiz', 'assignment'
- `duration_minutes` (integer) ← для видео
- `order_index` (integer)
- `is_preview` (boolean) ← бесплатные preview уроки
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Статус:** ⏳ Нужно выполнить

---

### ✅ ШАГ 1.4: Проверить структуру таблицы `video_content`

**SQL команда:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'video_content'
ORDER BY ordinal_position;
```

**Обязательные колонки для Cloudflare R2:**
- `id` (uuid)
- `lesson_id` (uuid) ← FOREIGN KEY
- `r2_object_key` (text) ← ключ в R2
- `r2_bucket_name` (character varying) ← 'onai-academy-videos'
- `filename` (text)
- `file_size_bytes` (bigint)
- `duration_seconds` (integer) ← длительность видео
- `resolution` (character varying) ← '1080p', '720p', etc.
- `format` (character varying) ← 'mp4', 'webm'
- `upload_status` (character varying) ← 'pending', 'completed', 'failed'
- `transcoding_status` (character varying)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Статус:** ⏳ Нужно выполнить

---

### ✅ ШАГ 1.5: Проверить FOREIGN KEY constraints

**SQL команда:**
```sql
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('modules', 'lessons', 'video_content', 'lesson_materials', 'student_progress')
ORDER BY tc.table_name;
```

**Ожидаемые связи:**
```
modules.course_id → courses.id (CASCADE DELETE)
lessons.module_id → modules.id (CASCADE DELETE)
video_content.lesson_id → lessons.id (CASCADE DELETE)
lesson_materials.lesson_id → lessons.id (CASCADE DELETE)
student_progress.lesson_id → lessons.id (CASCADE DELETE)
```

**Статус:** ⏳ Нужно выполнить

---

### ✅ ШАГ 1.6: Очистить тестовые данные (если есть)

**SQL команда:**
```sql
-- Удаляем тестовый курс (CASCADE удалит все связанное)
DELETE FROM public.courses WHERE slug = 'python-basics';

-- Проверяем что всё чисто
SELECT 
    (SELECT COUNT(*) FROM public.courses) as courses_count,
    (SELECT COUNT(*) FROM public.modules) as modules_count,
    (SELECT COUNT(*) FROM public.lessons) as lessons_count,
    (SELECT COUNT(*) FROM public.video_content) as videos_count;
```

**Ожидаемый результат:**
```
courses_count | modules_count | lessons_count | videos_count
--------------|---------------|---------------|-------------
0             | 0             | 0             | 0
```

**Статус:** ⏳ Выполнить если есть тестовые данные

---

## 🎯 ЭТАП 2: ИСПРАВИТЬ МИГРАЦИИ (ЕСЛИ НУЖНО)

### ✅ ШАГ 2.1: Если каких-то колонок нет - применить фикс

**Файл:** `20251115_fix_course_structure.sql`

**Что делает:**
- Добавляет недостающие колонки в `courses`
- Добавляет недостающие колонки в `lessons` (lesson_type, duration_minutes, is_preview)
- Создает таблицы если их нет (video_content, lesson_materials, etc)
- Создает индексы
- Создает RLS политики

**Как запустить:**
1. Открой Supabase Dashboard → SQL Editor
2. Скопируй код из `20251115_fix_course_structure.sql`
3. Вставь и нажми RUN

**Статус:** ⏳ Только если Шаг 1 показал проблемы

---

## 🎯 ЭТАП 3: ПОСЛЕ ЗАГРУЗКИ РЕАЛЬНЫХ УРОКОВ

### ⏳ ШАГ 3.1: Создать Backend API для загрузки видео в R2

**Файлы:**
- `backend/src/controllers/videoUploadController.ts`
- `backend/src/routes/videos.ts`

**Endpoint:**
- `POST /api/videos/upload`

**Логика:**
1. Получить файл (до 3 ГБ)
2. Загрузить в Cloudflare R2
3. Сохранить метаданные в `video_content`
4. Связать с уроком

**Статус:** 🔒 Делаем ПОСЛЕ проверки миграций

---

### ⏳ ШАГ 3.2: Создать UI для загрузки видео (админ-панель)

**Компонент:**
- `src/components/admin/VideoUploader.tsx`

**Статус:** 🔒 Делаем ПОСЛЕ Backend API

---

### ⏳ ШАГ 3.3: ТОЛЬКО ПОТОМ - Аналитика видео

**Файл:** `20251115_video_analytics_and_mentor.sql`

**Статус:** 🔒 Делаем когда РЕАЛЬНЫЕ видео загружены

---

## 📊 ТЕКУЩИЙ ПРОГРЕСС

```
ЭТАП 1: Проверка миграций [0/6] ⏳
├─ 1.1 Проверить таблицы ⏳
├─ 1.2 Проверить courses ⏳
├─ 1.3 Проверить lessons ⏳
├─ 1.4 Проверить video_content ⏳
├─ 1.5 Проверить Foreign Keys ⏳
└─ 1.6 Очистить тестовые данные ⏳

ЭТАП 2: Исправить миграции [0/1] ⏳
└─ 2.1 Применить фикс если нужно ⏳

ЭТАП 3: После загрузки видео [0/3] 🔒
├─ 3.1 Backend API ⏳
├─ 3.2 UI для загрузки ⏳
└─ 3.3 Аналитика ⏳
```

---

## 🚀 СЛЕДУЮЩИЙ ШАГ ПРЯМО СЕЙЧАС:

### **ШАГ 1.1: Проверить какие таблицы есть**

Запусти в Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'courses',
  'modules', 
  'lessons',
  'video_content',
  'lesson_materials',
  'student_progress',
  'module_progress'
)
ORDER BY table_name;
```

**Скажи мне результат!** 📊

