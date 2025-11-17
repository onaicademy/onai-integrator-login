# 🔥 ИНСТРУКЦИЯ ПО УДАЛЕНИЮ TRIGGERS

## 📋 ПРОБЛЕМА:
```
❌ Error: record "new" has no field "updated_at"
```

**Причина:** В Supabase БД есть trigger который автоматически устанавливает `updated_at` при UPDATE операциях на таблице `lessons`.

---

## ✅ РЕШЕНИЕ: Удалить trigger из БД

---

## 🚀 ПОШАГОВАЯ ИНСТРУКЦИЯ:

### ШАГ 1: Открой Supabase SQL Editor

Перейди по ссылке:
```
https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql
```

**Или вручную:**
1. Открой [Supabase Dashboard](https://supabase.com/dashboard)
2. Выбери проект `onai-academy`
3. Боковое меню → **SQL Editor**

---

### ШАГ 2: Открой файл SQL

В Cursor открой файл:
```
remove_updated_at_triggers.sql
```

**Скопируй ВЕСЬ содержимое файла**

---

### ШАГ 3: Выполни SQL

1. Вставь скопированный SQL в **SQL Editor**
2. Нажми **Run** (или `Ctrl+Enter`)
3. Дождись выполнения

---

### ШАГ 4: Проверь результат

После выполнения SQL проверь:

#### ✅ ШАГ 4.1: Triggers удалены
Должен вернуть **0 строк**:
```sql
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'lessons';
```

#### ✅ ШАГ 4.2: Функции удалены
Должен вернуть **0 строк** (или строки без `updated_at`):
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%updated_at%';
```

---

### ШАГ 5: Перезапусти Backend

Открой PowerShell и выполни:

```powershell
# Остановить все Node процессы
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Подождать 2 секунды
Start-Sleep -Seconds 2

# Запустить Backend
cd C:\onai-integrator-login\backend
npm run dev
```

**Или через Cursor:**
1. Открой терминал в Cursor
2. Запусти команду остановки процессов
3. Запусти `npm run dev` в папке `backend`

---

### ШАГ 6: Протестируй загрузку видео

1. Открой http://localhost:8080/course/1/module/1
2. Нажми **"Добавить урок"**
3. Заполни:
   - **Название:** "TEST AFTER TRIGGER REMOVAL"
   - **Описание:** "Проверка после удаления triggers"
   - **Длительность:** 10
4. Добавь **видео** (5-10 MB)
5. Нажми **"🚀 Создать урок и загрузить все материалы"**

---

### ШАГ 7: Проверь Backend Console

**✅ Должно быть:**
```
POST /api/lessons
✅ Урок создан с ID: 28

POST /api/videos/upload/28
✅ 1. File received: test.mp4
✅ 2. Starting R2 upload...
✅ 3. R2 upload success
✅ 4. Saving video_url to lessons table
✅ 5. DB save success
✅ Видео успешно загружено

🔗 URL видео: https://...
```

**❌ НЕ должно быть:**
```
❌ Error: record "new" has no field "updated_at"  ← ДОЛЖНО ИСЧЕЗНУТЬ!
```

---

## 🔍 ЕСЛИ ОШИБКА ВСЁ ЕЩЁ ЕСТЬ:

### Проверь RLS Policies:

```sql
SELECT 
  policyname,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lessons';
```

Если в `qual` или `with_check` есть упоминание `updated_at` - нужно обновить policy.

---

### Проверь есть ли колонка updated_at:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'lessons' 
  AND column_name = 'updated_at';
```

**Если колонка ЕСТЬ** (вернулась 1 строка):

#### Вариант A: Удалить колонку (если не используется)
```sql
ALTER TABLE lessons DROP COLUMN IF EXISTS updated_at;
```

#### Вариант B: Создать trigger для автоматического обновления
```sql
-- 1. Создать функцию
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Создать trigger
CREATE TRIGGER update_lessons_updated_at 
BEFORE UPDATE ON lessons 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
```

**⚠️ НО:** Это вернет проблему назад! Лучше просто **удалить колонку**.

---

## 📊 ЧЕКЛИСТ:

- [ ] Открыл Supabase SQL Editor
- [ ] Скопировал SQL из `remove_updated_at_triggers.sql`
- [ ] Выполнил SQL
- [ ] Проверил что triggers удалены (0 строк)
- [ ] Перезапустил Backend
- [ ] Протестировал загрузку видео
- [ ] Проверил Backend Console - нет ошибки `updated_at`
- [ ] Видео успешно загрузилось
- [ ] Видео отобразилось в UI

---

## 🎯 ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

После удаления triggers:

```diff
- ❌ Error: record "new" has no field "updated_at"
+ ✅ Видео успешно загружено
+ ✅ Материалы успешно загружены
+ ✅ Progress bar работает
+ ✅ Автоматический переход на страницу урока
```

---

## 📝 ПОЛНЫЙ SQL ДЛЯ БЫСТРОГО КОПИРОВАНИЯ:

```sql
-- 1. Удалить все triggers
DROP TRIGGER IF EXISTS update_lessons_updated_at ON lessons;
DROP TRIGGER IF EXISTS set_updated_at ON lessons;
DROP TRIGGER IF EXISTS handle_updated_at ON lessons;
DROP TRIGGER IF EXISTS update_updated_at_column ON lessons;

-- 2. Удалить функции
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;

-- 3. Проверить что triggers удалены (должно вернуть 0 строк)
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'lessons';

-- 4. (ОПЦИОНАЛЬНО) Удалить колонку updated_at
-- ⚠️ ТОЛЬКО если она не используется!
ALTER TABLE lessons DROP COLUMN IF EXISTS updated_at;
```

---

## 🚨 ВАЖНО:

1. **После выполнения SQL** - обязательно перезапусти Backend
2. **Очисти кэш браузера** - нажми `Ctrl+Shift+R`
3. **Проверь Frontend Console** - не должно быть ошибок
4. **Проверь Backend Console** - должны быть логи с ✅

---

## 📤 ПРИШЛИ МНЕ:

После выполнения всех шагов пришли:

```
=== РЕЗУЛЬТАТ УДАЛЕНИЯ TRIGGERS ===

1. Triggers удалены:
[Скопируй результат SELECT trigger_name...]

2. Backend перезапущен:
[✅ OK / ❌ FAILED]

3. Тест загрузки видео:
[✅ SUCCESS / ❌ FAILED]

4. Backend Console:
[Скопируй вывод с ✅ или ❌]

5. Ошибка "updated_at":
[✅ ИСЧЕЗЛА / ❌ ВСЁ ЕЩЁ ЕСТЬ]
```

---

**УДАЛЯЙ TRIGGERS И ПРИСЫЛАЙ РЕЗУЛЬТАТ!** 🔥

