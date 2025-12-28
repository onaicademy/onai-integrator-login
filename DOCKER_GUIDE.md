# 🐳 Docker Руководство по развертыванию

## 📋 Архитектура контейнеров

```
┌─────────────────────────────────────────────────────────┐
│                   Docker Network                       │
│                    onai-network                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌──────────────┐              │
│  │  Frontend    │──────│   Nginx      │ (Port 80)    │
│  │  React/Vite  │      │  (Static)    │              │
│  └──────────────┘      └──────────────┘              │
│         │                      │                      │
│         └──────────┬───────────┘                      │
│                    │                                  │
│         ┌──────────▼──────────┐                      │
│         │  Backend API        │ (Port 3000)           │
│         │  Node.js/Express    │                       │
│         └──────────┬──────────┘                       │
│                    │                                  │
│         ┌──────────▼──────────┐      ┌─────────────┐ │
│         │  Redis             │◄─────│  Worker     │ │
│         │  (Queue/Cache)     │      │  BullMQ     │ │
│         └─────────────────────┘      └─────────────┘ │
│                                                         │
│  ☁️ Supabase (Cloud)                                    │
│  ☁️ Telegram Bot (опционально)                         │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Быстрый старт

### 1. Подготовка окружения

Убедись, что установлен Docker и Docker Compose:

```bash
# Проверка установки
docker --version
docker-compose --version
```

### 2. Настройка переменных окружения

Создай файл `.env` в корне проекта:

```bash
cp .env.example .env
```

Отредактируй `.env` и добавь все необходимые переменные:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# JWT & Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-32-chars-long

# Redis (по умолчанию для docker-compose)
REDIS_URL=redis://redis:6379

# API Keys
RESEND_API_KEY=re_xxxxxxxxxxxx
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx
GROQ_API_KEY=gsk_xxxxxxxxxxxx

# Telegram
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# AmoCRM
AMO_CRM_SECRET_KEY=your-amo-crm-secret

# Facebook
FACEBOOK_ACCESS_TOKEN=your-facebook-access-token
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Sentry (опционально)
SENTRY_DSN=https://your-sentry-dsn
```

### 3. Запуск всех контейнеров

```bash
# Сборка и запуск всех сервисов
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Проверка статуса контейнеров
docker-compose ps
```

### 4. Проверка работоспособности

```bash
# Проверка health status всех контейнеров
docker-compose ps

# Проверка логов конкретного сервиса
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f redis
```

## 📦 Структура контейнеров

### 1. Frontend Container
- **Image**: nginx:alpine
- **Port**: 80
- **Purpose**: Обслуживание статических файлов React SPA
- **Health Check**: `/health/` endpoint

### 2. Backend Container
- **Image**: node:20-alpine
- **Port**: 3000
- **Purpose**: REST API сервер
- **Health Check**: `/health` endpoint

### 3. Worker Container
- **Image**: node:20-alpine
- **Purpose**: Фоновые задачи (BullMQ, cron jobs)
- **Health Check**: Проверка подключения к Redis

### 4. Redis Container
- **Image**: redis:7-alpine
- **Port**: 6379
- **Purpose**: Очереди задач и кеширование
- **Persistence**: Volume `redis-data`

## 🔧 Команды управления

### Базовые команды

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка всех сервисов
docker-compose down

# Перезапуск конкретного сервиса
docker-compose restart backend

# Просмотр логов
docker-compose logs -f [service-name]

# Вход в контейнер
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Сборка и обновление

```bash
# Пересборка всех контейнеров
docker-compose build --no-cache

# Пересборка конкретного контейнера
docker-compose build backend

# Пересборка и запуск
docker-compose up -d --build
```

### Очистка

```bash
# Остановка и удаление контейнеров
docker-compose down

# Остановка и удаление контейнеров + volumes
docker-compose down -v

# Удаление всех образов
docker-compose down --rmi all
```

### Мониторинг

```bash
# Статус всех контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f --tail=100
```

## 🐛 Отладка

### Просмотр логов

```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs backend
docker-compose logs worker
docker-compose logs frontend

# Логи с фильтрацией
docker-compose logs backend | grep ERROR
```

### Вход в контейнер для отладки

```bash
# Вход в backend контейнер
docker-compose exec backend sh

# Вход в frontend контейнер
docker-compose exec frontend sh

# Вход в redis контейнер
docker-compose exec redis redis-cli
```

### Проверка соединений

```bash
# Проверка подключения к Redis
docker-compose exec backend node -e "const { createClient } = require('redis'); const client = createClient({ url: 'redis://redis:6379' }); client.connect().then(() => console.log('Connected!')).then(() => client.quit())"

# Проверка health endpoint
curl http://localhost/health/
curl http://localhost:3000/health
```

## 🔄 Разворачивание Telegram Bot

Telegram bot запускается отдельно через profile:

```bash
# Запуск с Telegram Bot
docker-compose --profile telegram up -d

# Остановка Telegram Bot
docker-compose --profile telegram down
```

## 📊 Мониторинг и аналитика

### Health Checks

Все контейнеры имеют встроенные health checks:

```bash
# Просмотр health status
docker-compose ps
```

Статусы:
- `healthy` - контейнер работает нормально
- `unhealthy` - проблемы с контейнером
- `starting` - контейнер запускается

### Логи и метрики

```bash
# Логи Nginx
docker-compose exec frontend cat /var/log/nginx/access.log
docker-compose exec frontend cat /var/log/nginx/error.log

# Логи Backend
docker-compose exec backend tail -f /app/logs/combined.log

# Логи Worker
docker-compose exec worker tail -f /app/logs/worker.log
```

## 🚀 Production развертывание

### Подготовка к production

1. **Настройка SSL сертификата** (через Let's Encrypt или свой сертификат)
2. **Настройка firewall** (открыть только нужные порты)
3. **Настройка мониторинга** (Sentry, Prometheus, Grafana)
4. **Настройка backup** (Redis volumes, database backups)

### Production docker-compose.yml

Для production создай отдельный файл `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    # ... (как в docker-compose.yml)
    restart: always
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  backend:
    # ... (как в docker-compose.yml)
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '1'
          memory: 512M

  worker:
    # ... (как в docker-compose.yml)
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

Запуск production:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 🔐 Безопасность

### Рекомендации

1. **Никогда не коммить `.env` файл в Git**
2. **Используй сложные пароли и JWT секреты**
3. **Ограничь доступ к Redis** (внутри docker network)
4. **Включи rate limiting** (уже есть в backend)
5. **Используй HTTPS** в production
6. **Регулярно обновляй Docker образы**

### Firewall правила

```bash
# Разрешить только HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Закрыть прямой доступ к backend
sudo ufw enable
```

## 📝 Troubleshooting

### Проблема: Контейнер не стартует

```bash
# Проверка логов
docker-compose logs [service-name]

# Проверка конфигурации
docker-compose config

# Пересборка
docker-compose up -d --build --force-recreate
```

### Проблема: Нет подключения к Redis

```bash
# Проверка статуса Redis
docker-compose ps redis

# Вход в Redis CLI
docker-compose exec redis redis-cli ping
```

### Проблема: Frontend не видит Backend

Проверь переменную `VITE_API_URL` в `.env` файле. В Docker она должна быть `http://backend:3000`.

### Проблема: Health check failing

```bash
# Ручная проверка health endpoint
docker-compose exec backend curl http://localhost:3000/health

# Проверка зависимостей
docker-compose ps
```

## 📚 Полезные ресурсы

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Redis Documentation](https://redis.io/documentation)

## 🆘 Поддержка

Если возникли проблемы:
1. Проверь логи: `docker-compose logs`
2. Проверь статус: `docker-compose ps`
3. Проверь конфигурацию: `docker-compose config`
4. Перезапусти контейнеры: `docker-compose restart`
