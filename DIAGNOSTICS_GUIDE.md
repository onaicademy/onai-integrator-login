# 🔍 Руководство по диагностике загрузки файлов

## ✅ Что было добавлено

Во все критические точки системы добавлено **детальное логирование** для выявления проблем с загрузкой видео и материалов.

---

## 📋 Список изменений

### Backend:
1. ✅ **backend/src/routes/videos.ts** - детальные логи загрузки видео
2. ✅ **backend/src/routes/materials.ts** - детальные логи загрузки материалов
3. ✅ **backend/src/server.ts** - проверка Environment Variables

### Frontend:
4. ✅ **src/utils/apiClient.ts** - детальные логи API запросов
5. ✅ **src/components/admin/LessonEditDialog.tsx** - логи состояния videoUrl
6. ✅ **src/components/admin/MaterialsManager.tsx** - логи состояния materials

---

## 🚀 Как запустить диагностику

### 1. Запустите Backend с логами

```bash
cd backend
npm run dev
```

**Что проверить при старте:**
```
🔍 Environment variables loaded:
   SUPABASE_URL: ✅ SET
   SUPABASE_SERVICE_ROLE_KEY: ✅ SET
   OPENAI_API_KEY: ✅ SET
   FRONTEND_URL: http://localhost:8080 (default)

☁️ Cloudflare R2 Config:
   R2_ENDPOINT: ✅ SET
   R2_BUCKET_NAME: ✅ SET
   R2_PUBLIC_URL: ✅ SET
   R2_ACCESS_KEY_ID: ✅ SET
   R2_SECRET_ACCESS_KEY: ✅ SET
```

❌ **Если какая-то переменная NOT SET** - проблема в `.env` файле!

---

### 2. Запустите Frontend с логами

```bash
npm run dev
```

---

### 3. Откройте Chrome DevTools

1. **F12** → вкладка **Console**
2. **F12** → вкладка **Network**

---

## 🧪 Тест 1: Загрузка ВИДЕО

### Шаги:
1. Открой http://localhost:8080/course/1/module/1
2. Нажми "Добавить урок"
3. Заполни название: "Тест видео"
4. Перейди на таб "Видео"
5. Выбери MP4 файл (до 100MB для быстрого теста)
6. Нажми "Загрузить"

### 📝 Что проверить в FRONTEND Console:

```
================================================================================
🌐 API Request: POST http://localhost:3000/api/videos/upload/6
📦 Body type: FormData
📋 Headers: { ... }
📤 FormData detected - checking entries:
  - video: File(test.mp4, 5242880 bytes, video/mp4)
================================================================================
```

**✅ ВАЖНО:** Должна быть строка с File(...)! Если нет - файл НЕ отправляется!

---

### 📝 Что проверить в BACKEND Console:

```
================================================================================
=== VIDEO UPLOAD REQUEST ===
Headers: {
  "content-type": "multipart/form-data; boundary=----WebKitFormBoundary...",
  ...
}
Body: {}
File: {
  fieldname: 'video',
  originalname: 'test.mp4',
  encoding: '7bit',
  mimetype: 'video/mp4',
  size: 5242880,
  bufferLength: 5242880
}
Params: { lessonId: '6' }
================================================================================
✅ 1. File received: test.mp4
📹 Загрузка видео для урока: 6
📦 Размер файла: 5.00 MB
✅ 2. Starting R2 upload...
☁️ Bucket: onai-academy-videos
☁️ Key: lessons/6/video_1699999999999.mp4
☁️ Endpoint: https://<account-id>.r2.cloudflarestorage.com
✅ 3. R2 upload success: { ... }
🔗 URL видео: https://videos.onai.academy/lessons/6/video_1699999999999.mp4
✅ 4. Saving to database...
✅ 5. DB save success: { id: 1, lesson_id: 6, video_url: '...', ... }
✅ Видео успешно загружено
✅ Sending response: { video: { ... } }
================================================================================
```

### ❌ Возможные ошибки:

#### Ошибка 1: `File: 'NO FILE'`
**Причина:** Multer не получил файл
**Решение:** 
- Проверь `enctype="multipart/form-data"` в форме
- Проверь `name="video"` у input
- Проверь middleware порядок в server.ts

#### Ошибка 2: `R2_ENDPOINT: ❌ NOT SET`
**Причина:** Environment variables не загружены
**Решение:**
- Проверь `backend/.env` файл
- Убедись что все R2 переменные заполнены

#### Ошибка 3: `Error at step 3: R2 upload`
**Причина:** Проблема с Cloudflare R2
**Решение:**
- Проверь R2 credentials
- Проверь bucket name
- Проверь в R2 dashboard - создан ли bucket?

#### Ошибка 4: `Error at step 5: DB save`
**Причина:** Ошибка Supabase
**Решение:**
- Проверь таблицу `video_content` в Supabase
- Проверь RLS policies
- Проверь SUPABASE_SERVICE_ROLE_KEY

---

## 🧪 Тест 2: Загрузка МАТЕРИАЛОВ

### Шаги:
1. Открой урок
2. Перейди на таб "Материалы"
3. Добавь 2-3 файла (PDF, DOCX)
4. Измени названия
5. Нажми "Загрузить все материалы"

### 📝 Что проверить в FRONTEND Console:

```
================================================================================
🌐 API Request: POST http://localhost:3000/api/materials/upload
📦 Body type: FormData
📤 FormData detected - checking entries:
  - file: File(document.pdf, 1048576 bytes, application/pdf)
  - lessonId: 6
  - display_name: Моя книга
================================================================================
```

---

### 📝 Что проверить в BACKEND Console:

```
================================================================================
=== MATERIAL UPLOAD REQUEST ===
Headers: { ... }
Body: { lessonId: '6', display_name: 'Моя книга' }
File: {
  fieldname: 'file',
  originalname: 'document.pdf',
  mimetype: 'application/pdf',
  size: 1048576,
  bufferLength: 1048576
}
================================================================================
✅ 1. File received: document.pdf
📥 Загрузка материала:
  - Файл: document.pdf
  - Размер: 1048576 bytes
  - Lesson ID: 6
  - Display name: Моя книга
📂 Storage path: course_1/module_1/lesson_6/1699999999999_document.pdf
✅ 2. Starting Supabase Storage upload...
✅ 3. Storage upload success: { ... }
✅ Файл загружен в Storage
✅ 4. Saving to database...
✅ 5. DB save success: { id: 1, lesson_id: 6, ... }
🔗 Public URL: https://...supabase.co/storage/v1/object/public/...
✅ Материал сохранен в БД: { ... }
✅ Sending response: { material: { ... } }
================================================================================
```

---

## 🔍 Критические вопросы для диагностики

### 1️⃣ Доходит ли файл до backend?
**Где искать:** Backend Console → `File: { fieldname: ...` или `'NO FILE'`

**Если NO FILE:**
- Проблема на уровне NETWORK или FRONTEND
- Проверь Chrome DevTools → Network → Request Payload
- Проверь apiClient.ts → FormData entries

**Если есть File:**
- ✅ Frontend отправляет правильно
- Проблема дальше в pipeline

---

### 2️⃣ Загружается ли файл в Storage (R2/Supabase)?
**Где искать:** Backend Console → `✅ 3. R2 upload success` или ошибка

**Если ошибка:**
- Проверь Environment Variables
- Проверь R2/Supabase Dashboard - существует ли bucket?
- Проверь credentials

**Если успех:**
- ✅ Файл на Storage
- Проблема в БД или URL

---

### 3️⃣ Сохраняется ли запись в БД?
**Где искать:** Backend Console → `✅ 5. DB save success` или ошибка

**Если ошибка:**
- Проверь Supabase RLS policies
- Проверь структуру таблицы
- Проверь SUPABASE_SERVICE_ROLE_KEY

**Если успех:**
- ✅ Все на backend работает
- Проблема в Frontend State

---

### 4️⃣ Обновляется ли состояние на Frontend?
**Где искать:** Frontend Console → `🔍 Video URL state updated to:`

**Если URL пустой:**
- Проверь структуру ответа backend: `res.data.video.video_url`
- Проверь в Frontend: `🔍 Backend response structure`

**Если URL есть, но UI не обновляется:**
- Проблема с React state
- Проверь `setVideoUrl()` вызов
- Проверь компонент рендеринг

---

### 5️⃣ Какой URL приходит с Backend?
**Где искать:** Backend Console → `🔗 URL видео:` или `🔗 Public URL:`

**Для видео:**
```
https://videos.onai.academy/lessons/6/video_1699999999999.mp4
```

**Для материалов:**
```
https://arqhkacellqbhjhbebfh.supabase.co/storage/v1/object/public/lesson-materials/...
```

**Если URL некорректный:**
- Проверь `R2_PUBLIC_URL` в `.env`
- Проверь Supabase Storage settings

---

## 📊 Проверка в БД

### После успешной загрузки ВИДЕО:

```sql
SELECT * FROM video_content ORDER BY created_at DESC LIMIT 1;
```

**Ожидаемый результат:**
```
id | lesson_id | video_url                                      | platform       | duration_seconds
---|-----------|------------------------------------------------|----------------|------------------
1  | 6         | https://videos.onai.academy/lessons/6/...mp4  | cloudflare_r2  | 0
```

---

### После успешной загрузки МАТЕРИАЛА:

```sql
SELECT * FROM lesson_materials ORDER BY created_at DESC LIMIT 1;
```

**Ожидаемый результат:**
```
id | lesson_id | filename      | display_name | storage_path                  | file_size_bytes
---|-----------|---------------|--------------|-------------------------------|----------------
1  | 6         | document.pdf  | Моя книга    | course_1/module_1/lesson_6/... | 1048576
```

---

## ☁️ Проверка в Storage

### Cloudflare R2 (Видео):
1. Зайди в Cloudflare Dashboard
2. R2 → Buckets → `onai-academy-videos`
3. Проверь папку `lessons/{lessonId}/`
4. Должен быть файл `video_{timestamp}.mp4`

### Supabase Storage (Материалы):
1. Зайди в Supabase Dashboard
2. Storage → `lesson-materials`
3. Проверь папку `course_{id}/module_{id}/lesson_{id}/`
4. Должен быть файл с timestamp

---

## 🌐 Проверка Network (Chrome DevTools)

### Откройте:
1. **F12** → **Network**
2. Фильтр: **XHR/Fetch**
3. Загрузите файл
4. Кликните на запрос **POST /api/videos/upload/6**

### Проверьте вкладки:

#### Headers:
```
Request URL: http://localhost:3000/api/videos/upload/6
Request Method: POST
Status Code: 200 OK
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...
```

#### Payload:
```
------WebKitFormBoundary...
Content-Disposition: form-data; name="video"; filename="test.mp4"
Content-Type: video/mp4

<binary data>
------WebKitFormBoundary...
```

**❗ ВАЖНО:** Должен быть `<binary data>` или показана длина файла!

#### Response:
```json
{
  "video": {
    "id": 1,
    "lesson_id": 6,
    "video_url": "https://videos.onai.academy/lessons/6/video_1699999999999.mp4",
    "platform": "cloudflare_r2",
    "duration_seconds": 0
  }
}
```

---

## 🔧 Быстрая проверка всех компонентов

### Backend Health Check:
```bash
curl http://localhost:3000/api/health
```

**Ожидается:**
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Backend Environment Check:
```bash
curl http://localhost:3000/api/debug/env
```

**Ожидается:**
```json
{
  "SUPABASE_URL": "SET",
  "SUPABASE_SERVICE_ROLE_KEY": "SET",
  "SUPABASE_SERVICE_ROLE_KEY_LENGTH": 257,
  ...
}
```

---

## 📝 Чек-лист диагностики

Проходи по порядку:

- [ ] 1. Backend запущен (`npm run dev` в backend/)
- [ ] 2. Frontend запущен (`npm run dev` в корне)
- [ ] 3. Chrome DevTools открыты (F12)
- [ ] 4. Environment Variables загружены (проверь Backend Console)
- [ ] 5. R2 Config показывает ✅ SET (проверь Backend Console)
- [ ] 6. Загрузил файл и проверил Frontend Console
- [ ] 7. Видел FormData entries в Frontend Console
- [ ] 8. Видел `File: { ... }` в Backend Console
- [ ] 9. Видел `✅ 1. File received` в Backend Console
- [ ] 10. Видел `✅ 3. R2/Storage upload success` в Backend Console
- [ ] 11. Видел `✅ 5. DB save success` в Backend Console
- [ ] 12. Видел `🔗 URL видео/Public URL` в Backend Console
- [ ] 13. Видел `✅ Sending response` в Backend Console
- [ ] 14. Видел `✅ API Response 200` в Frontend Console
- [ ] 15. Проверил БД - запись есть
- [ ] 16. Проверил Storage - файл есть
- [ ] 17. URL правильный и доступный

---

## ❌ Наиболее вероятные проблемы

### Проблема 1: Files not reaching backend
**Симптом:** `File: 'NO FILE'` в Backend Console
**Причина:** Multer не распознает multipart/form-data
**Решение:** Проверь middleware порядок в server.ts

### Проблема 2: R2 upload fails
**Симптом:** `Error at step 3: R2 upload`
**Причина:** Неверные credentials или bucket не существует
**Решение:** Проверь .env и R2 dashboard

### Проблема 3: URL is undefined on frontend
**Симптом:** `🔍 Extracted video URL: undefined`
**Причина:** Неверная структура ответа
**Решение:** Проверь `res.data.video.video_url` vs `res.video.video_url`

### Проблема 4: State updates but UI doesn't
**Симптом:** URL есть в state, но видео не показывается
**Причина:** React не перерендеривается
**Решение:** Проверь dependencies в useEffect, проверь key prop

### Проблема 5: CORS error
**Симптом:** `CORS policy: No 'Access-Control-Allow-Origin' header`
**Причина:** Backend CORS не настроен для localhost:8080
**Решение:** Проверь `cors({ origin: 'http://localhost:8080' })` в server.ts

---

## 🎯 Итоговый workflow диагностики

```
1. Запусти Backend → проверь Environment Variables
2. Запусти Frontend → открой DevTools
3. Загрузи файл
4. Проверь Frontend Console → FormData entries
5. Проверь Backend Console → File received?
   ❌ NO → проблема в Network/Multer
   ✅ YES → продолжи
6. Проверь Backend Console → R2/Storage success?
   ❌ NO → проблема в Storage
   ✅ YES → продолжи
7. Проверь Backend Console → DB save success?
   ❌ NO → проблема в БД/RLS
   ✅ YES → продолжи
8. Проверь Frontend Console → API Response 200?
   ❌ NO → проблема в Backend response
   ✅ YES → продолжи
9. Проверь Frontend Console → URL extracted?
   ❌ NO → проблема в response structure
   ✅ YES → продолжи
10. Проверь UI → файл отображается?
    ❌ NO → проблема в React state/render
    ✅ YES → ВСЁ РАБОТАЕТ! 🎉
```

---

## 📞 Что сообщить после диагностики

После прохождения диагностики скопируй и отправь:

```
=== РЕЗУЛЬТАТЫ ДИАГНОСТИКИ ===

Backend Environment:
- SUPABASE_URL: [✅ SET / ❌ NOT SET]
- R2_ENDPOINT: [✅ SET / ❌ NOT SET]
- R2_PUBLIC_URL: [✅ SET / ❌ NOT SET]

Файл загрузки: [test.mp4 / document.pdf / ...]
Размер: [5MB / ...]

Frontend Console:
- FormData entries видны: [✅ YES / ❌ NO]
- Файл в FormData: [✅ YES / ❌ NO]

Backend Console:
- File received: [✅ YES / ❌ NO]
- Storage upload success: [✅ YES / ❌ NO]
- DB save success: [✅ YES / ❌ NO]
- URL returned: [URL или 'undefined']

Frontend Console (после response):
- API Response 200: [✅ YES / ❌ NO]
- URL extracted: [URL или 'undefined']
- State updated: [✅ YES / ❌ NO]

UI:
- Файл отображается: [✅ YES / ❌ NO]

Ошибки (если есть):
[копируй ПОЛНЫЙ текст ошибки из Console]
```

---

## 🚀 Готово!

Теперь у тебя есть **полная диагностическая система**!

Запускай серверы и проводи тесты! 🔥

