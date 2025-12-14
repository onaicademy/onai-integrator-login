# 🛡️ SENTRY MONITORING - Инструкция по настройке и использованию

## 📋 Что такое Sentry?

Sentry - это платформа для мониторинга ошибок и производительности приложений в реальном времени. Она помогает:

- ✅ **Отслеживать все ошибки** - Frontend + Backend
- ✅ **Находить зацикливания** - Долгие операции > 5-10 секунд
- ✅ **Мониторить производительность** - API, Database, AI генерация
- ✅ **Записывать сессии** - Session Replay при ошибках
- ✅ **Анализировать падения сервера** - Memory leaks, CPU usage

## 🚀 Установка Sentry

### 1. Создайте аккаунт на Sentry

1. Зайдите на [sentry.io](https://sentry.io)
2. Создайте аккаунт (или используйте GitHub OAuth)
3. Создайте новую организацию (например, "onAI Academy")
4. Создайте 2 проекта:
   - **Frontend** - Platform: `React`
   - **Backend** - Platform: `Node.js / Express`

### 2. Получите DSN ключи

После создания проектов вы получите **DSN** (Data Source Name) - это URL для отправки данных в Sentry.

Пример DSN:
```
https://abc123def456@o1234567.ingest.sentry.io/1234567
```

### 3. Настройте переменные окружения

#### Frontend (.env или .env.local)

```env
# 🛡️ Sentry Frontend Monitoring
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN_HERE
VITE_APP_VERSION=1.0.0
```

#### Backend (backend/.env)

```env
# 🛡️ Sentry Backend Monitoring
SENTRY_DSN=https://YOUR_BACKEND_DSN_HERE
SERVER_NAME=onai-backend-production
NODE_ENV=production
```

### 4. Запустите приложение

```bash
# Frontend
npm run dev

# Backend
cd backend
npm run dev
```

✅ При запуске вы увидите в консоли:
```
✅ Sentry initialized for frontend monitoring
✅ Sentry initialized for backend monitoring
```

## 📊 Как использовать Sentry мониторинг

### Frontend (React)

#### 1. Отслеживание загрузки урока

```typescript
import { monitorLessonLoading } from '@/utils/sentryMonitoring';

// Загрузка урока с мониторингом
const loadLesson = async (lessonId: string) => {
  return await monitorLessonLoading(lessonId, async () => {
    const response = await fetch(`/api/tripwire/lessons/${lessonId}`);
    return response.json();
  });
};
```

#### 2. Отслеживание AI генерации

```typescript
import { monitorAIGeneration } from '@/utils/sentryMonitoring';

const generateContent = async () => {
  return await monitorAIGeneration(
    'description_generation',
    { lessonId: '123', platform: 'tripwire' },
    async () => {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ lessonId: '123' })
      });
      return response.json();
    }
  );
};
```

#### 3. Отслеживание видео

```typescript
import { monitorVideoLoading } from '@/utils/sentryMonitoring';

const loadVideo = async (videoId: string, videoUrl: string) => {
  return await monitorVideoLoading(videoId, videoUrl, async () => {
    // Загрузка видео
    const video = await fetch(videoUrl);
    return video;
  });
};
```

#### 4. Ручное отслеживание ошибок

```typescript
import { Sentry } from '@/config/sentry';

try {
  // Ваш код
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'TripwireLesson',
      lesson_id: lessonId,
    },
    extra: {
      context: 'Loading lesson failed',
    },
  });
}
```

### Backend (Node.js)

#### 1. Отслеживание AI генерации (OpenAI/Groq)

```typescript
import { monitorAIGeneration } from '../utils/sentryMonitoring';

const generateDescription = async (videoId: string) => {
  return await monitorAIGeneration(
    'groq',
    'lesson_description',
    { videoId, lessonId: 123 },
    async () => {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      });
      return completion.choices[0].message.content;
    }
  );
};
```

#### 2. Отслеживание Email отправки

```typescript
import { monitorEmailSending } from '../utils/sentryMonitoring';

const sendWelcomeEmail = async (email: string) => {
  return await monitorEmailSending(
    'welcome_email',
    email,
    async () => {
      await resend.emails.send({
        from: 'onAI <noreply@onai.academy>',
        to: email,
        subject: 'Welcome!',
        html: '<h1>Welcome to onAI!</h1>',
      });
    }
  );
};
```

#### 3. Отслеживание Database запросов

```typescript
import { monitorDBOperation } from '../utils/sentryMonitoring';

const getLesson = async (lessonId: string) => {
  return await monitorDBOperation(
    'select',
    'lessons',
    async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single();
      
      if (error) throw error;
      return data;
    }
  );
};
```

#### 4. Обнаружение зацикливаний

```typescript
import { detectInfiniteLoop } from '../utils/sentryMonitoring';

let iterations = 0;
while (condition) {
  iterations++;
  
  // Проверяем на зацикливание каждые 100 итераций
  if (iterations % 100 === 0) {
    detectInfiniteLoop('process_lessons', iterations);
  }
  
  // Ваша логика
  if (iterations > 10000) {
    throw new Error('Infinite loop detected!');
  }
}
```

#### 5. Мониторинг памяти

```typescript
import { checkMemoryUsage } from '../utils/sentryMonitoring';

// Проверяем память каждые 5 минут
setInterval(() => {
  const { heapUsedMB, heapTotalMB, usagePercent } = checkMemoryUsage();
  console.log(`Memory: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`);
}, 5 * 60 * 1000);
```

## 🎯 Критичные места для мониторинга

### Frontend

1. **TripwireLesson.tsx** - загрузка урока, прогресс, AI curator
2. **TripwireProductPage.tsx** - загрузка курса, оплата
3. **AchievementModal.tsx** - генерация сертификатов
4. **API requests** - все запросы к backend

### Backend

1. **tripwire-lessons.ts** - загрузка уроков, обновление прогресса
2. **ai-lesson-generator.ts** - AI генерация описаний
3. **emailService.ts** - отправка email (Resend)
4. **amoCrmService.ts** - интеграция с AmoCRM
5. **fileUpload** - загрузка видео на Bunny CDN

## 📈 Что отслеживается автоматически?

### Frontend
- ✅ Все необработанные ошибки
- ✅ React component errors (через ErrorBoundary)
- ✅ Navigation (React Router)
- ✅ API requests (fetch/axios)
- ✅ Performance (page load, component render)
- ✅ Session Replay при ошибках

### Backend
- ✅ Все необработанные exceptions
- ✅ Unhandled Promise rejections
- ✅ API endpoint performance
- ✅ HTTP requests/responses
- ✅ 500 errors
- ✅ Memory usage alerts

## 🚨 Alerts и Notifications

### Настройка Alerts

1. Зайдите в Sentry Dashboard
2. Settings → Alerts
3. Создайте правила:
   - **High Error Rate** - > 10 ошибок за 5 минут
   - **Slow API** - Request duration > 5 секунд
   - **Memory Usage** - Heap usage > 80%
   - **Infinite Loop** - > 1000 iterations

### Интеграция с Telegram/Slack

1. Settings → Integrations
2. Выберите Telegram или Slack
3. Настройте webhook
4. Выберите какие события отправлять

## 🔍 Как читать отчеты Sentry

### 1. Issues (Ошибки)

- **Frequency** - как часто возникает
- **Users affected** - сколько пользователей затронуто
- **Last seen** - когда последний раз произошло
- **Stack trace** - полный стек вызовов
- **Breadcrumbs** - что делал пользователь перед ошибкой

### 2. Performance

- **Transaction** - название операции (API endpoint, page load)
- **Duration** - сколько времени заняло
- **Throughput** - сколько раз вызывалось
- **Slowest operations** - самые медленные операции

### 3. Releases

- **Version** - версия приложения
- **Deploy time** - когда задеплоили
- **New issues** - новые ошибки в этой версии
- **Regressions** - что сломалось

## 💡 Best Practices

### 1. НЕ логируйте sensitive данные

```typescript
// ❌ ПЛОХО
Sentry.captureMessage('User login', {
  extra: {
    password: '12345', // НЕ ДЕЛАЙТЕ ТАК!
    credit_card: '1234-5678-9012-3456', // НЕ ДЕЛАЙТЕ ТАК!
  }
});

// ✅ ХОРОШО
Sentry.captureMessage('User login', {
  extra: {
    email: 'us***@gmail.com', // Маскируйте email
    method: 'password', // Только тип аутентификации
  }
});
```

### 2. Добавляйте контекст

```typescript
Sentry.setContext('lesson', {
  id: lessonId,
  title: lessonTitle,
  module_id: moduleId,
  platform: 'tripwire',
});
```

### 3. Тегируйте ошибки

```typescript
Sentry.setTags({
  platform: 'tripwire',
  component: 'lesson',
  feature: 'video_player',
});
```

### 4. Фильтруйте шум

Не все ошибки критичны. В `sentry.ts` уже настроены фильтры для:
- Browser extensions errors
- Network timeouts
- ResizeObserver loops (безопасны)

## 🐛 Debugging с Sentry

### 1. Session Replay

При ошибке Sentry записывает видео сессии пользователя (без sensitive данных).

Вы можете посмотреть:
- Что делал пользователь
- На каких элементах кликал
- Какие API запросы отправлял
- Где произошла ошибка

### 2. Breadcrumbs

Breadcrumbs - это "хлебные крошки", след действий пользователя:

```
1. User clicked "Start Lesson" button
2. API request to /api/tripwire/lessons/123
3. Video started loading
4. Error: Video failed to load
```

## 📞 Support

Если у вас проблемы с Sentry:

1. Проверьте что DSN правильно настроен в `.env`
2. Проверьте что Sentry initialized (смотрите консоль)
3. Проверьте лимиты на [sentry.io](https://sentry.io) (бесплатный план - 5000 events/месяц)
4. Документация: [docs.sentry.io](https://docs.sentry.io)

## 🎉 Готово!

Теперь у вас полноценный мониторинг всех процессов в Tripwire!

Все зацикливания, долгие операции и ошибки будут автоматически отправляться в Sentry.

