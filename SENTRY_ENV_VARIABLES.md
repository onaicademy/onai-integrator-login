# 🛡️ SENTRY - Переменные окружения

## Frontend (.env или .env.local)

Добавьте эти переменные в корневой `.env` файл проекта:

```env
# ═══════════════════════════════════════════════════════════════
# 🛡️ SENTRY MONITORING - FRONTEND
# ═══════════════════════════════════════════════════════════════

# DSN для frontend проекта (получите на sentry.io)
VITE_SENTRY_DSN=https://YOUR_FRONTEND_DSN@o123456.ingest.sentry.io/123456

# Версия приложения (для tracking releases)
VITE_APP_VERSION=1.0.0

# ═══════════════════════════════════════════════════════════════
```

### Как получить VITE_SENTRY_DSN?

1. Зайдите на [sentry.io](https://sentry.io)
2. Создайте новый проект → **React**
3. После создания вы увидите DSN в формате:
   ```
   https://abc123def456@o1234567.ingest.sentry.io/1234567
   ```
4. Скопируйте и вставьте в `.env`

---

## Backend (backend/.env)

Добавьте эти переменные в `backend/.env`:

```env
# ═══════════════════════════════════════════════════════════════
# 🛡️ SENTRY MONITORING - BACKEND
# ═══════════════════════════════════════════════════════════════

# DSN для backend проекта (получите на sentry.io)
SENTRY_DSN=https://YOUR_BACKEND_DSN@o123456.ingest.sentry.io/123456

# Имя сервера (для идентификации в Sentry)
SERVER_NAME=onai-backend-production

# Environment (development, staging, production)
NODE_ENV=production

# ═══════════════════════════════════════════════════════════════
```

### Как получить SENTRY_DSN?

1. Зайдите на [sentry.io](https://sentry.io)
2. Создайте новый проект → **Node.js / Express**
3. После создания вы увидите DSN в формате:
   ```
   https://xyz789abc123@o1234567.ingest.sentry.io/7654321
   ```
4. Скопируйте и вставьте в `backend/.env`

---

## 🔐 Безопасность

### ❗ ВАЖНО

- **НЕ коммитьте** `.env` файлы в git!
- `.env` должен быть в `.gitignore`
- Используйте **разные DSN** для frontend и backend
- Используйте **разные DSN** для development и production

### Разные окружения

#### Development

```env
# Frontend
VITE_SENTRY_DSN=https://dev-frontend-dsn@sentry.io/123

# Backend
SENTRY_DSN=https://dev-backend-dsn@sentry.io/456
NODE_ENV=development
```

#### Production

```env
# Frontend
VITE_SENTRY_DSN=https://prod-frontend-dsn@sentry.io/789

# Backend
SENTRY_DSN=https://prod-backend-dsn@sentry.io/012
NODE_ENV=production
```

---

## ✅ Проверка настройки

После добавления переменных окружения:

### Frontend

```bash
npm run dev
```

В консоли должно появиться:
```
✅ Sentry initialized for frontend monitoring
```

### Backend

```bash
cd backend
npm run dev
```

В консоли должно появиться:
```
✅ Sentry initialized for backend monitoring
```

---

## 🚫 Отключение Sentry (для локальной разработки)

Если вы хотите временно отключить Sentry (например, для локальной разработки без отправки данных):

### Frontend
```env
# Оставьте пустым или закомментируйте
# VITE_SENTRY_DSN=
```

### Backend
```env
# Оставьте пустым или закомментируйте
# SENTRY_DSN=
```

При отсутствии DSN Sentry не будет инициализирован, но приложение продолжит работать.

---

## 📊 Sample Rate (частота отправки)

В `src/config/sentry.ts` и `backend/src/config/sentry.ts` настроены sample rates:

### Frontend
```typescript
// Performance Monitoring
tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0
// 20% в production, 100% в development

// Session Replay
replaysSessionSampleRate: 0.1  // 10% всех сессий
replaysOnErrorSampleRate: 1.0  // 100% сессий с ошибками
```

### Backend
```typescript
// Performance Monitoring
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0
// 20% в production, 100% в development

// Profiling
profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
// 10% в production, 100% в development
```

Эти значения можно изменить в зависимости от вашего плана на sentry.io.

---

## 💰 Лимиты Sentry (бесплатный план)

Бесплатный план Sentry включает:
- **5,000 errors** в месяц
- **10,000 performance transactions** в месяц
- **50 session replays** в месяц

Если вы превысите лимиты, события просто не будут отправляться (приложение продолжит работать).

Для увеличения лимитов перейдите на платный план:
- **Team**: $26/месяц (50k errors, 100k transactions)
- **Business**: $80/месяц (500k errors, 500k transactions)

---

## 🎯 Примеры DSN

### ✅ Правильный формат

```
https://abc123def456@o1234567.ingest.sentry.io/1234567
```

### ❌ Неправильный формат

```
# Без протокола
abc123def456@o1234567.ingest.sentry.io/1234567

# Неполный DSN
https://o1234567.ingest.sentry.io/1234567

# Старый формат (Sentry 9.x)
https://abc123@sentry.io/1234567
```

---

## 📞 Troubleshooting

### Проблема: Sentry не инициализируется

**Решение:**
1. Проверьте что `.env` файл находится в **корне проекта** (рядом с `package.json`)
2. Проверьте что переменная называется **ТОЧНО** `VITE_SENTRY_DSN` (для frontend) или `SENTRY_DSN` (для backend)
3. Перезапустите dev сервер после изменения `.env`

### Проблема: Events не отправляются в Sentry

**Решение:**
1. Проверьте что DSN правильный (скопирован с sentry.io)
2. Проверьте что вы не превысили лимиты на sentry.io
3. Откройте Network в DevTools → фильтр "sentry" → должны быть POST запросы
4. Проверьте firewall/antivirus - они могут блокировать sentry.io

### Проблема: Слишком много событий отправляется

**Решение:**
1. Уменьшите `tracesSampleRate` в конфиге Sentry
2. Добавьте больше паттернов в `ignoreErrors`
3. Используйте `beforeSend` для фильтрации событий

---

## ✅ Checklist после настройки

- [ ] DSN добавлены в `.env` файлы (frontend + backend)
- [ ] `.env` файлы добавлены в `.gitignore`
- [ ] Dev серверы перезапущены
- [ ] В консоли появилось "✅ Sentry initialized"
- [ ] Создан тестовый error для проверки (см. ниже)
- [ ] Error появился в Sentry Dashboard

### Тестовый error

#### Frontend
```typescript
// Добавьте в любой компонент
<button onClick={() => {
  throw new Error('Test Sentry Error - Frontend');
}}>
  Test Sentry
</button>
```

#### Backend
```typescript
// Добавьте в любой route
app.get('/test-sentry', (req, res) => {
  throw new Error('Test Sentry Error - Backend');
});
```

Кликните на кнопку/откройте endpoint → Error должен появиться в Sentry Dashboard в течение 5-10 секунд.

---

## 🎉 Готово!

Теперь Sentry полностью настроен и готов к использованию!

Все ошибки, зацикливания и проблемы с производительностью будут автоматически отслеживаться.

