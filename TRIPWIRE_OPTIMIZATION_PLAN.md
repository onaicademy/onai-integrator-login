# 🚀 TRIPWIRE - ПЛАН ОПТИМИЗАЦИИ ПЛАТФОРМЫ

## ✅ ПРОВЕРЕНО:

### 1️⃣ **Достижения (Achievements)**
- ✅ Таблица `user_achievements` существует
- ✅ Backend API `/api/tripwire/unlock-achievement` работает
- ✅ Frontend вызывает API после completion
- ✅ Confetti анимация на завершение
- ✅ Модалка для достижений
- ✅ Автоматическое открытие следующего модуля

### 2️⃣ **Сертификаты (Certificates)**
- ✅ Автоматическая выдача после Module 18 (3)
- ✅ Обновление `tripwire_user_profile.certificate_issued`
- ✅ Достижение `tripwire_graduate` разблокируется

### 3️⃣ **Видео Трекинг (80% правило)**
- ✅ Сегментное отслеживание просмотренных секунд
- ✅ Расчёт уникального времени просмотра
- ✅ Проверка 80% для completion
- ✅ Сохранение в `video_tracking` / `tripwire_progress`

---

## 🔥 ПРОБЛЕМЫ (ОТ ПОЛЬЗОВАТЕЛЯ):

1. **Дико лагает** - медленная загрузка страниц
2. **Виснет** - фризы при взаимодействии
3. **Видео грузится очень долго** - задержка при старте

---

## 🎯 ПЛАН ОПТИМИЗАЦИИ:

### 1️⃣ **ВИДЕО ПЛЕЕР (КРИТИЧНО)**

#### Проблема:
- Видео загружается полностью перед показом
- Нет preloading стратегии
- Возможно высокое качество = большой размер

#### Решение:
```typescript
// a) Lazy loading видео
<video 
  preload="metadata"  // ✅ Вместо "auto"
  poster={thumbnailUrl}  // ✅ Показываем превью
/>

// b) Adaptive bitrate (если используем Bunny Stream)
// Использовать HLS/DASH для автоматического выбора качества

// c) Оптимизация Bunny Stream
// - Enable video compression
// - Use multiple resolutions (360p, 480p, 720p, 1080p)
// - Enable adaptive streaming
```

#### Код изменения:
**File:** `src/pages/tripwire/TripwireLesson.tsx`

```diff
<video
  ref={videoRef}
  src={currentLesson?.video_url}
  className="w-full rounded-xl"
- preload="auto"
+ preload="metadata"
+ poster={currentLesson?.thumbnail_url}
  onTimeUpdate={handleTimeUpdate}
  onPlay={handlePlay}
  onPause={handlePause}
  onSeeking={handleSeeking}
  onLoadedMetadata={handleLoadedMetadata}
/>
```

---

### 2️⃣ **REACT РЕРЕНДЕРЫ (ВАЖНО)**

#### Проблема:
- Много ненужных ререндеров компонентов
- Inline функции в JSX
- Нет мемоизации тяжёлых вычислений

#### Решение:

**a) Мемоизация компонентов:**
```typescript
import { memo, useMemo, useCallback } from 'react';

// Компоненты списков
export const ModuleCard = memo(({ module }) => {
  // ...
});

// Вычисления
const sortedModules = useMemo(() => {
  return modules.sort((a, b) => a.id - b.id);
}, [modules]);

// Коллбэки
const handleClick = useCallback(() => {
  navigate(`/tripwire/lesson/${lessonId}`);
}, [lessonId, navigate]);
```

**b) Виртуализация списков (если много уроков):**
```typescript
import { FixedSizeList } from 'react-window';

// Для больших списков уроков
<FixedSizeList
  height={600}
  itemCount={lessons.length}
  itemSize={100}
>
  {({ index, style }) => (
    <div style={style}>
      <LessonCard lesson={lessons[index]} />
    </div>
  )}
</FixedSizeList>
```

---

### 3️⃣ **API ЗАПРОСЫ (ВАЖНО)**

#### Проблема:
- Множественные одинаковые запросы
- Нет кэширования
- Waterfall запросы (последовательные)

#### Решение:

**a) React Query для кэширования:**
```typescript
import { useQuery } from '@tanstack/react-query';

const { data: modules } = useQuery({
  queryKey: ['modules', userId],
  queryFn: () => api.get('/api/tripwire/modules'),
  staleTime: 5 * 60 * 1000, // 5 минут кэш
  cacheTime: 10 * 60 * 1000, // 10 минут в памяти
});
```

**b) Batch API запросы:**
```typescript
// ❌ ПЛОХО: 3 отдельных запроса
const modules = await api.get('/api/tripwire/modules');
const progress = await api.get('/api/tripwire/progress');
const achievements = await api.get('/api/tripwire/achievements');

// ✅ ХОРОШО: 1 батч запрос
const data = await api.post('/api/tripwire/batch', {
  queries: ['modules', 'progress', 'achievements']
});
```

**c) Параллельные запросы:**
```typescript
// ❌ ПЛОХО: Последовательно
const modules = await api.get('/api/tripwire/modules');
const progress = await api.get('/api/tripwire/progress');

// ✅ ХОРОШО: Параллельно
const [modules, progress] = await Promise.all([
  api.get('/api/tripwire/modules'),
  api.get('/api/tripwire/progress')
]);
```

---

### 4️⃣ **BUNDLE SIZE (ВАЖНО)**

#### Проблема:
- Большой размер бандла = медленная загрузка
- Все компоненты загружаются сразу

#### Решение:

**a) Code Splitting:**
```typescript
import { lazy, Suspense } from 'react';

// ❌ ПЛОХО
import TripwireLesson from './pages/tripwire/TripwireLesson';

// ✅ ХОРОШО
const TripwireLesson = lazy(() => import('./pages/tripwire/TripwireLesson'));

// В Router:
<Route path="/tripwire/lesson/:id" element={
  <Suspense fallback={<Loader />}>
    <TripwireLesson />
  </Suspense>
} />
```

**b) Анализ bundle size:**
```bash
npm run build
npx vite-bundle-visualizer
```

---

### 5️⃣ **IMAGES & ASSETS (ВАЖНО)**

#### Проблема:
- Большие изображения
- Нет оптимизации
- Загружаются все сразу

#### Решение:

**a) Lazy loading изображений:**
```typescript
<img 
  src={imageUrl} 
  loading="lazy"  // ✅ Native lazy loading
  decoding="async"  // ✅ Async декодинг
/>
```

**b) Modern formats (WebP, AVIF):**
```typescript
<picture>
  <source srcSet={`${imageUrl}.avif`} type="image/avif" />
  <source srcSet={`${imageUrl}.webp`} type="image/webp" />
  <img src={`${imageUrl}.jpg`} alt="..." />
</picture>
```

---

### 6️⃣ **DATABASE OPTIMIZATION (BACKEND)**

#### Проблема:
- N+1 запросы
- Медленные JOIN
- Нет индексов

#### Решение:

**a) Добавить индексы:**
```sql
-- Для video_tracking
CREATE INDEX idx_video_tracking_user_lesson 
ON video_tracking(user_id, lesson_id);

-- Для user_achievements
CREATE INDEX idx_user_achievements_user_completed 
ON user_achievements(user_id, is_completed);

-- Для module_unlocks
CREATE INDEX idx_module_unlocks_user 
ON module_unlocks(user_id, module_id);
```

**b) Оптимизация запросов:**
```typescript
// ❌ ПЛОХО: N+1
for (const lesson of lessons) {
  const progress = await db.query('SELECT * FROM video_tracking WHERE lesson_id = $1', [lesson.id]);
}

// ✅ ХОРОШО: 1 запрос
const progress = await db.query(`
  SELECT * FROM video_tracking 
  WHERE lesson_id = ANY($1)
`, [lessonIds]);
```

---

## 📊 ПРИОРИТЕТЫ:

### 🔴 КРИТИЧНО (ДЕЛАЕМ СЕЙЧАС):
1. ✅ Видео preload="metadata"
2. ✅ React.memo для тяжёлых компонентов
3. ✅ Lazy loading страниц
4. ✅ API кэширование

### 🟡 ВАЖНО (ПОТОМ):
5. Batch API запросы
6. Database индексы
7. Image optimization

### 🟢 НИЗКИЙ ПРИОРИТЕТ:
8. Виртуализация списков (если список > 50 элементов)
9. Service Worker для offline
10. CDN для статики

---

## 🚀 НАЧИНАЕМ ОПТИМИЗАЦИЮ!

**Порядок действий:**
1. ✅ Оптимизация видео плеера
2. ✅ React.memo для компонентов
3. ✅ Lazy loading роутов
4. ✅ API кэширование
5. ✅ Проверка результата

---

**ДАТА:** 2025-12-07  
**СТАТУС:** 🚀 НАЧИНАЕМ ОПТИМИЗАЦИЮ
