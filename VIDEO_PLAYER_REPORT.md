# 📊 Отчёт: Видеоплеер с аналитикой для страницы урока

**Дата:** 16 ноября 2025  
**Файл:** `src/pages/Lesson.tsx`  
**Статус:** ✅ Готово к тестированию

---

## 🎯 Что было сделано

### 1. **API Интеграция**
Добавлена загрузка данных урока из бэкенда:

- ✅ **GET `/api/lessons/:lessonId`** - данные урока (title, description, duration_minutes)
- ✅ **GET `/api/videos/lesson/:lessonId`** - видео файл (video_url)
- ✅ **GET `/api/materials/:lessonId`** - материалы для скачивания

### 2. **Кастомный видеоплеер**
Создан полностью функциональный HTML5 видеоплеер:

#### Элементы управления:
- ✅ **Play / Pause** - воспроизведение и пауза
- ✅ **Прогресс-бар** - перемотка с трекингом seek события
- ✅ **Громкость** - регулятор громкости + кнопка Mute
- ✅ **Скорость** - выбор из 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
- ✅ **Fullscreen** - полноэкранный режим
- ✅ **Время** - текущее / общая длительность (формат M:SS)

#### UI/UX:
- ✅ Контролы появляются при наведении
- ✅ Контролы скрываются при воспроизведении (убираются от курсора)
- ✅ Большая кнопка Play в центре когда видео на паузе
- ✅ Градиентный фон под контролами для читаемости
- ✅ Анимации появления/исчезновения (framer-motion)

### 3. **Аналитика видео**
Реализован трекинг всех событий:

#### Отслеживаемые события:
| Событие | Когда отправляется | Данные |
|---------|-------------------|--------|
| `play` | Нажатие Play | `position_seconds` |
| `pause` | Нажатие Pause | `position_seconds` |
| `seek` | Перемотка видео | `seek_to_seconds` |
| `progress` | Каждые 10 секунд | `progress_percent` |
| `complete` | Видео завершено | `position_seconds` |
| `playback_rate_change` | Изменение скорости | `playback_rate` |
| `mute` | Включение/выключение звука | `muted` (true/false) |
| `fullscreen_toggle` | Переход в fullscreen | - |
| `lesson_complete` | Завершение урока | - |

#### Формат отправки:
```typescript
POST /api/analytics/video-event
{
  "user_id": "uuid пользователя",
  "lesson_id": 123,
  "video_id": 456,
  "session_id": "случайный ID сессии",
  "event_type": "play",
  "position_seconds": 45.5,
  // + дополнительные данные в зависимости от события
}
```

### 4. **Материалы урока**
Отображение загруженных файлов:

- ✅ Название файла
- ✅ Размер файла (автоматический расчёт в MB)
- ✅ Иконка типа (PDF, Link, Download)
- ✅ Кнопка скачивания
- ✅ Hover эффект с изменением цвета на зелёный
- ✅ Fallback если материалы не загружены

---

## 📁 Структура компонента

### State переменные:

```typescript
// Данные урока
const [lesson, setLesson] = useState<any>(null);
const [video, setVideo] = useState<any>(null);
const [materials, setMaterials] = useState<any[]>([]);
const [loading, setLoading] = useState(true);
const [isCompleted, setIsCompleted] = useState(false);

// Видеоплеер
const videoRef = useRef<HTMLVideoElement>(null);
const [playing, setPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);
const [volume, setVolume] = useState(1);
const [muted, setMuted] = useState(false);
const [playbackRate, setPlaybackRate] = useState(1);
const [showControls, setShowControls] = useState(true);

// Аналитика
const [sessionId] = useState(() => Math.random().toString(36).substring(7));
```

### Основные функции:

| Функция | Описание |
|---------|----------|
| `loadLessonData()` | Загружает урок, видео и материалы из API |
| `trackEvent(type, data)` | Отправляет событие в аналитику |
| `togglePlay()` | Play/Pause + трекинг |
| `handleTimeUpdate()` | Обновление текущего времени + трекинг прогресса |
| `handleLoadedMetadata()` | Получение длительности видео |
| `handleEnded()` | Обработка завершения видео |
| `changePlaybackRate(rate)` | Изменение скорости + трекинг |
| `changeVolume(vol)` | Изменение громкости |
| `toggleMute()` | Вкл/выкл звук + трекинг |
| `toggleFullscreen()` | Fullscreen режим + трекинг |
| `handleSeek(time)` | Перемотка + трекинг |
| `formatTime(seconds)` | Форматирование времени (M:SS) |

---

## 🎨 Визуальный дизайн

### Сохранён оригинальный стиль платформы:

✅ Чёрный фон с анимированной нейросетью  
✅ Зелёные акценты (#00ff00)  
✅ Тёмные карточки (#1a1a24)  
✅ Пролетающие кометы  
✅ Плавные анимации (framer-motion)

### Видеоплеер:

```css
/* Контейнер */
aspect-video (16:9)
border: border-[#00ff00]/20
shadow: shadow-lg shadow-[#00ff00]/10

/* Контролы */
Градиент фона: from-black via-black/80 to-transparent
Кнопки: white → hover:[#00ff00]
Прогресс-бар: gray-600 → [#00ff00] ползунок

/* Большая кнопка Play */
w-20 h-20 rounded-full
bg-[#00ff00]/20 border-2 border-[#00ff00]
backdrop-blur-sm
```

---

## 🔌 API Endpoints (Backend)

### Что должно быть реализовано:

#### 1. GET `/api/lessons/:lessonId`
**Получение данных урока**

**Response:**
```json
{
  "lesson": {
    "id": 3,
    "module_id": 2,
    "title": "Подключение Telegram-бота",
    "description": "Научитесь создавать и настраивать Telegram-бота",
    "duration_minutes": 12,
    "order": 3,
    "created_at": "2025-11-15T10:00:00Z"
  }
}
```

#### 2. GET `/api/videos/lesson/:lessonId`
**Получение видео для урока**

**Response:**
```json
{
  "video": {
    "id": 1,
    "lesson_id": 3,
    "video_url": "https://storage.example.com/videos/lesson-3.mp4",
    "duration_seconds": 720,
    "quality": "1080p",
    "created_at": "2025-11-15T10:00:00Z"
  }
}
```

**Важно:** 
- `video_url` должен быть прямой ссылкой на MP4 файл
- Поддержка CORS для видео
- Или использовать signed URL если хранится в S3/CloudStorage

#### 3. GET `/api/materials/:lessonId`
**Получение материалов урока**

**Response:**
```json
{
  "materials": [
    {
      "id": 1,
      "lesson_id": 3,
      "filename": "Инструкция по созданию бота.pdf",
      "file_url": "https://storage.example.com/materials/instruction.pdf",
      "file_size_bytes": 2048576,
      "type": "pdf",
      "created_at": "2025-11-15T10:00:00Z"
    },
    {
      "id": 2,
      "lesson_id": 3,
      "filename": "BotFather в Telegram",
      "file_url": "https://t.me/botfather",
      "file_size_bytes": 0,
      "type": "link",
      "created_at": "2025-11-15T10:00:00Z"
    }
  ]
}
```

#### 4. POST `/api/analytics/video-event`
**Трекинг события видео**

**Request Body:**
```json
{
  "user_id": "1d063207-02ca-41e9-b17b-bf83830e66ca",
  "lesson_id": 3,
  "video_id": 1,
  "session_id": "abc123xyz",
  "event_type": "play",
  "position_seconds": 45.5,
  "progress_percent": 6.25
}
```

**Response:**
```json
{
  "success": true,
  "event_id": 12345
}
```

---

## 📊 База данных

### Таблица `video_analytics`:

```sql
CREATE TABLE video_analytics (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  lesson_id INTEGER REFERENCES lessons(id),
  video_id INTEGER REFERENCES videos(id),
  session_id VARCHAR(50),
  event_type VARCHAR(50),
  position_seconds FLOAT,
  progress_percent FLOAT,
  playback_rate FLOAT,
  muted BOOLEAN,
  seek_to_seconds FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрой аналитики
CREATE INDEX idx_video_analytics_user ON video_analytics(user_id);
CREATE INDEX idx_video_analytics_lesson ON video_analytics(lesson_id);
CREATE INDEX idx_video_analytics_session ON video_analytics(session_id);
CREATE INDEX idx_video_analytics_type ON video_analytics(event_type);
```

---

## 🚀 Как работает

### 1. Загрузка страницы:

```
User opens /course/1/module/2/lesson/3
    ↓
useEffect запускается
    ↓
loadLessonData() вызывается
    ↓
Параллельные запросы к API:
  - GET /api/lessons/3
  - GET /api/videos/lesson/3
  - GET /api/materials/3
    ↓
State обновляется (lesson, video, materials)
    ↓
Компонент рендерится с данными
```

### 2. Воспроизведение видео:

```
User clicks Play button
    ↓
togglePlay() вызывается
    ↓
videoRef.current.play()
    ↓
trackEvent('play') → POST /api/analytics/video-event
    ↓
setPlaying(true)
    ↓
handleTimeUpdate() вызывается каждый кадр
    ↓
Каждые 10 секунд: trackEvent('progress')
```

### 3. Завершение урока:

```
User clicks "Завершить урок"
    ↓
handleComplete() вызывается
    ↓
localStorage.setItem('lesson-3-completed', 'true')
    ↓
trackEvent('lesson_complete')
    ↓
setIsCompleted(true)
    ↓
Кнопка становится disabled
```

---

## 🐛 Обработка ошибок

### Fallback сценарии:

1. **Урок не найден в API:**
   ```typescript
   // Показывается mock данные:
   setLesson({
     id: parseInt(lessonId!),
     title: "Урок загружается...",
     description: "Данные урока загружаются из API"
   });
   ```

2. **Видео не найдено:**
   ```tsx
   // Показывается placeholder:
   <div className="aspect-video bg-[#0a0a0f] flex items-center justify-center">
     <p className="text-gray-400">Видео еще не загружено</p>
   </div>
   ```

3. **Материалы отсутствуют:**
   ```tsx
   // Показывается сообщение:
   <p className="text-sm text-gray-400 text-center py-4">
     Материалы пока не загружены
   </p>
   ```

4. **Ошибка трекинга:**
   ```typescript
   // Не прерывает работу плеера:
   catch (error) {
     console.error('❌ Ошибка трекинга:', error);
     // Продолжаем воспроизведение
   }
   ```

---

## ✅ Тестирование

### Чек-лист для проверки:

#### Загрузка данных:
- [ ] Урок загружается из API
- [ ] Видео загружается и воспроизводится
- [ ] Материалы отображаются корректно
- [ ] Loading состояние показывается

#### Видеоплеер:
- [ ] Play/Pause работает
- [ ] Прогресс-бар обновляется в реальном времени
- [ ] Перемотка работает корректно
- [ ] Громкость регулируется
- [ ] Mute включается/выключается
- [ ] Скорость изменяется (0.5x - 2x)
- [ ] Fullscreen работает
- [ ] Время форматируется корректно (M:SS)
- [ ] Контролы появляются/скрываются

#### Аналитика:
- [ ] Play событие отправляется
- [ ] Pause событие отправляется
- [ ] Seek событие отправляется при перемотке
- [ ] Progress отправляется каждые 10 секунд
- [ ] Complete отправляется при завершении
- [ ] Session ID одинаковый для всех событий

#### Материалы:
- [ ] Файлы отображаются
- [ ] Размер файла показывается в MB
- [ ] Ссылка на скачивание работает
- [ ] Hover эффект работает

---

## 🎯 Следующие шаги

### Backend (нужно реализовать):

1. **Создать endpoints:**
   - `GET /api/lessons/:lessonId`
   - `GET /api/videos/lesson/:lessonId`
   - `GET /api/materials/:lessonId`
   - `POST /api/analytics/video-event`

2. **Настроить хранилище:**
   - Загрузка видео в S3/CloudStorage
   - Генерация signed URLs для видео
   - CORS настройки для видео

3. **База данных:**
   - Создать таблицу `video_analytics`
   - Добавить индексы

### Frontend (опционально):

1. **Улучшения:**
   - [ ] Кнопка "Предыдущий урок"
   - [ ] Горячие клавиши (Space, ←, →, F)
   - [ ] Picture-in-Picture режим
   - [ ] Субтитры
   - [ ] Качество видео (если есть разные версии)

2. **Аналитика:**
   - [ ] Дашборд просмотренных уроков
   - [ ] Тепловая карта перемоток
   - [ ] Средняя скорость просмотра

---

## 📞 Заметки для разработчика

### Важные моменты:

1. **Session ID** генерируется при загрузке страницы и используется для группировки всех событий одной сессии просмотра.

2. **Трекинг прогресса** отправляется каждые 10 секунд, чтобы не создавать слишком много запросов к API.

3. **video_url** должен быть прямой ссылкой на MP4 файл. Если используется YouTube/Vimeo - нужно адаптировать плеер.

4. **Все API запросы** обрабатывают ошибки через try/catch и не ломают интерфейс.

5. **localStorage** используется для сохранения статуса завершения урока локально (временное решение).

6. **useAuth** hook используется для получения `user.id` для аналитики.

### Файлы для проверки:

- `src/pages/Lesson.tsx` - основной компонент
- `src/utils/apiClient.ts` - HTTP клиент для API запросов
- `src/hooks/useAuth.tsx` - hook для получения пользователя

---

**Статус:** ✅ Frontend готов  
**Backend:** ❌ Требуется реализация  
**Приоритет:** Высокий



