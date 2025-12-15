# 🛡️ SENTRY MONITORING - Unified Guide

> Официальная инициализация Sentry + Кастомные утилиты мониторинга

---

## 📦 Что изменилось?

### ✅ Новый подход (Unified)

Все в одном файле: **`src/config/sentryInit.ts`**

```typescript
import { initSentry, monitorLessonLoading, Sentry } from '@/config/sentryInit';

// Инициализация (один раз при старте)
initSentry();

// Использование утилит
const lesson = await monitorLessonLoading(lessonId, async () => {
  const res = await fetch(`/api/tripwire/lessons/${lessonId}`);
  return res.json();
});
```

### ❌ Старый подход (Deprecated)

~~`src/config/sentry.ts`~~ + ~~`src/utils/sentryMonitoring.ts`~~ → **Заменены на `sentryInit.ts`**

---

## 🚀 Быстрый старт

### 1. Переменные окружения (.env)

```env
# 🛡️ Sentry Frontend
VITE_SENTRY_DSN=https://27d1661108accc9b9046ec9dbf9d99ce@o4510539720884224.ingest.de.sentry.io/4510539760795728
VITE_APP_VERSION=1.0.0
```

> ⚠️ DSN взят из твоей официальной инструкции Sentry

### 2. Инициализация (уже сделана в App.tsx)

```typescript
import { initSentry, Sentry } from '@/config/sentryInit';

// Initialize BEFORE rendering
initSentry();

// Wrap app with Sentry ErrorBoundary
<Sentry.ErrorBoundary fallback={...}>
  <App />
</Sentry.ErrorBoundary>
```

### 3. Использование

```typescript
import { 
  monitorLessonLoading,
  monitorAIGeneration,
  monitorPaymentProcessing,
  monitorVideoLoading,
  monitorAPIRequest,
  detectInfiniteLoop,
  trackEvent,
  Sentry,
} from '@/config/sentryInit';
```

---

## 💡 Примеры использования

### 1. Monitor Lesson Loading

```typescript
import { monitorLessonLoading } from '@/config/sentryInit';

const lesson = await monitorLessonLoading(lessonId, async () => {
  const res = await fetch(`/api/tripwire/lessons/${lessonId}`);
  if (!res.ok) throw new Error('Failed to load lesson');
  return res.json();
});

// ✅ Автоматически:
// - Трекает длительность загрузки
// - Отправляет warning если > 5 секунд
// - Логирует ошибки с полным контекстом
// - Создает transaction в Sentry Performance
```

### 2. Monitor AI Generation

```typescript
import { monitorAIGeneration } from '@/config/sentryInit';

const response = await monitorAIGeneration(
  'ai_curator_chat',
  { 
    lessonId,
    messageLength: message.length,
    userId: user?.id,
  },
  async () => {
    const res = await fetch('/api/tripwire/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lessonId, chatHistory }),
    });
    return res.json();
  }
);

// ✅ Автоматически:
// - Трекает AI response time
// - Warning если > 10 секунд
// - Логирует контекст (lessonId, messageLength)
```

### 3. Monitor Payment Processing

```typescript
import { monitorPaymentProcessing } from '@/config/sentryInit';

const result = await monitorPaymentProcessing(
  { 
    method: 'card',
    amount: 990,
    currency: 'RUB',
  },
  async () => {
    const res = await fetch('/api/tripwire/payment', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
    return res.json();
  }
);

// ✅ Автоматически:
// - Безопасно логирует данные (без номеров карт)
// - Warning если > 5 секунд
// - Трекает payment method и amount
```

### 4. Monitor Video Loading

```typescript
import { monitorVideoLoading } from '@/config/sentryInit';

await monitorVideoLoading(videoId, videoUrl, async () => {
  const video = document.querySelector('video');
  if (!video) throw new Error('Video element not found');

  return new Promise((resolve, reject) => {
    video.onloadeddata = () => resolve(true);
    video.onerror = () => reject(new Error('Video failed to load'));
    video.src = videoUrl;
  });
});

// ✅ Автоматически:
// - Трекает загрузку видео
// - Warning если > 15 секунд (проблема с CDN)
// - Логирует video_id и video_url
```

### 5. Monitor API Requests

```typescript
import { monitorAPIRequest } from '@/config/sentryInit';

const progress = await monitorAPIRequest(
  '/api/tripwire/progress',
  'POST',
  async () => {
    const res = await fetch('/api/tripwire/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId, progress: 100 }),
    });
    return res.json();
  }
);

// ✅ Автоматически:
// - Трекает API calls
// - Warning если > 5 секунд
// - Создает breadcrumbs для отладки
```

### 6. Detect Infinite Loops

```typescript
import { detectInfiniteLoop } from '@/config/sentryInit';

let iterations = 0;
for (const lesson of lessons) {
  iterations++;
  
  // Проверяем каждые 100 итераций
  if (iterations % 100 === 0) {
    detectInfiniteLoop('process_lessons', iterations);
  }
  
  await processLesson(lesson);
}

// ✅ Автоматически:
// - Отправляет ERROR если > 1000 итераций
// - Логирует количество итераций
// - Помогает найти зацикливания
```

### 7. Track Custom Events

```typescript
import { trackEvent } from '@/config/sentryInit';

// Track user actions
trackEvent('lesson_completed', {
  lessonId,
  duration: 1234,
  score: 95,
});

trackEvent('certificate_generated', {
  userId,
  courseId,
});

// ✅ Создает breadcrumbs для отладки
```

### 8. Manual Error Tracking

```typescript
import { Sentry } from '@/config/sentryInit';

try {
  // Your code
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'TripwireLesson',
      lesson_id: lessonId,
    },
    extra: {
      userId: user?.id,
      timestamp: new Date().toISOString(),
    },
  });
  
  toast.error('Произошла ошибка');
}
```

---

## 🎯 Официальная конфигурация (под капотом)

```typescript
Sentry.init({
  dsn: "https://27d1661108accc9b9046ec9dbf9d99ce@o4510539720884224.ingest.de.sentry.io/4510539760795728",
  
  integrations: [
    // ✅ Browser Tracing - автоматический мониторинг
    Sentry.browserTracingIntegration(),
    
    // ✅ Replay - записывает сессии с ошибками
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: true,
    }),
  ],

  // 📊 Performance Monitoring
  tracesSampleRate: 1.0, // 100% в dev, 20% в production
  
  // 🎥 Session Replay
  replaysSessionSampleRate: 0.1,  // 10% всех сессий
  replaysOnErrorSampleRate: 1.0,  // 100% с ошибками

  // 🌐 Distributed Tracing
  tracePropagationTargets: [
    'localhost',
    'onai.academy',
    /^\//,
  ],
});
```

---

## 📊 Что отслеживается автоматически?

### Frontend ✅

**Официальная интеграция Sentry:**
- ❌ Все необработанные ошибки (React, JS)
- 🚀 Performance (page load, navigation)
- 🎥 Session Replay при ошибках
- 📍 Breadcrumbs (user actions)
- 🔄 React Router navigation
- 📡 API requests (fetch/axios)

**Наши кастомные утилиты:**
- 📚 Lesson loading (> 5 сек)
- 🤖 AI generation (> 10 сек)
- 💳 Payment processing (> 5 сек)
- 🎬 Video loading (> 15 сек)
- 🔄 Infinite loops (> 1000 iterations)

---

## 🔧 Backend тоже нужен Sentry?

Да! Backend имеет свой файл: **`backend/src/config/sentry.ts`**

```typescript
import { initSentry } from './config/sentry';

// Initialize Sentry
initSentry(app);

// Add middleware
app.use(trackAPIPerformance);

// Add error handler (last middleware)
app.use(sentryErrorHandler());
```

Подробнее: [SENTRY_SETUP.md](./SENTRY_SETUP.md)

---

## 🎉 Преимущества Unified подхода

✅ **Всё в одном месте** - не нужно импортировать из 2 файлов  
✅ **Официальная инициализация** - по документации Sentry  
✅ **Кастомные утилиты** - удобные хелперы для мониторинга  
✅ **Type-safe** - полная типизация TypeScript  
✅ **Production-ready** - оптимизировано для prod (20% sampling)  

---

## 📚 Дополнительная документация

- 📖 [README_SENTRY.md](./README_SENTRY.md) - Полная документация
- 🚀 [SENTRY_QUICKSTART.md](./SENTRY_QUICKSTART.md) - Быстрый старт
- 💡 [SENTRY_EXAMPLE_USAGE.md](./SENTRY_EXAMPLE_USAGE.md) - Больше примеров
- ⚙️ [SENTRY_ENV_VARIABLES.md](./SENTRY_ENV_VARIABLES.md) - Переменные окружения

---

## 🆚 Migration Guide

### Если вы использовали старые импорты:

#### ❌ Старый код
```typescript
import { initSentry } from '@/config/sentry';
import { monitorLessonLoading } from '@/utils/sentryMonitoring';
import * as Sentry from '@sentry/react';
```

#### ✅ Новый код
```typescript
import { 
  initSentry,
  monitorLessonLoading,
  Sentry,
} from '@/config/sentryInit';
```

**Всё из одного файла!** 🎉

---

## ✅ Checklist

- [ ] DSN добавлен в `.env` (VITE_SENTRY_DSN)
- [ ] App.tsx использует `sentryInit.ts`
- [ ] Все импорты обновлены на `@/config/sentryInit`
- [ ] Dev server перезапущен
- [ ] В консоли появилось "✅ Sentry initialized"
- [ ] Тестовая ошибка отправилась в Sentry Dashboard

---

**Время миграции: 2 минуты | Профит: Unified API 🚀**
