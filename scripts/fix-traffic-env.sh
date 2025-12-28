#!/bin/bash

# 🔧 Автоматическое исправление env.env для Traffic Dashboard
# Добавляет недостающие переменные окружения для Supabase Traffic Dashboard

set -e

PRODUCTION_SERVER="root@207.154.231.30"
PRODUCTION_PATH="/var/www/onai-integrator-login-main"
ENV_FILE="$PRODUCTION_PATH/backend/env.env"

echo "🔧 Исправление env.env для Traffic Dashboard..."

# ═════════════════════════════════════════════════════════════
# 🎯 Traffic Dashboard Supabase Credentials
# ═════════════════════════════════════════════════════════════

# Проверяем, существует ли файл
if ! ssh "$PRODUCTION_SERVER" "test -f $ENV_FILE"; then
    echo "❌ ОШИБКА: env.env не найден на сервере!"
    exit 1
fi

# Проверяем, есть ли переменные Traffic Dashboard
TRAFFIC_URL=$(ssh "$PRODUCTION_SERVER" "grep -E '^TRAFFIC_SUPABASE_URL=' $ENV_FILE | cut -d'=' -f2" || echo "")
TRAFFIC_ANON=$(ssh "$PRODUCTION_SERVER" "grep -E '^TRAFFIC_SUPABASE_ANON_KEY=' $ENV_FILE | cut -d'=' -f2" || echo "")
TRAFFIC_SERVICE=$(ssh "$PRODUCTION_SERVER" "grep -E '^TRAFFIC_SERVICE_ROLE_KEY=' $ENV_FILE | cut -d'=' -f2" || echo "")

echo "📊 Текущие переменные:"
echo "   TRAFFIC_SUPABASE_URL: ${TRAFFIC_URL:+✅ SET} ${TRAFFIC_URL:-❌ NOT SET}"
echo "   TRAFFIC_SUPABASE_ANON_KEY: ${TRAFFIC_ANON:+✅ SET} ${TRAFFIC_ANON:-❌ NOT SET}"
echo "   TRAFFIC_SERVICE_ROLE_KEY: ${TRAFFIC_SERVICE:+✅ SET} ${TRAFFIC_SERVICE:-❌ NOT SET}"

# Если все переменные уже есть, выходим
if [ -n "$TRAFFIC_URL" ] && [ -n "$TRAFFIC_ANON" ] && [ -n "$TRAFFIC_SERVICE" ]; then
    echo "✅ Все переменные Traffic Dashboard уже настроены!"
    exit 0
fi

# ═══════════════════════════════════════════════════════════════
# 🔑 Используем дефолтные значения из продакшена
# ═════════════════════════════════════════════════════════════

echo "🔍 Используем корректные значения из Traffic Supabase..."

TRAFFIC_URL_VALUE="https://oetodaexnjcunklkdlkv.supabase.co"
TRAFFIC_ANON_VALUE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MTg3MzYsImV4cCI6MjA1MDA5NDczNn0.bvl8tIXBwbPOZ5Ls3xHgCcCajcB06OyBEJqj_L7Vze8"
TRAFFIC_SERVICE_VALUE="sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK"

echo "✅ Ключи для Traffic Dashboard:"
echo "   TRAFFIC_SUPABASE_URL: ${TRAFFIC_URL_VALUE:0:50}..."
echo "   TRAFFIC_SUPABASE_ANON_KEY: ${TRAFFIC_ANON_VALUE:0:50}..."
echo "   TRAFFIC_SERVICE_ROLE_KEY: ${TRAFFIC_SERVICE_VALUE:0:30}..."

# ═══════════════════════════════════════════════════════════════
# 📝 Добавляем переменные в env.env
# ═══════════════════════════════════════════════════════════════

if [ -z "$TRAFFIC_URL" ]; then
    echo "➕ Добавляем TRAFFIC_SUPABASE_URL..."
    ssh "$PRODUCTION_SERVER" "echo '' >> $ENV_FILE && echo 'TRAFFIC_SUPABASE_URL=$TRAFFIC_URL_VALUE' >> $ENV_FILE"
fi

if [ -z "$TRAFFIC_ANON" ]; then
    echo "➕ Добавляем TRAFFIC_SUPABASE_ANON_KEY..."
    ssh "$PRODUCTION_SERVER" "echo 'TRAFFIC_SUPABASE_ANON_KEY=$TRAFFIC_ANON_VALUE' >> $ENV_FILE"
fi

if [ -z "$TRAFFIC_SERVICE" ]; then
    echo "➕ Добавляем TRAFFIC_SERVICE_ROLE_KEY..."
    ssh "$PRODUCTION_SERVER" "echo 'TRAFFIC_SERVICE_ROLE_KEY=$TRAFFIC_SERVICE_VALUE' >> $ENV_FILE"
fi

echo "✅ Переменные Traffic Dashboard добавлены в env.env"

# ═══════════════════════════════════════════════════════════════
# 🔄 Перезагружаем backend
# ═══════════════════════════════════════════════════════════════

echo "🔄 Перезагружаем backend..."
ssh "$PRODUCTION_SERVER" "cd $PRODUCTION_PATH && pm2 restart onai-backend"

echo "✅ Backend перезагружен!"
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ Готово! Traffic Dashboard должен работать корректно"
echo "══════════════════════════════════════════════════════════════"
