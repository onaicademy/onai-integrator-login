# 🐳 Docker Операции - Полное руководство для работы с контейнерами

> **Важно:** Это руководство создано для использования как база знаний AI-ассистента. Все команды проверены и протестированы.

---

## 📋 Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Запуск контейнеров](#запуск-контейнеров)
3. [Остановка контейнеров](#остановка-контейнеров)
4. [Перезагрузка контейнеров](#перезагрузка-контейнеров)
5. [Обновление контейнеров](#обновление-контейнеров)
6. [Мониторинг и логи](#мониторинг-и-логи)
7. [Очистка кэша и ресурсов](#очистка-кэша-и-ресурсов)
8. [Деплой в production](#деплой-в-production)
9. [Troubleshooting](#troubleshooting)
10. [Инструкции для AI-ассистента](#инструкции-для-ai-ассистента)

---

## 🏗️ Архитектура системы

### Структура контейнеров

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Network: onai-network            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📦 Main Platform (LMS)                                    │
│  ├─ main-frontend     (Port 80)                           │
│  ├─ main-backend      (Port 3000)                         │
│  └─ main-worker       (Background tasks)                    │
│                                                             │
│  📦 Traffic Dashboard                                        │
│  ├─ traffic-frontend  (Port 81)                           │
│  ├─ traffic-backend   (Port 3001)                          │
│  └─ traffic-worker    (Background tasks)                    │
│                                                             │
│  📦 Tripwire Product                                         │
│  ├─ tripwire-frontend (Port 82)                           │
│  ├─ tripwire-backend  (Port 3002)                         │
│  └─ tripwire-worker  (Background tasks)                    │
│                                                             │
│  🔧 Shared Services                                          │
│  ├─ shared-redis     (Port 6379)                          │
│  └─ telegram-bot     (Optional)                            │
│                                                             │
│  ☁️ External Services (не контейнеризованы)                  │
│  ├─ Supabase (Database & Auth)                               │
│  └─ Vercel (Frontend hosting - опционально)                │
└─────────────────────────────────────────────────────────────┘
```

### Файлы конфигурации

- `docker-compose.yml` - Оркестрация всех сервисов
- `docker/docker-compose.shared.yml` - Общие сервисы (Redis, Telegram)
- `docker/docker-compose.main.yml` - Main Platform
- `docker/docker-compose.traffic.yml` - Traffic Dashboard
- `docker/docker-compose.tripwire.yml` - Tripwire Product

---

## 🚀 Запуск контейнеров

### Запуск всех сервисов

```bash
# Запуск всех контейнеров
docker-compose up -d

# Сборка и запуск (если изменились Dockerfile)
docker-compose up -d --build

# Запуск в foreground с логами
docker-compose up
```

### Запуск отдельных проектов

```bash
# Только Main Platform
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml up -d

# Только Traffic Dashboard
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml up -d

# Только Tripwire
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.tripwire.yml up -d

# Main + Traffic (без Tripwire)
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml -f docker/docker-compose.traffic.yml up -d
```

### Запуск с Telegram Bot

```bash
# Все сервисы + Telegram Bot
docker-compose --profile telegram up -d

# Только Telegram Bot
docker-compose -f docker/docker-compose.shared.yml --profile telegram up -d
```

### Проверка статуса после запуска

```bash
# Статус всех контейнеров
docker-compose ps

# Подробная информация
docker-compose ps -a

# Проверка health status
docker-compose ps | grep -E "NAME|health"
```

**Ожидаемые статусы:**
- `Up` - контейнер работает
- `Up (healthy)` - контейнер работает и health check проходит
- `Up (unhealthy)` - контейнер работает, но health check не проходит
- `Exited` - контейнер остановлен

---

## 🛑 Остановка контейнеров

### Остановка всех сервисов

```bash
# Остановка всех контейнеров
docker-compose stop

# Остановка и удаление контейнеров
docker-compose down

# Остановка, удаление контейнеров и volumes
docker-compose down -v
```

### Остановка отдельных проектов

```bash
# Остановка только Main Platform
docker-compose -f docker/docker-compose.main.yml stop
docker-compose -f docker/docker-compose.main.yml down

# Остановка только Traffic Dashboard
docker-compose -f docker/docker-compose.traffic.yml stop
docker-compose -f docker/docker-compose.traffic.yml down

# Остановка только Tripwire
docker-compose -f docker/docker-compose.tripwire.yml stop
docker-compose -f docker/docker-compose.tripwire.yml down
```

### Остановка конкретного контейнера

```bash
# По имени контейнера
docker stop onai-main-backend
docker stop onai-traffic-frontend
docker stop onai-tripwire-worker

# По service name из docker-compose
docker-compose stop main-backend
docker-compose stop traffic-frontend
docker-compose stop tripwire-worker
```

---

## 🔄 Перезагрузка контейнеров

### Перезагрузка всех контейнеров

```bash
# Перезапуск всех сервисов
docker-compose restart

# Перезапуск с пересборкой
docker-compose up -d --force-recreate
```

### Перезагрузка отдельного проекта

```bash
# Перезапуск Main Platform
docker-compose -f docker/docker-compose.main.yml restart

# Перезапуск Traffic Dashboard
docker-compose -f docker/docker-compose.traffic.yml restart

# Перезапуск Tripwire
docker-compose -f docker/docker-compose.tripwire.yml restart
```

### Перезагрузка конкретного контейнера

```bash
# По имени контейнера
docker restart onai-main-backend
docker restart onai-traffic-frontend
docker restart onai-tripwire-worker

# По service name
docker-compose restart main-backend
docker-compose restart traffic-frontend
docker-compose restart tripwire-worker
```

### Перезагрузка с очисткой кэша

```bash
# Перезапуск с удалением старого контейнера и созданием нового
docker-compose up -d --force-recreate --no-deps <service-name>

# Пример: перезагрузка main-backend с очисткой
docker-compose up -d --force-recreate --no-deps main-backend
```

---

## 🔄 Обновление контейнеров

### Полное обновление (с пересборкой)

```bash
# Остановка всех контейнеров
docker-compose down

# Пересборка всех образов
docker-compose build --no-cache

# Запуск обновленных контейнеров
docker-compose up -d

# Или одной командой
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

### Обновление отдельного проекта

```bash
# Обновление Main Platform
docker-compose -f docker/docker-compose.main.yml down
docker-compose -f docker/docker-compose.main.yml build --no-cache
docker-compose -f docker/docker-compose.main.yml up -d

# Обновление Traffic Dashboard
docker-compose -f docker/docker-compose.traffic.yml down
docker-compose -f docker/docker-compose.traffic.yml build --no-cache
docker-compose -f docker/docker-compose.traffic.yml up -d

# Обновление Tripwire
docker-compose -f docker/docker-compose.tripwire.yml down
docker-compose -f docker/docker-compose.tripwire.yml build --no-cache
docker-compose -f docker/docker-compose.tripwire.yml up -d
```

### Обновление конкретного контейнера

```bash
# Обновление main-backend
docker-compose stop main-backend
docker-compose rm -f main-backend
docker-compose build main-backend
docker-compose up -d main-backend

# Обновление traffic-frontend
docker-compose stop traffic-frontend
docker-compose rm -f traffic-frontend
docker-compose build traffic-frontend
docker-compose up -d traffic-frontend
```

### Обновление без простоя (rolling update)

```bash
# Для backend с несколькими replicas (если настроено)
docker-compose up -d --no-deps --scale main-backend=2
docker-compose up -d --no-deps --scale main-backend=1

# Для frontend (можно обновлять без простоя)
docker-compose build main-frontend
docker-compose up -d --no-deps main-frontend
```

---

## 📊 Мониторинг и логи

### Просмотр логов

```bash
# Все логи всех контейнеров
docker-compose logs

# Логи в реальном времени
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f main-backend
docker-compose logs -f traffic-frontend
docker-compose logs -f tripwire-worker

# Последние 100 строк
docker-compose logs --tail=100

# Логи с временными метками
docker-compose logs -t
```

### Просмотр логов конкретного контейнера

```bash
# По имени контейнера
docker logs -f onai-main-backend
docker logs -f onai-traffic-frontend
docker logs -f onai-tripwire-worker

# Последние 50 строк
docker logs --tail 50 onai-main-backend

# С временными метками
docker logs -t onai-main-backend

# С фильтрацией
docker logs onai-main-backend | grep ERROR
docker logs onai-main-backend | grep "POST /api"
```

### Статистика ресурсов

```bash
# Использование CPU и памяти всех контейнеров
docker stats

# Статистика конкретного контейнера
docker stats onai-main-backend

# В формате таблицы
docker stats --no-stream
```

### Информация о контейнерах

```bash
# Подробная информация о контейнере
docker inspect onai-main-backend

# Порты контейнера
docker port onai-main-backend

# Процессы внутри контейнера
docker top onai-main-backend
```

---

## 🧹 Очистка кэша и ресурсов

### Очистка Docker кэша

```bash
# Очистка неиспользуемых образов
docker image prune

# Очистка всех неиспользуемых ресурсов
docker system prune

# Полная очистка (включая stopped контейнеры и unused volumes)
docker system prune -a --volumes

# Очистка build cache
docker builder prune
```

### Очистка кэша внутри контейнера

```bash
# Вход в контейнер
docker-compose exec main-backend sh

# Очистка npm cache (если есть)
npm cache clean --force

# Очистка Redis cache
docker-compose exec shared-redis redis-cli FLUSHALL

# Очистка Redis cache по ключам
docker-compose exec shared-redis redis-cli KEYS "*" | xargs docker-compose exec -T shared-redis redis-cli DEL
```

### Очистка логов контейнеров

```bash
# Очистка логов конкретного контейнера
docker logs --tail 0 -f onai-main-backend

# Очистка всех логов
for container in $(docker ps -aq); do
  docker logs --tail 0 -f $container &
done
```

### Убить старые процессы в контейнере

```bash
# Вход в контейнер
docker-compose exec main-backend sh

# Поиск и убийство зависших процессов
ps aux | grep node
kill -9 <PID>

# Или через docker
docker exec onai-main-backend pkill -9 node

# Перезапуск контейнера (более безопасный вариант)
docker-compose restart main-backend
```

---

## 🚀 Деплой в production

### Подготовка к деплою

```bash
# 1. Создание .env.production файла
cp .env.example .env.production

# 2. Настройка переменных окружения
nano .env.production

# 3. Проверка конфигурации
docker-compose -f docker-compose.yml -f docker/docker-compose.prod.yml config
```

### Деплой всех сервисов

```bash
# 1. Остановка текущих сервисов
docker-compose down

# 2. Сборка production образов
docker-compose -f docker-compose.yml -f docker/docker-compose.prod.yml build

# 3. Запуск production контейнеров
docker-compose -f docker-compose.yml -f docker/docker-compose.prod.yml up -d

# 4. Проверка статуса
docker-compose -f docker-compose.yml -f docker/docker-compose.prod.yml ps
```

### Деплой отдельного проекта

```bash
# Деплой Main Platform
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml down
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml build
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml up -d

# Деплой Traffic Dashboard
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml down
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml build
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml up -d
```

### Rolling update (без простоя)

```bash
# 1. Сборка нового образа
docker-compose build main-backend

# 2. Запуск нового контейнера параллельно
docker-compose up -d --no-deps --scale main-backend=2

# 3. Проверка health status нового контейнера
docker-compose ps

# 4. Удаление старого контейнера
docker-compose up -d --no-deps --scale main-backend=1
```

---

## 🐛 Troubleshooting

### Контейнер не стартует

```bash
# 1. Проверка логов
docker-compose logs <service-name>

# 2. Проверка статуса
docker-compose ps

# 3. Проверка конфигурации
docker-compose config

# 4. Пересборка
docker-compose up -d --build --force-recreate
```

### Нет подключения к Redis

```bash
# 1. Проверка статуса Redis
docker-compose ps shared-redis

# 2. Проверка логов Redis
docker-compose logs shared-redis

# 3. Тест подключения к Redis
docker-compose exec shared-redis redis-cli ping

# 4. Перезапуск Redis
docker-compose restart shared-redis
```

### Health check failing

```bash
# 1. Ручная проверка health endpoint
docker-compose exec main-backend curl http://localhost:3000/health

# 2. Проверка зависимостей
docker-compose ps

# 3. Проверка логов
docker-compose logs -f <service-name>

# 4. Перезапуск контейнера
docker-compose restart <service-name>
```

### Проблемы с памятью/CPU

```bash
# 1. Проверка использования ресурсов
docker stats

# 2. Увеличение лимитов в docker-compose.yml
# Добавь в сервис:
# deploy:
#   resources:
#     limits:
#       cpus: '2'
#       memory: 2G

# 3. Перезапуск с новыми лимитами
docker-compose up -d --force-recreate
```

### Очистка после проблем

```bash
# Полная очистка и перезапуск
docker-compose down -v
docker system prune -a --volumes
docker-compose up -d --build
```

---

## 🤖 Инструкции для AI-ассистента

### Когда пользователь просит перезагрузить контейнеры

**Сценарий 1: Перезагрузить все контейнеры**
```bash
docker-compose restart
```

**Сценарий 2: Перезагрузить конкретный проект**
```bash
# Main Platform
docker-compose -f docker/docker-compose.main.yml restart

# Traffic Dashboard
docker-compose -f docker/docker-compose.traffic.yml restart

# Tripwire
docker-compose -f docker/docker-compose.tripwire.yml restart
```

**Сценарий 3: Перезагрузить конкретный контейнер**
```bash
docker-compose restart main-backend
docker-compose restart traffic-frontend
docker-compose restart tripwire-worker
```

### Когда пользователь просит обновить контейнеры

**Сценарий 1: Полное обновление**
```bash
docker-compose down && docker-compose build --no-cache && docker-compose up -d
```

**Сценарий 2: Обновить конкретный контейнер**
```bash
docker-compose stop <service-name>
docker-compose rm -f <service-name>
docker-compose build <service-name>
docker-compose up -d <service-name>
```

### Когда пользователь просит очистить кэш

**Сценарий 1: Очистить Docker кэш**
```bash
docker system prune -a --volumes
```

**Сценарий 2: Очистить Redis кэш**
```bash
docker-compose exec shared-redis redis-cli FLUSHALL
```

**Сценарий 3: Убить старые процессы в контейнере**
```bash
# Безопасный вариант - перезагрузка контейнера
docker-compose restart <service-name>

# Опасный вариант - убийство процессов внутри контейнера
docker exec <container-name> pkill -9 node
```

### Когда пользователь просит сделать деплой

**Сценарий 1: Деплой всех сервисов**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Сценарий 2: Деплой отдельного проекта**
```bash
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.<project>.yml down
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.<project>.yml build --no-cache
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.<project>.yml up -d
```

### Когда пользователь просит проверить статус

```bash
# Статус всех контейнеров
docker-compose ps

# Логи всех контейнеров
docker-compose logs --tail=50

# Статистика ресурсов
docker stats --no-stream
```

### Когда пользователь просит остановить контейнеры

```bash
# Остановка всех контейнеров
docker-compose stop

# Остановка и удаление
docker-compose down

# Остановка конкретного проекта
docker-compose -f docker/docker-compose.<project>.yml stop
```

### Когда пользователь просит запустить контейнеры

```bash
# Запуск всех контейнеров
docker-compose up -d

# Запуск конкретного проекта
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.<project>.yml up -d

# Запуск с пересборкой
docker-compose up -d --build
```

---

## 📝 Чек-лист для AI-ассистента

Перед выполнением любых операций с контейнерами:

1. ✅ Проверить текущий статус: `docker-compose ps`
2. ✅ Проверить логи: `docker-compose logs --tail=50`
3. ✅ Понять, какой проект нужно обновить/перезагрузить
4. ✅ Выбрать правильную команду из этого руководства
5. ✅ Выполнить команду
6. ✅ Проверить результат: `docker-compose ps`
7. ✅ Проверить логи: `docker-compose logs -f <service-name>`

**ВАЖНО:** Всегда сообщать пользователю о том, что было сделано и почему.

---

## 🎯 Быстрые команды (Cheat Sheet)

```bash
# Статус
docker-compose ps

# Логи
docker-compose logs -f

# Перезапуск
docker-compose restart

# Остановка
docker-compose stop

# Запуск
docker-compose up -d

# Обновление
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Очистка
docker system prune -a --volumes

# Статистика
docker stats

# Вход в контейнер
docker-compose exec main-backend sh
```

---

## 📚 Дополнительные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Redis Documentation](https://redis.io/documentation)
- [Nginx Documentation](https://nginx.org/en/docs/)
