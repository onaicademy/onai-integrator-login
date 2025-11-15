# 🎯 АРХИТЕКТУРА: Аналитика в профиле студента

**Дата:** 15 ноября 2025  
**Концепция:** Вся аналитика привязана к профилю студента

---

## 📊 ЛОГИКА РАБОТЫ СИСТЕМЫ

```
┌─────────────────────────────────────────────────────────────┐
│  1. РЕГИСТРАЦИЯ → Создается user_id (UUID)                  │
│  2. WELCOME → Опросник (сохраняется в profiles)             │
│  3. ПЛАТФОРМА → Начинает смотреть уроки                     │
│  4. АНАЛИТИКА → ВСЁ логируется в таблицы с user_id          │
│  5. ПРОФИЛЬ → Показывается в /neurohub (AI Наставник)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ СТРУКТУРА ДАННЫХ (привязка к user_id)

### 1️⃣ **student_progress** - Прогресс по урокам

```sql
CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 👤 СВЯЗЬ С ПРОФИЛЕМ СТУДЕНТА
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 📚 Какой урок смотрит
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  
  -- 📊 АНАЛИТИКА ПРОСМОТРА
  video_progress INTEGER DEFAULT 0,           -- Процент 0-100
  watch_time_seconds INTEGER DEFAULT 0,       -- Сколько секунд смотрел ВСЕГО
  last_position_seconds INTEGER DEFAULT 0,    -- Где остановился (текущая позиция)
  
  -- ✅ СТАТУС
  is_completed BOOLEAN DEFAULT false,         -- Завершил урок?
  first_watched_at TIMESTAMP DEFAULT NOW(),   -- Когда первый раз открыл
  last_watched_at TIMESTAMP DEFAULT NOW(),    -- Когда последний раз смотрел
  completed_at TIMESTAMP,                     -- Когда завершил
  
  -- 🔄 Автообновление
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Уникальность: один прогресс на один урок для одного студента
  UNIQUE(user_id, lesson_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_student_progress_user ON student_progress(user_id);
CREATE INDEX idx_student_progress_lesson ON student_progress(lesson_id);
CREATE INDEX idx_student_progress_completed ON student_progress(user_id, is_completed);
```

---

### 2️⃣ **video_analytics** - Детальная аналитика событий

```sql
CREATE TABLE public.video_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 👤 СВЯЗЬ С ПРОФИЛЕМ СТУДЕНТА
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 🎥 Какое видео смотрит
  video_id UUID NOT NULL REFERENCES public.video_content(id) ON DELETE CASCADE,
  
  -- 📍 Сессия просмотра (чтобы группировать события)
  session_id UUID NOT NULL,
  
  -- 🎬 ТИП СОБЫТИЯ
  event_type VARCHAR(20) NOT NULL,  -- 'play', 'pause', 'seek', 'complete', 'skip'
  
  -- ⏱️ ВРЕМЯ СОБЫТИЯ
  timestamp_seconds INTEGER NOT NULL,  -- В какой момент видео произошло событие
  
  -- 📊 ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ
  playback_rate NUMERIC(3,2) DEFAULT 1.0,  -- Скорость воспроизведения (1.0, 1.5, 2.0)
  quality VARCHAR(10),                      -- Качество видео ('1080p', '720p')
  
  -- 🔄 Время создания
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Индекс для анализа
  CHECK (event_type IN ('play', 'pause', 'seek', 'complete', 'skip', 'buffer', 'error'))
);

-- Индексы для AI-аналитики
CREATE INDEX idx_video_analytics_user ON video_analytics(user_id);
CREATE INDEX idx_video_analytics_video ON video_analytics(video_id);
CREATE INDEX idx_video_analytics_session ON video_analytics(session_id);
CREATE INDEX idx_video_analytics_event ON video_analytics(event_type);
```

---

### 3️⃣ **module_progress** - Прогресс по модулям

```sql
CREATE TABLE public.module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 👤 СВЯЗЬ С ПРОФИЛЕМ СТУДЕНТА
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 📚 Какой модуль
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  
  -- 📊 ПРОГРЕСС
  completed_lessons INTEGER DEFAULT 0,        -- Завершено уроков
  total_lessons INTEGER DEFAULT 0,            -- Всего уроков в модуле
  progress_percentage INTEGER DEFAULT 0,      -- Процент завершения
  
  -- 🔄 Автообновление
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Уникальность
  UNIQUE(user_id, module_id)
);

-- Индексы
CREATE INDEX idx_module_progress_user ON module_progress(user_id);
CREATE INDEX idx_module_progress_module ON module_progress(module_id);
```

---

## 🎨 FRONTEND: Как отображается в /neurohub

### Страница: `/neurohub` (AI Наставник)

```typescript
// src/pages/Neurohub.tsx

interface StudentAnalytics {
  userId: string;
  
  // 📊 ОБЩАЯ СТАТИСТИКА
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  
  // 🎥 ВИДЕО СТАТИСТИКА
  totalVideosWatched: number;
  totalWatchTimeMinutes: number;
  averageProgressPercent: number;
  
  // 📚 ТЕКУЩИЙ ПРОГРЕСС
  currentCourse: {
    id: string;
    name: string;
    progress: number;
  };
  
  currentLesson: {
    id: string;
    title: string;
    videoProgress: number;
    lastPosition: number;
  };
  
  // 🔥 АКТИВНОСТЬ
  lastWatchedAt: Date;
  streakDays: number;
  
  // 🎯 AI РЕКОМЕНДАЦИИ
  aiMentorLastMessage: {
    type: string;
    message: string;
    sentAt: Date;
  };
}

// Компонент дашборда
export function NeurohubDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
  
  useEffect(() => {
    // Загрузка аналитики профиля
    fetch(`/api/analytics/student/${user.id}/dashboard`)
      .then(res => res.json())
      .then(data => setAnalytics(data));
  }, [user.id]);
  
  return (
    <div className="neurohub-dashboard">
      {/* 1. ОБЩАЯ СТАТИСТИКА */}
      <StatsOverview 
        totalVideos={analytics?.totalVideosWatched}
        watchTime={analytics?.totalWatchTimeMinutes}
        progress={analytics?.averageProgressPercent}
      />
      
      {/* 2. ТЕКУЩИЙ УРОК (продолжить с места остановки) */}
      <CurrentLessonCard 
        lesson={analytics?.currentLesson}
        onContinue={() => navigateToLesson(analytics.currentLesson.id)}
      />
      
      {/* 3. ПРОГРЕСС ПО КУРСАМ */}
      <CoursesProgressList userId={user.id} />
      
      {/* 4. AI-МЕНТОР РЕКОМЕНДАЦИИ */}
      <AIMentorCard 
        lastMessage={analytics?.aiMentorLastMessage}
      />
      
      {/* 5. ИСТОРИЯ ПРОСМОТРОВ */}
      <WatchHistoryTimeline userId={user.id} />
    </div>
  );
}
```

---

## 🔧 BACKEND API ENDPOINTS

### 1️⃣ **GET /api/analytics/student/:userId/dashboard**

Возвращает полную аналитику студента для /neurohub

```typescript
// backend/src/controllers/analyticsController.ts

export async function getStudentDashboard(req: Request, res: Response) {
  const { userId } = req.params;
  
  // 1. Общая статистика
  const stats = await supabase
    .from('student_progress')
    .select('*')
    .eq('user_id', userId);
  
  // 2. Текущий урок (последний смотрел)
  const currentLesson = await supabase
    .from('student_progress')
    .select(`
      *,
      lessons (
        id,
        title,
        module_id,
        modules (
          course_id,
          courses (name)
        )
      )
    `)
    .eq('user_id', userId)
    .order('last_watched_at', { ascending: false })
    .limit(1)
    .single();
  
  // 3. Прогресс по курсам
  const coursesProgress = await supabase.rpc('get_user_courses_progress', {
    p_user_id: userId
  });
  
  // 4. Последнее сообщение от AI-Ментора
  const lastMentorMessage = await supabase
    .from('mentor_motivation_log')
    .select('*')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return res.json({
    userId,
    stats: {
      totalVideosWatched: stats.data?.filter(s => s.is_completed).length || 0,
      totalWatchTimeMinutes: Math.round(
        (stats.data?.reduce((sum, s) => sum + s.watch_time_seconds, 0) || 0) / 60
      ),
      averageProgressPercent: Math.round(
        (stats.data?.reduce((sum, s) => sum + s.video_progress, 0) || 0) / 
        (stats.data?.length || 1)
      )
    },
    currentLesson: currentLesson.data,
    coursesProgress: coursesProgress.data,
    aiMentorLastMessage: lastMentorMessage.data
  });
}
```

---

### 2️⃣ **POST /api/analytics/video/track**

Трекинг событий видео (вызывается с фронтенда)

```typescript
// backend/src/controllers/videoTrackingController.ts

export async function trackVideoEvent(req: Request, res: Response) {
  const { userId, videoId, sessionId, eventType, timestampSeconds } = req.body;
  
  // 1. Логируем событие в video_analytics
  await supabase.from('video_analytics').insert({
    user_id: userId,
    video_id: videoId,
    session_id: sessionId,
    event_type: eventType,
    timestamp_seconds: timestampSeconds
  });
  
  // 2. Обновляем student_progress
  if (eventType === 'play' || eventType === 'pause') {
    const lesson = await supabase
      .from('video_content')
      .select('lesson_id')
      .eq('id', videoId)
      .single();
    
    const progress = await supabase
      .from('student_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lesson.data.lesson_id)
      .maybeSingle();
    
    if (progress.data) {
      // Обновляем существующий прогресс
      await supabase
        .from('student_progress')
        .update({
          last_position_seconds: timestampSeconds,
          last_watched_at: new Date().toISOString()
        })
        .eq('id', progress.data.id);
    } else {
      // Создаем новый прогресс
      await supabase.from('student_progress').insert({
        user_id: userId,
        lesson_id: lesson.data.lesson_id,
        last_position_seconds: timestampSeconds
      });
    }
  }
  
  // 3. Если событие 'complete' → отмечаем урок завершенным
  if (eventType === 'complete') {
    await supabase.rpc('mark_lesson_completed', {
      p_user_id: userId,
      p_video_id: videoId
    });
  }
  
  return res.json({ success: true });
}
```

---

## 📱 FRONTEND: Video Player с трекингом

```typescript
// src/components/courses/VideoPlayer.tsx

export function VideoPlayer({ videoId, lessonId, userId }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionId = useRef(uuidv4()); // Уникальная сессия просмотра
  
  // Трекинг событий
  const trackEvent = async (eventType: string, timestamp: number) => {
    await fetch('/api/analytics/video/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        videoId,
        sessionId: sessionId.current,
        eventType,
        timestampSeconds: Math.round(timestamp)
      })
    });
  };
  
  // События видео
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Play
    video.addEventListener('play', () => {
      trackEvent('play', video.currentTime);
    });
    
    // Pause
    video.addEventListener('pause', () => {
      trackEvent('pause', video.currentTime);
    });
    
    // Seek (перемотка)
    video.addEventListener('seeked', () => {
      trackEvent('seek', video.currentTime);
    });
    
    // Complete (завершение)
    video.addEventListener('ended', () => {
      trackEvent('complete', video.duration);
    });
    
    // Каждые 10 секунд отправляем текущую позицию
    const interval = setInterval(() => {
      if (!video.paused) {
        trackEvent('progress', video.currentTime);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <video ref={videoRef} controls>
      <source src={videoUrl} type="video/mp4" />
    </video>
  );
}
```

---

## 🎯 ИТОГОВАЯ АРХИТЕКТУРА

```
┌──────────────────────────────────────────────────────────────┐
│                    👤 ПРОФИЛЬ СТУДЕНТА                       │
│                  (auth.users → user_id UUID)                 │
└────────────────────┬─────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌────────▼────────┐
│ student_progress│       │ video_analytics  │
│                 │       │                  │
│ • lesson_id     │       │ • video_id       │
│ • progress %    │       │ • event_type     │
│ • watch_time    │       │ • timestamp      │
│ • last_position │       │ • session_id     │
│ • is_completed  │       │                  │
└─────────────────┘       └──────────────────┘
        │                         │
        │      ┌──────────────────┘
        │      │
        ▼      ▼
┌─────────────────────────────┐
│   /neurohub (AI Наставник)  │
│                             │
│ • Общая статистика          │
│ • Текущий урок (продолжить) │
│ • Прогресс по курсам        │
│ • AI-Ментор рекомендации    │
│ • История просмотров        │
└─────────────────────────────┘
```

---

## ✅ СЛЕДУЮЩИЙ ШАГ:

**ЗАПУСТИ ПРОВЕРКУ:**

```sql
-- Файл: CHECK_USER_ANALYTICS_STRUCTURE.sql
-- Проверит что все таблицы правильно привязаны к user_id
```

**После проверки я скажу что нужно исправить!**

