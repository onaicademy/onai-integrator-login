#!/bin/bash

# Применить миграцию telegram_groups через psql
# Landing Supabase PostgreSQL

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📱 ПРИМЕНЕНИЕ МИГРАЦИИ TELEGRAM_GROUPS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# PostgreSQL connection string для Landing Supabase
# Формат: postgresql://postgres.PROJECT_REF:PASSWORD@HOST:PORT/postgres
DB_URL="postgresql://postgres.xikaiavwqinamgolmtcy:RM8O6L2XN9XG7HI9@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

SQL_FILE="../supabase/migrations/create_telegram_groups.sql"

echo "🔗 Connecting to Landing Supabase..."
echo "   Project: xikaiavwqinamgolmtcy"
echo ""

# Проверяем есть ли psql
if ! command -v psql &> /dev/null; then
    echo "❌ psql не установлен!"
    echo ""
    echo "📋 Установи PostgreSQL client:"
    echo "   macOS: brew install postgresql"
    echo "   Ubuntu: sudo apt install postgresql-client"
    echo ""
    echo "⚠️  Или примени SQL вручную через Supabase UI:"
    echo "   https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new"
    echo ""
    exit 1
fi

echo "📝 Applying migration from: $SQL_FILE"
echo ""

# Применяем миграцию
psql "$DB_URL" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Миграция применена успешно!"
    echo ""
    echo "🔍 Проверка таблицы..."
    psql "$DB_URL" -c "SELECT COUNT(*) as total_groups FROM telegram_groups;"
    echo ""
    echo "✨ Готово! Теперь можешь активировать группу кодом 2134"
    echo ""
else
    echo ""
    echo "❌ Ошибка при применении миграции"
    echo ""
    echo "⚠️  Примени SQL вручную:"
    echo "   1. Открой: https://supabase.com/dashboard/project/xikaiavwqinamgolmtcy/sql/new"
    echo "   2. Скопируй SQL из: $SQL_FILE"
    echo "   3. Выполни в SQL Editor"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
echo ""
