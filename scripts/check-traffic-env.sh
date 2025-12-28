#!/bin/bash

# ═════════════════════════════════════════════════════════════
# 🔍 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ TRAFFIC DASHBOARD
# ═════════════════════════════════════════════════════════════

set -e

PRODUCTION_SERVER="root@207.154.231.30"
PRODUCTION_PATH="/var/www/onai-integrator-login-main"

echo "🔍 ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ TRAFFIC DASHBOARD"
echo "════════════════════════════════════════════════════════════"
echo ""

# Проверить что сервер доступен
echo "📡 Подключение к серверу..."
ssh "$PRODUCTION_SERVER" "echo '✅ Подключено'"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "🎯 TRAFFIC SUPABASE ПЕРЕМЕННЫЕ"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Проверить TRAFFIC_SUPABASE_URL
TRAFFIC_URL=$(ssh "$PRODUCTION_SERVER" "grep '^TRAFFIC_SUPABASE_URL=' $PRODUCTION_PATH/.env | cut -d'=' -f2" 2>/dev/null || echo "")
if [ -n "$TRAFFIC_URL" ]; then
    echo "✅ TRAFFIC_SUPABASE_URL: $TRAFFIC_URL"
else
    echo "❌ TRAFFIC_SUPABASE_URL: НЕ НАЙДЕНО!"
    TRAFFIC_URL_MISSING=true
fi

# Проверить TRAFFIC_SUPABASE_ANON_KEY
TRAFFIC_ANON_KEY=$(ssh "$PRODUCTION_SERVER" "grep '^TRAFFIC_SUPABASE_ANON_KEY=' $PRODUCTION_PATH/.env | cut -d'=' -f2" 2>/dev/null || echo "")
if [ -n "$TRAFFIC_ANON_KEY" ]; then
    if [ "$TRAFFIC_ANON_KEY" = "your_traffic_supabase_anon_key_here" ]; then
        echo "⚠️  TRAFFIC_SUPABASE_ANON_KEY: ПЛАЙСХОЛДЕР (нужно заменить)"
        TRAFFIC_ANON_KEY_MISSING=true
    else
        echo "✅ TRAFFIC_SUPABASE_ANON_KEY: ${TRAFFIC_ANON_KEY:0:50}..."
    fi
else
    echo "❌ TRAFFIC_SUPABASE_ANON_KEY: НЕ НАЙДЕНО!"
    TRAFFIC_ANON_KEY_MISSING=true
fi

# Проверить TRAFFIC_SERVICE_ROLE_KEY
TRAFFIC_SERVICE_KEY=$(ssh "$PRODUCTION_SERVER" "grep '^TRAFFIC_SERVICE_ROLE_KEY=' $PRODUCTION_PATH/.env | cut -d'=' -f2" 2>/dev/null || echo "")
if [ -n "$TRAFFIC_SERVICE_KEY" ]; then
    if [ "$TRAFFIC_SERVICE_KEY" = "your_traffic_supabase_service_role_key_here" ]; then
        echo "⚠️  TRAFFIC_SERVICE_ROLE_KEY: ПЛАЙСХОЛДЕР (нужно заменить)"
        TRAFFIC_SERVICE_KEY_MISSING=true
    else
        echo "✅ TRAFFIC_SERVICE_ROLE_KEY: ${TRAFFIC_SERVICE_KEY:0:50}..."
    fi
else
    echo "❌ TRAFFIC_SERVICE_ROLE_KEY: НЕ НАЙДЕНО!"
    TRAFFIC_SERVICE_KEY_MISSING=true
fi

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "📊 ИТОГОВАЯ СТАТИСТИКА"
echo "══════════════════════════════════════════════════════════════"
echo ""

# Подсчет отсутствующих переменных
MISSING_COUNT=0
if [ "$TRAFFIC_URL_MISSING" = true ]; then MISSING_COUNT=$((MISSING_COUNT + 1)); fi
if [ "$TRAFFIC_ANON_KEY_MISSING" = true ]; then MISSING_COUNT=$((MISSING_COUNT + 1)); fi
if [ "$TRAFFIC_SERVICE_KEY_MISSING" = true ]; then MISSING_COUNT=$((MISSING_COUNT + 1)); fi

if [ $MISSING_COUNT -eq 0 ]; then
    echo "✅ ВСЕ ПЕРЕМЕННЫЕ TRAFFIC DASHBOARD НАСТРОЕНЫ ПРАВИЛЬНО!"
    echo ""
    echo "🎉 Traffic Dashboard должен работать корректно"
    exit 0
else
    echo "❌ ОТСУТСТВУЕТ $MISSING_COUNT ПЕРЕМЕННЫХ(ОЕ) TRAFFIC DASHBOARD!"
    echo ""
    echo "📝 РЕШЕНИЕ:"
    echo ""
    echo "1. Открыть Supabase Dashboard: https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/settings/api"
    echo ""
    echo "2. Скопировать следующие ключи:"
    echo "   - Project URL → TRAFFIC_SUPABASE_URL"
    echo "   - anon public → TRAFFIC_SUPABASE_ANON_KEY"
    echo "   - service_role secret → TRAFFIC_SERVICE_ROLE_KEY"
    echo ""
    echo "3. Добавить ключи в .env на сервере:"
    echo ""
    echo "   ssh $PRODUCTION_SERVER"
    echo "   cd $PRODUCTION_PATH"
    echo "   nano .env"
    echo ""
    echo "4. Добавить следующие строки:"
    echo ""
    echo "   TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co"
    echo "   TRAFFIC_SUPABASE_ANON_KEY=<paste_anon_key_here>"
    echo "   TRAFFIC_SERVICE_ROLE_KEY=<paste_service_role_key_here>"
    echo ""
    echo "5. Сохранить (Ctrl+O, Enter) и выйти (Ctrl+X)"
    echo ""
    echo "6. Перезагрузить backend:"
    echo ""
    echo "   pm2 restart onai-backend"
    echo ""
    echo "7. Проверить работу: https://traffic.onai.academy"
    echo ""
    exit 1
fi
