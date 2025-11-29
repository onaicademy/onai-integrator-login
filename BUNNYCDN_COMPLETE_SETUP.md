# 🐰 BunnyCDN Stream - Полная Интеграция ЗАВЕРШЕНА! ✅

## 🎯 ЧТО СДЕЛАНО (Frontend + Backend):

### ✅ FRONTEND FIXES

#### 1. VideoPlayer.tsx - True Fullscreen
**Изменения:**
- 🖥️ **Fullscreen на контейнере** (не на `<video>`)
- 📱 **CSS классы:** `fixed top-0 left-0 w-screen h-screen z-50`
- 🎨 **Adaptive UI:** Контролы видны в fullscreen
- 🔄 **Event listener:** `fullscreenchange` для синхронизации

#### 2. Settings Menu - Scroll & Adaptive
**Изменения:**
- 📜 **Scroll:** `max-h-64 overflow-y-auto`
- 🎯 **Custom scrollbar:** `scrollbar-thin scrollbar-thumb-gray-600`
- 📐 **Adaptive position:** Автоопределение вверх/вниз
- 🔝 **Z-index:** `z-[60]` выше контролов

#### 3. Netflix-Style Progress Bar
**Фишки:**
- 📏 **Тонкая линия:** 2px → 6px на hover
- ⭕ **Thumb:** Появляется только при hover
- 🖱️ **Click to seek:** Клик = перемотка
- 🎨 **Smooth animation:** `transition: height 0.15s ease`

---

### ✅ BACKEND UPLOAD

#### 1. Создан роут `backend/src/routes/videoUpload.ts`

**API Endpoints:**
```
POST   /api/upload-video        - Загрузка в BunnyCDN
GET    /api/video-status/:id    - Проверка статуса обработки
DELETE /api/video/:id           - Удаление видео
```

**Возможности:**
- 📤 **Direct Upload** в BunnyCDN Stream API
- 📊 **Progress tracking** через `onUploadProgress`
- 🗑️ **Auto cleanup** временных файлов
- ⚡️ **Error recovery** с детальными логами

#### 2. Интеграция в `server.ts`
```typescript
import videoUploadRouter from './routes/videoUpload';
app.use('/api', videoUploadRouter);
```

#### 3. Папка `backend/uploads/temp/`
- ✅ Создана для временного хранения
- ✅ Добавлена в `.gitignore`

---

### ✅ ADMIN UI INTEGRATION

#### Обновлён `TripwireLessonEditDialog.tsx`

**Изменения:**
- 🐰 **Label:** "🐰 Загрузить видео в BunnyCDN Stream"
- 📊 **Progress bar** внутри upload зоны
- ✨ **Gradient background** для красоты
- 💾 **Auto-save** `bunny_video_id` в базу

**Логика:**
1. Выбор файла → Автозагрузка в BunnyCDN
2. Получение `videoId` от BunnyCDN
3. Сохранение `bunny_video_id` и `video_url` в таблицу `lessons`
4. Автоперезагрузка данных

---

### ✅ DATABASE MIGRATION

```sql
ALTER TABLE public.lessons 
ADD COLUMN bunny_video_id TEXT;

CREATE INDEX idx_lessons_bunny_video_id ON public.lessons(bunny_video_id);
```

---

## 🔧 НАСТРОЙКА BUNNYCDN API:

### ШАГ 1: Получи ключи в BunnyCDN Dashboard

1. Зайди в **BunnyCDN Dashboard**
2. Перейди в **Stream → API**
3. Создай новый **API Key** (или скопируй существующий)
4. Скопируй **Library ID** из настроек Stream Library

### ШАГ 2: Обнови `.env` файл

Открой `backend/.env` и обнови эти переменные:

```bash
# BunnyCDN Stream API
BUNNY_STREAM_API_KEY=ваш-реальный-ключ-здесь
BUNNY_STREAM_LIBRARY_ID=ваш-library-id-здесь
BUNNY_STREAM_CDN_HOSTNAME=video.onai.academy
```

**Где найти:**
- `BUNNY_STREAM_API_KEY`: Dashboard → Stream → API → Access Key
- `BUNNY_STREAM_LIBRARY_ID`: Dashboard → Stream → Library → ID (в URL)

### ШАГ 3: Перезапусти Backend

```bash
cd backend
npm run dev
```

Проверь в логах:
```
✅ Backend API запущен на http://localhost:3000
```

---

## 🧪 ТЕСТИРОВАНИЕ (Полный Цикл):

### 1️⃣ Тест Frontend Плеера

Открой: `http://localhost:8080/tripwire/module/1/lesson/29`

**Чек-лист:**
- ✅ Прогресс-бар тонкий (2px)?
- ✅ При hover → 6px + кружок?
- ✅ Клик по прогресс-бару перематывает?
- ✅ Settings (⚙️) открывает меню?
- ✅ Меню НЕ уезжает за экран?
- ✅ Есть scroll если много качеств?
- ✅ Fullscreen работает (весь плеер)?
- ✅ Контролы видны в fullscreen?

### 2️⃣ Тест BunnyCDN Upload (Админ)

**Подготовка:**
1. Войди под админом
2. Открой любой урок Tripwire
3. Нажми "Edit" (иконка карандаша)

**Процесс:**
1. Перейди на вкладку **"Видео"**
2. Нажми на область **"🐰 Выбрать видео"**
3. Выбери видео файл (MP4, до 5GB)
4. Подтверди загрузку

**Ожидаемый результат:**
```
📤 Отправка видео в BunnyCDN...       [████░░░░░░] 40%
💾 Сохраняем Video ID в базу...       [████████░░] 85%
✅ Видео загружено в BunnyCDN!        [██████████] 100%
```

**Alert:**
```
✅ Видео успешно загружено!

🎥 Video ID: 9d82c6f0-7a16-41ad-b11b-e28e1d84f769
📊 Статус: Обрабатывается...

Плеер автоматически подхватит его через несколько минут.
```

### 3️⃣ Проверь базу данных

**Supabase SQL Editor:**
```sql
SELECT 
  id,
  title,
  bunny_video_id,
  video_url
FROM lessons
WHERE bunny_video_id IS NOT NULL
ORDER BY updated_at DESC;
```

**Ожидаемый результат:**
```
| id | title          | bunny_video_id                        | video_url                                   |
|----|----------------|---------------------------------------|---------------------------------------------|
| 29 | Введение в AI  | 9d82c6f0-7a16-41ad-b11b-e28e1d84f769 | https://video.onai.academy/.../playlist.m3u8|
```

### 4️⃣ Проверь HLS Playback

1. Открой урок с загруженным видео
2. Открой **DevTools → Network**
3. Ищи запросы:
   - `playlist.m3u8` (манифест)
   - `*.ts` (сегменты видео)

4. Нажми **Settings → Качество**
   - Должны быть: 480p, 720p, 1080p (если видео было transcoded)

---

## 🐛 TROUBLESHOOTING:

### Ошибка: "BunnyCDN Stream not configured"

**Решение:**
1. Проверь что в `backend/.env` есть:
   ```
   BUNNY_STREAM_API_KEY=...
   BUNNY_STREAM_LIBRARY_ID=...
   ```
2. Перезапусти backend

### Видео не воспроизводится

**Причины:**
1. BunnyCDN ещё обрабатывает видео (подожди 2-5 минут)
2. CORS не настроен на BunnyCDN
3. Неправильный hostname

**Проверка:**
```bash
curl https://video.onai.academy/{videoId}/playlist.m3u8
```

Должен вернуть HLS манифест.

### Settings Menu уезжает за экран

**Решение:**
- ✅ Уже исправлено через `max-h-64 overflow-y-auto`
- Проверь что в Tailwind config есть scrollbar plugin

### Fullscreen не работает на мобильных

**Решение:**
- Добавь `playsInline` к `<video>` (✅ уже добавлено)
- На iOS fullscreen работает через нативные контролы

---

## 📊 API REFERENCE:

### POST /api/upload-video

**Request:**
```typescript
FormData {
  video: File,
  title: string,
  collectionId?: string
}
```

**Response:**
```json
{
  "success": true,
  "videoId": "9d82c6f0-7a16-41ad-b11b-e28e1d84f769",
  "title": "Урок 29",
  "status": "processing",
  "hlsUrl": "https://video.onai.academy/.../playlist.m3u8",
  "thumbnailUrl": "https://video.onai.academy/.../thumbnail.jpg"
}
```

### GET /api/video-status/:videoId

**Response:**
```json
{
  "success": true,
  "videoId": "...",
  "status": 3,  // 0=queued, 1=processing, 2=encoding, 3=finished, 4=error
  "duration": 845,
  "views": 12,
  "hlsUrl": "...",
  "thumbnailUrl": "..."
}
```

---

## 🎨 UI SCREENSHOTS (Expected):

### Settings Menu
```
┌───────────────────┐
│ КАЧЕСТВО          │
│ ✓ Авто           │ ← Галочка зелёная
│   480p           │
│   720p           │
│   1080p          │
├───────────────────┤
│ СКОРОСТЬ         │
│   0.5x           │
│ ✓ 1x             │
│   1.5x           │
│   2x             │
└───────────────────┘
```

### Upload Zone (Admin)
```
┌─────────────────────────────────┐
│ 🐰 Загрузить видео в BunnyCDN   │
│                                  │
│         📤                       │
│    🐰 Выбрать видео             │
│  MP4, MOV, AVI • До 5GB         │
│                                  │
│  [████████░░] 80%                │
│  📤 Отправка видео в BunnyCDN... │
└─────────────────────────────────┘
```

---

## 🔐 БЕЗОПАСНОСТЬ:

### Frontend:
- ✅ `onContextMenu` блокирует ПКМ
- ✅ `controlsList="nodownload"` скрывает скачивание
- ✅ HLS сегменты нельзя легко скачать

### Backend:
- ✅ Multer с лимитом 5GB
- ✅ File type validation (только видео)
- ✅ Автоудаление временных файлов
- ✅ Error handling с логами

### BunnyCDN:
- 🔜 **Signed URLs** (для приватных видео)
- 🔜 **Geo-blocking** (ограничение по странам)
- 🔜 **Hotlink protection**

---

## 📊 МОНИТОРИНГ:

### SQL для проверки трекинга:

```sql
-- Кто смотрит видео прямо сейчас?
SELECT 
  u.email,
  l.title as lesson_title,
  vt.watch_percentage,
  vt.is_qualified_for_completion,
  vt.updated_at
FROM video_tracking vt
JOIN auth.users u ON vt.user_id = u.id
JOIN lessons l ON vt.lesson_id = l.id
WHERE vt.updated_at > NOW() - INTERVAL '5 minutes'
ORDER BY vt.updated_at DESC;

-- Статистика по урокам
SELECT 
  l.title,
  l.bunny_video_id,
  COUNT(DISTINCT vt.user_id) as viewers,
  ROUND(AVG(vt.watch_percentage), 1) as avg_completion
FROM lessons l
LEFT JOIN video_tracking vt ON l.id = vt.lesson_id
WHERE l.bunny_video_id IS NOT NULL
GROUP BY l.id, l.title, l.bunny_video_id
ORDER BY viewers DESC;
```

---

## 🚀 PRODUCTION DEPLOYMENT:

### 1. Обнови .env на сервере
```bash
BUNNY_STREAM_API_KEY=prod_key_here
BUNNY_STREAM_LIBRARY_ID=12345
BUNNY_STREAM_CDN_HOSTNAME=video.onai.academy
```

### 2. Настрой CDN Hostname в BunnyCDN
1. Stream → Settings → Custom Hostname
2. Добавь: `video.onai.academy`
3. Настрой DNS: CNAME → `vz-xxxxx.b-cdn.net`
4. Включи SSL

### 3. CORS Policy
В BunnyCDN Dashboard:
```
Allowed Origins: 
- https://onai.academy
- https://localhost:8080 (для тестов)
```

### 4. Migrate старые видео
```sql
-- Пример миграции (если есть старые видео на другом CDN)
UPDATE lessons 
SET bunny_video_id = 'MANUAL_UPLOAD_ID'
WHERE id = 1;
```

---

## 📁 СТРУКТУРА ФАЙЛОВ:

```
backend/
├── src/
│   └── routes/
│       └── videoUpload.ts           ✅ Новый (Upload API)
├── uploads/
│   └── temp/                        ✅ Новая (Temp storage)
└── .env                             🔧 Обновлён (BunnyCDN keys)

frontend/
├── src/
│   ├── components/
│   │   └── VideoPlayer/
│   │       └── VideoPlayer.tsx      🔧 Обновлён (HLS + Fixes)
│   └── pages/
│       └── tripwire/
│           └── TripwireLessonEditDialog.tsx  🔧 Обновлён (BunnyCDN Upload)
└── package.json                     🔧 Обновлён (hls.js added)
```

---

## ✅ ЧЕКЛИСТ ГОТОВНОСТИ:

### Конфигурация:
- [x] hls.js установлен
- [x] VideoPlayer.tsx обновлён (HLS + Fullscreen + Settings)
- [x] videoUpload.ts создан
- [x] server.ts обновлён (роут зарегистрирован)
- [x] TripwireLessonEditDialog.tsx обновлён (BunnyCDN UI)
- [x] Database migration (bunny_video_id column)
- [ ] BunnyCDN API keys в .env (НУЖНО ДОБАВИТЬ РЕАЛЬНЫЕ)

### Тестирование:
- [ ] Загрузить тестовое видео через админку
- [ ] Проверить что videoId сохранился в БД
- [ ] Открыть урок и убедиться что HLS работает
- [ ] Проверить Settings → Качество (480p, 720p, 1080p)
- [ ] Проверить Fullscreen на desktop + mobile
- [ ] Проверить трекинг в таблице video_tracking

---

## 🎯 СЛЕДУЮЩИЕ ШАГИ:

### 1. Добавь реальные ключи BunnyCDN
```bash
cd backend
nano .env
# Замени placeholders на реальные значения
```

### 2. Загрузи первое видео
1. Зайди под админом
2. Редактируй урок
3. Загрузи тестовое видео (короткое, ~1-2 минуты)

### 3. Проверь обработку
Через 2-3 минуты проверь статус:
```bash
curl -X GET \
  http://localhost:3000/api/video-status/{videoId} \
  -H 'Content-Type: application/json'
```

### 4. Тестируй плеер
- Открой урок
- Проверь что HLS загружается
- Переключай качество
- Тестируй fullscreen

---

## 🎉 ИТОГИ:

### Создано файлов: 2
- ✅ `backend/src/routes/videoUpload.ts`
- ✅ `BUNNYCDN_COMPLETE_SETUP.md`

### Обновлено файлов: 5
- ✅ `src/components/VideoPlayer/VideoPlayer.tsx`
- ✅ `src/pages/tripwire/TripwireLesson.tsx`
- ✅ `src/components/tripwire/TripwireLessonEditDialog.tsx`
- ✅ `backend/src/server.ts`
- ✅ `backend/.env`

### Применено миграций: 1
- ✅ `add_bunny_video_id_to_lessons`

### TODO выполнено: 4/4 ✅
- [x] True Fullscreen с правильными CSS
- [x] Settings Menu с scroll
- [x] Backend роут для загрузки
- [x] Интеграция в админку

---

**🔥 СИСТЕМА ГОТОВА К РАБОТЕ!**

Добавь реальные BunnyCDN ключи в `.env` и можешь загружать видео! 🐰🚀

