#!/bin/bash

# ============================================
# 🛑 STOP LOCAL DEVELOPMENT
# ============================================
# Остановка локальной среды разработки
# ./stop-local.sh
# ============================================

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🛑 Остановка локального окружения                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

echo "📋 Выбери действие:"
echo ""
echo "  1) Остановить контейнеры (сохранить данные)"
echo "  2) Остановить и удалить volumes (полная очистка)"
echo "  3) Только показать статус"
echo ""
read -p "Выбери вариант [1-3]: " choice

case $choice in
    1)
        echo "🛑 Остановка контейнеров..."
        docker-compose -f docker-compose.local.yml down
        echo "✅ Контейнеры остановлены"
        ;;
    2)
        echo "⚠️  Внимание! Все данные в volumes будут удалены!"
        read -p "Продолжить? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🗑️  Остановка и очистка..."
            docker-compose -f docker-compose.local.yml down -v
            echo "✅ Контейнеры остановлены и volumes удалены"
        else
            echo "❌ Отменено"
        fi
        ;;
    3)
        echo "📊 Статус контейнеров:"
        docker-compose -f docker-compose.local.yml ps
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "💡 Для запуска используй: ./start-local.sh"
