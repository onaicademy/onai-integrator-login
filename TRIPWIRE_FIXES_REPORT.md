# 🔧 ДЕТАЛЬНЫЙ ОТЧЕТ ПО ФИКСАМ TRIPWIRE ПРОДУКТА

**Дата:** 2025-11-29  
**Статус:** Требуется архитектурное решение от AI-архитектора  
**Приоритет:** HIGH  

---

## 📋 ОГЛАВЛЕНИЕ

1. [UI/UX Проблемы](#1-uiux-проблемы)
2. [Видео-плеер](#2-видео-плеер)
3. [Система прогресса и модулей](#3-система-прогресса-и-модулей)
4. [Профиль пользователя](#4-профиль-пользователя)
5. [Система домашних заданий и AI Куратор](#5-система-домашних-заданий-и-ai-куратор)
6. [Архитектурные решения](#6-архитектурные-решения)

---

## 1. UI/UX ПРОБЛЕМЫ

### 1.1 Адаптивность блока "Длительность 14 мин"

**Проблема:** Текст "слипается" на мобильных экранах

**Текущий код:**
```tsx
<motion.div 
  className="bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl"
>
  Длительность 14 мин
</motion.div>

<div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5">
  Длительность 14 мин
</div>
```

**Локация:**
- Компонент: `src/pages/tripwire/TripwireLesson.tsx`
- Роут: `/tripwire/module/:moduleId/lesson/:lessonId`

**Требуется:**
- Адаптивные классы для мобильных (sm:, md:, lg:)
- Уменьшение padding на маленьких экранах
- Возможно, перенос текста на две строки на мобильных

**Предложение:**
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-black/30 rounded-lg border border-white/5">
  <span className="text-sm sm:text-base">Длительность</span>
  <span className="text-[#00FF88] font-semibold text-base sm:text-lg">14 мин</span>
</div>
```

---

### 1.2 Шрифт блока "ЗАВЕРШЕНО"

**Проблема:** Нужно изменить шрифт на `font-mono` как в "PREMIUM LEARNING PLATFORM"

**Текущий код:**
```tsx
<motion.div className="flex items-center gap-3 px-6 py-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl backdrop-blur-sm">
  ЗАВЕРШЕНО
</motion.div>
```

**Эталонный стиль:**
```tsx
<p className="text-[10px] font-mono font-medium text-gray-600 tracking-wide">
  PREMIUM LEARNING PLATFORM
</p>
```

**Требуется:**
```tsx
<motion.div className="flex items-center gap-3 px-6 py-3 bg-[#00FF88]/10 border border-[#00FF88]/30 rounded-xl backdrop-blur-sm">
  <span className="font-mono font-semibold tracking-wider">ЗАВЕРШЕНО</span>
</motion.div>
```

**Локация:** `src/pages/tripwire/TripwireLesson.tsx`

---

### 1.3 Курсив в скорости видео

**Проблема:** При нажатии "Завершить урок" появляется курсив в блоке скорости (0.5x, 0.75x, 1x и т.д.)

**Текущий код:**
```tsx
<div className="flex items-center gap-2">
  0.5x 0.75x 1x 1.25x 1.5x 1.75x 2x
</div>
```

**Локация:** `src/pages/tripwire/TripwireLesson.tsx` - видео плеер

**Требуется:**
- Убрать класс `italic` или `font-italic` из всех состояний компонента
- Проверить стили при завершении урока

---

### 1.4 Курсив в кнопке "ДАЛЕЕ"

**Проблема:** Аналогично п.1.3 - появляется курсив

**Текущий код:**
```tsx
<motion.button 
  className="group px-6 py-4 bg-transparent border-2 border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88] font-sans font-semibold uppercase tracking-wider text-sm"
>
  ДАЛЕЕ
</motion.button>
```

**Требуется:**
- Убрать все `italic` классы
- Добавить явно `not-italic` если нужно

**Локация:** `src/pages/tripwire/TripwireLesson.tsx`

---

### 1.5 Z-index проблема с sidebar

**Проблема:** Текст "НЕЙРОСЕТЯМ" накладывается на sidebar, кнопки не кликаются

**Описание:**
- Контент страницы имеет высокий z-index
- Sidebar имеет низкий z-index
- При наложении контент перекрывает sidebar

**Локация:**
- Sidebar: `src/components/tripwire/TripwireLayout.tsx`
- Контент: страницы в `src/pages/tripwire/`

**Требуется:**
- Sidebar: `z-index: 1000` (минимум)
- Контент: `z-index: 1` (базовый)
- Добавить `padding` контенту, чтобы он не заходил под sidebar

**Предложение:**
```tsx
// TripwireLayout.tsx
<aside className="fixed left-0 top-0 h-screen w-64 bg-black/90 border-r border-white/10 z-[1000]">
  {/* Sidebar content */}
</aside>

<main className="ml-64 p-6 relative z-0">
  {/* Page content */}
</main>
```

---

### 1.6 Убрать эмодзи 💾 с кнопки "Сохранить изменения"

**Текущий код:**
```tsx
<button className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold flex-1">
  💾 Сохранить изменения
</button>
```

**Требуется:**
```tsx
<button className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold flex-1">
  Сохранить изменения
</button>
```

**Локация:** 
- Компонент редактирования урока в админке
- Возможно: `src/components/tripwire/TripwireLessonEditDialog.tsx`

---

## 2. ВИДЕО-ПЛЕЕР

### 2.1 Полноэкранный режим

**Проблема:** Кнопка масштабирования видео не работает. Нужен функционал как в YouTube:
- Нажал на полный экран → видео на весь экран
- Поддержка поворота экрана на мобильных/планшетах
- Работа на iPhone, iPad

**Текущее состояние:**
- Вероятно используется `<video>` тег без Fullscreen API

**Локация:** `src/pages/tripwire/TripwireLesson.tsx`

**Требуется реализовать:**

```typescript
// Fullscreen API
const handleFullscreen = async () => {
  const videoElement = videoRef.current;
  
  if (!document.fullscreenElement) {
    // Enter fullscreen
    if (videoElement.requestFullscreen) {
      await videoElement.requestFullscreen();
    } else if (videoElement.webkitRequestFullscreen) { // Safari
      await videoElement.webkitRequestFullscreen();
    } else if (videoElement.mozRequestFullScreen) { // Firefox
      await videoElement.mozRequestFullScreen();
    } else if (videoElement.msRequestFullscreen) { // IE/Edge
      await videoElement.msRequestFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }
};

// Orientation lock на мобильных
screen.orientation?.lock('landscape').catch(() => {
  // Fallback если не поддерживается
});
```

**API для использования:**
- [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API)
- [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API)

---

### 2.2 Универсальный видео-плеер

**Проблема:** Нужна единая концепция видео-плеера для:
- Tripwire продукта (`/tripwire/*`)
- Основной платформы (`/course/*`)

**Текущие плееры:**
1. `src/pages/tripwire/TripwireLesson.tsx` - Tripwire
2. `src/pages/Lesson.tsx` - Основная платформа

**Требуется:**
- Создать универсальный компонент `VideoPlayer.tsx`
- Единые стили, функционал, контролы
- Адаптация под оба продукта через props

**Предложение архитектуры:**

```typescript
// src/components/VideoPlayer/VideoPlayer.tsx
interface VideoPlayerProps {
  videoUrl: string;
  poster?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onSeek?: (time: number, direction: 'forward' | 'backward') => void;
  autoPlay?: boolean;
  variant?: 'tripwire' | 'platform'; // Для стилизации
}

export const VideoPlayer = ({ 
  videoUrl, 
  onProgress, 
  onComplete,
  variant = 'platform' 
}: VideoPlayerProps) => {
  // Общая логика плеера
  // Трекинг времени
  // Fullscreen API
  // Контролы
};
```

**Использование:**

```tsx
// Tripwire
<VideoPlayer 
  videoUrl={lessonVideo.url}
  variant="tripwire"
  onProgress={handleProgress}
/>

// Основная платформа
<VideoPlayer 
  videoUrl={videoUrl}
  variant="platform"
  onProgress={handleProgress}
/>
```

---

## 3. СИСТЕМА ПРОГРЕССА И МОДУЛЕЙ

### 3.1 Нумерация модулей

**Проблема:** Визуально непонятно, какой модуль первый, второй и т.д.

**Текущие модули:**
1. AI Foundation - Основы AI
2. [Module 2] - название
3. [Module 3] - название
4. [Module 4] - название

**Локация:** `src/pages/tripwire/TripwireProductPage.tsx`

**Требуется:**
```tsx
<div className="relative rounded-[20px] p-6 lg:p-8">
  {/* Номер модуля */}
  <div className="absolute top-6 left-6 w-12 h-12 bg-[#00FF88]/20 border-2 border-[#00FF88] rounded-full flex items-center justify-center">
    <span className="font-mono font-bold text-2xl text-[#00FF88]">1</span>
  </div>
  
  {/* Остальной контент модуля */}
</div>
```

**Пример дизайна:**
```
┌─────────────────────────────┐
│  ⭕ 1   AI FOUNDATION        │
│         ОСНОВЫ AI           │
│         45 мин • 1 урок     │
└─────────────────────────────┘
```

---

### 3.2 Автоматический расчет длительности модулей

**Проблема:** 
- Модуль 1 показывает 45 мин (должно быть 14 мин из урока)
- Модуль 2 показывает 60 мин (некорректно)
- Нужно автоматически подтягивать из счетчика уроков
- Если уроков нет → показывать "0 мин"

**Текущая архитектура:**
```typescript
// Вероятно хардкод
<span>45 мин</span>
```

**Требуется реализовать:**

```typescript
// 1. В базе данных уже есть duration в video_content
// Таблица: video_content
// Поля: lesson_id, duration_seconds

// 2. Создать функцию подсчета длительности модуля
const calculateModuleDuration = async (moduleId: string) => {
  // Получить все уроки модуля
  const { data: lessons } = await supabase
    .from('tripwire_lessons')
    .select('id')
    .eq('module_id', moduleId);
  
  if (!lessons?.length) return 0;
  
  // Получить длительность всех видео в этих уроках
  const lessonIds = lessons.map(l => l.id);
  const { data: videos } = await supabase
    .from('video_content')
    .select('duration_seconds')
    .in('lesson_id', lessonIds);
  
  // Суммировать
  const totalSeconds = videos?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) || 0;
  const totalMinutes = Math.round(totalSeconds / 60);
  
  return totalMinutes;
};

// 3. Использовать в компоненте
const [moduleDuration, setModuleDuration] = useState(0);

useEffect(() => {
  calculateModuleDuration(moduleId).then(setModuleDuration);
}, [moduleId]);

// 4. Отображение
<span className="text-gray-400">
  {moduleDuration > 0 ? `${moduleDuration} мин` : '0 мин'}
</span>
```

**Локация:**
- UI: `src/pages/tripwire/TripwireProductPage.tsx`
- Логика: создать `src/services/tripwireModuleService.ts`

**База данных:**
- Таблица: `tripwire_modules` (id, title, order)
- Таблица: `tripwire_lessons` (id, module_id, title)
- Таблица: `video_content` (id, lesson_id, duration_seconds)

---

### 3.3 Трекинг просмотра видео

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** 
Система не проверяет, смотрел ли пользователь видео. Можно нажать "Завершить урок" не просматривая.

**Требуемая логика:**

1. **Трекинг времени просмотра:**
   - Сколько секунд посмотрено
   - Сколько раз перемотано вперед
   - Сколько раз перемотано назад
   - Процент просмотра

2. **Условия завершения урока:**
   - Просмотрено минимум 80% видео
   - Если было много перемоток вперед → предупреждение
   - Если не досмотрел → кнопка "Завершить урок" disabled

3. **Метрики внимательности:**
   - Оценка качества просмотра (1-100%)
   - Учет пауз, перемоток, скорости воспроизведения

**Архитектура реализации:**

```typescript
// 1. Создать таблицу video_tracking
CREATE TABLE video_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lesson_id INTEGER REFERENCES tripwire_lessons(id),
  
  -- Трекинг просмотра
  total_watch_time_seconds INTEGER DEFAULT 0, -- Фактическое время просмотра
  video_duration_seconds INTEGER NOT NULL, -- Длительность видео
  watch_percentage DECIMAL(5,2) DEFAULT 0, -- Процент просмотра
  
  -- Метрики поведения
  seek_forward_count INTEGER DEFAULT 0, -- Перемотки вперед
  seek_backward_count INTEGER DEFAULT 0, -- Перемотки назад
  pause_count INTEGER DEFAULT 0, -- Количество пауз
  playback_speed DECIMAL(3,2) DEFAULT 1.0, -- Средняя скорость
  
  -- Оценка внимательности
  attention_score INTEGER DEFAULT 0, -- 0-100
  is_qualified_for_completion BOOLEAN DEFAULT FALSE, -- Можно ли завершить урок
  
  -- Метаданные
  started_at TIMESTAMP DEFAULT NOW(),
  last_position_seconds INTEGER DEFAULT 0, -- Последняя позиция
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

// 2. Хук для трекинга
const useVideoTracking = (lessonId: number, videoDuration: number) => {
  const { user } = useAuth();
  const [tracking, setTracking] = useState<VideoTracking | null>(null);
  
  // Обновлять каждые 5 секунд
  const updateTracking = async (currentTime: number, event: 'progress' | 'seek_forward' | 'seek_backward' | 'pause') => {
    const response = await api.post('/api/video-tracking/update', {
      userId: user.id,
      lessonId,
      currentTime,
      videoDuration,
      event
    });
    
    setTracking(response.data);
  };
  
  return { tracking, updateTracking };
};

// 3. Логика расчета на backend
const calculateAttentionScore = (tracking: VideoTracking) => {
  let score = 100;
  
  // Штраф за перемотки вперед (пропуск контента)
  score -= tracking.seek_forward_count * 5;
  
  // Бонус за перемотки назад (пересмотр)
  score += tracking.seek_backward_count * 2;
  
  // Штраф за низкий процент просмотра
  if (tracking.watch_percentage < 80) {
    score -= (80 - tracking.watch_percentage) * 2;
  }
  
  // Бонус за скорость 1x (внимательный просмотр)
  if (tracking.playback_speed === 1.0) {
    score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

// 4. Проверка возможности завершения
const canCompleteLesson = (tracking: VideoTracking) => {
  return tracking.watch_percentage >= 80 && 
         tracking.attention_score >= 50;
};
```

**Интеграция в UI:**

```tsx
const TripwireLesson = () => {
  const { tracking, updateTracking } = useVideoTracking(lessonId, videoDuration);
  const [canComplete, setCanComplete] = useState(false);
  
  useEffect(() => {
    if (tracking) {
      setCanComplete(tracking.is_qualified_for_completion);
    }
  }, [tracking]);
  
  const handleCompleteLesson = () => {
    if (!canComplete) {
      toast({
        title: "⚠️ Досмотрите урок",
        description: `Вы посмотрели только ${tracking.watch_percentage}% урока. Минимум 80% для завершения.`,
        variant: "destructive"
      });
      return;
    }
    
    // Завершить урок
    completeLesson();
  };
  
  return (
    <>
      {/* Видео плеер с трекингом */}
      <VideoPlayer 
        onProgress={(time) => updateTracking(time, 'progress')}
        onSeek={(direction) => updateTracking(currentTime, direction)}
      />
      
      {/* Индикатор прогресса */}
      <div className="flex items-center gap-3">
        <span>Просмотрено: {tracking?.watch_percentage}%</span>
        <span>Внимательность: {tracking?.attention_score}/100</span>
      </div>
      
      {/* Кнопка завершения */}
      <button 
        disabled={!canComplete}
        onClick={handleCompleteLesson}
      >
        Завершить урок
      </button>
    </>
  );
};
```

**Файлы для создания:**
- `backend/src/routes/video-tracking.ts`
- `backend/src/services/videoTrackingService.ts`
- `src/hooks/useVideoTracking.ts`
- SQL миграция: `backend/migrations/add_video_tracking.sql`

---

### 3.4 Чекпоинты открытия следующих модулей

**Проблема:** Не проверена технология с открытием следующих модулей после завершения предыдущего

**Текущая архитектура (вероятно):**
- Таблица `tripwire_module_unlocks` существует
- Но логика может быть не полностью реализована

**Требуется проверить:**

1. **При завершении урока:**
   - Проверяется ли, что это последний урок в модуле?
   - Создается ли запись в `module_unlocks` для следующего модуля?

2. **При рендере модулей:**
   - Проверяется ли статус unlock?
   - Блокируются ли модули с замком?

**Логика должна быть:**

```typescript
// 1. При завершении урока
const handleLessonComplete = async (lessonId: number) => {
  // Получить модуль урока
  const { data: lesson } = await supabase
    .from('tripwire_lessons')
    .select('module_id')
    .eq('id', lessonId)
    .single();
  
  // Проверить, все ли уроки модуля завершены
  const { data: moduleLessons } = await supabase
    .from('tripwire_lessons')
    .select('id')
    .eq('module_id', lesson.module_id);
  
  const { data: completedLessons } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .in('lesson_id', moduleLessons.map(l => l.id));
  
  // Если все уроки завершены → открыть следующий модуль
  if (completedLessons.length === moduleLessons.length) {
    await unlockNextModule(userId, lesson.module_id);
  }
};

// 2. Открытие следующего модуля
const unlockNextModule = async (userId: string, currentModuleId: number) => {
  // Получить порядковый номер текущего модуля
  const { data: currentModule } = await supabase
    .from('tripwire_modules')
    .select('order')
    .eq('id', currentModuleId)
    .single();
  
  // Найти следующий модуль
  const { data: nextModule } = await supabase
    .from('tripwire_modules')
    .select('id')
    .eq('order', currentModule.order + 1)
    .single();
  
  if (nextModule) {
    // Создать unlock
    await supabase
      .from('tripwire_module_unlocks')
      .insert({
        user_id: userId,
        module_id: nextModule.id,
        unlocked_at: new Date().toISOString()
      });
    
    // Показать уведомление
    toast({
      title: "🎉 Новый модуль открыт!",
      description: "Вы завершили модуль и открыли следующий",
    });
  }
};

// 3. Проверка доступа к модулю
const isModuleUnlocked = async (userId: string, moduleId: number) => {
  // Модуль 1 всегда открыт
  const { data: module } = await supabase
    .from('tripwire_modules')
    .select('order')
    .eq('id', moduleId)
    .single();
  
  if (module.order === 1) return true;
  
  // Проверить unlock
  const { data: unlock } = await supabase
    .from('tripwire_module_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .single();
  
  return !!unlock;
};
```

**UI индикация:**

```tsx
{!isUnlocked && (
  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-[20px]">
    <div className="text-center">
      <Lock className="w-12 h-12 text-white/50 mx-auto mb-4" />
      <p className="text-white/70">Завершите предыдущий модуль</p>
    </div>
  </div>
)}
```

**Файлы:**
- `backend/src/services/tripwireProgressService.ts`
- `src/hooks/useTripwireProgress.ts`

---

## 4. ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ

### 4.1 Раздел "Мой профиль" для Tripwire

**Проблема:** Функционал не реализован (пустая страница)

**Требуется перенести с основной платформы:**
1. Смена имени
2. Смена почты
3. Смена пароля
4. Аватар (опционально)

**НЕ переносить:**
- Уровни
- Достижения
- Геймификация

**Добавить для Tripwire:**
1. **Статистика прогресса:**
   - Пройдено модулей: X из 4
   - Пройдено уроков: X из Y
   - Общее время обучения: X часов

2. **Аналитика внимательности:**
   - Средний балл внимательности: 85/100
   - Количество пересмотров: 12
   - Любимая скорость: 1.25x

**Архитектура:**

```typescript
// 1. API endpoint для статистики
GET /api/tripwire/profile/stats?userId={userId}

Response:
{
  "modules_completed": 2,
  "modules_total": 4,
  "lessons_completed": 8,
  "lessons_total": 16,
  "total_watch_time_seconds": 7200,
  "average_attention_score": 85,
  "total_reviews": 12,
  "favorite_playback_speed": 1.25
}

// 2. Компонент профиля
interface TripwireProfileStats {
  modulesCompleted: number;
  modulesTotal: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  totalWatchTimeSeconds: number;
  averageAttentionScore: number;
}

const TripwireProfile = () => {
  const [stats, setStats] = useState<TripwireProfileStats | null>(null);
  
  useEffect(() => {
    fetchProfileStats().then(setStats);
  }, []);
  
  return (
    <div className="p-8">
      <h1>Мой профиль</h1>
      
      {/* Базовая информация */}
      <ProfileBasicInfo /> {/* Переиспользовать с основной платформы */}
      
      {/* Статистика прогресса */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <StatCard 
          title="Модули"
          value={`${stats.modulesCompleted}/${stats.modulesTotal}`}
        />
        <StatCard 
          title="Уроки"
          value={`${stats.lessonsCompleted}/${stats.lessonsTotal}`}
        />
        <StatCard 
          title="Время обучения"
          value={formatTime(stats.totalWatchTimeSeconds)}
        />
        <StatCard 
          title="Внимательность"
          value={`${stats.averageAttentionScore}/100`}
        />
      </div>
      
      {/* Настройки профиля */}
      <ProfileSettings /> {/* Переиспользовать */}
    </div>
  );
};
```

**Локация:**
- Создать: `src/pages/tripwire/TripwireProfile.tsx`
- Роут: `/tripwire/profile`
- Backend: `backend/src/routes/tripwire-profile.ts`

**Переиспользовать компоненты:**
- `src/pages/ProfileSettings.tsx` - смена имени, почты, пароля
- Но адаптировать под Tripwire дизайн

---

## 5. СИСТЕМА ДОМАШНИХ ЗАДАНИЙ И AI КУРАТОР

### 5.1 Концепция домашних заданий

**Требования:**

1. **Домашние задания привязаны к урокам:**
   - Не все уроки имеют ДЗ
   - Админ настраивает, какие уроки требуют ДЗ

2. **Логика завершения урока:**
   ```
   Условия для кнопки "Завершить урок":
   1. Просмотрено 80%+ видео (трекинг)
   2. Если урок имеет ДЗ → ДЗ должно быть сдано и принято AI куратором
   3. Если ДЗ нет → можно завершать после просмотра
   ```

3. **AI Куратор проверяет ДЗ:**
   - Пользователь отправляет текст/файлы AI куратору
   - AI анализирует ответ
   - AI либо принимает, либо просит доработать

4. **Триггер завершения:**
   - После принятия ДЗ → срабатывает чекпоинт
   - Кнопка "Завершить урок" становится активной

**Архитектура базы данных:**

```sql
-- 1. Таблица домашних заданий к урокам
CREATE TABLE tripwire_lesson_homeworks (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES tripwire_lessons(id),
  
  -- Описание задания
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[], -- Массив требований
  
  -- AI Куратор
  ai_curator_prompt TEXT NOT NULL, -- Промпт для проверки
  ai_assistant_id TEXT NOT NULL, -- ID OpenAI Assistant
  
  -- Настройки
  is_required BOOLEAN DEFAULT TRUE, -- Обязательно ли для завершения урока
  max_attempts INTEGER DEFAULT 3, -- Максимум попыток сдачи
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Таблица сдачи ДЗ пользователями
CREATE TABLE tripwire_homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id INTEGER REFERENCES tripwire_lesson_homeworks(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Ответ пользователя
  submission_text TEXT,
  submission_files JSONB, -- [{url, name, type}]
  
  -- Статус проверки
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'needs_revision')),
  ai_feedback TEXT, -- Обратная связь от AI
  ai_score INTEGER, -- Оценка 0-100
  
  -- Попытки
  attempt_number INTEGER DEFAULT 1,
  
  -- Timestamps
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  UNIQUE(homework_id, user_id, attempt_number)
);

-- 3. Триггер завершения урока
CREATE TABLE tripwire_lesson_completion_requirements (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES tripwire_lessons(id),
  user_id UUID REFERENCES auth.users(id),
  
  -- Чекпоинты
  video_watched BOOLEAN DEFAULT FALSE, -- 80%+ просмотрено
  homework_accepted BOOLEAN DEFAULT FALSE, -- ДЗ принято (если требуется)
  
  -- Итоговый статус
  can_complete BOOLEAN GENERATED ALWAYS AS (
    video_watched AND (
      NOT EXISTS (
        SELECT 1 FROM tripwire_lesson_homeworks 
        WHERE lesson_id = tripwire_lesson_completion_requirements.lesson_id 
        AND is_required = TRUE
      ) OR homework_accepted
    )
  ) STORED,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(lesson_id, user_id)
);
```

**Backend API:**

```typescript
// backend/src/routes/tripwire-homework.ts

// 1. Получить ДЗ для урока
router.get('/homework/:lessonId', async (req, res) => {
  const { lessonId } = req.params;
  
  const { data: homework } = await supabase
    .from('tripwire_lesson_homeworks')
    .select('*')
    .eq('lesson_id', lessonId)
    .single();
  
  res.json(homework);
});

// 2. Сдать ДЗ
router.post('/homework/:homeworkId/submit', async (req, res) => {
  const { homeworkId } = req.params;
  const { userId, submissionText, submissionFiles } = req.body;
  
  // Проверить количество попыток
  const { data: attempts } = await supabase
    .from('tripwire_homework_submissions')
    .select('attempt_number')
    .eq('homework_id', homeworkId)
    .eq('user_id', userId)
    .order('attempt_number', { ascending: false })
    .limit(1);
  
  const attemptNumber = (attempts?.[0]?.attempt_number || 0) + 1;
  
  // Создать submission
  const { data: submission } = await supabase
    .from('tripwire_homework_submissions')
    .insert({
      homework_id: homeworkId,
      user_id: userId,
      submission_text: submissionText,
      submission_files: submissionFiles,
      status: 'pending',
      attempt_number: attemptNumber
    })
    .select()
    .single();
  
  // Отправить на проверку AI куратору
  const result = await checkHomeworkWithAI(submission.id);
  
  res.json(result);
});

// 3. Проверка ДЗ через AI
const checkHomeworkWithAI = async (submissionId: string) => {
  // Получить submission и homework
  const { data: submission } = await supabase
    .from('tripwire_homework_submissions')
    .select(`
      *,
      homework:tripwire_lesson_homeworks(*)
    `)
    .eq('id', submissionId)
    .single();
  
  // Создать thread с OpenAI Assistant
  const thread = await openai.beta.threads.create();
  
  // Отправить submission AI куратору
  await openai.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: `Задание: ${submission.homework.description}\n\nОтвет студента: ${submission.submission_text}`
  });
  
  // Запустить проверку
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: submission.homework.ai_assistant_id
  });
  
  // Дождаться результата
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  while (runStatus.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }
  
  // Получить ответ AI
  const messages = await openai.beta.threads.messages.list(thread.id);
  const aiFeedback = messages.data[0].content[0].text.value;
  
  // Парсинг ответа (ожидаем JSON формат)
  const aiResult = JSON.parse(aiFeedback);
  // { status: 'accepted', score: 85, feedback: '...' }
  
  // Обновить submission
  await supabase
    .from('tripwire_homework_submissions')
    .update({
      status: aiResult.status,
      ai_feedback: aiResult.feedback,
      ai_score: aiResult.score,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', submissionId);
  
  // Если принято → обновить чекпоинт
  if (aiResult.status === 'accepted') {
    await supabase
      .from('tripwire_lesson_completion_requirements')
      .update({ homework_accepted: true })
      .eq('lesson_id', submission.homework.lesson_id)
      .eq('user_id', submission.user_id);
  }
  
  return aiResult;
};
```

**Frontend интеграция:**

```tsx
const TripwireLesson = () => {
  const [homework, setHomework] = useState(null);
  const [canComplete, setCanComplete] = useState(false);
  
  useEffect(() => {
    // Загрузить ДЗ
    fetchHomework(lessonId).then(setHomework);
    
    // Проверить чекпоинты
    checkCompletionRequirements(lessonId, userId).then(setCanComplete);
  }, [lessonId]);
  
  const handleCompleteLesson = () => {
    if (!canComplete) {
      if (!videoTracking.is_qualified) {
        toast.error("Досмотрите урок до конца");
      } else if (homework && !homework.is_accepted) {
        toast.error("Сдайте домашнее задание AI куратору");
      }
      return;
    }
    
    // Завершить урок
    completeLesson();
  };
  
  return (
    <div>
      {/* Видео */}
      <VideoPlayer />
      
      {/* Домашнее задание */}
      {homework && (
        <HomeworkSection homework={homework} />
      )}
      
      {/* Кнопка завершения */}
      <button 
        disabled={!canComplete}
        onClick={handleCompleteLesson}
      >
        Завершить урок
      </button>
    </div>
  );
};
```

---

### 5.2 Кнопка AI Куратор

**Требование:** Добавить кнопку "AI Куратор" в интерфейс Tripwire

**Местоположение:** Главная страница продукта + sidebar

**Дизайн кнопки:**

```tsx
// В TripwireProductPage.tsx
<motion.div
  whileHover={{ scale: 1.02 }}
  className="fixed bottom-8 right-8 z-50"
>
  <button
    onClick={() => setAICuratorOpen(true)}
    className="group relative px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-2xl hover:shadow-purple-500/50 transition-all duration-300"
  >
    {/* Иконка */}
    <div className="flex items-center gap-3">
      <Bot className="w-6 h-6 text-white" />
      <span className="font-semibold text-white">AI Куратор</span>
    </div>
    
    {/* Индикатор новых сообщений */}
    {unreadMessages > 0 && (
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-xs font-bold text-white">{unreadMessages}</span>
      </div>
    )}
  </button>
</motion.div>

// Модальное окно чата
<AICuratorDialog 
  open={aiCuratorOpen}
  onClose={() => setAICuratorOpen(false)}
/>
```

**Функционал:**
- Чат с AI куратором
- История сообщений
- Сдача домашних заданий
- Вопросы по материалу

**Компонент чата:**

```tsx
// src/components/tripwire/AICuratorDialog.tsx
const AICuratorDialog = ({ open, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  const sendMessage = async () => {
    // Отправить сообщение AI куратору
    const response = await api.post('/api/ai-curator/message', {
      userId: user.id,
      message: input
    });
    
    setMessages([...messages, 
      { role: 'user', content: input },
      { role: 'assistant', content: response.data.message }
    ]);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[600px]">
        <DialogHeader>
          <DialogTitle>AI Куратор</DialogTitle>
        </DialogHeader>
        
        {/* История сообщений */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
        </div>
        
        {/* Ввод */}
        <div className="flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос или сдайте ДЗ..."
          />
          <Button onClick={sendMessage}>
            Отправить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

### 5.3 Промпт для AI Куратора

**Требование:** Написать системный промпт для OpenAI Assistant

**Промпт для AI Куратора:**

```
# Роль
Вы — AI Куратор образовательной платформы onAI Academy, продукт "Integrator V3.0". Ваша задача — помогать студентам осваивать AI-интеграции, проверять домашние задания и мотивировать к обучению.

# Контекст
- Платформа: onAI Academy Tripwire Product
- Курс: Integrator V3.0 - от нуля до первых $1000 с AI
- Формат: 4 модуля, каждый с уроками и домашними заданиями

# Ваши функции

## 1. Проверка домашних заданий
Когда студент присылает ДЗ:
1. Внимательно прочитайте требования к заданию
2. Оцените ответ студента по критериям:
   - Полнота ответа (0-30 баллов)
   - Правильность решения (0-40 баллов)
   - Практическое применение (0-30 баллов)
3. Дайте развернутую обратную связь:
   - Что сделано хорошо
   - Что нужно улучшить
   - Конкретные рекомендации
4. Примите решение:
   - "accepted" (85+ баллов) - задание принято
   - "needs_revision" (50-84 балла) - требуется доработка
   - "rejected" (<50 баллов) - нужно переделать

## 2. Ответы на вопросы
- Отвечайте кратко и по делу
- Давайте примеры из реальной практики
- Мотивируйте студента продолжать обучение

## 3. Мотивация и поддержка
- Хвалите за прогресс
- Поддерживайте в сложных моментах
- Напоминайте о цели: заработать первые $1000 с AI

# Формат ответа для проверки ДЗ
Всегда возвращайте JSON:
{
  "status": "accepted | needs_revision | rejected",
  "score": 0-100,
  "feedback": "Подробная обратная связь",
  "praise": "Что сделано хорошо",
  "improvements": ["Что улучшить 1", "Что улучшить 2"],
  "next_steps": "Рекомендации для следующего шага"
}

# Стиль общения
- Дружелюбный, но профессиональный
- На "ты"
- Используйте эмодзи для эмоций (но умеренно)
- Говорите просто, без сложных терминов

# Примеры

## Пример 1: Принято
{
  "status": "accepted",
  "score": 90,
  "feedback": "Отличная работа! Ты детально разобрал все этапы интеграции ChatGPT API, привел рабочий код и описал возможные ошибки.",
  "praise": "Особенно впечатлил раздел про обработку ошибок - это показывает профессиональный подход.",
  "improvements": ["Можно было бы добавить примеры тестирования API"],
  "next_steps": "Переходи к следующему уроку про автоматизацию с Make.com"
}

## Пример 2: Требуется доработка
{
  "status": "needs_revision",
  "score": 65,
  "feedback": "Ты на правильном пути, но есть несколько важных моментов. Код работает, но не хватает обработки ошибок и примеров использования.",
  "praise": "Хорошо описал базовую логику интеграции.",
  "improvements": [
    "Добавь обработку ошибок API (try-catch блоки)",
    "Приведи 2-3 примера практического применения",
    "Опиши, как проверить, что интеграция работает"
  ],
  "next_steps": "Доработай эти моменты и пришли обновленную версию. У тебя все получится!"
}

# Важно
- Всегда будьте объективны в оценке
- Давайте конструктивную критику
- Мотивируйте студента расти
- Помните: цель курса - первые $1000 с AI
```

**Создание Assistant в OpenAI:**

```typescript
// backend/src/scripts/create-ai-curator-assistant.ts
const assistant = await openai.beta.assistants.create({
  name: "AI Куратор onAI Academy",
  instructions: `${ПРОМПТ_ВЫШЕ}`,
  model: "gpt-4-turbo-preview",
  tools: [
    {
      type: "function",
      function: {
        name: "check_homework",
        description: "Проверить домашнее задание студента",
        parameters: {
          type: "object",
          properties: {
            homework_requirements: {
              type: "string",
              description: "Требования к домашнему заданию"
            },
            student_answer: {
              type: "string",
              description: "Ответ студента"
            }
          },
          required: ["homework_requirements", "student_answer"]
        }
      }
    }
  ]
});

console.log("AI Куратор создан:", assistant.id);
// Сохранить assistant.id в .env как AI_CURATOR_ASSISTANT_ID
```

**Добавить в .env:**
```bash
AI_CURATOR_ASSISTANT_ID=asst_xxxxxxxxxxxxx
```

---

## 6. АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### 6.1 Структура файлов

**Создать новые файлы:**

```
backend/
├── src/
│   ├── routes/
│   │   ├── video-tracking.ts         # NEW: Трекинг видео
│   │   ├── tripwire-homework.ts      # NEW: Домашние задания
│   │   ├── tripwire-profile.ts       # NEW: Профиль Tripwire
│   │   └── ai-curator.ts             # NEW: AI Куратор чат
│   ├── services/
│   │   ├── videoTrackingService.ts   # NEW
│   │   ├── homeworkService.ts        # NEW
│   │   ├── aiCuratorService.ts       # NEW
│   │   └── tripwireModuleService.ts  # NEW: Расчет длительности
│   └── scripts/
│       └── create-ai-curator-assistant.ts # NEW

frontend/
├── src/
│   ├── components/
│   │   ├── VideoPlayer/
│   │   │   ├── VideoPlayer.tsx       # NEW: Универсальный плеер
│   │   │   ├── VideoControls.tsx     # NEW
│   │   │   └── FullscreenButton.tsx  # NEW
│   │   └── tripwire/
│   │       ├── AICuratorDialog.tsx   # NEW: Чат с куратором
│   │       └── HomeworkSection.tsx   # NEW: Блок ДЗ
│   ├── pages/tripwire/
│   │   └── TripwireProfile.tsx       # NEW: Профиль
│   └── hooks/
│       ├── useVideoTracking.ts       # NEW: Трекинг видео
│       ├── useHomework.ts            # NEW: ДЗ
│       └── useAICurator.ts           # NEW: Чат с куратором
```

---

### 6.2 База данных - Новые таблицы

**SQL миграции:**

```sql
-- backend/migrations/add_video_tracking.sql
CREATE TABLE video_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lesson_id INTEGER,
  
  total_watch_time_seconds INTEGER DEFAULT 0,
  video_duration_seconds INTEGER NOT NULL,
  watch_percentage DECIMAL(5,2) DEFAULT 0,
  
  seek_forward_count INTEGER DEFAULT 0,
  seek_backward_count INTEGER DEFAULT 0,
  pause_count INTEGER DEFAULT 0,
  playback_speed DECIMAL(3,2) DEFAULT 1.0,
  
  attention_score INTEGER DEFAULT 0,
  is_qualified_for_completion BOOLEAN DEFAULT FALSE,
  
  started_at TIMESTAMP DEFAULT NOW(),
  last_position_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, lesson_id)
);

-- backend/migrations/add_homework_system.sql
CREATE TABLE tripwire_lesson_homeworks (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES tripwire_lessons(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[],
  ai_curator_prompt TEXT NOT NULL,
  ai_assistant_id TEXT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tripwire_homework_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  homework_id INTEGER REFERENCES tripwire_lesson_homeworks(id),
  user_id UUID REFERENCES auth.users(id),
  submission_text TEXT,
  submission_files JSONB,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'needs_revision')),
  ai_feedback TEXT,
  ai_score INTEGER,
  attempt_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  UNIQUE(homework_id, user_id, attempt_number)
);

CREATE TABLE tripwire_lesson_completion_requirements (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER,
  user_id UUID REFERENCES auth.users(id),
  video_watched BOOLEAN DEFAULT FALSE,
  homework_accepted BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- backend/migrations/add_ai_curator_chat.sql
CREATE TABLE ai_curator_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  openai_thread_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ai_curator_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES ai_curator_conversations(id),
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6.3 API Endpoints

**Новые эндпоинты:**

```typescript
// Video Tracking
POST   /api/video-tracking/update           # Обновить прогресс просмотра
GET    /api/video-tracking/:lessonId        # Получить статистику

// Homework
GET    /api/tripwire/homework/:lessonId     # Получить ДЗ для урока
POST   /api/tripwire/homework/:id/submit    # Сдать ДЗ
GET    /api/tripwire/homework/my-submissions # История сдачи

// AI Curator
POST   /api/ai-curator/message               # Отправить сообщение
GET    /api/ai-curator/conversation          # История чата
POST   /api/ai-curator/check-homework        # Проверить ДЗ

// Tripwire Profile
GET    /api/tripwire/profile/stats           # Статистика прогресса
PUT    /api/tripwire/profile/settings        # Обновить профиль

// Module Duration
GET    /api/tripwire/modules/:id/duration    # Рассчитать длительность модуля
```

---

### 6.4 Приоритеты реализации

**PHASE 1 (Критично):**
1. ✅ UI фиксы (адаптивность, курсив, z-index) - 2 часа
2. ✅ Универсальный видео-плеер с fullscreen - 4 часа
3. ✅ Трекинг просмотра видео - 6 часов
4. ✅ Расчет длительности модулей - 2 часа

**PHASE 2 (Важно):**
5. ✅ Система домашних заданий (база + API) - 8 часов
6. ✅ AI Куратор (Assistant + промпт) - 4 часа
7. ✅ Чекпоинты открытия модулей - 4 часа

**PHASE 3 (Дополнительно):**
8. ✅ Раздел "Мой профиль" для Tripwire - 4 часа
9. ✅ Аналитика внимательности - 3 часа
10. ✅ Кнопка AI Куратор в UI - 2 часа

**Общая оценка:** 39 часов чистой работы (≈ 5-7 рабочих дней)

---

## 7. ВОПРОСЫ К AI АРХИТЕКТОРУ

1. **Видео-плеер:**
   - Использовать готовую библиотеку (video.js, plyr.js) или писать с нуля?
   - Как синхронизировать трекинг между Tripwire и основной платформой?

2. **Домашние задания:**
   - Нужна ли поддержка файлов (скриншоты, PDF)?
   - Как хранить файлы? (Cloudflare R2 или Supabase Storage)

3. **AI Куратор:**
   - Один Assistant на всех или персональные Thread'ы для каждого студента?
   - Лимиты на количество сообщений в день?

4. **Производительность:**
   - Нужен ли кеш для расчета длительности модулей?
   - Как оптимизировать трекинг видео (не слишком частые запросы)?

5. **Безопасность:**
   - RLS политики для новых таблиц?
   - Валидация на уровне базы или backend?

---

## 8. ТЕСТИРОВАНИЕ

**Чек-лист после реализации:**

- [ ] Видео корректно работает на всех экранах (мобильный, планшет, десктоп)
- [ ] Fullscreen работает на iOS Safari
- [ ] Трекинг точно считает время просмотра
- [ ] Нельзя завершить урок без просмотра 80% видео
- [ ] ДЗ корректно проверяется AI куратором
- [ ] Следующий модуль открывается после завершения предыдущего
- [ ] Длительность модулей обновляется автоматически
- [ ] Профиль показывает актуальную статистику
- [ ] Кнопка AI Куратор работает на всех страницах
- [ ] Все тексты без курсива
- [ ] Sidebar не перекрывается контентом

---

## 9. ЗАКЛЮЧЕНИЕ

Этот документ содержит полную спецификацию фиксов для Tripwire продукта. Все задачи систематизированы, приоритизированы и готовы к реализации.

**Следующие шаги:**
1. AI Архитектор изучает документ
2. Принимает архитектурные решения по вопросам из раздела 7
3. Дает детальные инструкции по реализации
4. После этого начинается поэтапная разработка (Phase 1 → Phase 2 → Phase 3)

---

**Автор:** AI Assistant  
**Дата:** 2025-11-29  
**Версия:** 1.0  
**Статус:** Готов к передаче AI Архитектору

