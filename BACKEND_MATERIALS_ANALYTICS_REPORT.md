# 🚀 Backend API - Материалы и Аналитика

## ✅ ЧТО СОЗДАНО:

### 📁 Новые файлы:

1. **`backend/src/routes/materials.ts`** (227 строк)
   - POST `/api/materials/upload` - загрузка материалов
   - GET `/api/materials/:lessonId` - получение материалов урока
   - DELETE `/api/materials/:materialId` - удаление материала

2. **`backend/src/routes/analytics.ts`** (282 строки)
   - POST `/api/analytics/video-event` - трекинг видео-событий
   - POST `/api/analytics/session/start` - начало сессии
   - POST `/api/analytics/session/end/:sessionId` - завершение сессии
   - POST `/api/analytics/navigation` - трекинг навигации
   - POST `/api/analytics/interaction` - трекинг взаимодействий
   - GET `/api/analytics/student/:userId` - детальная аналитика студента
   - GET `/api/analytics/summary` - сводная аналитика всех студентов
   - GET `/api/analytics/heatmap/:videoId` - тепловая карта видео

### 🔧 Обновлённые файлы:

✅ **`backend/src/server.ts`** - роуты уже были подключены:
```typescript
app.use('/api/materials', materialsRouter);  // строка 96
app.use('/api/analytics', analyticsRouter);  // строка 89
```

### 📦 Установленные зависимости:

✅ `multer` - уже был установлен (для загрузки файлов)  
✅ `@types/multer` - уже был установлен  
✅ `uuid` - **ДОБАВЛЕНО** (для генерации уникальных ID)  
✅ `@types/uuid` - **ДОБАВЛЕНО**

---

## 🎯 API ENDPOINTS:

### 📎 **МАТЕРИАЛЫ (Materials)**

#### 1. Загрузка материала
```http
POST /api/materials/upload
Content-Type: multipart/form-data

Body (form-data):
- file: [файл] (PDF, DOCX, PPTX, Excel, изображения, ZIP, TXT, Markdown)
- lessonId: number (ID урока)
- displayName: string (опционально, отображаемое имя)
```

**Ответ:**
```json
{
  "success": true,
  "material": {
    "id": 1,
    "lesson_id": 5,
    "storage_path": "course_1/module_2/lesson_5/1732185234_document.pdf",
    "bucket_name": "lesson-materials",
    "filename": "document.pdf",
    "file_type": "application/pdf",
    "file_size_bytes": 1048576,
    "display_name": "Лекция 1",
    "is_downloadable": true,
    "public_url": "https://arqhkacellqbhjhbebfh.supabase.co/storage/v1/object/public/lesson-materials/course_1/module_2/lesson_5/1732185234_document.pdf",
    "created_at": "2025-11-16T14:30:00Z"
  }
}
```

**Поддерживаемые типы файлов:**
- PDF (`.pdf`)
- Word (`.doc`, `.docx`)
- PowerPoint (`.ppt`, `.pptx`)
- Excel (`.xls`, `.xlsx`)
- Изображения (`.jpg`, `.png`, `.gif`, `.webp`)
- Архивы (`.zip`)
- Текст (`.txt`, `.md`)

**Лимиты:**
- Максимальный размер файла: **50 MB**

---

#### 2. Получить материалы урока
```http
GET /api/materials/:lessonId
```

**Ответ:**
```json
{
  "materials": [
    {
      "id": 1,
      "lesson_id": 5,
      "filename": "document.pdf",
      "display_name": "Лекция 1",
      "file_type": "application/pdf",
      "file_size_bytes": 1048576,
      "public_url": "https://...",
      "is_downloadable": true,
      "created_at": "2025-11-16T14:30:00Z"
    }
  ]
}
```

---

#### 3. Удалить материал
```http
DELETE /api/materials/:materialId
```

**Ответ:**
```json
{
  "success": true,
  "message": "Материал удален"
}
```

**Что происходит:**
1. Удаляется файл из Supabase Storage (bucket: `lesson-materials`)
2. Удаляется запись из БД (`lesson_materials`)

---

### 📊 **АНАЛИТИКА (Analytics)**

#### 1. Трекинг видео-событий
```http
POST /api/analytics/video-event

Body (JSON):
{
  "userId": "uuid",
  "lessonId": 5,
  "videoId": "uuid",
  "sessionId": "uuid",
  "eventType": "play" | "pause" | "seek" | "complete" | "speed_change" | ...,
  "videoTimestamp": 120,       // секунды в видео
  "videoDuration": 600,         // общая длительность
  "playbackSpeed": 1.5,         // скорость воспроизведения
  "volumeLevel": 80,            // громкость (0-100)
  "quality": "720p",            // качество видео
  "isFullscreen": false,
  "seekFrom": 100,              // откуда перемотал (опц.)
  "seekTo": 120,                // куда перемотал (опц.)
  "deviceType": "desktop",
  "browser": "Chrome"
}
```

**Типы событий:**
- `play` - начало воспроизведения
- `pause` - пауза
- `seek` - перемотка
- `speed_change` - изменение скорости
- `volume_change` - изменение громкости
- `fullscreen` - полноэкранный режим
- `quality_change` - изменение качества
- `complete` - видео просмотрено до конца
- `buffer` - буферизация

---

#### 2. Начать сессию обучения
```http
POST /api/analytics/session/start

Body (JSON):
{
  "userId": "uuid",
  "courseId": 1,              // опционально
  "deviceType": "desktop",
  "browser": "Chrome",
  "screenResolution": "1920x1080",
  "ipAddress": "192.168.1.1"  // опционально
}
```

**Ответ:**
```json
{
  "success": true,
  "sessionId": "uuid"
}
```

**Используй этот `sessionId` для всех событий в этой сессии!**

---

#### 3. Завершить сессию
```http
POST /api/analytics/session/end/:sessionId

Body (JSON):
{
  "lessonsViewed": 3,
  "lessonsCompleted": 1,
  "videosWatched": 5,
  "materialsDownloaded": 2,
  "clicksCount": 45,
  "navigationCount": 12,
  "aiMessagesSent": 3,
  "engagementScore": 0.85,    // 0-1
  "focusScore": 0.92,          // 0-1
  "endedBy": "user" | "timeout" | "inactivity" | "system"
}
```

---

#### 4. Трекинг навигации
```http
POST /api/analytics/navigation

Body (JSON):
{
  "userId": "uuid",
  "sessionId": "uuid",
  "eventType": "page_view" | "course_open" | "lesson_open" | ...,
  "fromUrl": "/courses",
  "toUrl": "/courses/1/lessons/5",
  "fromPage": "courses_list",
  "toPage": "lesson_view",
  "courseId": 1,               // опционально
  "moduleId": 2,               // опционально
  "lessonId": 5,               // опционально
  "searchQuery": "AI basics",  // если eventType = 'search'
  "searchResultsCount": 10,
  "timeSpentSeconds": 45       // время на предыдущей странице
}
```

**Типы событий навигации:**
- `page_view` - просмотр страницы
- `course_open` - открытие курса
- `lesson_open` - открытие урока
- `module_expand` - раскрытие модуля
- `search` - поиск
- `filter` - фильтрация
- `back` - кнопка "Назад"
- `forward` - кнопка "Вперёд"
- `external_link` - переход по внешней ссылке

---

#### 5. Трекинг взаимодействий с UI
```http
POST /api/analytics/interaction

Body (JSON):
{
  "userId": "uuid",
  "sessionId": "uuid",
  "interactionType": "button_click" | "file_download" | ...,
  "elementId": "download-pdf-btn",
  "elementClass": "btn btn-primary",
  "elementText": "Скачать презентацию",
  "elementType": "button",
  "pageUrl": "/courses/1/lessons/5",
  "pageSection": "lesson_materials",
  "courseId": 1,               // опционально
  "lessonId": 5,               // опционально
  "metadata": {                 // произвольные данные (JSONB)
    "fileName": "lecture1.pdf",
    "fileSize": 1048576
  }
}
```

**Типы взаимодействий:**
- `button_click` - клик по кнопке
- `link_click` - клик по ссылке
- `dropdown_open` - открытие выпадающего списка
- `modal_open` / `modal_close` - модальные окна
- `tab_switch` - переключение вкладки
- `scroll` - скролл
- `hover` - наведение курсора
- `input_focus` - фокус в поле ввода
- `form_submit` - отправка формы
- `file_download` - скачивание файла
- `file_upload` - загрузка файла
- `copy_text` - копирование текста
- `bookmark` - добавление в закладки
- `share` - поделиться

---

#### 6. Получить детальную аналитику студента
```http
GET /api/analytics/student/:userId?daysBack=30
```

**Ответ (JSONB):**
```json
{
  "userId": "uuid",
  "period": {
    "days": 30,
    "from": "2025-10-17",
    "to": "2025-11-16"
  },
  "sessions": {
    "totalSessions": 15,
    "totalDuration": 7200,     // секунды
    "avgDuration": 480,
    "avgEngagement": 0.85,
    "lastSessionDate": "2025-11-16T10:00:00Z"
  },
  "videoStats": {
    "uniqueVideos": 12,
    "totalEvents": 234,
    "playEvents": 87,
    "pauseEvents": 45,
    "seekEvents": 23,
    "completedVideos": 9,
    "avgPlaybackSpeed": 1.3
  },
  "navigation": {
    "totalNavigations": 156,
    "uniquePages": 23,
    "searchQueries": 8,
    "lessonsOpened": 12,
    "avgTimePerPage": 180
  },
  "engagement": {
    "totalInteractions": 342,
    "buttonClicks": 123,
    "filesDownloaded": 15,
    "uniqueLessons": 12
  },
  "calculatedAt": "2025-11-16T14:30:00Z"
}
```

**Используется:** AI-агентами (Куратор, Ментор, Аналитик) для персонализации обучения.

---

#### 7. Получить сводную аналитику всех студентов
```http
GET /api/analytics/summary
```

**Ответ:**
```json
{
  "students": [
    {
      "user_id": "uuid",
      "email": "student@example.com",
      "full_name": "Иван Иванов",
      "total_sessions": 15,
      "total_learning_time_seconds": 7200,
      "avg_engagement_score": 0.85,
      "last_session_date": "2025-11-16T10:00:00Z",
      "lessons_started": 20,
      "lessons_completed": 12,
      "unique_videos_watched": 15,
      "total_video_watch_time": 5400,
      "ai_messages_sent": 8,
      "churn_risk_level": "active" | "medium_risk" | "high_risk"
    }
  ]
}
```

**Используется:** Админ-панелью для мониторинга студентов.

---

#### 8. Получить тепловую карту видео
```http
GET /api/analytics/heatmap/:videoId?lessonId=5
```

**Ответ:**
```json
{
  "heatmap": [
    {
      "id": "uuid",
      "video_id": "uuid",
      "lesson_id": 5,
      "segment_start": 0,
      "segment_end": 5,
      "total_views": 45,
      "unique_viewers": 23,
      "play_count": 45,
      "pause_count": 12,
      "seek_forward_count": 3,
      "seek_backward_count": 8,
      "avg_watch_time": 4.8,
      "avg_playback_speed": 1.2,
      "engagement_score": 0.92,
      "difficulty_score": 0.15,
      "is_hot_zone": false,    // часто перематывают назад (сложное)
      "is_skip_zone": false    // часто пропускают (скучное)
    },
    // ... остальные сегменты по 5 секунд
  ]
}
```

**Используется:** Для визуализации "горячих" и "холодных" зон видео.

---

## 🧪 ТЕСТИРОВАНИЕ:

### 1. Запустить Backend:
```bash
cd backend
npm run dev
```

### 2. Тестирование загрузки материала (через Postman/Insomnia):

**POST** `http://localhost:3000/api/materials/upload`

**Body (form-data):**
- `file`: выбери PDF файл
- `lessonId`: `1`
- `displayName`: `Тестовая лекция`

**Ожидается:** Файл загружен в Supabase Storage, создана запись в БД, получен `public_url`.

---

### 3. Тестирование получения материалов:

**GET** `http://localhost:3000/api/materials/1`

**Ожидается:** Список всех материалов урока с ID = 1.

---

### 4. Тестирование видео-событий:

**POST** `http://localhost:3000/api/analytics/video-event`

**Body (JSON):**
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "lessonId": 1,
  "videoId": "123e4567-e89b-12d3-a456-426614174001",
  "sessionId": "123e4567-e89b-12d3-a456-426614174002",
  "eventType": "play",
  "videoTimestamp": 0,
  "videoDuration": 600,
  "playbackSpeed": 1.0,
  "volumeLevel": 80,
  "deviceType": "desktop",
  "browser": "Chrome"
}
```

**Ожидается:** `{ "success": true }`

---

### 5. Тестирование сессии:

**1) Начать сессию:**
```http
POST http://localhost:3000/api/analytics/session/start

Body:
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "deviceType": "desktop",
  "browser": "Chrome"
}
```

**Получишь:** `{ "success": true, "sessionId": "..." }`

**2) Завершить сессию:**
```http
POST http://localhost:3000/api/analytics/session/end/[sessionId]

Body:
{
  "lessonsViewed": 2,
  "videosWatched": 3
}
```

---

## 🔒 БЕЗОПАСНОСТЬ:

### ✅ RLS Политики (Supabase):

1. **`lesson_materials`**:
   - Админы могут загружать/удалять
   - Все студенты могут скачивать

2. **`video_events`**, **`learning_sessions`**, **`navigation_events`**, **`interaction_events`**:
   - Студенты видят только свои данные
   - Студенты могут создавать свои события
   - Админы видят всё

3. **`video_heatmap`**:
   - Публичный доступ на чтение
   - Админы могут изменять

---

## 📝 СЛЕДУЮЩИЕ ШАГИ:

### Frontend интеграция:

1. **Загрузка материалов:**
   - Форма загрузки в Конструкторе Курсов
   - Drag & Drop для файлов
   - Прогресс-бар загрузки

2. **Трекинг аналитики:**
   - Видеоплеер: отправлять события `play`, `pause`, `seek`, `complete`
   - Навигация: отправлять `page_view` при переходе между страницами
   - Взаимодействия: трекать клики на кнопки, скачивания файлов

3. **Админ-панель аналитики:**
   - Дашборд с метриками студентов
   - Тепловая карта видео
   - Список студентов с риском отвала

---

## 🎯 СТАТУС:

✅ Backend API создан  
✅ TypeScript компилируется без ошибок  
✅ Все зависимости установлены  
✅ Роуты подключены к server.ts  
✅ Supabase Storage интеграция  
✅ RLS политики настроены  

**Готово к тестированию и интеграции с Frontend!** 🚀

---

**Дата:** 16 ноября 2025  
**Файлы:** `backend/src/routes/materials.ts`, `backend/src/routes/analytics.ts`  
**Endpoints:** 11 новых API endpoints

