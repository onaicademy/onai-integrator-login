# ✅ PDF STORAGE - ПОЛНАЯ РЕАЛИЗАЦИЯ

**Дата:** 14 ноября 2025  
**Статус:** Backend реализован, требуется выполнение SQL + тестирование

---

## 🎯 НОВАЯ АРХИТЕКТУРА (Production-Ready)

```
User Upload PDF
    ↓
Frontend (FormData: file + userId + threadId)
    ↓
Backend (/api/files/process)
    ↓
1. Multer → req.file.buffer
2. Extract Text (pdf-parse / mammoth)
3. Upload to Supabase Storage
4. Save Metadata to Database (file_uploads table)
5. Return { fileUrl, extractedText, fileId }
```

---

## ✅ ЧТО РЕАЛИЗОВАНО (Backend)

### 1. SQL Script
- **Файл:** `supabase_create_file_storage.sql`
- **Создаёт:**
  - Таблицу `file_uploads` (metadata файлов)
  - RLS политики для `file_uploads`
  - Storage RLS политики для bucket `user-files`

### 2. Services
- **`backend/src/services/supabaseStorageService.ts`**
  - `uploadToStorage()` - загрузка в Storage
  - `getSignedUrl()` - получение signed URL
  - `deleteFromStorage()` - удаление файла
  - `fileExists()` - проверка существования

- **`backend/src/services/supabaseDatabaseService.ts`**
  - `saveFileMetadata()` - сохранение в БД
  - `getUserFiles()` - получение файлов пользователя
  - `getThreadFiles()` - получение файлов thread
  - `updateFileStatus()` - обновление статуса
  - `deleteFileMetadata()` - удаление metadata
  - `getUserFileStats()` - статистика пользователя

### 3. Middleware
- **`backend/src/middleware/multer.ts`**
  - Multer config (memoryStorage, 20MB limit)
  - File type validation (PDF, DOCX, PNG, JPG, WEBP)
  - Error handling
  - Logging

### 4. Controller
- **`backend/src/controllers/fileController.ts`**
  - **Обновлён:** Новая архитектура с Storage + Database
  - Извлечение текста из PDF/DOCX
  - Анализ изображений через Vision API
  - Загрузка в Storage
  - Сохранение metadata
  - Error handling с записью в БД

### 5. Routes
- **`backend/src/routes/files.ts`**
  - **Обновлён:** Использует новый Multer middleware
  - Middleware chain: Auth → Multer → Logging → Error Handler → Controller

---

## 🚀 ЧТО НУЖНО СДЕЛАТЬ (User Action Required)

### ШАГ 1: Создать Supabase Storage Bucket

1. Открой **Supabase Dashboard** → **Storage**
2. Click **"Create a new bucket"**
3. Настройки:
   - **Bucket name:** `user-files`
   - **Public:** ❌ **false** (приватный bucket)
   - **File size limit:** `20 MB`
   - **Allowed MIME types:**
     - `application/pdf`
     - `image/png`
     - `image/jpeg`
     - `image/webp`
     - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

4. Click **"Create bucket"**

---

### ШАГ 2: Выполнить SQL Script

1. Открой **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Скопируй содержимое файла **`supabase_create_file_storage.sql`**
4. Вставь в редактор
5. Click **"Run"** (или нажми `Ctrl+Enter`)

**Ожидаемый результат:**
```
✅ SQL скрипт выполнен успешно! Теперь создай bucket user-files в Supabase Dashboard.
```

**Проверка:**
- Открой **Table Editor** → найди таблицу `file_uploads` ✅
- Открой **Storage** → найди bucket `user-files` ✅

---

### ШАГ 3: Обновить Frontend

**Файл:** `src/lib/openai-assistant.ts` (функция `processFile`)

**Было:**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('userQuestion', userQuestion);
```

**Стало:**
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('userId', userId); // ✅ Добавить userId!
formData.append('threadId', threadId || ''); // ✅ Добавить threadId!
formData.append('userQuestion', userQuestion || '');
```

**Также обновить обработку ответа:**
```typescript
const response = await api.post('/api/files/process', formData);

// Теперь в response есть:
// - response.file.fileUrl (URL в Supabase Storage)
// - response.file.extractedText (текст из PDF/DOCX)
// - response.file.fileId (ID записи в БД)
```

---

### ШАГ 4: Перезапустить Backend

```bash
cd backend
npm run dev
```

**Ожидаемый вывод:**
```
✅ Supabase configured with SERVICE_ROLE key
✅ Server running on port 3000
```

---

### ШАГ 5: Протестировать

1. Открой `http://localhost:8080`
2. Перейди в **AI-Куратор**
3. Прикрепи **PDF файл** (маленький, простой, без пароля)
4. Отправь сообщение

**Ожидаемые логи Backend:**
```
[FileController] 🔍 Обработка файла (НОВАЯ АРХИТЕКТУРА)...
[FileController] 📄 Файл получен: { filename: 'test.pdf', mimetype: 'application/pdf', size: 54257, userId: '...' }
[FileController] 📄 Извлекаем текст из PDF...
[FileProcessing] ✅ Извлечено 1234 символов из PDF
[FileController] 📤 Загружаем файл в Supabase Storage...
[StorageService] ✅ Файл загружен: user-files/...
[FileController] 💾 Сохраняем metadata в БД...
[DatabaseService] ✅ Metadata сохранена, ID: 1
[FileController] ✅ Обработка завершена успешно
```

**Проверка в Supabase:**
- **Storage** → `user-files` → должен появиться файл с path `{userId}/{timestamp}-{filename}.pdf` ✅
- **Table Editor** → `file_uploads` → должна появиться запись с `processing_status = 'completed'` ✅

---

## 📊 СТРУКТУРА ТАБЛИЦЫ `file_uploads`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | BIGINT | Primary Key (auto-increment) |
| `user_id` | UUID | FK → auth.users(id) |
| `thread_id` | TEXT | OpenAI thread ID (optional) |
| `filename` | TEXT | Оригинальное имя файла |
| `file_path` | TEXT | Path в Storage: `{userId}/{timestamp}-{filename}` |
| `file_url` | TEXT | Public/Signed URL |
| `file_size` | BIGINT | Размер в байтах |
| `file_type` | TEXT | MIME type (application/pdf, image/png, etc.) |
| `extracted_text` | TEXT | Текст извлечённый из PDF/DOCX |
| `processing_status` | TEXT | `pending` / `completed` / `failed` |
| `error_message` | TEXT | Сообщение об ошибке (если failed) |
| `created_at` | TIMESTAMP | Дата создания |
| `updated_at` | TIMESTAMP | Дата обновления |

---

## 🔧 TROUBLESHOOTING

### Проблема 1: `Bucket 'user-files' not found`
**Причина:** Bucket не создан в Supabase Dashboard  
**Решение:** Выполни **ШАГ 1** (создание bucket)

### Проблема 2: `Table 'file_uploads' does not exist`
**Причина:** SQL скрипт не выполнен  
**Решение:** Выполни **ШАГ 2** (SQL Editor → Run script)

### Проблема 3: `permission denied for table file_uploads`
**Причина:** RLS политики не созданы или SERVICE_ROLE_KEY неверный  
**Решение:**  
- Проверь `backend/.env` → `SUPABASE_SERVICE_ROLE_KEY` (должен быть SERVICE ROLE, не ANON!)
- Перезапусти Backend
- Проверь RLS политики в Supabase (ШАГ 2)

### Проблема 4: `userId is required`
**Причина:** Frontend не передаёт userId в FormData  
**Решение:** Выполни **ШАГ 3** (обновление Frontend)

### Проблема 5: `pdf-parse error: Failed to parse PDF`
**Причина:** PDF файл защищён паролем / повреждён / не содержит текст  
**Решение:** Попробуй другой PDF файл (простой, без защиты)

---

## 📋 CHECKLIST

- [ ] ШАГ 1: Bucket `user-files` создан в Supabase
- [ ] ШАГ 2: SQL скрипт выполнен (таблица `file_uploads` создана)
- [ ] ШАГ 3: Frontend обновлён (передаём userId и threadId)
- [ ] ШАГ 4: Backend перезапущен
- [ ] ШАГ 5: Тест загрузки PDF выполнен
- [ ] Проверка: Файл появился в Storage
- [ ] Проверка: Metadata сохранилась в БД

---

## 🎉 ГОТОВО!

После выполнения всех шагов:
- ✅ PDF файлы загружаются в Supabase Storage
- ✅ Metadata сохраняется в БД
- ✅ Текст извлекается корректно
- ✅ RLS работает (каждый пользователь видит только свои файлы)
- ✅ Production-ready архитектура

**Теперь файлы НЕ теряются и доступны для скачивания через `fileUrl`!** 🔥

