# 🚀 SENTRY MIGRATION GUIDE - Быстрая миграция на v10.x

**Цель:** Обновить Sentry с устаревшего API (v7.x) на новый API (v10.x)  
**Время:** ~15 минут  
**Риск:** ⚠️ СРЕДНИЙ (может сломать backend при ошибке)

---

## ⚡ QUICK START (3 шага)

### 1️⃣ Замените файл `sentry.ts`

```bash
# Создайте backup
cp backend/src/config/sentry.ts backend/src/config/sentry.ts.backup

# Замените на новую версию
cp backend/src/config/sentry-v10-CORRECT.ts backend/src/config/sentry.ts
```

### 2️⃣ Проверьте `.env`

```bash
# Убедитесь что DSN не настроен (временно)
SENTRY_DSN=placeholder
```

### 3️⃣ Протестируйте локально

```bash
cd backend
npm run dev
```

**Ожидаемый результат:**
```
⚠️ SENTRY_DSN not configured - error monitoring disabled
✅ Server running on port 3000
```

---

## 📋 ДЕТАЛЬНАЯ ИНСТРУКЦИЯ

### Шаг 1: Backup текущей конфигурации

```bash
# 1. Создайте backup
cd /Users/miso/onai-integrator-login/backend
cp src/config/sentry.ts src/config/sentry.ts.v7-backup

# 2. Сохраните текущие логи
pm2 logs onai-backend --nostream --lines 100 > ~/sentry-migration-before.log
```

### Шаг 2: Обновите код

**Option A: Используйте готовый файл**

```bash
cp src/config/sentry-v10-CORRECT.ts src/config/sentry.ts
```

**Option B: Ручное обновление (если хотите кастомизировать)**

Замените в `src/config/sentry.ts`:

```typescript
// ❌ СТАРЫЙ API (v7.x)
integrations: [
  new Sentry.Integrations.Http({ tracing: true }),
  new Sentry.Integrations.Express({ app }),
  new ProfilingIntegration(),
],

// ✅ НОВЫЙ API (v10.x)
integrations: [
  Sentry.httpIntegration(),
  Sentry.expressIntegration({ app }),
  nodeProfilingIntegration(),
],
```

### Шаг 3: Локальное тестирование

```bash
# 1. Убедитесь что Sentry отключен
echo "SENTRY_DSN=placeholder" >> .env

# 2. Запустите backend
npm run dev

# 3. Проверьте что нет ошибок в консоли
# Должно быть: "⚠️ SENTRY_DSN not configured"
```

### Шаг 4: Тестирование с включенным Sentry (опционально)

```bash
# 1. Получите тестовый DSN на sentry.io
# 2. Добавьте в .env
echo "SENTRY_DSN=https://your-test-dsn@sentry.io/project-id" >> .env

# 3. Перезапустите backend
npm run dev

# 4. Проверьте логи
# Должно быть: "✅ Sentry initialized successfully"

# 5. Вызовите тестовую ошибку
curl http://localhost:3000/api/test-error

# 6. Проверьте Sentry Dashboard - ошибка должна появиться
```

### Шаг 5: Deploy на production

**⚠️ ВАЖНО: Делайте deploy в нерабочее время или с canary strategy!**

```bash
# 1. Убедитесь что на production Sentry отключен
ssh root@207.154.231.30 "grep SENTRY_DSN /var/www/onai-integrator-login-main/backend/env.env"
# Должно быть: SENTRY_DSN=placeholder

# 2. Deploy нового кода
scp backend/src/config/sentry.ts root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/config/sentry.ts

# 3. Перезапустите backend
ssh root@207.154.231.30 "pm2 restart onai-backend"

# 4. Проверьте что backend запустился
ssh root@207.154.231.30 "pm2 status"
# Должно быть: status: online, restarts: 0

# 5. Проверьте API
curl https://api.onai.academy/api/health
# Должно вернуть: {"status":"ok"}
```

### Шаг 6: Включение Sentry на production (после тестирования)

```bash
# 1. Получите production DSN на sentry.io
# 2. Добавьте на сервер
ssh root@207.154.231.30
nano /var/www/onai-integrator-login-main/backend/env.env
# Замените: SENTRY_DSN=placeholder
# На: SENTRY_DSN=https://your-production-dsn@sentry.io/project-id

# 3. Перезапустите backend
pm2 restart onai-backend --update-env

# 4. Проверьте логи
pm2 logs onai-backend --lines 50 | grep Sentry
# Должно быть: "✅ Sentry initialized successfully"
```

---

## 🧪 ТЕСТИРОВАНИЕ

### Test Case 1: Backend запускается без Sentry

```bash
# .env: SENTRY_DSN=placeholder
npm run dev

# ✅ Ожидаем:
# ⚠️ SENTRY_DSN not configured - error monitoring disabled
# ✅ Server running on port 3000
```

### Test Case 2: Backend запускается с Sentry

```bash
# .env: SENTRY_DSN=https://valid-dsn@sentry.io/123
npm run dev

# ✅ Ожидаем:
# ✅ Sentry initialized successfully
# ✅ Server running on port 3000
```

### Test Case 3: Ошибки отправляются в Sentry

```bash
# Создайте тестовый endpoint
# backend/src/routes/test.ts
app.get('/api/test-error', (req, res) => {
  throw new Error('Test error for Sentry');
});

# Вызовите endpoint
curl http://localhost:3000/api/test-error

# Проверьте Sentry Dashboard
# ✅ Должна появиться ошибка "Test error for Sentry"
```

### Test Case 4: Performance tracking работает

```bash
# Создайте медленный endpoint
app.get('/api/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 5000)); // 5s delay
  res.json({ ok: true });
});

# Вызовите endpoint
curl http://localhost:3000/api/slow

# Проверьте Sentry Dashboard → Performance
# ✅ Должна появиться транзакция с duration ~5000ms
```

---

## ❌ ROLLBACK PLAN

Если что-то пошло не так:

### Plan A: Быстрый rollback (1 минута)

```bash
# 1. Восстановите старый файл
scp backend/src/config/sentry.ts.v7-backup root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/config/sentry.ts

# 2. Перезапустите
ssh root@207.154.231.30 "pm2 restart onai-backend"
```

### Plan B: Отключите Sentry (30 секунд)

```bash
# 1. Установите placeholder DSN
ssh root@207.154.231.30
nano /var/www/onai-integrator-login-main/backend/env.env
# SENTRY_DSN=placeholder

# 2. Перезапустите
pm2 restart onai-backend --update-env
```

### Plan C: Hard rollback к предыдущему коммиту

```bash
# 1. Откатите код
git revert HEAD
git push origin main

# 2. Задеплойте
./deploy.sh
```

---

## 🎯 CHECKLIST

### Перед миграцией:

- [ ] Создан backup `sentry.ts.v7-backup`
- [ ] Сохранены текущие логи
- [ ] Team уведомлена о migration
- [ ] Выбрано нерабочее время (или готова canary strategy)
- [ ] Есть доступ к Sentry Dashboard
- [ ] Rollback plan подготовлен

### После миграции:

- [ ] Backend запускается без ошибок
- [ ] `pm2 status` показывает `online` (не `waiting restart`)
- [ ] API `/api/health` возвращает 200
- [ ] Логи не содержат ошибок Sentry
- [ ] (Опционально) Тестовая ошибка появилась в Sentry Dashboard
- [ ] (Опционально) Performance metrics видны в Sentry

### Через 24 часа:

- [ ] Backend стабилен (нет рестартов)
- [ ] Ошибки корректно отправляются в Sentry
- [ ] Performance metrics собираются
- [ ] Alerts настроены и работают
- [ ] Team довольна результатом

---

## 🔧 TROUBLESHOOTING

### Проблема 1: Backend крашится после миграции

**Симптом:**
```bash
pm2 status
# status: waiting restart, restarts: > 5
```

**Решение:**

```bash
# 1. Проверьте логи
ssh root@207.154.231.30 "pm2 logs onai-backend --err --lines 50"

# 2. Если видите ошибку Sentry - отключите его
ssh root@207.154.231.30
nano /var/www/onai-integrator-login-main/backend/env.env
# SENTRY_DSN=placeholder

# 3. Перезапустите
pm2 restart onai-backend --update-env
```

### Проблема 2: Ошибки не отправляются в Sentry

**Симптом:** Backend работает, но ошибки не появляются в Sentry Dashboard

**Решение:**

```bash
# 1. Проверьте что DSN настроен
grep SENTRY_DSN backend/.env

# 2. Проверьте логи инициализации
pm2 logs onai-backend | grep Sentry
# Должно быть: "✅ Sentry initialized successfully"

# 3. Проверьте что error handler добавлен
grep "sentryErrorHandler" backend/src/server.ts
# Должно быть: app.use(sentryErrorHandler());

# 4. Вызовите тестовую ошибку
curl https://api.onai.academy/api/test-error

# 5. Проверьте Sentry Dashboard через 1-2 минуты
```

### Проблема 3: Performance metrics не собираются

**Симптом:** Ошибки отправляются, но Performance вкладка пустая

**Решение:**

```bash
# 1. Проверьте tracesSampleRate в sentry.ts
grep "tracesSampleRate" backend/src/config/sentry.ts
# Должно быть: tracesSampleRate: 0.1 или выше

# 2. Проверьте что tracingHandler добавлен
grep "tracingHandler" backend/src/config/sentry.ts
# Должно быть: app.use(Sentry.Handlers.tracingHandler());

# 3. Увеличьте sample rate для тестирования
# tracesSampleRate: 1.0  (100% запросов)

# 4. Перезапустите backend
pm2 restart onai-backend
```

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- **Полный анализ:** `🔴_SENTRY_CRASH_REPORT_ПОЛНЫЙ_АНАЛИЗ.md`
- **Правильный код:** `backend/src/config/sentry-v10-CORRECT.ts`
- **Sentry Docs:** https://docs.sentry.io/platforms/node/
- **Migration Guide:** https://docs.sentry.io/platforms/javascript/migration/v7-to-v8/

---

## ✅ ИТОГОВЫЙ СТАТУС

После успешной миграции у вас будет:

✅ **Работающий Sentry** с новым API v10.x  
✅ **Graceful degradation** - backend не крашится если Sentry падает  
✅ **Security** - чувствительные данные не отправляются  
✅ **Performance monitoring** - видите медленные endpoints  
✅ **Error tracking** - все ошибки в одном месте  
✅ **Alerts** - уведомления о критичных проблемах

**Good luck! 🚀**





