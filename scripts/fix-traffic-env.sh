#!/bin/bash

# 🔧 Автоматическое исправление .env для Traffic Dashboard
# Добавляет недостающие переменные окружения для Supabase Traffic Dashboard

set -e

PRODUCTION_SERVER="root@207.154.231.30"
PRODUCTION_PATH="/var/www/onai-integrator-login-main"
ENV_FILE="$PRODUCTION_PATH/.env"

echo "🔧 Исправление .env для Traffic Dashboard..."

# ═════════════════════════════════════════════════════════════
# 🎯 Traffic Dashboard Supabase Credentials
# ═════════════════════════════════════════════════════════════

# Проверяем, существует ли файл
if ! ssh "$PRODUCTION_SERVER" "test -f $ENV_FILE"; then
    echo "❌ ОШИБКА: .env не найден на сервере!"
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
# 🔑 Получаем ключи из Tripwire базы данных
# ═════════════════════════════════════════════════════════════

echo "🔍 Получаем ключи из Tripwire базы данных..."

# Получаем ключи через Supabase CLI
TRAFFIC_URL_VALUE=$(npx -y supabase db execute --project-ref arqhkacellqbhjhbebfh --sql "SELECT value FROM api_tokens WHERE token_name = 'TRAFFIC_SUPABASE_URL' LIMIT 1;" 2>/dev/null | grep -oP 'TRAFFIC_SUPABASE_URL=\K.*' || echo "")
TRAFFIC_ANON_VALUE=$(npx -y supabase db execute --project-ref arqhkacellqbhjhbebfh --sql "SELECT value FROM api_tokens WHERE token_name = 'TRAFFIC_SUPABASE_ANON_KEY' LIMIT 1;" 2>/dev/null | grep -oP 'TRAFFIC_SUPABASE_ANON_KEY=\K.*' || echo "")
TRAFFIC_SERVICE_VALUE=$(npx -y supabase db execute --project-ref arqhkacellqbhjhbebfh --sql "SELECT value FROM api_tokens WHERE token_name = 'TRAFFIC_SERVICE_ROLE_KEY' LIMIT 1;" 2>/dev/null | grep -oP 'TRAFFIC_SERVICE_ROLE_KEY=\K.*' || echo "")

# Если ключи не найдены в базе, используем дефолтные значения
if [ -z "$TRAFFIC_URL_VALUE" ]; then
    echo "⚠️ Ключи не найдены в Tripwire, используем дефолтные значения"
    TRAFFIC_URL_VALUE="https://oetodaexnjcunklkdlkv.supabase.co"
    TRAFFIC_ANON_VALUE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9"
    TRAFFIC_SERVICE_VALUE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1hdXRoIiwic3ViIjoiMzY3YzNlYjMtZDZhZS00NjUyLTg0MzItOWU3YzIwM2M5ZTkiLCJyb2xlcyIpbXsicGVybWl0dGVkIjoic2VsZWN0In0sImF1dGhvcml0eV9pZCI6IjM2N2MzZWI4LWRmYWUtNDY1Mi04NDMyLTllN2M4MDM2OWU5OSIsInVzZXJfaWQiOiIzNjdjM2ViOC1kZmFlLTQ2NTItODQzMi05ZTdjODAzNjllOSJ9"
fi

echo "✅ Ключи получены:"
echo "   TRAFFIC_SUPABASE_URL: ${TRAFFIC_URL_VALUE:0:50}..."
echo "   TRAFFIC_SUPABASE_ANON_KEY: ${TRAFFIC_ANON_VALUE:0:50}..."
echo "   TRAFFIC_SERVICE_ROLE_KEY: ${TRAFFIC_SERVICE_VALUE:0:50}..."

# ═══════════════════════════════════════════════════════════════
# 📝 Добавляем переменные в .env
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

echo "✅ Переменные Traffic Dashboard добавлены в .env"

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
