# 🐳 Docker Архитектура onAI

## 📋 Обзор

Эта директория содержит Docker конфигурации для всех продуктов onAI. Архитектура разделена на независимые проекты для лучшей изоляции, масштабируемости и безопасности.

## 🏗️ Архитектура

```
onai-integrator/
├── docker/
│   ├── README.md                           # Этот файл
│   ├── docker-compose.main.yml              # Main Platform (LMS)
│   ├── docker-compose.traffic.yml           # Traffic Dashboard
│   ├── docker-compose.tripwire.yml          # Tripwire Product
│   └── docker-compose.shared.yml           # Общие сервисы (Redis, Telegram)
├── Dockerfile                             # Frontend (React + Nginx)
├── backend/
│   ├── Dockerfile                          # Backend API
│   ├── Dockerfile.worker                   # Worker (BullMQ + Cron)
│   └── .dockerignore                     # Backend ignore правила
├── docker-compose.yml                      # Оркестрация всех сервисов
├── docker/nginx.conf                      # Nginx конфигурация
└── .dockerignore                         # Frontend ignore правила
```

## 📦 Контейнеры

### Main Platform (LMS) - для студентов

| Контейнер | Порт | Назначение |
|-----------|-------|-----------|
| main-frontend | 80 | React SPA (Nginx) |
| main-backend | 3000 | REST API (Node.js + Express) |
| main-worker | - | Фоновые задачи (BullMQ + Cron) |

### Traffic Dashboard - для таргетологов и админов

| Контейнер | Порт | Назначение |
|-----------|-------|-----------|
| traffic-frontend | 81 | React SPA (Nginx) |
| traffic-backend | 3001 | REST API (Node.js + Express) |
| traffic-worker | - | Фоновые задачи (BullMQ + Cron) |

### Tripwire Product - отдельный продукт

| Контейнер | Порт | Назначение |
|-----------|-------|-----------|
| tripwire-frontend | 82 | React SPA (Nginx) |
| tripwire-backend | 3002 | REST API (Node.js + Express) |
| tripwire-worker | - | Фоновые задачи (BullMQ + Cron) |

### Shared Services - общие сервисы

| Контейнер | Порт | Назначение |
|-----------|-------|-----------|
| shared-redis | 6379 | Очереди задач и кеширование |
| telegram-bot | - | Telegram Bot (опционально) |

## 🚀 Быстрый старт

### Запуск всех сервисов

```bash
docker-compose up -d --build
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

## 🔧 Основные команды

### Перезагрузка

```bash
# Все контейнеры
docker-compose restart

# Конкретный контейнер
docker-compose restart main-backend
docker-compose restart traffic-frontend
docker-compose restart tripwire-worker
```

### Обновление

```bash
# Полное обновление
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Конкретный контейнер
docker-compose stop main-backend
docker-compose rm -f main-backend
docker-compose build main-backend
docker-compose up -d main-backend
```

### Остановка

```bash
# Все контейнеры
docker-compose stop

# Все контейнеры + удаление
docker-compose down

# Конкретный проект
docker-compose -f docker/docker-compose.main.yml stop
```

### Логи

```bash
# Все логи
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f main-backend
docker-compose logs -f traffic-frontend
docker-compose logs -f tripwire-worker
```

## 📊 Мониторинг

```bash
# Статус всех контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f --tail=100
```

## 🧹 Очистка

```bash
# Docker кэш
docker system prune -a --volumes

# Redis кэш
docker-compose exec shared-redis redis-cli FLUSHALL
```

## 🎯 Преимущества этой архитектуры

### ✅ Изоляция
- Каждый продукт работает в своих контейнерах
- Если один продукт упадет, другие продолжат работать
- Изоляция уязвимостей между продуктами

### ✅ Масштабируемость
- Можно масштабировать каждый продукт отдельно
- Разные ресурсы для разных продуктов
- Горизонтальное масштабирование через replicas

### ✅ Независимый деплой
- Обновляй один продукт, не трогая другие
- Rolling update без простоя
- Разные версии для разных продуктов

### ✅ Безопасность
- Изоляция процессов
- Разные переменные окружения
- Контроль доступа через docker network

### ✅ Командная работа
- Разные разработчики могут работать параллельно
- Независимые CI/CD пайплайны
- Легкое тестирование изменений

## 📚 Дополнительная документация

- [`../DOCKER_GUIDE.md`](../DOCKER_GUIDE.md) - Полное руководство по развертыванию
- [`../DOCKER_OPERATIONS.md`](../DOCKER_OPERATIONS.md) - Все операции с контейнерами
- [`../QUICK_START_DOCKER.md`](../QUICK_START_DOCKER.md) - Быстрый старт

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

## 🐛 Troubleshooting

### Контейнер не стартует

```bash
# Проверка логов
docker-compose logs <service-name>

# Пересборка
docker-compose up -d --build --force-recreate
```

### Нет подключения к Redis

```bash
# Проверка статуса Redis
docker-compose ps shared-redis

# Тест подключения
docker-compose exec shared-redis redis-cli ping

# Перезапуск Redis
docker-compose restart shared-redis
```

### Health check failing

```bash
# Ручная проверка
docker-compose exec main-backend curl http://localhost:3000/health

# Перезапуск контейнера
docker-compose restart <service-name>
```

## 🎉 Готово!

Теперь у вас есть профессиональная Docker архитектура с разделением по проектам!

**Ключевые файлы:**
- [`docker-compose.yml`](../docker-compose.yml) - Оркестрация всех сервисов
- [`docker/docker-compose.main.yml`](docker-compose.main.yml) - Main Platform
- [`docker/docker-compose.traffic.yml`](docker-compose.traffic.yml) - Traffic Dashboard
- [`docker/docker-compose.tripwire.yml`](docker-compose.tripwire.yml) - Tripwire Product
- [`docker/docker-compose.shared.yml`](docker-compose.shared.yml) - Shared Services

**Для быстрого старта:** [`../QUICK_START_DOCKER.md`](../QUICK_START_DOCKER.md)

**Для AI-ассистента:** [`../DOCKER_OPERATIONS.md`](../DOCKER_OPERATIONS.md)
