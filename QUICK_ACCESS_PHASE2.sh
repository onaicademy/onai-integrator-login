#!/bin/bash

# QUICK ACCESS - PHASE 2: INTEGRATION LOGS TABLE
# Быстрый доступ ко всем важным файлам и командам

echo ""
echo "=========================================="
echo "PHASE 2: INTEGRATION LOGS TABLE"
echo "=========================================="
echo ""

# Основная информация
echo "📋 ОСНОВНАЯ ИНФОРМАЦИЯ"
echo "Задача: Создание таблицы integration_logs"
echo "База: Landing BD (xikaiavwqinamgolmtcy)"
echo "Статус: ⚠️  ТРЕБУЕТСЯ РУЧНОЕ ВЫПОЛНЕНИЕ"
echo ""

# Файлы
echo "📁 ФАЙЛЫ"
echo ""
echo "1️⃣  SQL миграция (ГЛАВНЫЙ ФАЙЛ):"
echo "   sql/migrations/004_create_integration_logs_table.sql"
echo ""
echo "2️⃣  Полный отчет:"
echo "   docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md"
echo ""
echo "3️⃣  Быстрый старт:"
echo "   sql/migrations/QUICK_START_004.md"
echo ""
echo "4️⃣  Инструкция выполнения:"
echo "   sql/migrations/EXECUTE_MIGRATION_004.md"
echo ""

# Ссылки
echo "🔗 ССЫЛКИ"
echo ""
echo "SQL Editor:"
echo "https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor"
echo ""
echo "Dashboard:"
echo "https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy"
echo ""

# Команды
echo "⚡ КОМАНДЫ"
echo ""
echo "Открыть SQL миграцию:"
echo "  cat sql/migrations/004_create_integration_logs_table.sql"
echo ""
echo "Открыть полный отчет:"
echo "  cat docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md"
echo ""
echo "Проверить таблицу (после выполнения миграции):"
echo "  cd backend && npx ts-node scripts/verify-integration-logs-table.ts"
echo ""
echo "Проверить существование таблицы:"
echo "  cd backend && npx ts-node scripts/execute-migration-004-simple.ts"
echo ""

# Быстрые действия
echo "🚀 БЫСТРЫЕ ДЕЙСТВИЯ"
echo ""
echo "[1] Показать SQL скрипт"
echo "[2] Показать быстрый старт"
echo "[3] Показать полный отчет"
echo "[4] Показать список файлов"
echo "[5] Открыть SQL Editor в браузере"
echo "[6] Проверить таблицу"
echo "[0] Выход"
echo ""

read -p "Выберите действие (0-6): " action

case $action in
  1)
    echo ""
    echo "📄 SQL СКРИПТ:"
    echo "=========================================="
    cat sql/migrations/004_create_integration_logs_table.sql | head -100
    echo ""
    echo "... (полный файл: sql/migrations/004_create_integration_logs_table.sql)"
    ;;
  2)
    echo ""
    cat sql/migrations/QUICK_START_004.md
    ;;
  3)
    echo ""
    cat docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md | head -200
    echo ""
    echo "... (полный файл: docs/PHASE2_INTEGRATION_LOGS_TABLE_REPORT.md)"
    ;;
  4)
    echo ""
    cat CREATED_FILES_PHASE2.txt
    ;;
  5)
    echo ""
    echo "Открываем SQL Editor в браузере..."
    open "https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/editor"
    ;;
  6)
    echo ""
    echo "Запускаем проверку таблицы..."
    cd backend && npx ts-node scripts/verify-integration-logs-table.ts
    ;;
  0)
    echo "Выход"
    exit 0
    ;;
  *)
    echo "Неверный выбор"
    exit 1
    ;;
esac

echo ""
