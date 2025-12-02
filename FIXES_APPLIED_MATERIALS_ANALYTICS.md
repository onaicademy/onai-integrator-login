# ✅ ИСПРАВЛЕНЫ ДВЕ ПРОБЛЕМЫ!

## 🎯 ЧТО БЫЛО ИСПРАВЛЕНО:

### 1️⃣ Кракозябры в названиях файлов ✅
### 2️⃣ Ошибки video analytics API ✅

---

## 📝 ПРОБЛЕМА 1: КРАКОЗЯБРЫ В НАЗВАНИЯХ ФАЙЛОВ

### Что было:
```
Original filename: "Чек за курс.pdf"
↓
Storage: "������_1763388714.pdf" ❌
Display: "������.pdf" ❌
```

### Что стало:
```
Original filename: "Чек за курс.pdf"
↓
Sanitized: "Chek_za_kurs.pdf" (транслитерация)
↓
Storage: "1763388714_Chek_za_kurs.pdf" ✅
Display (в БД): "Чек за курс.pdf" ✅ (оригинал!)
Display (в UI): "Чек за курс.pdf" ✅
```

### Исправления в `backend/src/routes/materials.ts`:

1. **Добавлена функция `transliterate()`**:
   - Транслитерирует кириллицу → латиницу
   - Пример: "Чек" → "Chek", "Презентация" → "Prezentatsiya"

2. **Добавлена функция `sanitizeFilename()`**:
   - Транслитерирует кириллицу
   - Заменяет пробелы на `_`
   - Убирает спецсимволы (оставляет только a-z, 0-9, -, _)
   - Сохраняет расширение файла

3. **Обновлена логика загрузки**:
   ```typescript
   const originalFilename = file.originalname; // "Чек за курс.pdf"
   const sanitizedFilename = sanitizeFilename(originalFilename); // "Chek_za_kurs.pdf"
   const uniqueFileName = `${timestamp}_${sanitizedFilename}`; // "1763388714_Chek_za_kurs.pdf"
   ```

4. **БД теперь сохраняет**:
   ```typescript
   {
     filename: uniqueFileName, // Sanitized для storage
     display_name: originalFilename, // Original для UI
     storage_path: `course_1/module_1/lesson_21/1763388714_Chek_za_kurs.pdf`
   }
   ```

---

## 📊 ПРОБЛЕМА 2: ОШИБКИ VIDEO ANALYTICS API

### Что было:
```
POST /api/analytics/video-event
❌ 400 Bad Request
❌ Frontend Console: Error logging video event
```

### Что стало:
```
POST /api/analytics/video-event
✅ 200 OK
✅ { success: true, event: {...} }
```

### Исправления:

1. **Создан `backend/src/routes/analytics.ts`** ✅
   - POST `/api/analytics/video-event` - сохранение событий
   - GET `/api/analytics/video/:lessonId` - получение статистики

2. **Route уже зарегистрирован в `server.ts`** ✅
   ```typescript
   app.use('/api/analytics', analyticsRouter); // Уже был!
   ```

3. **Создан SQL для таблицы** ✅
   - Файл: `create_video_analytics_table.sql`
   - Нужно выполнить в Supabase SQL Editor

---

## 🧪 ТЕСТИРОВАНИЕ:

### Тест 1: Материалы с кириллицей

```bash
# 1. Перезапусти Backend
cd backend
npm run dev

# 2. Открой Frontend
http://localhost:8080/course/1/module/1

# 3. Создай урок
Добавить урок → Заполни форму

# 4. Загрузи материал с русским названием
Выбери файл: "Чек за курс.pdf"

# 5. Проверь Backend Console:
📝 Filename processing:
  - Original: Чек за курс.pdf
  - Sanitized: Chek_za_kurs.pdf
  - Final: 1763388714_Chek_za_kurs.pdf
  - Storage path: course_1/module_1/lesson_21/1763388714_Chek_za_kurs.pdf
✅ Материал сохранен в БД

# 6. Проверь в UI:
Материалы урока → должно показывать "Чек за курс.pdf" ✅
```

---

### Тест 2: Video Analytics

```bash
# 1. СНАЧАЛА выполни SQL!
Открой: https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql
Скопируй содержимое: create_video_analytics_table.sql
Нажми: Run

# 2. Перезапусти Backend
cd backend
npm run dev

# 3. Открой урок с видео
http://localhost:8080/course/1/module/1/lesson/20

# 4. Нажми Play на видео

# 5. Проверь Backend Console:
POST /api/analytics/video-event
📊 Video analytics event received: {
  lesson_id: 20,
  session_id: "...",
  event_type: "play",
  position_seconds: 0
}
✅ Video analytics saved

# 6. Проверь Frontend Console (F12):
НЕ должно быть ошибок "400 Bad Request" ✅
```

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ:

### ОБЯЗАТЕЛЬНО:

#### 1️⃣ Выполнить SQL для video_analytics

```bash
# Открой Supabase SQL Editor
https://supabase.com/dashboard/project/arqhkacellqbhjhbebfh/sql

# Скопируй весь SQL из файла:
create_video_analytics_table.sql

# Нажми Run (или Ctrl+Enter)

# Проверь что таблица создана:
SELECT * FROM video_analytics LIMIT 1;
# Должно вернуть: пустая таблица (0 rows) ✅
```

#### 2️⃣ Перезапустить Backend

```powershell
# Останови все Node процессы
Get-Process node | Stop-Process -Force

# Запусти Backend
cd C:\onai-integrator-login\backend
npm run dev
```

#### 3️⃣ Перезапустить Frontend (с очисткой кэша)

```powershell
# Останови Frontend
Get-Process node | Stop-Process -Force

# Очисти кэш
cd C:\onai-integrator-login
Remove-Item -Path "node_modules\.vite" -Recurse -Force

# Запусти Frontend
npm run dev
```

---

### ОПЦИОНАЛЬНО (если будут проблемы):

#### Проверить что analytics route работает:

```bash
curl http://localhost:3000/api/analytics/video/20
# Должно вернуть: {"success":true,"events":[]}
```

#### Если таблица уже существует - удалить и пересоздать:

```sql
-- В Supabase SQL Editor
DROP TABLE IF EXISTS video_analytics CASCADE;

-- Потом выполни create_video_analytics_table.sql
```

---

## 📊 ИЗМЕНЕННЫЕ ФАЙЛЫ:

### Backend:
- ✅ `backend/src/routes/materials.ts` - транслитерация + sanitize
- ✅ `backend/src/routes/analytics.ts` - **НОВЫЙ ФАЙЛ**
- ✅ `backend/src/server.ts` - analytics route уже зарегистрирован

### SQL:
- ✅ `create_video_analytics_table.sql` - **НОВЫЙ ФАЙЛ**

### Frontend:
- ✅ Без изменений! (уже корректно использует `display_name`)

---

## 🔍 ПРОВЕРКА РЕЗУЛЬТАТА:

### Материалы:

**БД (Supabase):**
```sql
SELECT 
  filename,          -- "1763388714_Chek_za_kurs.pdf" (sanitized)
  display_name,      -- "Чек за курс.pdf" (original)
  storage_path       -- "course_1/module_1/lesson_21/1763388714_Chek_za_kurs.pdf"
FROM lesson_materials
ORDER BY created_at DESC
LIMIT 5;
```

**UI (Frontend):**
- Список материалов → "Чек за курс.pdf" ✅
- Кнопка скачать → работает ✅
- Storage → файл с транслитерированным именем ✅

---

### Analytics:

**Backend Console:**
```
POST /api/analytics/video-event
✅ 200 OK
{ success: true }
```

**Frontend Console (F12):**
```
✅ Нет ошибок "400 Bad Request"
✅ Нет ошибок "Error logging video event"
```

**БД (Supabase):**
```sql
SELECT * FROM video_analytics 
ORDER BY created_at DESC 
LIMIT 10;
```
Должны появляться записи при просмотре видео ✅

---

## 🚀 СЛЕДУЮЩИЕ ШАГИ:

### 1️⃣ Выполни SQL (create_video_analytics_table.sql)

### 2️⃣ Перезапусти Backend + Frontend

### 3️⃣ Протестируй:
- Загрузи материал с русским названием
- Проверь что отображается оригинальное название
- Открой видео
- Нажми Play
- Проверь что нет ошибок в консоли

### 4️⃣ Git commit + push:
```bash
cd C:\onai-integrator-login
git add .
git commit -m "✅ Fix: Транслитерация файлов + Video analytics API

- Добавлена транслитерация кириллицы в filename
- Оригинальное название сохраняется в display_name
- Создан analytics route для video events
- Добавлена таблица video_analytics"
git push origin main
```

### 5️⃣ Деплой на DigitalOcean:
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main && cd backend && npm install --production && npm run build && pm2 restart onai-backend"
```

**НЕ ЗАБУДЬ** выполнить SQL на production Supabase!

---

## 📤 ПРИШЛИ МНЕ РЕЗУЛЬТАТЫ:

```
=== ТЕСТИРОВАНИЕ ===

1. SQL для video_analytics выполнен:
   ✅ YES / ❌ NO

2. Backend перезапущен:
   ✅ YES / ❌ NO

3. Материалы с кириллицей:
   Загрузил файл: "Чек.pdf"
   Backend Console: [скопируй вывод "Filename processing"]
   UI показывает: "Чек.pdf" ✅ / кракозябры ❌

4. Video Analytics:
   Нажал Play на видео
   Backend Console: ✅ 200 OK / ❌ Error
   Frontend Console: ✅ Нет ошибок / ❌ Есть ошибки

5. Git push:
   ✅ DONE / ❌ NOT YET

6. Деплой:
   ✅ DONE / ❌ NOT YET
```

---

# 🔥 ВЫПОЛНЯЙ SQL И ПЕРЕЗАПУСКАЙ СЕРВЕРЫ!

**После этого всё заработает!** 🚀

