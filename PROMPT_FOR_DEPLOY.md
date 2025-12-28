# 🎯 Пром для AI-ассистента по деплою

## 📋 Контекст

Я только что создал Docker архитектуру и систему скрытия логов в production. Теперь нужно задеплоить все изменения на production сервер DigitalOcean.

## 🚀 Что изменилось

### 1. Добавлена Docker архитектура с разделением по проектам
- [`Dockerfile`](Dockerfile) - Multi-stage build для Frontend (React + Nginx)
- [`backend/Dockerfile`](backend/Dockerfile) - Backend API (Node.js + Express)
- [`backend/Dockerfile.worker`](backend/Dockerfile.worker) - Worker (BullMQ + Cron)
- [`docker-compose.yml`](docker-compose.yml) - Оркестрация всех сервисов
- [`docker/docker-compose.main.yml`](docker/docker-compose.main.yml) - Main Platform (LMS)
- [`docker/docker-compose.traffic.yml`](docker/docker-compose.traffic.yml) - Traffic Dashboard
- [`docker/docker-compose.tripwire.yml`](docker/docker-compose.tripwire.yml) - Tripwire Product
- [`docker/docker-compose.shared.yml`](docker/docker-compose.shared.yml) - Shared Services (Redis, Telegram)
- [`docker/nginx.conf`](docker/nginx.conf) - Nginx конфигурация
- [`.dockerignore`](.dockerignore) - Frontend ignore правила
- [`backend/.dockerignore`](backend/.dockerignore) - Backend ignore правила

### 2. Добавлена система логирования
- [`src/lib/logger.ts`](src/lib/logger.ts) - централизованная система логирования
- В production показываются только **ОШИБКИ** (console.error)
- В development показываются все логи
- Добавлена функция `sanitizeData()` для скрытия чувствительных данных

### 3. Настроено удаление console.log в production
- [`vite.config.ts`](vite.config.ts:105-110) обновлен
- Удалены: `console.log`, `console.debug`, `console.info`, `console.trace`, `console.warn`
- Оставлен: `console.error` (для отладки в production)

### 4. Создана документация
- [`DOCKER_ARCHITECTURE_OVERVIEW.md`](DOCKER_ARCHITECTURE_OVERVIEW.md) - Итоговый обзор
- [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) - Полное руководство по развертыванию
- [`DOCKER_OPERATIONS.md`](DOCKER_OPERATIONS.md) - Все операции с контейнерами
- [`QUICK_START_DOCKER.md`](QUICK_START_DOCKER.md) - Быстрый старт
- [`DEPLOY_INSTRUCTIONS.md`](DEPLOY_INSTRUCTIONS.md) - Инструкции по деплою
- [`docker/README.md`](docker/README.md) - Обзор Docker архитектуры

## 🎯 Твоя задача

Сделай деплой всех изменений на production сервер DigitalOcean.

## 📝 Пошаговая инструкция

### Шаг 1: Подключение к серверу

```bash
# Подключись к production серверу DigitalOcean
ssh root@your-server-ip
```

### Шаг 2: Переход в директорию проекта

```bash
# Перейди в директорию проекта
cd /path/to/onai-integrator-login

# Или клонируй репозиторий если нет
git clone https://github.com/your-repo/onai-integrator-login.git
cd onai-integrator-login
```

### Шаг 3: Обновление кода

```bash
# Получи последние изменения
git pull origin main

# Или если ветка другая
git pull origin <branch-name>
```

### Шаг 4: Сборка проекта

```bash
# Сборка для production
npm run build:production

# Или просто
npm run build
```

### Шаг 5: Проверка сборки

```bash
# Проверь, что в dist нет console.log
grep -r "console.log" dist/
grep -r "console.info" dist/
grep -r "console.warn" dist/

# Должен быть пустой результат (или только в node_modules)
```

### Шаг 6: Деплой через Docker

```bash
# Остановка текущих контейнеров
docker-compose down

# Сборка новых образов
docker-compose build --no-cache

# Запуск новых контейнеров
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### Шаг 7: Проверка логов

```bash
# Проверь логи всех контейнеров
docker-compose logs -f

# Или конкретного контейнера
docker-compose logs -f main-frontend
docker-compose logs -f main-backend
```

### Шаг 8: Проверка работы приложения

```bash
# Открой сайт в браузере
# http://your-domain.com

# Открой DevTools (F12)
# Проверь Console - там не должно быть логов кроме ошибок
```

## ✅ Что проверить после деплоя

### 1. Проверка отсутствия console.log в браузере

```javascript
// Открой DevTools (F12) -> Console
// Там не должно быть:
// ❌ console.log(...)
// ❌ console.info(...)
// ❌ console.warn(...)
// ❌ console.debug(...)

// Должен быть только:
// ✅ console.error(...) (если есть ошибки)
```

### 2. Проверка отсутствия чувствительных данных

```javascript
// Открой DevTools (F12) -> Network
// Проверь запросы - не должно быть:
// ❌ API ключей в URL
// ❌ JWT токенов в URL
// ❌ Паролей в URL
```

### 3. Проверка работы приложения

- ✅ Логин работает
- ✅ Навигация работает
- ✅ API запросы работают
- ✅ Нет ошибок в Console
- ✅ Контейнеры работают (docker-compose ps)

## 🔒 Правила для production

### ✅ Разрешено в Console
- `console.error()` - только для критических ошибок
- Ошибки из Sentry (если настроен)

### ❌ Запрещено в Console
- `console.log()` - использовать `logger.info()`
- `console.info()` - использовать `logger.info()`
- `console.warn()` - использовать `logger.warn()`
- `console.debug()` - использовать `logger.debug()`
- Любые логи с API ключами, токенами, паролями

### ✅ Разрешено в Network
- API запросы с заголовками Authorization
- API запросы с телом запроса

### ❌ Запрещено в Network
- API ключи в URL параметрах
- JWT токены в URL параметрах
- Пароли в URL параметрах

## 🐛 Если что-то пошло не так

### Проблема: Логи все еще видны в production

**Решение:**
```bash
# 1. Проверь, что сборка была с mode=production
npm run build:production

# 2. Проверь vite.config.ts
# Должно быть: pure: mode === 'production' ? ['console.log', ...] : []

# 3. Пересобери проект
rm -rf dist
npm run build:production

# 4. Проверь dist
grep -r "console.log" dist/

# 5. Пересобери Docker образы
docker-compose build --no-cache
docker-compose up -d
```

### Проблема: Контейнеры не стартуют

**Решение:**
```bash
# 1. Проверь логи
docker-compose logs

# 2. Проверь статус
docker-compose ps

# 3. Проверь конфигурацию
docker-compose config

# 4. Пересобери контейнеры
docker-compose up -d --build --force-recreate
```

### Проблема: Нет подключения к Redis

**Решение:**
```bash
# 1. Проверь статус Redis
docker-compose ps shared-redis

# 2. Проверь логи Redis
docker-compose logs shared-redis

# 3. Тест подключения
docker-compose exec shared-redis redis-cli ping

# 4. Перезапуск Redis
docker-compose restart shared-redis
```

## 📚 Дополнительная документация

- [`DOCKER_ARCHITECTURE_OVERVIEW.md`](DOCKER_ARCHITECTURE_OVERVIEW.md) - Итоговый обзор
- [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) - Полное руководство
- [`DOCKER_OPERATIONS.md`](DOCKER_OPERATIONS.md) - Операции с контейнерами
- [`DEPLOY_INSTRUCTIONS.md`](DEPLOY_INSTRUCTIONS.md) - Инструкции по деплою
- [`src/lib/logger.ts`](src/lib/logger.ts) - Система логирования

## 🎯 Критически важные моменты

1. **ВСЕГДА** проверяй, что в dist нет console.log перед деплоем
2. **ВСЕГДА** проверяй Console в браузере после деплоя - там не должно быть логов кроме ошибок
3. **ВСЕГДА** используй `docker-compose logs` для проверки работы контейнеров
4. **ВСЕГДА** проверяй `docker-compose ps` после деплоя
5. **НИКОГДА** не деплой без проверки сборки

## 🚨 Если возникли проблемы

1. Проверь логи: `docker-compose logs`
2. Проверь статус: `docker-compose ps`
3. Проверь конфигурацию: `docker-compose config`
4. Перезапусти контейнеры: `docker-compose restart`

## 🎉 Удачи!

После успешного деплоя сообщи мне, что:
- ✅ Все контейнеры работают
- ✅ Нет console.log в Console
- ✅ Приложение работает корректно
- ✅ Нет ошибок в логах
