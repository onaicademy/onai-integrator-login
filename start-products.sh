#!/bin/bash

# ============================================
# 🚀 START PRODUCTS - Interactive Menu
# ============================================
# Простое управление продуктами через меню
# ============================================

set -e

echo "============================================"
echo "🐳 Docker Products Manager"
echo "============================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущен!"
    echo "   Открой Docker Desktop и попробуй снова"
    exit 1
fi

# Create network if doesn't exist
if ! docker network inspect onai-network > /dev/null 2>&1; then
    echo "📡 Создаю общую сеть onai-network..."
    docker network create onai-network
fi

echo "📋 Выбери что запустить:"
echo ""
echo "  1) 🔴 Redis (общий для всех)"
echo "  2) 🏠 Main Platform (frontend + backend)"
echo "  3) 🎯 Tripwire Product (frontend + backend)"
echo "  4) 📊 Traffic Dashboard (frontend + backend)"
echo "  5) 🌟 Всё сразу (Redis + все продукты)"
echo "  6) ❌ Остановить всё"
echo ""
read -p "Выбери вариант [1-6]: " choice

case $choice in
    1)
        echo "🔴 Запускаю Redis..."
        docker-compose -f docker-compose.redis.yml up -d
        echo "✅ Redis запущен на порту 6379"
        ;;
    2)
        echo "🏠 Запускаю Main Platform..."
        # Check if Redis is running
        if ! docker ps | grep -q redis-shared; then
            echo "⚠️  Redis не запущен. Запускаю Redis сначала..."
            docker-compose -f docker-compose.redis.yml up -d
            sleep 3
        fi
        docker-compose -f docker-compose.main.yml up -d
        echo "✅ Main Platform запущен:"
        echo "   Frontend: http://localhost:8080"
        echo "   Backend:  http://localhost:3000"
        ;;
    3)
        echo "🎯 Запускаю Tripwire Product..."
        if ! docker ps | grep -q redis-shared; then
            echo "⚠️  Redis не запущен. Запускаю Redis сначала..."
            docker-compose -f docker-compose.redis.yml up -d
            sleep 3
        fi
        docker-compose -f docker-compose.tripwire.yml up -d
        echo "✅ Tripwire запущен:"
        echo "   Frontend: http://localhost:8082"
        echo "   Backend:  http://localhost:3002"
        ;;
    4)
        echo "📊 Запускаю Traffic Dashboard..."
        if ! docker ps | grep -q redis-shared; then
            echo "⚠️  Redis не запущен. Запускаю Redis сначала..."
            docker-compose -f docker-compose.redis.yml up -d
            sleep 3
        fi
        docker-compose -f docker-compose.traffic.yml up -d
        echo "✅ Traffic Dashboard запущен:"
        echo "   Frontend: http://localhost:8081"
        echo "   Backend:  http://localhost:3001"
        ;;
    5)
        echo "🌟 Запускаю ВСЁ..."
        docker-compose -f docker-compose.redis.yml up -d
        sleep 3
        docker-compose -f docker-compose.main.yml up -d &
        docker-compose -f docker-compose.tripwire.yml up -d &
        docker-compose -f docker-compose.traffic.yml up -d &
        wait
        echo "✅ Все продукты запущены!"
        echo ""
        echo "🌐 Доступные сервисы:"
        echo "   🏠 Main Platform:     http://localhost:8080"
        echo "   🎯 Tripwire:          http://localhost:8082"
        echo "   📊 Traffic Dashboard: http://localhost:8081"
        ;;
    6)
        echo "❌ Останавливаю всё..."
        docker-compose -f docker-compose.main.yml down 2>/dev/null || true
        docker-compose -f docker-compose.tripwire.yml down 2>/dev/null || true
        docker-compose -f docker-compose.traffic.yml down 2>/dev/null || true
        docker-compose -f docker-compose.redis.yml down 2>/dev/null || true
        echo "✅ Все контейнеры остановлены"
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "============================================"
echo "💡 Совет: Открой Docker Desktop → Containers"
echo "   чтобы видеть и управлять контейнерами"
echo "============================================"
