# 🛡️ SENTRY PARANOID DEPLOY GUIDE

**Миссия:** Задеплоить Sentry так, чтобы backend **физически не мог упасть**

**Принцип:** Sentry = наклейка на машине. Отклеилась → машина едет дальше! ✅

---

## 🔒 УРОВНИ ЗАЩИТЫ

### Уровень 1: Feature Flag (Рубильник безопасности)

```bash
SENTRY_ENABLED=false  # ✅ Sentry ВЫКЛЮЧЕН (безопасно)
SENTRY_ENABLED=true   # ⚠️ Sentry ВКЛЮЧЕН (тестируем)
```

### Уровень 2: Triple Try-Catch

```typescript
try {              // 🔒 Outer protection
  try {            // 🔒 Init protection
    Sentry.init()
  } catch {}       // ✅ Не крашим
  
  try {            // 🔒 Middleware protection
    app.use()
  } catch {}       // ✅ Не крашим
  
} catch {}         // 🔒 ✅ ФИНАЛЬНАЯ ЗАЩИТА - НЕ КРАШИМ!
```

### Уровень 3: Graceful Degradation

- Если DSN не настроен → молча игнорируем
- Если Sentry упал → логируем и продолжаем
- Если middleware сломан → backend работает без monitoring

---

## 🚀 БЕЗОПАСНЫЙ DEPLOY (Пошагово)

### Шаг 1: Локальное тестирование

```bash
cd /Users/miso/onai-integrator-login/backend

# 1. Убедитесь что Sentry ВЫКЛЮЧЕН
echo "SENTRY_ENABLED=false" >> .env

# 2. Запустите backend
npm run dev

# ✅ Ожидаем:
# ℹ️  Sentry is DISABLED (SENTRY_ENABLED !== "true")
# ✅ Server running on port 3000
```

### Шаг 2: Проверка с ВКЛЮЧЕННЫМ Sentry (локально)

```bash
# 1. Получите тестовый DSN на sentry.io
# Зайдите: https://sentry.io → Create Project → Node.js → Copy DSN

# 2. Настройте .env
echo "SENTRY_ENABLED=true" >> .env
echo "SENTRY_DSN=https://your-test-dsn@sentry.io/123" >> .env

# 3. Перезапустите
npm run dev

# ✅ Ожидаем:
# 🔄 Initializing Sentry...
# ✅ Sentry.init() completed successfully
# ✅ Sentry requestHandler added
# ✅ Sentry tracingHandler added
# 🎉 Sentry initialized successfully!
# ✅ Server running on port 3000
```

### Шаг 3: Production Deploy (БЕЗОПАСНЫЙ)

**⚠️ КРИТИЧНО: Деплоим с ВЫКЛЮЧЕННЫМ Sentry!**

```bash
# 1. Зайдите на сервер
ssh root@207.154.231.30

# 2. Откройте .env на сервере
nano /var/www/onai-integrator-login-main/backend/env.env

# 3. Добавьте в конец файла (если еще нет):
SENTRY_ENABLED=false
SENTRY_DSN=placeholder

# 4. Сохраните (Ctrl+O, Enter, Ctrl+X)
```

```bash
# 5. Деплой кода с локальной машины
cd /Users/miso/onai-integrator-login/backend

scp src/config/sentry.ts root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/config/sentry.ts

# 6. Перезапустите backend
ssh root@207.154.231.30 "pm2 restart onai-backend --update-env"

# 7. Проверьте статус
ssh root@207.154.231.30 "pm2 status"
```

**✅ Ожидаемый результат:**

```bash
┌────┬──────────────┬────────┬──────┬───────────┐
│ id │ name         │ uptime │ ↺    │ status    │
├────┼──────────────┼────────┼──────┼───────────┤
│ 0  │ onai-backend │ 5s     │ 0    │ online    │  ✅ ОТЛИЧНО!
└────┴──────────────┴────────┴──────┴───────────┘
```

**❌ Если что-то не так:**

```bash
# Backend крашится (status: waiting restart)
# Рестартов > 5
# Это НЕ должно происходить с новым кодом!
```

### Шаг 4: Проверка что backend работает

```bash
# 1. Проверьте health endpoint
curl https://api.onai.academy/api/health

# ✅ Ожидаем:
# {"status":"ok","timestamp":"2024-12-16T..."}

# 2. Проверьте логи
ssh root@207.154.231.30 "pm2 logs onai-backend --lines 50 | grep -i sentry"

# ✅ Ожидаем:
# ℹ️  Sentry is DISABLED (SENTRY_ENABLED !== "true")
# → Backend will run without error monitoring
```

### Шаг 5: Проверка функциональности

**✅ Проверьте что ВСЁ работает:**

1. **Frontend:** https://onai.academy/integrator/modules
2. **API:** Создайте тестового студента
3. **Telegram:** Отправьте тестовое сообщение
4. **CRM:** Проверьте что лиды приходят

**Если ВСЁ работает → переходите к Шагу 6 (включение Sentry)**

---

## ✅ ШАГ 6: ВКЛЮЧЕНИЕ SENTRY (Опционально)

**⚠️ Делайте только если уверены что backend стабилен!**

### Вариант A: Постепенное включение (Рекомендуется)

```bash
# 1. Зайдите на сервер
ssh root@207.154.231.30

# 2. Откройте .env
nano /var/www/onai-integrator-login-main/backend/env.env

# 3. Замените:
SENTRY_ENABLED=false
# На:
SENTRY_ENABLED=true

# 4. Добавьте настоящий DSN (получить на sentry.io)
SENTRY_DSN=https://your-production-dsn@sentry.io/project-id

# 5. Сохраните (Ctrl+O, Enter, Ctrl+X)

# 6. Перезапустите backend
pm2 restart onai-backend --update-env

# 7. Проверьте логи (КРИТИЧНО!)
pm2 logs onai-backend --lines 100
```

**✅ Если видите:**

```
🔄 Initializing Sentry...
✅ Sentry.init() completed successfully
✅ Sentry requestHandler added
✅ Sentry tracingHandler added
🎉 Sentry initialized successfully!
   → Error monitoring is ACTIVE
```

**→ Всё отлично! Sentry работает!**

**❌ Если видите:**

```
❌ Sentry.init() FAILED, but backend will continue:
   Error: ...
✅ Backend continues WITHOUT Sentry monitoring
```

**→ Sentry сломался, НО backend продолжает работу!**

### Вариант B: Быстрое отключение (Если что-то пошло не так)

```bash
# 1. Зайдите на сервер
ssh root@207.154.231.30

# 2. Откройте .env
nano /var/www/onai-integrator-login-main/backend/env.env

# 3. Замените:
SENTRY_ENABLED=true
# На:
SENTRY_ENABLED=false

# 4. Сохраните и перезапустите
pm2 restart onai-backend --update-env

# ✅ Backend вернется в безопасный режим (без Sentry)
```

---

## 🧪 ТЕСТИРОВАНИЕ SENTRY

### Test Case 1: Sentry отключен (безопасный режим)

```bash
# .env:
SENTRY_ENABLED=false

# ✅ Ожидаем:
ℹ️  Sentry is DISABLED
✅ Server running
```

### Test Case 2: Sentry включен и работает

```bash
# .env:
SENTRY_ENABLED=true
SENTRY_DSN=https://valid-dsn@sentry.io/123

# ✅ Ожидаем:
🎉 Sentry initialized successfully!
✅ Server running
```

### Test Case 3: Sentry включен но сломан (ЗАЩИТА!)

```bash
# .env:
SENTRY_ENABLED=true
SENTRY_DSN=https://invalid-dsn@sentry.io/999

# ✅ Ожидаем:
❌ Sentry.init() FAILED, but backend will continue:
✅ Backend continues WITHOUT Sentry monitoring
✅ Server running  # 🔒 BACKEND НЕ УПАЛ!
```

### Test Case 4: Ошибка отправляется в Sentry

```bash
# 1. Создайте тестовый endpoint (временно)
# backend/src/routes/test.ts

app.get('/api/test-sentry-error', (req, res) => {
  throw new Error('Test error for Sentry monitoring');
});

# 2. Вызовите endpoint
curl https://api.onai.academy/api/test-sentry-error

# 3. Проверьте Sentry Dashboard
# https://sentry.io → Issues
# ✅ Должна появиться ошибка "Test error for Sentry monitoring"

# 4. Удалите тестовый endpoint после проверки
```

---

## ❌ TROUBLESHOOTING

### Проблема 1: Backend крашится после deploy

**Симптом:**
```bash
pm2 status
# status: waiting restart, restarts: > 5
```

**Решение:**

```bash
# ЭТО НЕ ДОЛЖНО ПРОИСХОДИТЬ С PARANOID VERSION!

# Но если всё же произошло:

# 1. Проверьте логи
pm2 logs onai-backend --err --lines 100

# 2. Отключите Sentry через .env
nano /var/www/onai-integrator-login-main/backend/env.env
# SENTRY_ENABLED=false

# 3. Перезапустите
pm2 restart onai-backend --update-env

# 4. Backend должен запуститься
pm2 status
# status: online ✅
```

### Проблема 2: Sentry не отправляет ошибки

**Симптом:** Backend работает, но ошибки не появляются в Sentry Dashboard

**Решение:**

```bash
# 1. Проверьте что Sentry включен
grep SENTRY_ENABLED /var/www/onai-integrator-login-main/backend/env.env
# Должно быть: SENTRY_ENABLED=true

# 2. Проверьте логи инициализации
pm2 logs onai-backend | grep Sentry
# Должно быть: "🎉 Sentry initialized successfully!"

# 3. Проверьте DSN
grep SENTRY_DSN /var/www/onai-integrator-login-main/backend/env.env
# Должно быть валидное значение, НЕ "placeholder"

# 4. Вызовите тестовую ошибку
curl https://api.onai.academy/api/test-sentry-error

# 5. Проверьте Sentry Dashboard через 1-2 минуты
```

### Проблема 3: Sentry работал, потом перестал

**Решение:**

```bash
# 1. Проверьте PM2 status
pm2 status
# Должно быть: status: online

# 2. Перезапустите с обновлением env
pm2 restart onai-backend --update-env

# 3. Проверьте логи
pm2 logs onai-backend --lines 50 | grep -i sentry
```

---

## 🔒 ГАРАНТИИ БЕЗОПАСНОСТИ

### ✅ Что гарантирует Paranoid Mode:

1. **Backend ВСЕГДА запустится**
   - Даже если Sentry полностью сломан
   - Даже если DSN неправильный
   - Даже если Sentry API изменился

2. **CRM продолжит работать**
   - AmoCRM интеграция не затронута
   - Лиды будут приходить
   - Telegram бот работает

3. **Админка доступна**
   - Создание студентов работает
   - Прогресс трекается
   - Видео проигрывается

4. **Graceful Degradation**
   - Если Sentry упадет во время работы
   - Backend продолжит обрабатывать запросы
   - Только monitoring отключится

### ⚠️ Что НЕ гарантируется:

- ❌ Sentry может не работать (это OK!)
- ❌ Ошибки могут не отправляться (это OK!)
- ❌ Performance metrics могут не собираться (это OK!)

**→ НО BACKEND БУДЕТ РАБОТАТЬ!** ✅

---

## 📊 CHECKLIST БЕЗОПАСНОГО DEPLOY

### Перед deploy:

- [ ] Создан backup `sentry.ts.backup`
- [ ] Локально протестировано с `SENTRY_ENABLED=false`
- [ ] Локально протестировано с `SENTRY_ENABLED=true`
- [ ] Team уведомлена о deploy
- [ ] Есть доступ к серверу для быстрого rollback

### После deploy:

- [ ] `pm2 status` показывает `online` (не `waiting restart`)
- [ ] API `/api/health` возвращает 200
- [ ] Логи содержат: "Sentry is DISABLED" или "Sentry initialized"
- [ ] Frontend доступен
- [ ] Создание студента работает
- [ ] CRM получает лиды

### Через 1 час:

- [ ] Backend стабилен (нет рестартов)
- [ ] Все функции работают
- [ ] (Опционально) Sentry получает ошибки

### Через 24 часа:

- [ ] Backend работает без проблем
- [ ] Monitoring (если включен) собирает данные
- [ ] Alerts настроены
- [ ] Team довольна

---

## 🎯 ИТОГОВАЯ СТРАТЕГИЯ

### Phase 1: Безопасный deploy (сейчас)

```
SENTRY_ENABLED=false  →  Backend работает БЕЗ Sentry
✅ CRM работает
✅ Telegram работает
✅ Админка работает
✅ Студенты могут учиться
```

### Phase 2: Тестирование Sentry (через 1-2 дня)

```
SENTRY_ENABLED=true  →  Включаем Sentry
✅ Если работает - отлично, видим ошибки
❌ Если падает - backend продолжает работу
```

### Phase 3: Production monitoring (через неделю)

```
✅ Sentry работает стабильно
✅ Alerts настроены
✅ Performance monitoring активен
✅ Team получает уведомления
```

---

## 🛡️ "РУБИЛЬНИК БЕЗОПАСНОСТИ"

**В любой момент можно вернуться к безопасному режиму:**

```bash
# На сервере:
nano /var/www/onai-integrator-login-main/backend/env.env

# Изменить одну строчку:
SENTRY_ENABLED=false

# Перезапустить:
pm2 restart onai-backend --update-env

# ✅ Backend вернулся в безопасный режим!
# ✅ CRM работает
# ✅ Telegram работает
# ✅ Всё как было до Sentry
```

---

## 🎓 LESSONS LEARNED

1. **Monitoring инструменты НЕ должны крашить приложение**
   - Sentry = вспомогательный инструмент
   - Backend = критичная система
   - Backend > Sentry (по приоритету)

2. **Feature flags спасают жизни**
   - `SENTRY_ENABLED` = рубильник безопасности
   - Можно включить/выключить без deploy
   - Можно протестировать постепенно

3. **Paranoid programming works**
   - Triple try-catch = избыточно, но безопасно
   - Graceful degradation = правильный подход
   - Fail-safe > Fail-fast (для критичных систем)

4. **Тестируй на staging ВСЕГДА**
   - Локально с `SENTRY_ENABLED=false`
   - Локально с `SENTRY_ENABLED=true`
   - Production с `SENTRY_ENABLED=false` (сначала)
   - Production с `SENTRY_ENABLED=true` (потом)

---

**Автор:** AI Assistant + Engineering Team  
**Дата:** 16 декабря 2024  
**Версия:** Paranoid 1.0  
**Статус:** ✅ Готово к deploy

---

## 🚀 QUICK START (TL;DR)

```bash
# 1. Deploy с ВЫКЛЮЧЕННЫМ Sentry
ssh root@207.154.231.30
echo "SENTRY_ENABLED=false" >> /var/www/onai-integrator-login-main/backend/env.env

# 2. Скопируйте новый sentry.ts
scp backend/src/config/sentry.ts root@207.154.231.30:/var/www/onai-integrator-login-main/backend/src/config/sentry.ts

# 3. Перезапустите
ssh root@207.154.231.30 "pm2 restart onai-backend --update-env"

# 4. Проверьте
curl https://api.onai.academy/api/health

# ✅ Backend работает!
# ✅ CRM работает!
# ✅ Telegram работает!

# 5. (Опционально) Включите Sentry позже:
# Измените SENTRY_ENABLED=true и перезапустите
```

**Good luck! 🛡️**











