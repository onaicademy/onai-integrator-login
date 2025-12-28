# 🚀 Быстрый старт с Docker

## 📦 Что создано

### Архитектура контейнеров

```
📦 Main Platform (LMS)
├─ main-frontend    (Port 80)
├─ main-backend     (Port 3000)
└─ main-worker      (Background tasks)

📦 Traffic Dashboard
├─ traffic-frontend (Port 81)
├─ traffic-backend  (Port 3001)
└─ traffic-worker   (Background tasks)

📦 Tripwire Product
├─ tripwire-frontend (Port 82)
├─ tripwire-backend  (Port 3002)
└─ tripwire-worker  (Background tasks)

🔧 Shared Services
├─ shared-redis    (Port 6379)
└─ telegram-bot    (Optional)
```

### Созданные файлы

- [`Dockerfile`](Dockerfile) - Multi-stage build для Frontend (React + Nginx)
- [`backend/Dockerfile`](backend/Dockerfile) - Backend API (Node.js + Express)
- [`backend/Dockerfile.worker`](backend/Dockerfile.worker) - Worker (BullMQ + Cron)
- [`docker-compose.yml`](docker-compose.yml) - Оркестрация всех сервисов
- [`docker/docker-compose.main.yml`](docker/docker-compose.main.yml) - Main Platform
- [`docker/docker-compose.traffic.yml`](docker/docker-compose.traffic.yml) - Traffic Dashboard
- [`docker/docker-compose.tripwire.yml`](docker/docker-compose.tripwire.yml) - Tripwire Product
- [`docker/docker-compose.shared.yml`](docker/docker-compose.shared.yml) - Shared Services
- [`docker/nginx.conf`](docker/nginx.conf) - Nginx конфигурация
- [`.dockerignore`](.dockerignore) - Frontend ignore правила
- [`backend/.dockerignore`](backend/.dockerignore) - Backend ignore правила
- [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) - Полное руководство
- [`DOCKER_OPERATIONS.md`](DOCKER_OPERATIONS.md) - Операции с контейнерами

---

## 🎯 Быстрый старт

### 1. Настройка переменных окружения

```bash
# Создай .env файл
cp .env.example .env

# Отредактируй .env и добавь все необходимые переменные
nano .env
```

### 2. Запуск всех сервисов

```bash
# Запуск всех контейнеров
docker-compose up -d --build

# Просмотр логов
docker-compose logs -f

# Проверка статуса
docker-compose ps
```

### 3. Доступ к сервисам

- **Main Platform**: http://localhost:80
- **Traffic Dashboard**: http://localhost:81
- **Tripwire**: http://localhost:82
- **Backend API**: http://localhost:3000
- **Redis**: localhost:6379

---

## 🔧 Запуск отдельных проектов

### Только Main Platform

```bash
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.main.yml up -d
```

### Только Traffic Dashboard

```bash
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml up -d
```

### Только Tripwire

```bash
docker-compose -f docker/docker-compose.shared.yml -f docker/docker-compose.tripwire.yml up -d
```

---

## 🔄 Основные команды

### Перезагрузка контейнеров

```bash
# Все контейнеры
docker-compose restart

# Конкретный контейнер
docker-compose restart main-backend
docker-compose restart traffic-frontend
docker-compose restart tripwire-worker
```

### Обновление контейнеров

```bash
# Полное обновление
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Конкретный контейнер
docker-compose stop main-backend
docker-compose rm -f main-backend
docker-compose build main-backend
docker-compose up -d main-backend
```

### Остановка контейнеров

```bash
# Все контейнеры
docker-compose stop

# Все контейнеры + удаление
docker-compose down

# Конкретный проект
docker-compose -f docker/docker-compose.main.yml stop
```

### Просмотр логов

```bash
# Все логи
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f main-backend
docker-compose logs -f traffic-frontend
docker-compose logs -f tripwire-worker
```

### Очистка кэша

```bash
# Docker кэш
docker system prune -a --volumes

# Redis кэш
docker-compose exec shared-redis redis-cli FLUSHALL
```

---

## 📊 Мониторинг

```bash
# Статус всех контейнеров
docker-compose ps

# Использование ресурсов
docker stats

# Логи в реальном времени
docker-compose logs -f --tail=100
```

---

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

---

## 📚 Дополнительная документация

- [`DOCKER_GUIDE.md`](DOCKER_GUIDE.md) - Полное руководство по развертыванию
- [`DOCKER_OPERATIONS.md`](DOCKER_OPERATIONS.md) - Все операции с контейнерами (для AI-ассистента)

---

## 💡 Советы

1. **Всегда проверяйте статус перед операциями**: `docker-compose ps`
2. **Смотрите логи при проблемах**: `docker-compose logs -f <service-name>`
3. **Перезагружайте контейнеры по очереди**, чтобы избежать простоя
4. **Используйте `--no-cache` при пересборке** для получения последних изменений
5. **Очищайте кэш регулярно**: `docker system prune -a --volumes`

---

## 🆘 Нужна помощь?

Если возникли проблемы:
1. Проверьте логи: `docker-compose logs`
2. Проверьте статус: `docker-compose ps`
3. Проверьте конфигурацию: `docker-compose config`
4. Перезапустите контейнеры: `docker-compose restart`

---

## 🎉 Готово!

Теперь у вас есть полностью контейнеризованная система с разделением по проектам!

**Преимущества этой архитектуры:**
- ✅ Изоляция - каждый продукт работает независимо
- ✅ Масштабируемость - можно масштабировать каждый продукт отдельно
- ✅ Независимый деплой - обновляйте один продукт, не трогая другие
- ✅ Разные ресурсы - каждый продукт может требовать разные ресурсы
- ✅ Безопасность - изоляция уязвимостей между продуктами
