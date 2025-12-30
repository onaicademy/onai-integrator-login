#!/bin/bash

# ============================================
# 🚀 QUICK START SCRIPT - Local Development
# ============================================
# Быстрый запуск локальной разработки
# ./start-local.sh
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🐳 onAI Academy - Local Development Environment          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Проверка Docker
echo "🔍 Проверка Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "📥 Скачай с https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker не запущен!"
    echo "▶️  Запусти Docker Desktop"
    exit 1
fi

echo "✅ Docker работает"
echo ""

# Проверка .env.local
echo "🔍 Проверка конфигурации..."
if [ ! -f .env.local ]; then
    echo "⚠️  Файл .env.local не найден"
    echo "📝 Создаём из шаблона..."
    cp .env.local.example .env.local
    echo "✅ Создан .env.local"
    echo ""
    echo "⚠️  ВАЖНО: Заполни переменные окружения в .env.local"
    echo "   Минимум нужны:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - VITE_TRIPWIRE_SUPABASE_URL"
    echo "   - VITE_TRIPWIRE_SUPABASE_ANON_KEY"
    echo ""
    read -p "📝 Открыть .env.local для редактирования? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env.local
    fi
else
    echo "✅ Конфигурация найдена"
fi
echo ""

# Выбор сервисов для запуска
echo "📋 Какие сервисы запустить?"
echo ""
echo "  1) Все сервисы (Main + Tripwire + Traffic)"
echo "  2) Только Main Platform"
echo "  3) Только Tripwire Product"
echo "  4) Только Traffic Dashboard"
echo "  5) Main + Tripwire"
echo ""
read -p "Выбери вариант [1-5]: " choice

case $choice in
    1)
        SERVICES=""
        echo "🚀 Запуск ВСЕХ сервисов..."
        ;;
    2)
        SERVICES="redis main-frontend main-backend main-worker"
        echo "🚀 Запуск Main Platform..."
        ;;
    3)
        SERVICES="redis tripwire-frontend tripwire-backend"
        echo "🚀 Запуск Tripwire Product..."
        ;;
    4)
        SERVICES="redis traffic-frontend traffic-backend"
        echo "🚀 Запуск Traffic Dashboard..."
        ;;
    5)
        SERVICES="redis main-frontend main-backend main-worker tripwire-frontend tripwire-backend"
        echo "🚀 Запуск Main + Tripwire..."
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""

# Запуск Docker Compose
echo "⚙️  Запуск контейнеров..."
docker-compose -f docker-compose.local.yml up -d $SERVICES

echo ""
echo "⏳ Ждём готовности сервисов (30 сек)..."
sleep 30

# Проверка статуса
echo ""
echo "📊 Статус контейнеров:"
docker-compose -f docker-compose.local.yml ps

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Локальная среда запущена!                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Показ доступных URL
if [[ $choice == 1 || $choice == 2 || $choice == 5 ]]; then
    echo "🟢 Main Platform:"
    echo "   Frontend:  http://localhost:8080"
    echo "   Backend:   http://localhost:3000"
    echo "   Health:    http://localhost:3000/health"
    echo ""
fi

if [[ $choice == 1 || $choice == 3 || $choice == 5 ]]; then
    echo "🔵 Tripwire Product:"
    echo "   Frontend:  http://localhost:8082"
    echo "   Backend:   http://localhost:3002"
    echo "   Health:    http://localhost:3002/health"
    echo ""
fi

if [[ $choice == 1 || $choice == 4 ]]; then
    echo "🟡 Traffic Dashboard:"
    echo "   Frontend:  http://localhost:8081"
    echo "   Backend:   http://localhost:3001"
    echo "   Health:    http://localhost:3001/health"
    echo ""
fi

echo "🔴 Redis:        localhost:6379"
echo ""
echo "📝 Полезные команды:"
echo "   Логи всех:    docker-compose -f docker-compose.local.yml logs -f"
echo "   Логи backend: docker-compose -f docker-compose.local.yml logs -f main-backend"
echo "   Остановить:   docker-compose -f docker-compose.local.yml down"
echo "   Рестарт:      docker-compose -f docker-compose.local.yml restart [service]"
echo ""
echo "📖 Подробнее в LOCAL_DEVELOPMENT_GUIDE.md"
echo ""
echo "🎉 Удачной разработки!"
