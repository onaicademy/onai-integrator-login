#!/bin/bash

# 🔧 Скрипт для исправления .env на продакшене
# Исправляет placeholder значения на реальные ключи

set -e

SERVER="root@207.154.231.30"
PROD_ENV="/var/www/onai-integrator-login-main/backend/.env"
LOCAL_ENV=".env"

echo "🔧 Исправление .env на продакшене..."
echo "📅 Время: $(date)"
echo ""

# Копируем локальный .env во временную директорию
TEMP_ENV=$(mktemp)
cp "$LOCAL_ENV" "$TEMP_ENV"

# Заменяем placeholder значения на реальные из локального .env
echo "🔄 Заменяем placeholder значения..."

# OPENAI_API_KEY
sed -i 's/^OPENAI_API_KEY=.*/OPENAI_API_KEY=sk-proj-placeholder/' "$TEMP_ENV"
echo "✅ OPENAI_API_KEY исправлен"

# SUPABASE_URL (если placeholder)
sed -i 's|^SUPABASE_URL=https:\/\/placeholder.supabase.co/SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co/' "$TEMP_ENV"
echo "✅ SUPABASE_URL исправлен"

# FACEBOOK_APP_SECRET (если placeholder)
sed -i 's/^FACEBOOK_APP_SECRET=placeholder/FACEBOOK_APP_SECRET=/' "$TEMP_ENV"
echo "✅ FACEBOOK_APP_SECRET очищен"

# TRIPWIRE_SUPABASE_URL (если placeholder)
sed -i 's|^TRIPWIRE_SUPABASE_URL=https:\/\/pjmvxecykysfrzppdcto.supabase.co/TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co/' "$TEMP_ENV"
echo "✅ TRIPWIRE_SUPABASE_URL исправлен"

# LANDING_SUPABASE_URL (если placeholder)
sed -i 's|^LANDING_SUPABASE_URL=https:\/\/xikaiavwqinamgolmtcy.supabase.co/LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co/' "$TEMP_ENV"
echo "✅ LANDING_SUPABASE_URL исправлен"

# TRAFFIC_SUPABASE_URL (если placeholder)
sed -i 's|^TRAFFIC_SUPABASE_URL=https:\/\/oetodaexnjcunklkdlkv.supabase.co/TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co/' "$TEMP_ENV"
echo "✅ TRAFFIC_SUPABASE_URL исправлен"

# BUNNY_STREAM_API_KEY (если placeholder)
sed -i 's/^BUNNY_STREAM_API_KEY=placeho\./BUNNY_STREAM_API_KEY=/' "$TEMP_ENV"
echo "✅ BUNNY_STREAM_API_KEY исправлен"

# RESEND_API_KEY (если placeholder)
sed -i 's/^RESEND_API_KEY=placeho\./RESEND_API_KEY=/' "$TEMP_ENV"
echo "✅ RESEND_API_KEY исправлен"

echo ""
echo "📤 Загрузка исправленного .env на продакшен..."

# Создаем бэкап текущего .env на продакшене
ssh ${SERVER} "cp ${PROD_ENV} ${PROD_ENV}.backup-$(date +%Y%m%d-%H%M%S)"
echo "✅ Бэкап создан: ${PROD_ENV}.backup-$(date +%Y%m%d-%H%M%S)"

# Загружаем исправленный .env
scp "$TEMP_ENV" ${SERVER}:${PROD_ENV}
echo "✅ .env загружен на продакшен"

# Удаляем временный файл
rm -f "$TEMP_ENV"

echo ""
echo "🔄 Перезапуск backend..."

# Перезапускаем backend
ssh ${SERVER} "pm2 restart onai-backend"
echo "✅ Backend перезапущен"

echo ""
echo "🔍 Проверка статуса backend..."
sleep 3
ssh ${SERVER} "pm2 status onai-backend"

echo ""
echo "🎉 .env исправлен и backend перезапущен!"
echo ""
echo "📋 Следующие шаги:"
echo "   1. Проверьте логи: ssh ${SERVER} 'pm2 logs onai-backend --lines 50'"
echo "   2. Протестируйте Team Constructor"
echo "   3. Проверьте что ключи работают"
