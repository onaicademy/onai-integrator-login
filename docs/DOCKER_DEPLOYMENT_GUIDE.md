# 🐳 Docker Deployment Guide - onAI Academy
**Полное руководство по управлению контейнерами**

---

## 📊 АРХИТЕКТУРА КОНТЕЙНЕРОВ

### Структура проекта:

```
onAI Academy Platform
├── Shared Services
│   └── shared-redis (Redis 7)
│
├── Main Platform (LMS для студентов)
│   ├── main-frontend (Nginx + React) → Port 80
│   ├── main-backend (Node.js + Express) → Port 3000
│   └── main-worker (Background jobs)
│
├── Tripwire Platform (Трипваер)
│   ├── tripwire-frontend (Nginx + React) → Port 82
│   ├── tripwire-backend (Node.js + Express) → Port 3002
│   └── tripwire-worker (Background jobs)
│
└── Traffic Dashboard (Дашборд для таргетологов)
    ├── traffic-frontend (Nginx + React) → Port 81
    ├── traffic-backend (Node.js + Express) → Port 3001
    └── traffic-worker (Background jobs)
```

### Сетевая архитектура:

```
Internet
    ↓
Nginx (на хосте) :80, :443
    ├── onai.academy → main-frontend:80
    ├── traffic.onai.academy → traffic-frontend:80
    ├── expresscourse.onai.academy → tripwire-frontend:80
    └── api.onai.academy → main-backend:3000
                         → traffic-backend:3001
                         → tripwire-backend:3002
```

---

## 🎯 УПРАВЛЕНИЕ ОТДЕЛЬНЫМИ ПРОДУКТАМИ

### ✅ ГЛАВНОЕ ПРАВИЛО: Можно деплоить каждый продукт ОТДЕЛЬНО!

### 1. **Traffic Dashboard (только этот продукт)**

#### Пересобрать и перезапустить:
```bash
cd /var/www/onai-integrator-login-main

# Остановить только Traffic
docker compose stop traffic-frontend traffic-backend traffic-worker

# Пересобрать БЕЗ кэша
docker compose build --no-cache traffic-frontend traffic-backend traffic-worker

# Запустить обратно
docker compose up -d traffic-frontend traffic-backend traffic-worker

# Проверить статус
docker compose ps | grep traffic
```

#### Быстрый рестарт (без пересборки):
```bash
# Просто перезапустить (если код не менялся)
docker compose restart traffic-frontend traffic-backend traffic-worker
```

#### Посмотреть логи:
```bash
# Последние 100 строк
docker compose logs --tail=100 traffic-backend

# Следить в реальном времени
docker compose logs -f traffic-backend

# Все сервисы Traffic
docker compose logs -f traffic-frontend traffic-backend traffic-worker
```

#### Очистить кэш только Traffic:
```bash
# Остановить
docker compose stop traffic-frontend traffic-backend traffic-worker

# Удалить контейнеры
docker compose rm -f traffic-frontend traffic-backend traffic-worker

# Удалить ТОЛЬКО образы Traffic (НЕ трогает Main и Tripwire!)
docker images | grep traffic | awk '{print $3}' | xargs docker rmi -f

# Пересобрать с нуля
docker compose build --no-cache traffic-frontend traffic-backend traffic-worker

# Запустить
docker compose up -d traffic-frontend traffic-backend traffic-worker
```

### 2. **Main Platform (основной LMS)**

```bash
# Полный деплой Main (БЕЗ затрагивания Traffic и Tripwire)
docker compose stop main-frontend main-backend main-worker
docker compose build --no-cache main-frontend main-backend main-worker
docker compose up -d main-frontend main-backend main-worker

# Только backend (если менял только backend код)
docker compose stop main-backend
docker compose build --no-cache main-backend
docker compose up -d main-backend
```

### 3. **Tripwire Platform**

```bash
# Полный деплой Tripwire
docker compose stop tripwire-frontend tripwire-backend tripwire-worker
docker compose build --no-cache tripwire-frontend tripwire-backend tripwire-worker
docker compose up -d tripwire-frontend tripwire-backend tripwire-worker

# Только backend
docker compose stop tripwire-backend
docker compose build --no-cache tripwire-backend
docker compose up -d tripwire-backend
```

---

## 🚀 ПОЛНЫЙ ДЕПЛОЙ ВСЕЙ ПЛАТФОРМЫ

### Вариант 1: С минимальным downtime (~30 секунд)

```bash
cd /var/www/onai-integrator-login-main

# 1. Обновить код из GitHub
git pull origin main

# 2. Пересобрать ВСЕ образы (контейнеры продолжают работать)
docker compose build --no-cache

# 3. Перезапустить все контейнеры (rolling restart)
docker compose up -d

# Объяснение:
# - `up -d` пересоздаёт контейнеры ПООЧЕРЁДНО
# - Старый контейнер работает, пока новый не запустится
# - Downtime минимален (~5-30 сек на контейнер)
```

### Вариант 2: С полной остановкой (если нужна чистка)

```bash
cd /var/www/onai-integrator-login-main

# 1. Остановить всё
docker compose down

# 2. Почистить старые данные
docker system prune -f

# 3. Пересобрать с нуля
docker compose build --no-cache

# 4. Запустить
docker compose up -d
```

---

## 🧹 БЕЗОПАСНАЯ ЧИСТКА ДИСКА

### Уровень 1: Безопасная чистка (БЕЗ downtime)

```bash
# Удаляет ТОЛЬКО:
# - Остановленные контейнеры
# - Неиспользуемые образы
# - Dangling layers
# - Build cache старше 24 часов

docker system prune -f

# Экономия: ~2-5GB
# Риск: НЕТ (работающие контейнеры не трогает)
```

### Уровень 2: Глубокая чистка (С downtime ~10 минут)

```bash
cd /var/www/onai-integrator-login-main

# 1. Остановить все контейнеры
docker compose down

# 2. Удалить ВСЕ образы (кроме базовых)
docker image prune -a -f

# 3. Очистить build cache
docker builder prune -a -f

# 4. Пересобрать всё с нуля
docker compose build --no-cache

# 5. Запустить
docker compose up -d

# Экономия: ~15-20GB
# Риск: Downtime ~10-15 минут
```

### Уровень 3: ЯДЕРНАЯ ОПЦИЯ (ОПАСНО!)

```bash
# ⚠️ ВНИМАНИЕ: Удаляет ВСЁ включая volumes!
# Используй ТОЛЬКО если знаешь что делаешь

docker compose down -v  # ← -v удаляет volumes (Redis данные, логи)
docker system prune -a -f --volumes

# После этого нужно пересоздать всё с нуля
```

---

## 🔄 ПРАВИЛЬНЫЙ WORKFLOW ДЕПЛОЯ

### Сценарий: Исправил баг в Traffic Backend

```bash
cd /var/www/onai-integrator-login-main

# 1. Обновить код
git pull origin main

# 2. Проверить что изменилось
git log --oneline -5
git diff HEAD~1 backend/

# 3. Остановить ТОЛЬКО traffic-backend
docker compose stop traffic-backend

# 4. Пересобрать БЕЗ кэша (важно для новых изменений!)
docker compose build --no-cache traffic-backend

# 5. Запустить обратно
docker compose up -d traffic-backend

# 6. Проверить логи
docker compose logs -f --tail=50 traffic-backend

# 7. Проверить что работает
curl -I https://api.onai.academy/api/traffic/health
```

**Downtime:** ~30 секунд (только Traffic Dashboard)
**Затронуто:** Только Traffic Dashboard
**Main и Tripwire:** Работают без перерывов

---

## 📦 ПОНИМАНИЕ DOCKER КЭША

### Как работает Docker Build:

```dockerfile
# Каждая команда = отдельный СЛОЙ
FROM node:20-alpine        # Слой 1 (базовый образ)
RUN apk add ffmpeg        # Слой 2 (пакеты)
COPY package.json .       # Слой 3 (зависимости)
RUN npm ci                # Слой 4 (node_modules)
COPY . .                  # Слой 5 (код приложения)
RUN npm run build         # Слой 6 (компиляция)
```

### Кэширование слоёв:

```
✅ БЫСТРАЯ СБОРКА (с кэшом):
Слой 1: CACHED (базовый образ не изменился)
Слой 2: CACHED (пакеты те же)
Слой 3: CACHED (package.json не изменился)
Слой 4: CACHED (npm ci уже выполнен)
Слой 5: REBUILD (код изменился!)
Слой 6: REBUILD (нужна новая компиляция)

Время: ~2 минуты
```

```
❌ МЕДЛЕННАЯ СБОРКА (без кэша --no-cache):
Слой 1: REBUILD (скачивает node:20-alpine заново)
Слой 2: REBUILD (устанавливает ffmpeg заново)
Слой 3: REBUILD (копирует package.json)
Слой 4: REBUILD (npm ci заново - долго!)
Слой 5: REBUILD (код)
Слой 6: REBUILD (компиляция)

Время: ~10 минут
```

### Когда использовать `--no-cache`:

✅ **НУЖЕН --no-cache:**
- Код изменился, но контейнер использует старый (проблема кэша)
- После обновления зависимостей в package.json
- После изменения .env переменных
- При деплое критичных фиксов

❌ **НЕ нужен --no-cache:**
- Просто рестарт контейнера (код не менялся)
- Откат после сбоя
- Изменение конфигурации Nginx (не Docker)

---

## 🎓 ПРИМЕРЫ РЕАЛЬНЫХ СИТУАЦИЙ

### Ситуация 1: "Исправил баг в Sales Manager"

**Затронуто:** `backend/src/middleware/tripwire-auth.ts`

```bash
cd /var/www/onai-integrator-login-main
git pull origin main

# ВАРИАНТ A: Пересобрать только main-backend (БЕЗ Traffic и Tripwire)
docker compose stop main-backend
docker compose build --no-cache main-backend
docker compose up -d main-backend

# ВАРИАНТ B: Если используется tripwire-backend (проверь какой эндпоинт)
docker compose stop tripwire-backend
docker compose build --no-cache tripwire-backend
docker compose up -d tripwire-backend
```

**Downtime:** 30 секунд только для Main/Tripwire
**Traffic Dashboard:** Работает без перерывов

### Ситуация 2: "Обновил UI Traffic Dashboard"

**Затронуто:** `src/components/traffic/*`

```bash
cd /var/www/onai-integrator-login-main
git pull origin main

# Пересобрать только frontend Traffic
docker compose stop traffic-frontend
docker compose build --no-cache traffic-frontend
docker compose up -d traffic-frontend

# Backend НЕ трогаем (продолжает работать)
```

**Downtime:** 10 секунд только для Traffic UI
**Main и Tripwire:** Работают без перерывов
**Traffic API:** Работает без перерывов

### Ситуация 3: "Добавил новую env переменную"

**Затронуто:** `.env`, `docker-compose.*.yml`

```bash
cd /var/www/onai-integrator-login-main

# 1. Обновить .env файл
nano .env  # или git pull

# 2. Проверить что переменная в docker-compose
grep НОВАЯ_ПЕРЕМЕННАЯ docker/docker-compose.*.yml

# 3. Пересоздать ТОЛЬКО нужный контейнер
docker compose stop main-backend
docker compose rm -f main-backend
docker compose up -d main-backend  # Подтянет новые env
```

### Ситуация 4: "Диск заполнен, нужна срочная чистка"

```bash
# 1. Безопасная быстрая чистка (БЕЗ downtime)
docker system prune -f
docker image prune -a -f

# 2. Если не помогло - глубокая чистка (С downtime)
cd /var/www/onai-integrator-login-main
docker compose down
docker system prune -a -f
docker compose up -d --build
```

---

## 🔍 МОНИТОРИНГ И ДИАГНОСТИКА

### Проверить статус всех контейнеров:

```bash
docker compose ps

# Или более детально:
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Проверить использование ресурсов:

```bash
# CPU, Memory в реальном времени
docker stats

# Только определённые контейнеры
docker stats onai-main-backend onai-traffic-backend
```

### Проверить размер образов:

```bash
# Все образы
docker images

# Только наши образы
docker images | grep onai-integrator-login-main

# Размер по типу
docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}' | grep backend
```

### Проверить использование диска Docker:

```bash
# Общая статистика
docker system df

# Детально
docker system df -v
```

### Найти большие слои:

```bash
# Детали конкретного образа
docker history onai-integrator-login-main-main-backend --no-trunc

# Найти самые большие слои
docker history onai-integrator-login-main-main-backend --format '{{.Size}}\t{{.CreatedBy}}' | sort -rh | head -10
```

---

## 🚨 TROUBLESHOOTING

### Проблема: "Контейнер не запускается"

```bash
# 1. Проверить логи
docker compose logs --tail=100 main-backend

# 2. Попробовать запустить интерактивно
docker compose run --rm main-backend sh

# 3. Проверить env переменные
docker compose config | grep -A 10 main-backend
```

### Проблема: "No space left on device"

```bash
# 1. Проверить место
df -h /

# 2. Найти что занимает место
du -sh /var/lib/docker/* | sort -rh

# 3. Почистить
docker system prune -a -f

# 4. Если не помогло - удалить старые образы
docker images | grep '<none>' | awk '{print $3}' | xargs docker rmi -f
```

### Проблема: "Код обновился, но контейнер использует старый"

```bash
# Причина: Docker использует закэшированный слой

# Решение:
docker compose stop main-backend
docker compose build --no-cache main-backend  # ← БЕЗ КЭША!
docker compose up -d main-backend

# Проверить что код новый:
docker exec onai-main-backend cat /app/package.json | grep version
```

### Проблема: "Контейнер healthy, но не отвечает"

```bash
# 1. Проверить что порты работают
docker compose ps
netstat -tulpn | grep 3000

# 2. Проверить логи
docker compose logs --tail=100 main-backend

# 3. Зайти внутрь контейнера
docker exec -it onai-main-backend sh
curl localhost:3000/health
```

---

## 📅 РЕКОМЕНДАЦИИ ПО ОБСЛУЖИВАНИЮ

### Еженедельно (автоматически):

```bash
# Добавить в cron (воскресенье 3:00)
0 3 * * 0 cd /var/www/onai-integrator-login-main && docker system prune -f >> /var/log/docker-cleanup.log 2>&1
```

### Ежемесячно (вручную):

```bash
# Глубокая чистка (выбрать время минимальной нагрузки)
cd /var/www/onai-integrator-login-main
docker compose down
docker system prune -a -f
docker compose up -d --build
```

### При каждом деплое:

```bash
# 1. Обновить код
git pull origin main

# 2. Проверить изменения
git log --oneline -5

# 3. Пересобрать ТОЛЬКО изменённые сервисы
# (см. примеры выше)

# 4. Проверить логи
docker compose logs -f --tail=50 <service>

# 5. Проверить health
curl https://api.onai.academy/health
```

---

## 🎯 ИТОГОВАЯ ШПАРГАЛКА

### Traffic Dashboard (отдельно):
```bash
# Быстрый рестарт
docker compose restart traffic-backend

# Полный деплой
docker compose stop traffic-frontend traffic-backend traffic-worker
docker compose build --no-cache traffic-frontend traffic-backend traffic-worker
docker compose up -d traffic-frontend traffic-backend traffic-worker
```

### Main Platform (отдельно):
```bash
# Только backend
docker compose stop main-backend
docker compose build --no-cache main-backend
docker compose up -d main-backend
```

### Все продукты:
```bash
# Минимальный downtime
git pull origin main
docker compose build --no-cache
docker compose up -d

# С полной остановкой
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Чистка диска:
```bash
# Безопасно (БЕЗ downtime)
docker system prune -f

# Глубоко (С downtime)
docker compose down
docker system prune -a -f
docker compose up -d --build
```

---

**Документация подготовлена:** 29 декабря 2025
**Версия:** 1.0
**Следующее обновление:** При изменении архитектуры
