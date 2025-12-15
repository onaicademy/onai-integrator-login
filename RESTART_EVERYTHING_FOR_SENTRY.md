# 🚀 ПЕРЕЗАПУСК ВСЕГО ДЛЯ SENTRY

## ✅ ЧТО УЖЕ СДЕЛАНО:

1. ✅ Добавлен `VITE_SENTRY_DSN` в `.env` (frontend)
2. ✅ Добавлен `SENTRY_DSN` в `backend/.env.production`
3. ✅ Sentry инициализируется в `App.tsx` (строка 72)
4. ✅ Sentry настроен в `backend/src/config/sentry.ts`

---

## 🔥 ЧТО НУЖНО СДЕЛАТЬ СЕЙЧАС:

### 1️⃣ FRONTEND (если разрабатываешь локально):

```bash
# В терминале где запущен npm run dev:
Ctrl+C   # Закрыть dev сервер
npm run dev   # Запустить заново
```

**Проверка:**
```
Открой http://localhost:5173
F12 → Console
Должно быть: ✅ Sentry initialized for frontend monitoring
```

---

### 2️⃣ FRONTEND (на Digital Ocean):

**На сервере через SSH:**
```bash
cd /root/onai-integrator-login

# Убедись что .env файл на сервере содержит DSN:
cat .env | grep VITE_SENTRY_DSN

# Если нет - добавь:
echo "" >> .env
echo "# SENTRY MONITORING" >> .env
echo "VITE_SENTRY_DSN=https://27d1661108accc9b9046ec9dbf9d99ce@o4510539720884224.ingest.de.sentry.io/4510539760795728" >> .env
echo "VITE_APP_VERSION=1.0.0" >> .env

# Пересобери фронтенд:
npm run build

# Nginx автоматически подхватит новый билд
```

**Или через git (если есть CI/CD):**
```bash
# Локально:
git add .env
git commit -m "Add Sentry DSN"
git push origin main

# На сервере:
ssh root@your-server
cd /root/onai-integrator-login
git pull
npm run build
```

---

### 3️⃣ BACKEND (на продакшен сервере):

**На сервере через SSH:**
```bash
cd /root/onai-integrator-login/backend

# Перезапусти pm2:
pm2 restart onai-backend

# Проверь логи:
pm2 logs onai-backend --lines 50

# Должно появиться:
# ✅ Sentry initialized for backend monitoring
```

**Если pm2 не видит переменные:**
```bash
# Убедись что .env.production загружается:
pm2 restart onai-backend --update-env

# Или перезагрузи pm2 полностью:
pm2 delete onai-backend
pm2 start ecosystem.config.js
```

---

## ✅ ПРОВЕРКА ЧТО ВСЁ РАБОТАЕТ:

### Frontend:
```
1. Открой https://onai.academy
2. F12 → Console
3. Должно быть: ✅ Sentry initialized for frontend monitoring
4. Нажми любую кнопку с ошибкой
5. Зайди на https://sentry.io/issues/
6. Должна появиться ошибка через 5-10 секунд
```

### Backend:
```bash
pm2 logs onai-backend --lines 100

# Найди строку:
# ✅ Sentry initialized for backend monitoring
```

---

## 🎯 ТЕСТОВАЯ ОШИБКА:

### Frontend:
Добавь временно в любой компонент:
```typescript
<button onClick={() => {
  throw new Error('🧪 Test Sentry Frontend');
}}>
  Test Sentry
</button>
```

### Backend:
Добавь временно в `server.ts`:
```typescript
app.get('/test-sentry', (req, res) => {
  throw new Error('🧪 Test Sentry Backend');
});
```

Зайди на http://localhost:3000/test-sentry → ошибка должна появиться в Sentry!

---

## 📊 ГДЕ СМОТРЕТЬ ОТЧЁТЫ:

1. Зайди на https://sentry.io
2. Выбери проект (left menu)
3. Issues → все ошибки
4. Performance → производительность
5. Session Replay → записи сессий с ошибками

---

## 🚨 ЕСЛИ НЕ РАБОТАЕТ:

### Frontend (локально):
```
❌ Проблема: Не появляется "✅ Sentry initialized"

✅ Решение:
1. Убедись что .env файл в КОРНЕ проекта (не в src/)
2. Перезапусти dev сервер (Ctrl+C → npm run dev)
3. Проверь что DSN скопирован без пробелов
4. Проверь что нет кавычек: VITE_SENTRY_DSN=https://... (не "https://...")
```

### Frontend (Digital Ocean):
```
❌ Проблема: Ошибки не приходят в Sentry

✅ Решение:
1. Убедись что .env файл на сервере содержит VITE_SENTRY_DSN
2. Пересобери: npm run build
3. Очисти кеш браузера (Ctrl+Shift+R)
4. Проверь Network в F12 → должны быть POST запросы к sentry.io
```

### Backend:
```
❌ Проблема: Не появляется "✅ Sentry initialized" в логах

✅ Решение:
1. Убедись что .env.production содержит SENTRY_DSN
2. Перезапусти pm2: pm2 restart onai-backend --update-env
3. Проверь логи: pm2 logs onai-backend --lines 100
4. Если не помогло: pm2 delete onai-backend && pm2 start ecosystem.config.js
```

---

## 🎉 ГОТОВО!

После всех перезапусков Sentry будет:
- ✅ Отслеживать все ошибки (frontend + backend)
- ✅ Мониторить производительность
- ✅ Записывать сессии с ошибками
- ✅ Отслеживать зацикливания (`detectInfiniteLoop`)
- ✅ Мониторить кастомные операции (`monitorLessonLoading`, `monitorAIGeneration`, etc.)

---

**ВСЁ НАСТРОЕНО! ПРОСТО ПЕРЕЗАПУСТИ СЕРВЕРЫ!** 🚀
