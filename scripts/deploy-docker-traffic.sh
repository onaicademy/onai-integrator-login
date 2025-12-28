#!/bin/bash

# ============================================
# Zero-Downtime Docker Deployment для Traffic Dashboard
# ============================================
#
# Стратегия:
# 1. Установить Docker и Docker Compose на production сервере
# 2. Создать Docker images локально
# 3. Загрузить images на сервер
# 4. Запустить Docker контейнеры на ДРУГИХ портах (3001 для backend, 81 для frontend)
# 5. Проверить health checks
# 6. Обновить Nginx для проксирования на новые порты
# 7. Остановить PM2 и старый frontend
# 8. Очистить

set -e  # Exit on error
set -u  # Exit on undefined variable

# ============================================
# КОНФИГУРАЦИЯ
# ============================================

SERVER="root@207.154.231.30"
PROJECT_DIR="/var/www/onai-integrator-login-main"
BACKUP_DIR="/var/www/backups/$(date +%Y%m%d-%H%M%S)"
DOCKER_COMPOSE_FILE="docker/docker-compose.traffic.yml"
SHARED_COMPOSE_FILE="docker/docker-compose.shared.yml"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# ФУНКЦИИ
# ============================================

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Проверка соединения с сервером
check_connection() {
    log_info "Проверка подключения к серверу..."
    ssh "$SERVER" "echo 'Connected to server'" || {
        log_error "Не удалось подключиться к серверу $SERVER"
        exit 1
    }
}

# Установка Docker на production сервере
install_docker() {
    log_info "Проверка наличия Docker на сервере..."

    if ssh "$SERVER" "command -v docker &> /dev/null"; then
        log_info "Docker уже установлен"
        ssh "$SERVER" "docker --version"
        return 0
    fi

    log_warn "Docker не найден. Начинаю установку..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e

        # Обновление системы
        apt-get update

        # Установка зависимостей
        apt-get install -y \
            ca-certificates \
            curl \
            gnupg \
            lsb-release

        # Добавление официального GPG ключа Docker
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        # Добавление Docker репозитория
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

        # Установка Docker Engine
        apt-get update
        apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

        # Запуск Docker
        systemctl start docker
        systemctl enable docker

        # Проверка установки
        docker --version
        docker compose version
ENDSSH

    log_info "Docker успешно установлен"
}

# Создание резервной копии
create_backup() {
    log_info "Создание резервной копии текущей системы..."

    ssh "$SERVER" bash <<ENDSSH
        set -e

        # Создание директории для бэкапов
        mkdir -p "$BACKUP_DIR"

        # Бэкап PM2 конфигурации
        pm2 save
        cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2-dump.pm2" 2>/dev/null || true

        # Бэкап frontend
        cp -r /var/www/traffic.onai.academy "$BACKUP_DIR/traffic-frontend" 2>/dev/null || true

        # Бэкап nginx конфига
        cp /etc/nginx/sites-available/traffic.onai.academy "$BACKUP_DIR/nginx-traffic.conf"

        echo "Backup created at $BACKUP_DIR"
ENDSSH

    log_info "Резервная копия создана: $BACKUP_DIR"
}

# Синхронизация кода на сервер
sync_code() {
    log_info "Синхронизация кода на production сервер..."

    # Коммит изменений если есть
    if [[ -n $(git status -s) ]]; then
        log_warn "Обнаружены незакоммиченные изменения"
        git status -s
    fi

    # Пуш на GitHub
    git push origin main || log_warn "Git push failed, продолжаем..."

    # Пулл на сервере
    ssh "$SERVER" "cd $PROJECT_DIR && git pull origin main"

    log_info "Код синхронизирован"
}

# Создание .env файла для Docker
create_env_file() {
    log_info "Создание .env файла для Docker..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e
        cd /var/www/onai-integrator-login-main

        # Проверка наличия backend/env.env
        if [[ ! -f backend/env.env ]]; then
            echo "❌ backend/env.env не найден!"
            exit 1
        fi

        # Создание .env для Docker Compose из backend/env.env
        cp backend/env.env .env

        echo "✅ .env файл создан"
ENDSSH

    log_info ".env файл создан"
}

# Build Docker images на сервере
build_images() {
    log_info "Сборка Docker images на сервере..."

    ssh "$SERVER" bash <<ENDSSH
        set -e
        cd $PROJECT_DIR

        # Build shared services (Redis)
        docker compose -f $SHARED_COMPOSE_FILE build

        # Build Traffic Dashboard services
        docker compose -f $SHARED_COMPOSE_FILE -f $DOCKER_COMPOSE_FILE build

        echo "✅ Docker images собраны"
ENDSSH

    log_info "Docker images успешно собраны"
}

# Запуск Docker контейнеров
start_containers() {
    log_info "Запуск Docker контейнеров..."

    ssh "$SERVER" bash <<ENDSSH
        set -e
        cd $PROJECT_DIR

        # Создание Docker network если не существует
        docker network create onai-network 2>/dev/null || true

        # Запуск shared services (Redis)
        docker compose -f $SHARED_COMPOSE_FILE up -d

        # Ожидание Redis
        echo "Ожидание запуска Redis..."
        sleep 5

        # Запуск Traffic Dashboard services
        docker compose -f $SHARED_COMPOSE_FILE -f $DOCKER_COMPOSE_FILE up -d

        # Показать статус контейнеров
        docker compose -f $SHARED_COMPOSE_FILE -f $DOCKER_COMPOSE_FILE ps

        echo "✅ Docker контейнеры запущены"
ENDSSH

    log_info "Docker контейнеры запущены"
}

# Health check для контейнеров
health_check() {
    log_info "Проверка health status контейнеров..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e

        # Ожидание health checks (максимум 60 секунд)
        MAX_WAIT=60
        ELAPSED=0

        while [[ $ELAPSED -lt $MAX_WAIT ]]; do
            # Проверка backend
            BACKEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' onai-traffic-backend 2>/dev/null || echo "none")
            FRONTEND_HEALTH=$(docker inspect --format='{{.State.Health.Status}}' onai-traffic-frontend 2>/dev/null || echo "none")

            if [[ "$BACKEND_HEALTH" == "healthy" ]] && [[ "$FRONTEND_HEALTH" == "healthy" ]]; then
                echo "✅ Все контейнеры здоровы"
                exit 0
            fi

            echo "⏳ Ожидание health checks... (Backend: $BACKEND_HEALTH, Frontend: $FRONTEND_HEALTH)"
            sleep 5
            ELAPSED=$((ELAPSED + 5))
        done

        echo "⚠️ Health checks не прошли за $MAX_WAIT секунд"
        docker compose -f docker/docker-compose.shared.yml -f docker/docker-compose.traffic.yml ps
        exit 1
ENDSSH

    log_info "Health checks прошли успешно"
}

# Тестирование API
test_api() {
    log_info "Тестирование Traffic Dashboard API..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e

        # Тест health endpoint
        HEALTH=$(curl -s http://localhost:3001/health)
        if [[ "$HEALTH" != *"ok"* ]]; then
            echo "❌ Health check failed: $HEALTH"
            exit 1
        fi
        echo "✅ Backend health check OK"

        # Тест login endpoint
        LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/traffic-auth/login \
          -H "Content-Type: application/json" \
          -d '{"email":"admin@onai.academy","password":"admin123"}')

        if [[ "$LOGIN_RESPONSE" == *"token"* ]]; then
            echo "✅ Login endpoint OK"
        else
            echo "❌ Login failed: $LOGIN_RESPONSE"
            exit 1
        fi
ENDSSH

    log_info "API тесты прошли успешно"
}

# Обновление Nginx конфигурации
update_nginx() {
    log_info "Обновление Nginx конфигурации..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e

        # Backup текущей конфигурации
        cp /etc/nginx/sites-available/traffic.onai.academy \
           /etc/nginx/sites-available/traffic.onai.academy.backup-$(date +%Y%m%d-%H%M%S)

        # Обновление proxy_pass на Docker backend (порт 3001)
        sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://localhost:3001;|g' \
            /etc/nginx/sites-available/traffic.onai.academy

        # Проверка конфигурации
        nginx -t

        # Перезагрузка Nginx (graceful reload, без downtime)
        nginx -s reload

        echo "✅ Nginx конфигурация обновлена"
ENDSSH

    log_info "Nginx обновлен"
}

# Остановка старых сервисов (PM2 и старый frontend)
stop_old_services() {
    log_info "Остановка старых сервисов..."

    ssh "$SERVER" bash <<'ENDSSH'
        set -e

        # Остановка PM2 backend
        pm2 stop onai-backend || echo "PM2 backend уже остановлен"
        pm2 delete onai-backend || echo "PM2 backend уже удален"

        echo "✅ Старые сервисы остановлены"
ENDSSH

    log_info "Старые сервисы остановлены"
}

# Финальная проверка
final_verification() {
    log_info "Финальная проверка Traffic Dashboard..."

    # Проверка через публичный URL
    RESPONSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://traffic.onai.academy)

    if [[ "$RESPONSE_CODE" == "200" ]]; then
        log_info "✅ Frontend доступен: https://traffic.onai.academy"
    else
        log_error "❌ Frontend недоступен (код: $RESPONSE_CODE)"
        exit 1
    fi

    # Проверка API через публичный URL
    API_RESPONSE=$(curl -s https://api.onai.academy/health)
    if [[ "$API_RESPONSE" == *"ok"* ]]; then
        log_info "✅ Backend API доступен: https://api.onai.academy"
    else
        log_warn "⚠️ Backend API вернул неожиданный ответ: $API_RESPONSE"
    fi
}

# Rollback в случае проблем
rollback() {
    log_error "ROLLBACK: Восстановление предыдущего состояния..."

    ssh "$SERVER" bash <<ENDSSH
        set -e

        # Остановка Docker контейнеров
        cd $PROJECT_DIR
        docker compose -f $DOCKER_COMPOSE_FILE down || true

        # Восстановление Nginx конфига
        if [[ -f /etc/nginx/sites-available/traffic.onai.academy.backup-* ]]; then
            LATEST_BACKUP=\$(ls -t /etc/nginx/sites-available/traffic.onai.academy.backup-* | head -1)
            cp "\$LATEST_BACKUP" /etc/nginx/sites-available/traffic.onai.academy
            nginx -s reload
        fi

        # Запуск PM2 backend
        cd $PROJECT_DIR/backend
        pm2 start ecosystem.config.cjs --env production

        echo "✅ Rollback завершен"
ENDSSH

    log_error "Rollback выполнен. Система восстановлена в предыдущее состояние."
    exit 1
}

# ============================================
# MAIN DEPLOYMENT FLOW
# ============================================

main() {
    echo ""
    echo "=========================================="
    echo "🚀 Zero-Downtime Docker Deployment"
    echo "=========================================="
    echo ""

    # Trap для обработки ошибок
    trap rollback ERR

    # Шаг 1: Проверка подключения
    check_connection

    # Шаг 2: Установка Docker (если нужно)
    install_docker

    # Шаг 3: Резервное копирование
    create_backup

    # Шаг 4: Синхронизация кода
    sync_code

    # Шаг 5: Создание .env
    create_env_file

    # Шаг 6: Сборка Docker images
    build_images

    # Шаг 7: Запуск контейнеров
    start_containers

    # Шаг 8: Health checks
    health_check

    # Шаг 9: Тестирование API
    test_api

    # Шаг 10: Обновление Nginx (КРИТИЧЕСКИЙ МОМЕНТ - переключение трафика)
    update_nginx

    # Шаг 11: Остановка старых сервисов
    stop_old_services

    # Шаг 12: Финальная проверка
    final_verification

    echo ""
    echo "=========================================="
    echo "✅ DEPLOYMENT УСПЕШНО ЗАВЕРШЕН!"
    echo "=========================================="
    echo ""
    echo "📊 Статус:"
    echo "  - Frontend: https://traffic.onai.academy"
    echo "  - Backend API: https://api.onai.academy"
    echo "  - Backend (internal): http://localhost:3001"
    echo "  - Redis: redis://localhost:6379"
    echo ""
    echo "🐳 Docker контейнеры:"
    echo "  - onai-traffic-frontend (port 81 → 80)"
    echo "  - onai-traffic-backend (port 3001 → 3000)"
    echo "  - onai-traffic-worker"
    echo "  - onai-shared-redis (port 6379)"
    echo ""
    echo "📝 Backup: $BACKUP_DIR"
    echo ""
    echo "🔍 Проверка статуса:"
    echo "  ssh $SERVER 'docker compose -f $DOCKER_COMPOSE_FILE ps'"
    echo ""
    echo "📋 Логи:"
    echo "  ssh $SERVER 'docker compose -f $DOCKER_COMPOSE_FILE logs -f'"
    echo ""
}

# Запуск deployment
main "$@"
