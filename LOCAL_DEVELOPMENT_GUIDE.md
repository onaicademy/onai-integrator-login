# 🐳 Local Development with Docker

Полное руководство по локальной разработке с использованием Docker.

---

## 📋 Содержание

1. [Быстрый старт](#quick-start)
2. [Структура проекта](#project-structure)
3. [Доступные сервисы](#services)
4. [Команды Docker](#docker-commands)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 Быстрый старт {#quick-start}

### Шаг 1: Установка Docker Desktop

Скачай и установи [Docker Desktop](https://www.docker.com/products/docker-desktop/)

Проверь установку:
```bash
docker --version
docker-compose --version
```

### Шаг 2: Настрой переменные окружения

```bash
# Скопируй пример файла
cp .env.local.example .env.local

# Открой и заполни реальные значения
nano .env.local
```

**Обязательные переменные:**
- `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (Main Platform)
- `VITE_TRIPWIRE_SUPABASE_URL` и `VITE_TRIPWIRE_SUPABASE_ANON_KEY` (Tripwire)
- `TRAFFIC_SUPABASE_URL` и `TRAFFIC_SUPABASE_ANON_KEY` (Traffic Dashboard)
- `RESEND_API_KEY` (для email)
- `OPENAI_API_KEY` (для AI функций)

### Шаг 3: Запуск всех сервисов

```bash
# Запуск ВСЕХ сервисов
docker-compose -f docker-compose.local.yml up -d

# Или запуск конкретного сервиса
docker-compose -f docker-compose.local.yml up -d main-backend
```

### Шаг 4: Проверь статус

```bash
# Проверь статус всех контейнеров
docker-compose -f docker-compose.local.yml ps

# Проверь логи
docker-compose -f docker-compose.local.yml logs -f
```

### Шаг 5: Открой в браузере

- **Main Platform:** http://localhost:8080
- **Tripwire Product:** http://localhost:8082
- **Traffic Dashboard:** http://localhost:8081

- **Main Backend API:** http://localhost:3000
- **Tripwire Backend API:** http://localhost:3002
- **Traffic Backend API:** http://localhost:3001

- **Redis:** localhost:6379

---

## 📁 Структура проекта {#project-structure}

```
onai-integrator-login/
├── docker-compose.local.yml       # 🐳 Локальная Docker конфигурация
├── .env.local                     # 🔐 Локальные переменные окружения
├── .env.local.example             # 📝 Шаблон переменных
├── backend/                       # 🔧 Backend код
│   ├── Dockerfile                 # Backend image
│   ├── Dockerfile.worker          # Worker image
│   ├── src/                       # Исходный код
│   ├── logs/                      # Логи (volume)
│   └── uploads/                   # Загрузки (volume)
├── src/                           # ⚛️ Frontend код
├── docker/                        # 🏭 Production Docker configs
└── LOCAL_DEVELOPMENT_GUIDE.md     # 📖 Это руководство
```

---

## 🛠️ Доступные сервисы {#services}

### 1. **Redis** 🔴
- **Порт:** 6379
- **Назначение:** Кеширование, очереди задач, сессии
- **Здоровье:** `redis-cli ping` → `PONG`

### 2. **Main Platform** 🟢
- **Frontend:** http://localhost:8080
- **Backend:** http://localhost:3000
- **Worker:** background process
- **Назначение:** Основная LMS платформа для студентов
- **Health:** http://localhost:3000/health

### 3. **Tripwire Product** 🔵
- **Frontend:** http://localhost:8082
- **Backend:** http://localhost:3002
- **Назначение:** Express-курс (expresscourse.onai.academy)
- **Health:** http://localhost:3002/health

### 4. **Traffic Dashboard** 🟡
- **Frontend:** http://localhost:8081
- **Backend:** http://localhost:3001
- **Назначение:** Панель для таргетологов
- **Health:** http://localhost:3001/health

---

## 🎮 Команды Docker {#docker-commands}

### Управление контейнерами

```bash
# Запуск всех сервисов
docker-compose -f docker-compose.local.yml up -d

# Запуск конкретного сервиса
docker-compose -f docker-compose.local.yml up -d main-backend

# Остановка всех сервисов
docker-compose -f docker-compose.local.yml down

# Перезапуск сервиса
docker-compose -f docker-compose.local.yml restart main-backend

# Пересборка образа
docker-compose -f docker-compose.local.yml build main-backend

# Пересборка БЕЗ кеша
docker-compose -f docker-compose.local.yml build --no-cache main-backend

# Запуск с пересборкой
docker-compose -f docker-compose.local.yml up -d --build
```

### Просмотр логов

```bash
# Логи всех сервисов
docker-compose -f docker-compose.local.yml logs -f

# Логи конкретного сервиса
docker-compose -f docker-compose.local.yml logs -f main-backend

# Последние 100 строк
docker-compose -f docker-compose.local.yml logs --tail=100 main-backend

# Логи в реальном времени
docker-compose -f docker-compose.local.yml logs -f --tail=50 main-backend
```

### Выполнение команд внутри контейнера

```bash
# Войти в контейнер
docker exec -it onai-local-main-backend sh

# Выполнить команду
docker exec onai-local-main-backend node -v

# Проверить переменные окружения
docker exec onai-local-main-backend printenv | grep SUPABASE
```

### Управление volumes

```bash
# Показать volumes
docker volume ls | grep onai

# Удалить volumes (ОСТОРОЖНО!)
docker-compose -f docker-compose.local.yml down -v

# Очистить кеш Redis
docker exec onai-local-redis redis-cli FLUSHALL
```

### Проверка здоровья

```bash
# Статус контейнеров
docker-compose -f docker-compose.local.yml ps

# Детальная информация
docker inspect onai-local-main-backend

# Проверка портов
docker port onai-local-main-backend

# Использование ресурсов
docker stats
```

---

## 🔧 Troubleshooting {#troubleshooting}

### Проблема: Контейнер падает сразу после старта

**Решение:**
```bash
# 1. Проверь логи
docker-compose -f docker-compose.local.yml logs main-backend

# 2. Проверь переменные окружения
docker exec onai-local-main-backend printenv

# 3. Пересобери без кеша
docker-compose -f docker-compose.local.yml build --no-cache main-backend
docker-compose -f docker-compose.local.yml up -d main-backend
```

### Проблема: Порт занят

**Ошибка:** `Error starting userland proxy: listen tcp4 0.0.0.0:3000: bind: address already in use`

**Решение:**
```bash
# Найди процесс на порту 3000
lsof -i :3000

# Останови процесс
kill -9 <PID>

# Или измени порт в docker-compose.local.yml
# ports:
#   - "3005:3000"  # внешний:внутренний
```

### Проблема: Не подключается к Redis

**Решение:**
```bash
# 1. Проверь статус Redis
docker-compose -f docker-compose.local.yml ps redis

# 2. Проверь health check
docker inspect onai-local-redis | grep Health -A 10

# 3. Проверь подключение
docker exec onai-local-redis redis-cli ping

# 4. Перезапусти Redis
docker-compose -f docker-compose.local.yml restart redis
```

### Проблема: Supabase connection timeout

**Решение:**
```bash
# 1. Проверь .env.local - корректные ли URL?
cat .env.local | grep SUPABASE_URL

# 2. Проверь доступность Supabase
curl -I https://your-project.supabase.co

# 3. Проверь firewall/VPN
# Supabase может быть заблокирован в некоторых регионах
```

### Проблема: Frontend не обновляется

**Решение:**
```bash
# 1. Очисти кеш браузера (Ctrl+Shift+R)

# 2. Пересобери frontend
docker-compose -f docker-compose.local.yml build --no-cache main-frontend
docker-compose -f docker-compose.local.yml up -d main-frontend

# 3. Проверь volume mounts
docker inspect onai-local-main-frontend | grep Mounts -A 20
```

### Проблема: Медленная работа Docker на Mac

**Решение:**
```bash
# 1. Увеличь ресурсы в Docker Desktop:
# Settings → Resources → Advanced
# - CPUs: 4
# - Memory: 8GB
# - Swap: 2GB

# 2. Используй Docker volumes вместо bind mounts
# (уже настроено в docker-compose.local.yml)

# 3. Очисти неиспользуемые образы
docker system prune -a
```

---

## 📊 Полезные команды

### Мониторинг

```bash
# Использование ресурсов в реальном времени
docker stats

# Детальная информация о контейнере
docker inspect onai-local-main-backend | jq

# Проверка health checks
docker ps --filter "health=healthy"
```

### Очистка

```bash
# Удалить остановленные контейнеры
docker container prune

# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые volumes
docker volume prune

# Полная очистка системы
docker system prune -a --volumes
```

### Экспорт/Импорт

```bash
# Сохранить образ
docker save onai-local-main-backend > main-backend.tar

# Загрузить образ
docker load < main-backend.tar

# Экспорт контейнера
docker export onai-local-main-backend > container.tar
```

---

## 🎯 Workflow разработки

### 1. Запуск проекта утром

```bash
# Запусти все сервисы
docker-compose -f docker-compose.local.yml up -d

# Проверь статус
docker-compose -f docker-compose.local.yml ps

# Открой логи в отдельном терминале
docker-compose -f docker-compose.local.yml logs -f main-backend
```

### 2. Работа с кодом

- Frontend: http://localhost:8080 (автоматически обновляется)
- Backend: Требует рестарта при изменениях

```bash
# После изменений в backend коде
docker-compose -f docker-compose.local.yml restart main-backend
```

### 3. Тестирование API

```bash
# Health check
curl http://localhost:3000/health

# Тестовый запрос
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 4. Остановка проекта вечером

```bash
# Остановка всех сервисов
docker-compose -f docker-compose.local.yml down

# Остановка с удалением volumes (если нужна чистка)
docker-compose -f docker-compose.local.yml down -v
```

---

## 🔐 Безопасность

**⚠️ ВАЖНО:**

1. **Никогда не коммить .env.local** - добавлен в .gitignore
2. **Используй тестовые ключи** для локальной разработки
3. **Не используй production ключи** локально
4. **Регулярно обновляй зависимости:**
   ```bash
   npm audit
   npm update
   ```

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Supabase Docs](https://supabase.com/docs)
- [onAI Academy Docs](./docs/)

---

## 💡 Tips & Tricks

### Алиасы для быстрого доступа

Добавь в `~/.zshrc` или `~/.bashrc`:

```bash
# Docker aliases для onAI project
alias dcu='docker-compose -f docker-compose.local.yml up -d'
alias dcd='docker-compose -f docker-compose.local.yml down'
alias dcl='docker-compose -f docker-compose.local.yml logs -f'
alias dcp='docker-compose -f docker-compose.local.yml ps'
alias dcr='docker-compose -f docker-compose.local.yml restart'

# Быстрый доступ к логам
alias logs-main='docker-compose -f docker-compose.local.yml logs -f main-backend'
alias logs-tripwire='docker-compose -f docker-compose.local.yml logs -f tripwire-backend'
alias logs-traffic='docker-compose -f docker-compose.local.yml logs -f traffic-backend'

# Быстрый рестарт
alias restart-main='docker-compose -f docker-compose.local.yml restart main-backend'
```

Применить изменения:
```bash
source ~/.zshrc  # или source ~/.bashrc
```

Теперь можно использовать:
```bash
dcu           # вместо docker-compose -f docker-compose.local.yml up -d
logs-main     # вместо docker-compose -f docker-compose.local.yml logs -f main-backend
```

---

**Удачной разработки! 🚀**
