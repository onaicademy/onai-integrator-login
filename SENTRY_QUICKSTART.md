# 🛡️ SENTRY MONITORING - Quick Start (5 минут)

> Быстрая настройка мониторинга ошибок и производительности

---

## ⚡ Установка уже выполнена ✅

Пакеты уже установлены:
- `@sentry/react` + `@sentry/tracing` (Frontend)
- `@sentry/node` + `@sentry/profiling-node` (Backend)

---

## 🚀 Быстрый старт (3 шага)

### Шаг 1: Создайте проекты в Sentry (2 минуты)

1. Зайдите на **[sentry.io](https://sentry.io)** и создайте аккаунт
2. Создайте **2 проекта**:
   - **Frontend**: Platform = `React`
   - **Backend**: Platform = `Node.js / Express`
3. Скопируйте **DSN** для каждого проекта

---

### Шаг 2: Добавьте переменные окружения (1 минута)

#### Frontend: `.env` (в корне проекта)

```env
# 🛡️ Sentry Frontend
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/123456
VITE_APP_VERSION=1.0.0
```

#### Backend: `backend/.env`

```env
# 🛡️ Sentry Backend
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/654321
SERVER_NAME=onai-backend-production
NODE_ENV=production
```

> ⚠️ Замените `YOUR_FRONTEND_DSN` и `YOUR_BACKEND_DSN` на реальные значения из sentry.io

---

### Шаг 3: Запустите и проверьте (1 минута)

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
npm run dev
```

**Проверьте консоль** - должно появиться:
```
✅ Sentry initialized for frontend monitoring
✅ Sentry initialized for backend monitoring
```

---

## ✅ Проверка работы

### Frontend - Тестовая ошибка

Добавьте в любой компонент:

```tsx
<button onClick={() => {
  throw new Error('🧪 Test Sentry - Frontend');
}}>
  Test Sentry
</button>
```

Кликните на кнопку → Ошибка должна появиться в Sentry Dashboard через 5-10 секунд.

### Backend - Тестовая ошибка

Добавьте в `backend/src/server.ts`:

```typescript
app.get('/test-sentry', (req, res) => {
  throw new Error('🧪 Test Sentry - Backend');
});
```

Откройте `http://localhost:3000/test-sentry` → Ошибка должна появиться в Sentry.

---

## 🎯 Что отслеживается автоматически?

### Frontend ✅
- ❌ Все ошибки (React, API, Network)
- 🚀 Performance (page load, API calls)
- 🎥 Session Replay при ошибках
- 📍 Breadcrumbs (что делал пользователь)

### Backend ✅
- ❌ Uncaught exceptions
- 🚀 API endpoint performance
- 💾 Database query duration
- 🧠 Memory usage alerts (> 80%)
- 🔄 Infinite loop detection (> 1000 iterations)

---

## 💡 Примеры использования

### Frontend - Мониторинг урока

```typescript
import { monitorLessonLoading } from '@/utils/sentryMonitoring';

const lesson = await monitorLessonLoading(lessonId, async () => {
  const res = await fetch(`/api/tripwire/lessons/${lessonId}`);
  return res.json();
});
// ✅ Автоматически отслеживает длительность и ошибки
```

### Backend - Мониторинг AI генерации

```typescript
import { monitorAIGeneration } from '../utils/sentryMonitoring';

const description = await monitorAIGeneration(
  'groq', 'lesson_description', { lessonId },
  async () => {
    return await groq.chat.completions.create({...});
  }
);
// ✅ Автоматически отслеживает AI response time
```

### Обнаружение зацикливаний

```typescript
import { detectInfiniteLoop } from '../utils/sentryMonitoring';

let iterations = 0;
for (const lesson of lessons) {
  iterations++;
  if (iterations % 100 === 0) {
    detectInfiniteLoop('process_lessons', iterations);
  }
  await processLesson(lesson);
}
// ✅ Автоматически отправляет алерт если > 1000 итераций
```

---

## 📚 Полная документация

- 📖 **[README_SENTRY.md](./README_SENTRY.md)** - Главная документация
- 🔧 **[SENTRY_SETUP.md](./SENTRY_SETUP.md)** - Полная инструкция по настройке
- 💡 **[SENTRY_EXAMPLE_USAGE.md](./SENTRY_EXAMPLE_USAGE.md)** - Примеры использования
- ⚙️ **[SENTRY_ENV_VARIABLES.md](./SENTRY_ENV_VARIABLES.md)** - Переменные окружения

---

## 🐛 Troubleshooting

### Sentry не инициализируется?

1. ✅ Проверьте что `.env` в корне проекта (рядом с `package.json`)
2. ✅ Переменная называется `VITE_SENTRY_DSN` (frontend) или `SENTRY_DSN` (backend)
3. ✅ DSN правильный (скопирован из sentry.io)
4. ✅ Dev сервер перезапущен после изменения `.env`

### Events не отправляются?

1. ✅ Проверьте лимиты на sentry.io (бесплатный план: 5k errors/месяц)
2. ✅ Откройте DevTools → Network → фильтр "sentry" → должны быть POST запросы
3. ✅ Проверьте firewall/antivirus (могут блокировать sentry.io)

---

## 🎉 Готово!

Теперь у вас:

✅ Полный мониторинг всех ошибок  
✅ Отслеживание производительности  
✅ Обнаружение зацикливаний  
✅ Session Replay при ошибках  

**Серверы больше не будут падать неожиданно! 🚀**

---

## 📞 Нужна помощь?

- 📖 Читайте [полную документацию](./README_SENTRY.md)
- 💡 Смотрите [примеры использования](./SENTRY_EXAMPLE_USAGE.md)
- 🔧 Проверьте [troubleshooting](./SENTRY_ENV_VARIABLES.md#troubleshooting)

---

**Время настройки: 5 минут | Время экономии: бесценно ⏱️**

