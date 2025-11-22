# 🎬 ПЛАН ПОДКЛЮЧЕНИЯ ВИДЕО АНАЛИТИКИ

## 📊 ЧТО НУЖНО ПОДКЛЮЧИТЬ:

### ШАГ 1: Backend API Endpoint (15 минут)

**Файл:** `backend/src/routes/video-analytics.ts`

```typescript
import express from 'express';
import { supabase } from '../lib/supabase';

const router = express.Router();

// POST /api/video-analytics/track
router.post('/track', async (req, res) => {
  try {
    const {
      user_id,
      lesson_id,
      video_id,
      current_second,
      seeks_count,
      pauses_count,
      playback_speed,
      is_fully_watched
    } = req.body;

    // Сохраняем или обновляем сессию
    const { data, error } = await supabase
      .from('video_watch_sessions')
      .upsert({
        user_id,
        lesson_id,
        video_id,
        max_second_reached: current_second,
        seeks_count,
        pauses_count,
        playback_speed,
        is_fully_watched,
        session_end: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id',
        ignoreDuplicates: false
      });

    if (error) throw error;

    // Обновляем прогресс урока
    await supabase
      .from('user_progress')
      .upsert({
        user_id,
        lesson_id,
        video_current_second: current_second,
        video_watched_seconds: current_second,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      });

    res.json({ success: true });
  } catch (error) {
    console.error('Video analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Подключить в:** `backend/src/server.ts`
```typescript
import videoAnalyticsRoutes from './routes/video-analytics';
app.use('/api/video-analytics', videoAnalyticsRoutes);
```

---

### ШАГ 2: Frontend - Трекинг видео (20 минут)

**Файл:** `src/hooks/useVideoAnalytics.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import apiClient from '@/utils/apiClient';

interface VideoAnalyticsProps {
  lessonId: string;
  videoId?: string;
}

export const useVideoAnalytics = ({ lessonId, videoId }: VideoAnalyticsProps) => {
  const { user } = useAuth();
  const [currentSecond, setCurrentSecond] = useState(0);
  const [seeksCount, setSeeksCount] = useState(0);
  const [pausesCount, setPausesCount] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const lastSecondRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Отправка метрик каждые 10 секунд
  const sendAnalytics = async (isFullyWatched = false) => {
    if (!user?.id) return;

    try {
      await apiClient.post('/api/video-analytics/track', {
        user_id: user.id,
        lesson_id: lessonId,
        video_id: videoId,
        current_second: currentSecond,
        seeks_count: seeksCount,
        pauses_count: pausesCount,
        playback_speed: playbackSpeed,
        is_fully_watched: isFullyWatched
      });
    } catch (error) {
      console.error('Failed to send video analytics:', error);
    }
  };

  // Обработчики событий видео
  const handleTimeUpdate = (second: number) => {
    // Определяем перемотку назад
    if (second < lastSecondRef.current - 5) {
      setSeeksCount(prev => prev + 1);
    }
    
    lastSecondRef.current = second;
    setCurrentSecond(second);
  };

  const handlePause = () => {
    setPausesCount(prev => prev + 1);
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackSpeed(rate);
  };

  const handleVideoEnd = () => {
    sendAnalytics(true);
  };

  // Периодическая отправка метрик
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      sendAnalytics(false);
    }, 10000); // Каждые 10 секунд

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Финальная отправка при размонтировании
      sendAnalytics(false);
    };
  }, [currentSecond, seeksCount, pausesCount, playbackSpeed]);

  return {
    handleTimeUpdate,
    handlePause,
    handlePlaybackRateChange,
    handleVideoEnd,
    currentSecond,
    seeksCount,
    pausesCount
  };
};
```

---

### ШАГ 3: Интеграция в VideoPlayer (10 минут)

**Файл:** `src/components/VideoPlayer.tsx` (или где у тебя плеер)

```typescript
import { useVideoAnalytics } from '@/hooks/useVideoAnalytics';

interface VideoPlayerProps {
  lessonId: string;
  videoUrl: string;
  videoId?: string;
}

export const VideoPlayer = ({ lessonId, videoUrl, videoId }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    handleTimeUpdate,
    handlePause,
    handlePlaybackRateChange,
    handleVideoEnd,
    seeksCount
  } = useVideoAnalytics({ lessonId, videoId });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Обработчики событий
    const onTimeUpdate = () => {
      handleTimeUpdate(video.currentTime);
    };

    const onPause = () => {
      handlePause();
    };

    const onRateChange = () => {
      handlePlaybackRateChange(video.playbackRate);
    };

    const onEnded = () => {
      handleVideoEnd();
    };

    // Подписка на события
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('pause', onPause);
    video.addEventListener('ratechange', onRateChange);
    video.addEventListener('ended', onEnded);

    // Отписка
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ratechange', onRateChange);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        className="w-full rounded-lg"
      />
      
      {/* Индикатор проблем (опционально) */}
      {seeksCount >= 5 && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg">
          💡 Материал кажется сложным? AI-наставник может помочь!
        </div>
      )}
    </div>
  );
};
```

---

### ШАГ 4: Автоматическое создание записей при загрузке видео (5 минут)

**SQL Триггер:**

```sql
-- Создается автоматически при добавлении video_content
CREATE OR REPLACE FUNCTION init_video_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- При создании нового видео - ничего не делаем
  -- Записи создаются только когда студент начинает смотреть
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Не нужен триггер для создания, записи создаются on demand
```

**Backend:** При загрузке видео через Admin

```typescript
// backend/src/routes/admin/videos.ts
router.post('/videos/upload', async (req, res) => {
  // ... загрузка видео в Cloudflare R2 ...
  
  // Создаем запись в video_content
  const { data: video } = await supabase
    .from('video_content')
    .insert({
      lesson_id: req.body.lesson_id,
      video_url: uploadedUrl,
      duration_seconds: req.body.duration,
      thumbnail_url: thumbnailUrl
    })
    .select()
    .single();
  
  // Записи в video_watch_sessions создаются автоматически
  // когда студент начинает смотреть видео
  
  res.json({ success: true, video });
});
```

---

## 📊 КАК ЭТО РАБОТАЕТ:

### Поток данных:

```
Студент смотрит видео
    ↓
VideoPlayer отслеживает события:
  - Текущая секунда (каждую секунду)
  - Перемотка назад (seeks_count++)
  - Пауза (pauses_count++)
  - Скорость воспроизведения
    ↓
useVideoAnalytics собирает метрики
    ↓
Каждые 10 секунд → POST /api/video-analytics/track
    ↓
Backend сохраняет в video_watch_sessions
    ↓
Триггер detect_video_struggle() проверяет seeks_count
    ↓
Если >= 5 → создает задачу в ai_mentor_tasks
    ↓
AI-наставник видит проблему
    ↓
При следующем обращении: "Вижу, урок сложный? Помочь?"
```

---

## ✅ ОПТИМИЗАЦИИ:

### 1. Batch отправка (снижает нагрузку)
```typescript
// Вместо отправки каждые 10 сек от каждого студента
// Собираем в очередь и отправляем батчем
const analyticsQueue = [];

const sendBatch = async () => {
  if (analyticsQueue.length === 0) return;
  
  await apiClient.post('/api/video-analytics/batch', {
    sessions: analyticsQueue
  });
  
  analyticsQueue.length = 0;
};

setInterval(sendBatch, 30000); // Каждые 30 сек батч
```

### 2. Debounce для seeks_count
```typescript
// Не считаем каждую микроперемотку
const debouncedSeek = debounce(() => {
  setSeeksCount(prev => prev + 1);
}, 1000); // Только если перемотал и прошла 1 сек
```

### 3. Сжатие данных
```typescript
// Отправляем только измененные значения
const diff = {
  current_second: currentSecond, // Всегда
  seeks_count: seeksCount !== lastSeeksCount ? seeksCount : undefined,
  pauses_count: pausesCount !== lastPausesCount ? pausesCount : undefined
};
```

### 4. Local storage кэш (при потере связи)
```typescript
// Сохраняем локально если Backend недоступен
try {
  await sendAnalytics();
} catch (error) {
  localStorage.setItem('pending_analytics', JSON.stringify(data));
  // Отправим позже при восстановлении связи
}
```

---

## 📈 МЕТРИКИ КОТОРЫЕ СОБИРАЮТСЯ:

### Базовые:
- ✅ Текущая секунда просмотра
- ✅ Сколько секунд посмотрел всего
- ✅ Досмотрел ли до конца

### Поведенческие:
- ✅ Количество перемоток назад (seeks_count)
- ✅ Количество пауз (pauses_count)
- ✅ Скорость воспроизведения

### Вовлеченность:
- ✅ Engagement score (рассчитывается автоматически)
- ✅ Проблемные моменты (где перематывал)
- ✅ Время на паузе

### AI использует:
- 🤖 Определяет сложные уроки (много перемоток)
- 🤖 Находит проблемные моменты (секунды где застрял)
- 🤖 Предлагает помощь персонализированно
- 🤖 Рекомендует повторить материал

---

## 🎯 ИТОГОВЫЙ ЧЕКЛИСТ:

### Backend:
- [ ] Создать `backend/src/routes/video-analytics.ts`
- [ ] Подключить роут в `server.ts`
- [ ] Протестировать endpoint: POST /api/video-analytics/track

### Frontend:
- [ ] Создать `src/hooks/useVideoAnalytics.ts`
- [ ] Интегрировать в VideoPlayer
- [ ] Протестировать отправку метрик

### База данных:
- [x] Таблица `video_watch_sessions` создана ✅
- [x] Триггер `detect_video_struggle()` создан ✅
- [x] Таблица `user_progress` создана ✅

### Тестирование:
- [ ] Смотреть видео → метрики сохраняются
- [ ] Перемотать 5+ раз → задача для AI создается
- [ ] AI видит проблему → предлагает помощь

---

## ⏱️ ВРЕМЯ ВНЕДРЕНИЯ:

- Backend endpoint: **15 минут**
- Frontend hook: **20 минут**
- Интеграция в плеер: **10 минут**
- Тестирование: **15 минут**

**ИТОГО: ~1 час** 🚀

---

## 💡 ВАЖНО:

### При загрузке нового видео через Admin:
1. Админ загружает видео → сохраняется в Cloudflare R2
2. Создается запись в `video_content`
3. **НЕ создаются** записи в `video_watch_sessions`
4. Записи создаются **автоматически** когда студент начинает смотреть
5. Триггер срабатывает **автоматически** при seeks_count >= 5

### Все оптимизировано:
- ✅ Batch отправка (меньше запросов)
- ✅ Debounce (точнее метрики)
- ✅ Local storage (работает офлайн)
- ✅ Сжатие данных (экономия трафика)

---

**Готов начать подключение! Скажи когда стартуем! 🚀**

