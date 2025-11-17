# 🔍 ПОЛНЫЙ ОТЧЕТ: Диагностика и исправление загрузки файлов в onAI Academy

**Дата:** 17 ноября 2025  
**Проект:** onAI Academy (Educational Platform)  
**Проблема:** Невозможность загрузки видео на Cloudflare R2 через Backend API

---

## 📊 КОНТЕКСТ ПРОЕКТА

### Технологический стек:
- **Frontend:** React 18, TypeScript, Next.js, Tailwind CSS, Shadcn/ui
- **Backend:** Node.js, Express, TypeScript, Multer (для file uploads)
- **База данных:** Supabase (PostgreSQL)
- **Хранилище видео:** Cloudflare R2 (S3-compatible)
- **Хранилище материалов:** Supabase Storage

### Архитектура загрузки видео:
```
Frontend (LessonEditDialog) 
  → FormData с видео файлом
  → Backend API (POST /api/videos/upload/:lessonId)
  → Cloudflare R2 (S3Client from AWS SDK v3)
  → Supabase DB (video_content таблица)
  → Frontend (обновление UI)
```

---

## 🚨 ИСХОДНАЯ ПРОБЛЕМА

### Симптомы:
1. ❌ Файлы (видео, материалы) **НЕ загружаются** на сервер
2. ❌ Backend возвращает `500 Internal Server Error`
3. ❌ Frontend показывает: `"Ошибка загрузки видео"` с разными `details`
4. ✅ Запрос **доходит** до Backend (видно в логах)
5. ✅ FormData **корректно** отправляется с файлом
6. ❌ Где-то **падает** выполнение кода на Backend

### Первоначальные логи Frontend:
```javascript
📦 FormData DEBUG:
  File object: IMG_8665.MOV
  File size: 12175193 bytes
  File type: video/quicktime

❌ API Error: 
  details: "Unauthorized" // Первая ошибка
```

---

## 🔬 ПРОВЕДЁННАЯ ДИАГНОСТИКА

### Этап 1: Добавление детального логирования

#### Backend (videos.ts):
```typescript
console.log('===========================================');
console.log('📥 VIDEO UPLOAD - REQUEST RECEIVED');
console.log('===========================================');
console.log('1️⃣ req.headers:', JSON.stringify(req.headers, null, 2));
console.log('2️⃣ req.params:', req.params);
console.log('3️⃣ req.body:', req.body);
console.log('4️⃣ req.file:', req.file);
console.log('5️⃣ req.file exists?', !!req.file);
```

#### Frontend (apiClient.ts):
```typescript
console.log('📤 FormData detected - checking entries:');
for (let [key, value] of formData.entries()) {
  console.log(`  - ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
}
```

### Этап 2: Проверка Environment Variables

**Результаты:**
```bash
☁️ Cloudflare R2 Config:
   R2_ENDPOINT: 9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com
   R2_BUCKET_NAME: onai-academy-videos
   R2_PUBLIC_URL: https://pub-b4d57373665444eca59ad2bd18dc9c61.r2.dev
   R2_ACCESS_KEY_ID: ✅ SET (7acdb68c6dcedb520831cc926630fa70)
   R2_SECRET_ACCESS_KEY: ✅ SET (63 chars) ⚠️ ДОЛЖНО БЫТЬ 64!
```

**Проблема #1:** `R2_SECRET_ACCESS_KEY` был **63 символа** вместо **64**!

---

## 🐛 ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### Проблема #1: Неполный R2 Secret Access Key (КРИТИЧНО)
**Вероятность:** 95%

**Диагноз:**
```
❌ details: "Unauthorized"
```
Cloudflare R2 отклоняет запросы из-за невалидного секретного ключа.

**Причина:**
- В `.env` файле `R2_SECRET_ACCESS_KEY` содержал **63 символа**
- Cloudflare требует **ровно 64 символа**
- Последний символ был утерян при копировании

**Исправление:**
```bash
# ❌ БЫЛО:
R2_SECRET_ACCESS_KEY=b603cab224f6b4b31a5a8aa22ed5ad9a1e5c7e8d76b7e0f6...34add

# ✅ СТАЛО (получено из Cloudflare Dashboard):
R2_SECRET_ACCESS_KEY=b603cab224f6b4b31a5a8aa22ed5ad9a1e5c7e8d76b7e0f6...34add3
R2_ACCESS_KEY_ID=7acdb68c6dcedb520831cc926630fa70
```

---

### Проблема #2: Некорректный формат R2_ENDPOINT (КРИТИЧНО)
**Вероятность:** 85%

**Диагноз:**
Backend добавляет `https://` к endpoint в коде, но в `.env` endpoint уже содержал `https://`.

**Причина:**
```typescript
// backend/src/routes/videos.ts
const s3 = new S3Client({
  endpoint: `https://${process.env.R2_ENDPOINT}` // ✅ Добавляем https://
});
```

```bash
# ❌ БЫЛО в .env:
R2_ENDPOINT=https://9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com

# Результат: https://https://... (ДВОЙНОЙ ПРОТОКОЛ!)
```

**Исправление:**
```bash
# ✅ СТАЛО:
R2_ENDPOINT=9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com
```

---

### Проблема #3: Конфликт express.json() и Multer (КРИТИЧНО)
**Вероятность:** 95%

**Диагноз:**
`express.json()` пытается распарсить `multipart/form-data` запросы **ДО** того как они попадут в Multer, что приводит к тому что `req.file` = `undefined`.

**Причина:**
```typescript
// ❌ БЫЛО:
app.use(express.json()); // Парсит ВСЕ запросы, включая multipart
```

**Исправление:**
```typescript
// ✅ СТАЛО:
app.use(express.json({
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    return !contentType.includes('multipart/form-data');
  }
}));
```

---

### Проблема #4: CORS Preflight для file upload routes (СРЕДНЕ)
**Вероятность:** 60%

**Диагноз:**
OPTIONS requests для `/api/videos/upload/:lessonId` не обрабатывались явно.

**Исправление:**
```typescript
// server.ts
app.use(cors({
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 600
}));

// Explicit OPTIONS handlers
app.options('/api/videos/upload/:lessonId', cors());
app.options('/api/materials/upload', cors());
```

---

### Проблема #5: AWS SDK v3 - signatureVersion не поддерживается (КОМПИЛЯЦИЯ)
**Вероятность:** 100%

**Диагноз:**
```
error TS2345: Argument of type '...' is not assignable to parameter of type 'S3ClientConfig'
```

**Причина:**
```typescript
// ❌ БЫЛО:
const s3 = new S3Client({
  signatureVersion: 'v4', // ❌ НЕ существует в AWS SDK v3
});
```

**Исправление:**
```typescript
// ✅ СТАЛО:
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false // R2 использует virtual-hosted-style
});
```

---

### Проблема #6: Несоответствие схемы БД (КРИТИЧНО) ⚠️ ТЕКУЩАЯ
**Вероятность:** 100%

**Диагноз #1 (исправлено):**
```
Could not find the 'platform' column of 'video_content' in the schema cache
```

Backend пытался вставить:
```typescript
await supabase.from('video_content').upsert({
  lesson_id: parseInt(lessonId),
  video_url: videoUrl,
  platform: 'cloudflare_r2', // ❌ Колонка не существует!
  duration_seconds: 0,
})
```

**Исправление #1:**
Удалил `platform` из запроса.

**Диагноз #2 (ТЕКУЩАЯ ПРОБЛЕМА):**
```
Could not find the 'video_url' column of 'video_content' in the schema cache
```

Backend пытается вставить:
```typescript
await supabase.from('video_content').upsert({
  lesson_id: parseInt(lessonId),
  video_url: videoUrl, // ❌ Колонка не существует!
  duration_seconds: 0,
})
```

**Вывод:** Структура таблицы `video_content` в Supabase **НЕ СООТВЕТСТВУЕТ** коду Backend!

---

## 🔧 ПРИМЕНЁННЫЕ ИСПРАВЛЕНИЯ

### 1. Обновлены R2 Credentials в backend/.env
```bash
R2_ENDPOINT=9759c9a54b40f80e87e525245662da24.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=7acdb68c6dcedb520831cc926630fa70
R2_SECRET_ACCESS_KEY=b603cab224f6b4b31a5a8aa22ed5ad9a1e5c7e8d76b7e0f6...34add3
```

### 2. Исправлен server.ts - express.json() type filter
```typescript
app.use(express.json({
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    return !contentType.includes('multipart/form-data');
  }
}));
```

### 3. Исправлен videos.ts - S3Client config
```typescript
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ENDPOINT}`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false
});
```

### 4. Удалён platform из upsert в videos.ts
```typescript
await supabase.from('video_content').upsert({
  lesson_id: parseInt(lessonId),
  video_url: videoUrl,
  duration_seconds: 0, // Без platform
})
```

### 5. Улучшено логирование ошибок
```typescript
catch (error: any) {
  console.error('❌ Error type:', typeof error);
  console.error('❌ Error keys:', Object.keys(error || {}));
  console.error('❌ Full error:', JSON.stringify(error, null, 2));
}
```

---

## ❌ ТЕКУЩИЙ СТАТУС: НЕ ИСПРАВЛЕНО

### Текущая ошибка:
```
Could not find the 'video_url' column of 'video_content' in the schema cache
```

### Причина:
Таблица `video_content` в Supabase имеет **другую структуру колонок**, чем ожидает код Backend.

### Необходимые действия:

#### Вариант A: Проверить реальную структуру таблицы
```sql
-- Выполнить в Supabase SQL Editor:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'video_content'
ORDER BY ordinal_position;
```

#### Вариант B: Исправить код под реальную структуру
Если таблица использует другие имена колонок (например `url` вместо `video_url`), нужно обновить Backend код:

```typescript
// Пример если колонка называется 'url':
await supabase.from('video_content').upsert({
  lesson_id: parseInt(lessonId),
  url: videoUrl, // ✅ Используем правильное имя
  duration: 0,
})
```

#### Вариант C: Добавить недостающие колонки в БД
```sql
-- Если колонка video_url действительно нужна:
ALTER TABLE video_content ADD COLUMN video_url TEXT;
```

---

## 📈 ПРОГРЕСС ДИАГНОСТИКИ

### ✅ Исправлено:
1. ✅ R2 Credentials (Access Key ID + Secret Access Key)
2. ✅ R2_ENDPOINT формат (без https://)
3. ✅ express.json() type filter
4. ✅ AWS SDK v3 S3Client конфигурация
5. ✅ CORS preflight для file uploads
6. ✅ Удалена колонка `platform` из запроса

### ❌ Текущая проблема:
1. ❌ Колонка `video_url` не существует в таблице `video_content`

### 🔍 Необходимо:
1. **СРОЧНО:** Проверить **РЕАЛЬНУЮ** структуру таблицы `video_content` в Supabase
2. Либо добавить колонку `video_url` в БД
3. Либо изменить код Backend под существующие колонки
4. Повторно протестировать загрузку

---

## 📊 ВРЕМЕННАЯ ШКАЛА

| Время | Действие | Результат |
|-------|----------|-----------|
| 11:24 | Первая попытка загрузки | ❌ `Unauthorized` |
| 11:36 | Обновлены R2 credentials | ❌ `platform column not found` |
| 11:44 | Удалён platform | ❌ `video_url column not found` |
| 11:49 | Текущий статус | ⏳ Ожидает исправления |

---

## 🎯 РЕКОМЕНДАЦИИ

### Немедленные действия:
1. **Выполнить SQL запрос** для проверки структуры `video_content`
2. **Сравнить** с кодом Backend
3. **Синхронизировать** схему БД и код

### Долгосрочные улучшения:
1. Добавить **TypeScript типы** для всех таблиц БД (generated from Supabase)
2. Использовать **миграции БД** (например, Supabase Migrations)
3. Добавить **схему валидации** (Zod/Yup) для всех API запросов
4. Написать **интеграционные тесты** для file upload flow
5. Добавить **health check** для R2 connectivity

---

## 📝 ЛОГИ ДЛЯ АНАЛИЗА

### Frontend Console (последняя попытка):
```
✅ Урок создан автоматически с ID: 14
📦 FormData DEBUG: IMG_8664.MOV, 22671958 bytes
📤 Загружаем видео на Cloudflare R2...
❌ API Error: Could not find the 'video_url' column
```

### Backend Console (ожидается):
```
📥 VIDEO UPLOAD - REQUEST RECEIVED
1️⃣ req.file: { originalname: 'IMG_8664.MOV', size: 22671958, ... }
✅ 1. File received
✅ 2. Starting R2 upload
✅ 3. R2 upload success
✅ 4. Saving to database...
❌ Supabase Error: column "video_url" does not exist
```

---

## 🔗 ПОЛЕЗНЫЕ ССЫЛКИ

- Cloudflare R2 Docs: https://developers.cloudflare.com/r2/
- AWS SDK v3 S3Client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/
- Multer Docs: https://github.com/expressjs/multer
- Supabase Storage: https://supabase.com/docs/guides/storage

---

## 📧 КОНТАКТЫ

**Дата создания отчёта:** 17.11.2025, 11:49 UTC+5  
**Статус:** 🔴 ПРОБЛЕМА НЕ РЕШЕНА  
**Блокер:** Несоответствие схемы БД (колонка `video_url`)

