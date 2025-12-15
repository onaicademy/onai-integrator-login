# 🔥 СРОЧНАЯ НАСТРОЙКА SENTRY - 5 МИНУТ

## 1️⃣ Получи DSN от Sentry (2 минуты)

### Frontend DSN:
1. Зайди на https://sentry.io/settings/
2. Найди проект **"onai-frontend"** (или создай новый React проект)
3. Зайди в **Settings** → **Client Keys (DSN)**
4. Скопируй DSN в формате:
   ```
   https://abc123def456@o1234567.ingest.sentry.io/1234567
   ```

### Backend DSN:
1. Зайди на https://sentry.io/settings/
2. Найди проект **"onai-backend"** (или создай новый Node.js проект)
3. Зайди в **Settings** → **Client Keys (DSN)**
4. Скопируй DSN в формате:
   ```
   https://xyz789abc123@o7654321.ingest.sentry.io/7654321
   ```

---

## 2️⃣ Добавь DSN в .env файлы (1 минута)

### Frontend: `.env` (в корне проекта)

Открой файл:
```
c:\onai-integrator-login\onai-integrator-login\.env
```

Добавь/измени эти строки:
```env
# ═══════════════════════════════════════════════════════════════
# 🛡️ SENTRY MONITORING - FRONTEND
# ═══════════════════════════════════════════════════════════════

# Вставь свой DSN от Sentry!
VITE_SENTRY_DSN=https://YOUR_DSN_HERE@o1234567.ingest.sentry.io/1234567

# Версия приложения
VITE_APP_VERSION=1.0.0
```

### Backend: `backend/.env.production`

Открой файл:
```
c:\onai-integrator-login\onai-integrator-login\backend\.env.production
```

Добавь/измени эти строки:
```env
# ═══════════════════════════════════════════════════════════════
# 🛡️ SENTRY MONITORING - BACKEND
# ═══════════════════════════════════════════════════════════════

# Вставь свой DSN от Sentry!
SENTRY_DSN=https://YOUR_DSN_HERE@o7654321.ingest.sentry.io/7654321

# Имя сервера
SERVER_NAME=onai-backend-production

# Environment
NODE_ENV=production
```

---

## 3️⃣ Перезапусти серверы (2 минуты)

### Frontend (Vercel):
```bash
# Если используешь Vercel - добавь в Environment Variables:
# https://vercel.com/your-project/settings/environment-variables

1. Зайди в Vercel Dashboard
2. Settings → Environment Variables
3. Добавь: VITE_SENTRY_DSN = твой_dsn
4. Redeploy проект
```

### Backend:
```bash
# На сервере:
cd /root/onai-integrator-login/backend
pm2 restart onai-backend
pm2 logs onai-backend --lines 50

# Должно появиться:
# ✅ Sentry initialized for backend monitoring
```

---

## ✅ ПРОВЕРКА (30 секунд)

### Frontend:
1. Открой сайт: https://onai.academy
2. Открой DevTools Console (F12)
3. Должно быть:
   ```
   ✅ Sentry initialized for frontend monitoring
   ```
4. Нажми кнопку (если есть тестовая):
   ```javascript
   throw new Error('Test Sentry Frontend');
   ```
5. Зайди на sentry.io → Issues → должна быть ошибка!

### Backend:
1. Проверь логи:
   ```bash
   pm2 logs onai-backend --lines 50
   ```
2. Должно быть:
   ```
   ✅ Sentry initialized for backend monitoring
   ```

---

## 🎉 ГОТОВО!

Теперь все ошибки, зацикливания и проблемы будут автоматически отслеживаться в Sentry!

---

## 🚨 ВАЖНО!

- **НЕ коммить** `.env` файлы в git!
- Используй **РАЗНЫЕ DSN** для frontend и backend
- Используй **РАЗНЫЕ DSN** для dev и production

---

## 📞 Если не работает:

1. Проверь формат DSN (должен начинаться с `https://`)
2. Перезапусти серверы после изменения `.env`
3. Проверь Network в DevTools → должны быть POST запросы к `sentry.io`
4. Проверь лимиты на sentry.io (бесплатный план: 5k errors/месяц)

---

## 🎯 Следующие шаги:

После настройки DSN можешь:
- Использовать кастомный мониторинг (`monitorLessonLoading`, `monitorAIGeneration`, и т.д.)
- Отслеживать зацикливания (`detectInfiniteLoop`)
- Видеть все ошибки в реальном времени на sentry.io

---

**ВСЁ! ПОСЛЕ ДОБАВЛЕНИЯ DSN SENTRY ЗАРАБОТАЕТ АВТОМАТИЧЕСКИ!** 🚀
