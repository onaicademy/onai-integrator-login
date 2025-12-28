# 🐳 Docker Deployment Plan - Traffic Dashboard

**Дата**: 28 декабря 2025
**Цель**: Zero-downtime миграция с PM2 на Docker
**Статус**: Ready to Execute

---

## 📋 EXECUTIVE SUMMARY

Текущая система работает на:
- **Frontend**: Nginx → `/var/www/traffic.onai.academy` (статика)
- **Backend**: PM2 → Node.js на `localhost:3000`
- **База данных**: Supabase (external, не требует миграции)

**Новая система** (Docker):
- **Frontend**: Docker container → Nginx на порту `81` (internal)
- **Backend**: Docker container → Node.js на порту `3001` (internal)
- **Worker**: Docker container → BullMQ worker
- **Redis**: Docker container → `localhost:6379`

**Ключевая стратегия**: Запустить Docker контейнеры на ДРУГИХ портах, проверить работоспособность, переключить Nginx, остановить PM2.

---

## 🎯 ЦЕЛИ ДЕПЛОЯ

1. ✅ **Zero downtime** - студенты не заметят переключения
2. ✅ **Rollback capability** - можем откатиться в случае проблем
3. ✅ **Production-ready** - все сервисы работают стабильно
4. ✅ **Clean migration** - удаление старых сервисов после успеха

---

## 📊 АРХИТЕКТУРА

### До деплоя (PM2):
```
Internet → Nginx (443) → /var/www/traffic.onai.academy (статика)
                       → PM2 backend (localhost:3000) → Supabase
```

### После деплоя (Docker):
```
Internet → Nginx (443) → Docker Frontend (localhost:81)
                       → Docker Backend (localhost:3001) → Docker Redis (6379)
                                                         → Supabase
```

### Mapping портов:

| Сервис | Container Port | Host Port | Public URL |
|--------|---------------|-----------|------------|
| Frontend | 80 | 81 | https://traffic.onai.academy |
| Backend | 3000 | 3001 | https://api.onai.academy/api/* |
| Worker | - | - | - |
| Redis | 6379 | 6379 | - |

---

## 🔄 DEPLOYMENT FLOW

### Фаза 1: Подготовка (5 минут)

#### 1.1 Проверка подключения к серверу
```bash
ssh root@207.154.231.30 "echo 'Connected'"
```

#### 1.2 Установка Docker на production
```bash
# Автоматически выполняется скриптом
# Установит: docker-ce, docker-compose-plugin
```

**Expected**:
- Docker version: 24.0+
- Docker Compose version: 2.20+

#### 1.3 Создание резервной копии
```bash
# Бэкап:
- PM2 конфигурации
- Текущий frontend (/var/www/traffic.onai.academy)
- Nginx конфигурации
```

**Backup location**: `/var/www/backups/YYYYMMDD-HHMMSS/`

---

### Фаза 2: Build & Deploy (10 минут)

#### 2.1 Синхронизация кода
```bash
# Local
git push origin main

# Server
cd /var/www/onai-integrator-login-main
git pull origin main
```

#### 2.2 Создание .env файла
```bash
# Копирование из backend/env.env в корень проекта
cp backend/env.env .env
```

**Проверка критических переменных**:
- `NODE_ENV=production` ✅
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `JWT_SECRET` ✅

#### 2.3 Сборка Docker images
```bash
cd /var/www/onai-integrator-login-main

# Создание Docker network
docker network create onai-network

# Build shared services (Redis)
docker compose -f docker/docker-compose.shared.yml build

# Build Traffic Dashboard
docker compose -f docker/docker-compose.shared.yml \
               -f docker/docker-compose.traffic.yml build
```

**Expected images**:
- `onai-integrator-login-traffic-frontend`
- `onai-integrator-login-traffic-backend`
- `onai-integrator-login-traffic-worker`
- `redis:7-alpine`

**Build time**: ~5-8 минут

#### 2.4 Запуск контейнеров
```bash
# Запуск Redis
docker compose -f docker/docker-compose.shared.yml up -d

# Запуск Traffic Dashboard
docker compose -f docker/docker-compose.shared.yml \
               -f docker/docker-compose.traffic.yml up -d
```

**Expected containers**:
```
CONTAINER ID   NAME                    STATUS
xxxxxxxxx      onai-shared-redis       Up (healthy)
xxxxxxxxx      onai-traffic-backend    Up (healthy)
xxxxxxxxx      onai-traffic-frontend   Up (healthy)
xxxxxxxxx      onai-traffic-worker     Up (healthy)
```

---

### Фаза 3: Проверка работоспособности (5 минут)

#### 3.1 Health checks (автоматически)
```bash
# Backend health check
docker inspect --format='{{.State.Health.Status}}' onai-traffic-backend
# Expected: healthy

# Frontend health check
docker inspect --format='{{.State.Health.Status}}' onai-traffic-frontend
# Expected: healthy
```

**Timeout**: 60 секунд

#### 3.2 API Testing (internal)
```bash
# Health endpoint
curl http://localhost:3001/health
# Expected: {"status":"ok"}

# Login endpoint
curl -X POST http://localhost:3001/api/traffic-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onai.academy","password":"admin123"}'
# Expected: {"success":true,"token":"..."}

# /me endpoint
TOKEN="..."
curl http://localhost:3001/api/traffic-auth/me \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"user":{...}}
```

#### 3.3 Frontend Testing (internal)
```bash
# Frontend доступен
curl http://localhost:81/health/
# Expected: OK

# Index.html загружается
curl http://localhost:81/
# Expected: HTML content
```

**Если все тесты прошли** → переходим к Фазе 4
**Если тесты НЕ прошли** → ROLLBACK

---

### Фаза 4: Переключение трафика (КРИТИЧЕСКИЙ МОМЕНТ - 1 минута)

#### 4.1 Обновление Nginx конфигурации

**Текущая конфигурация** (`/etc/nginx/sites-available/traffic.onai.academy`):
```nginx
location /api/ {
    proxy_pass http://localhost:3000;  # ← PM2 backend
    ...
}
```

**Новая конфигурация**:
```nginx
location /api/ {
    proxy_pass http://localhost:3001;  # ← Docker backend
    ...
}
```

**Выполнение**:
```bash
# Backup текущей конфигурации
cp /etc/nginx/sites-available/traffic.onai.academy \
   /etc/nginx/sites-available/traffic.onai.academy.backup-$(date +%Y%m%d-%H%M%S)

# Обновление proxy_pass
sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://localhost:3001;|g' \
    /etc/nginx/sites-available/traffic.onai.academy

# Проверка конфигурации
nginx -t

# Graceful reload (без downtime!)
nginx -s reload
```

**CRITICAL**: Nginx reload занимает <1 секунду, активные connections НЕ обрываются.

#### 4.2 Верификация переключения
```bash
# Проверка через публичный URL
curl -I https://traffic.onai.academy
# Expected: 200 OK

curl https://api.onai.academy/health
# Expected: {"status":"ok"}
```

---

### Фаза 5: Cleanup (2 минуты)

#### 5.1 Остановка старых сервисов
```bash
# Остановка PM2 backend
pm2 stop onai-backend
pm2 delete onai-backend
pm2 save

# Проверка
pm2 list
# Expected: No processes
```

**NOTE**: Старый frontend в `/var/www/traffic.onai.academy` остается для возможного rollback. Удалим позже.

#### 5.2 Финальная проверка
```bash
# Публичный frontend
curl -I https://traffic.onai.academy
# Expected: 200 OK

# Публичный API
curl https://api.onai.academy/api/traffic-auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@onai.academy","password":"admin123"}'
# Expected: {"success":true,"token":"..."}
```

---

## 🔙 ROLLBACK PROCEDURE

**Если что-то пошло не так**, выполнить:

### Шаг 1: Остановка Docker контейнеров
```bash
cd /var/www/onai-integrator-login-main
docker compose -f docker/docker-compose.shared.yml \
               -f docker/docker-compose.traffic.yml down
```

### Шаг 2: Восстановление Nginx
```bash
# Найти последний backup
LATEST_BACKUP=$(ls -t /etc/nginx/sites-available/traffic.onai.academy.backup-* | head -1)

# Восстановить
cp "$LATEST_BACKUP" /etc/nginx/sites-available/traffic.onai.academy

# Reload
nginx -t && nginx -s reload
```

### Шаг 3: Запуск PM2 backend
```bash
cd /var/www/onai-integrator-login-main/backend
pm2 start ecosystem.config.cjs --env production
pm2 save
```

### Шаг 4: Проверка
```bash
curl https://traffic.onai.academy
curl https://api.onai.academy/health
```

**Время rollback**: ~2 минуты

---

## ✅ POST-DEPLOYMENT CHECKLIST

После успешного деплоя проверить:

### Frontend
- [ ] https://traffic.onai.academy - страница загружается
- [ ] Logo OnAI Academy отображается
- [ ] Login форма работает
- [ ] Dashboard отображает данные
- [ ] Все вкладки sidebar работают
- [ ] Team Constructor работает

### Backend API
- [ ] `/api/traffic-auth/login` - 200 OK
- [ ] `/api/traffic-auth/me` - 200 OK
- [ ] `/api/traffic-auth/change-password` - работает
- [ ] Rate limiting работает (6+ запросов → 429)
- [ ] Email validation работает

### Database & Security
- [ ] RLS policies активны
- [ ] Только админы видят все данные
- [ ] Таргетологи видят только свою команду
- [ ] JWT токены генерируются корректно
- [ ] Session logging работает

### Docker Monitoring
- [ ] Все контейнеры healthy
- [ ] Логи не содержат ошибок
- [ ] Memory usage нормальный (<200MB per container)
- [ ] CPU usage нормальный (<5%)

---

## 📊 EXPECTED METRICS

### Deployment Time
- **Total**: ~20-25 минут
- **Downtime**: 0 секунд (Nginx graceful reload)

### Resource Usage

**Before (PM2)**:
- Backend: ~60-70 MB memory
- Frontend: 0 (статика через Nginx)

**After (Docker)**:
- Frontend container: ~20 MB
- Backend container: ~80 MB
- Worker container: ~60 MB
- Redis container: ~10 MB
- **Total**: ~170 MB (приемлемо)

### Performance

**Expected NO degradation**:
- Response time: <100ms (same as PM2)
- Throughput: Same or better
- Latency: <10ms overhead from Docker network

---

## 🚨 TROUBLESHOOTING

### Problem: Docker images build failed

**Solution**:
```bash
# Проверка логов
docker compose -f docker/docker-compose.traffic.yml logs

# Очистка Docker cache
docker system prune -a

# Пересборка
docker compose -f docker/docker-compose.traffic.yml build --no-cache
```

### Problem: Health checks не проходят

**Solution**:
```bash
# Проверка логов контейнера
docker logs onai-traffic-backend

# Проверка переменных окружения
docker inspect onai-traffic-backend | grep -A 20 "Env"

# Проверка connectivity
docker exec onai-traffic-backend curl http://localhost:3000/health
```

### Problem: Nginx не может подключиться к Docker backend

**Solution**:
```bash
# Проверка портов
docker ps -a
netstat -tlnp | grep 3001

# Проверка network
docker network inspect onai-network

# Проверка firewall
ufw status
```

### Problem: Frontend не загружается

**Solution**:
```bash
# Проверка Nginx логов
tail -f /var/log/nginx/traffic.onai.academy.error.log

# Проверка frontend контейнера
docker logs onai-traffic-frontend
docker exec onai-traffic-frontend ls -la /usr/share/nginx/html/
```

---

## 📝 LOGS & MONITORING

### Docker Logs
```bash
# Все сервисы
docker compose -f docker/docker-compose.traffic.yml logs -f

# Только backend
docker logs -f onai-traffic-backend

# Только frontend
docker logs -f onai-traffic-frontend

# Только worker
docker logs -f onai-traffic-worker
```

### Nginx Logs
```bash
# Access log
tail -f /var/log/nginx/traffic.onai.academy.access.log

# Error log
tail -f /var/log/nginx/traffic.onai.academy.error.log
```

### PM2 Logs (для rollback)
```bash
pm2 logs onai-backend
```

---

## 🔐 SECURITY CONSIDERATIONS

### Производственная безопасность:

1. ✅ **Environment Variables**: Хранятся в `.env` файле (не в git)
2. ✅ **Docker Security**: Non-root user (nodejs:1001)
3. ✅ **Secrets**: JWT_SECRET, API keys в .env
4. ✅ **Network Isolation**: Docker network для изоляции
5. ✅ **Health Checks**: Мониторинг состояния контейнеров
6. ✅ **RLS Policies**: Row Level Security в Supabase

### После деплоя:

- [ ] Проверить, что `.env` НЕ доступен через HTTP
- [ ] Проверить, что Docker images не содержат secrets
- [ ] Проверить логи на отсутствие чувствительных данных

---

## 📞 SUPPORT

### В случае критических проблем:

1. **Rollback** (используя процедуру выше)
2. **Проверка логов** (Docker, Nginx, PM2)
3. **Проверка health endpoints**
4. **Restart контейнеров** (если нужно)

### Команды для quick diagnostics:
```bash
# Статус всех Docker контейнеров
docker ps -a

# Статус конкретного сервиса
docker compose -f docker/docker-compose.traffic.yml ps

# Логи с ошибками
docker compose -f docker/docker-compose.traffic.yml logs | grep -i error

# Restart контейнера
docker compose -f docker/docker-compose.traffic.yml restart traffic-backend
```

---

## ✅ SUCCESS CRITERIA

Деплой считается **успешным**, если:

1. ✅ https://traffic.onai.academy загружается и работает
2. ✅ Login работает (admin@onai.academy)
3. ✅ Dashboard отображает данные
4. ✅ Все API endpoints возвращают корректные данные
5. ✅ Docker контейнеры healthy
6. ✅ Логи не содержат критических ошибок
7. ✅ PM2 остановлен
8. ✅ Студенты НЕ заметили downtime

---

## 🎯 NEXT STEPS

После успешного деплоя:

1. **Мониторинг** (24 часа) - проверка стабильности
2. **Cleanup** - удаление старого frontend из `/var/www/traffic.onai.academy`
3. **Documentation** - обновление deployment docs
4. **Alerts** - настройка мониторинга для Docker контейнеров
5. **Backup Strategy** - настройка автоматических бэкапов

---

## 📚 REFERENCES

- Docker Compose file: `docker/docker-compose.traffic.yml`
- Shared services: `docker/docker-compose.shared.yml`
- Deployment script: `scripts/deploy-docker-traffic.sh`
- E2E Test Report: `docs/TRAFFIC_DASHBOARD_E2E_TEST_REPORT_20251228.md`

---

**Автор**: Claude Sonnet 4.5
**Дата**: 28 декабря 2025
**Версия**: 1.0.0
