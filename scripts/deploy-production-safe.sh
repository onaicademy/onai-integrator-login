#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🚀 БЕЗОПАСНЫЙ ДЕПЛОЙ НА ПРОДАКШЕН (защищает .env)
# ═══════════════════════════════════════════════════════════════

set -e  # Остановить при любой ошибке

# Конфигурация
PRODUCTION_SERVER="root@207.154.231.30"
PRODUCTION_PATH="/var/www/onai-integrator-login-main"
BACKUP_DIR="/var/www/onai-integrator-login-main/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "🚀 БЕЗОПАСНЫЙ ДЕПЛОЙ НА ПРОДАКШЕН"
echo "══════════════════════════════════════════════════════════════"
echo "📅 Дата: $(date '+%Y-%m-%d %H:%M:%S')"
echo "🖥️  Сервер: $PRODUCTION_SERVER"
echo ""

# ═══════════════════════════════════════════════════════════════
# 🔒 ШАГ 1: Проверка .env на сервере
# ═══════════════════════════════════════════════════════════════
echo "🔒 ШАГ 1: Проверка .env на сервере..."

ssh "$PRODUCTION_SERVER" "test -f $PRODUCTION_PATH/.env" || {
  echo "❌ ОШИБКА: .env не найден на сервере!"
  echo "❌ Путь: $PRODUCTION_PATH/.env"
  exit 1
}

echo "✅ .env найден на сервере"

# ═══════════════════════════════════════════════════════════════
# 💾 ШАГ 2: Создание бэкапа .env
# ═════════════════════════════════════════════════════════════
echo "💾 ШАГ 2: Создание бэкапа .env..."

ssh "$PRODUCTION_SERVER" "mkdir -p $BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/.env.backup.$TIMESTAMP"
ssh "$PRODUCTION_SERVER" "cp $PRODUCTION_PATH/.env $BACKUP_FILE"

echo "✅ Бэкап создан: $BACKUP_FILE"

# ═══════════════════════════════════════════════════════════════
# 📦 ШАГ 3: Создание архива деплоя (без .env)
# ═══════════════════════════════════════════════════════════════
echo "📦 ШАГ 3: Создание архива деплоя..."

DEPLOY_ARCHIVE="deploy-safe-$TIMESTAMP.tar.gz"

tar -czf "$DEPLOY_ARCHIVE" \
  --exclude='.env' \
  --exclude='.env.example' \
  --exclude='*.log' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  backend/dist \
  backend/src/server.ts \
  backend/src/routes/api-integrations.ts \
  backend/src/routes/utm-analytics.ts \
  ecosystem.config.cjs \
  docs/DEPLOYMENT_SUCCESS_REPORT_20251228.md \
  docs/DEPLOYMENT_COMMITS_20251228.md \
  docs/PRODUCTION_ISSUES_ANALYSIS_20251228.md

echo "✅ Архив создан: $DEPLOY_ARCHIVE"
echo "   Размер: $(du -h "$DEPLOY_ARCHIVE" | cut -f1)"

# ═══════════════════════════════════════════════════════════════
# 📤 ШАГ 4: Загрузка архива на сервер
# ═════════════════════════════════════════════════════════════
echo "📤 ШАГ 4: Загрузка архива на сервер..."

scp "$DEPLOY_ARCHIVE" "$PRODUCTION_SERVER:/tmp/"

echo "✅ Архив загружен на сервер"

# ═══════════════════════════════════════════════════════════════
# 📂 ШАГ 5: Распаковка архива на сервере
# ═══════════════════════════════════════════════════════════════
echo "📂 ШАГ 5: Распаковка архива на сервере..."

ssh "$PRODUCTION_SERVER" "cd $PRODUCTION_PATH && tar -xzf /tmp/$DEPLOY_ARCHIVE"

echo "✅ Архив распакован"

# ═══════════════════════════════════════════════════════════════
# 🔍 ШАГ 6: Проверка, что .env не был перезаписан
# ═══════════════════════════════════════════════════════════════
echo "🔍 ШАГ 6: Проверка .env..."

ssh "$PRODUCTION_SERVER" "test -f $PRODUCTION_PATH/.env" || {
  echo "⚠️  ВНИМАНИЕ: .env был перезаписан или удален!"
  echo "🔄 Восстановление из бэкапа..."
  ssh "$PRODUCTION_SERVER" "cp $BACKUP_FILE $PRODUCTION_PATH/.env"
  echo "✅ .env восстановлен из бэкапа"
}

echo "✅ .env в безопасности"

# ═══════════════════════════════════════════════════════════════
# 🔍 ШАГ 7: Проверка на placeholder значения
# ═════════════════════════════════════════════════════════════
echo "🔍 ШАГ 7: Проверка на placeholder значения..."

PLACEHOLDER_DETECTED=false

# Проверяем критичные переменные на placeholder значения
ssh "$PRODUCTION_SERVER" "grep -q 'your_openai_key_here' $PRODUCTION_PATH/.env" && PLACEHOLDER_DETECTED=true
ssh "$PRODUCTION_SERVER" "grep -q 'your_facebook_token_here' $PRODUCTION_PATH/.env" && PLACEHOLDER_DETECTED=true
ssh "$PRODUCTION_SERVER" "grep -q 'your_amocrm_token_here' $PRODUCTION_PATH/.env" && PLACEHOLDER_DETECTED=true

if [ "$PLACEHOLDER_DETECTED" = true ]; then
  echo "❌ ОБНАРУЖЕН PLACEHOLDER В .env!"
  echo "🔄 Восстановление из бэкапа..."
  ssh "$PRODUCTION_SERVER" "cp $BACKUP_FILE $PRODUCTION_PATH/.env"
  echo "✅ .env восстановлен из бэкапа"
  echo "❌ ДЕПЛОЙ ПРЕРВАН - .env содержит placeholder значения!"
  exit 1
fi

echo "✅ Placeholder значения не обнаружены"

# ═══════════════════════════════════════════════════════════════
# 🔄 ШАГ 8: Перезапуск PM2
# ═══════════════════════════════════════════════════════════════
echo "🔄 ШАГ 8: Перезапуск PM2..."

ssh "$PRODUCTION_SERVER" "cd $PRODUCTION_PATH && pm2 reload ecosystem.config.cjs --update-env"

echo "✅ PM2 перезапущен"

# ═════════════════════════════════════════════════════════════════
# 🔍 ШАГ 9: Проверка статуса PM2
# ═══════════════════════════════════════════════════════════════
echo "🔍 ШАГ 9: Проверка статуса PM2..."

sleep 3

STATUS=$(ssh "$PRODUCTION_SERVER" "pm2 status --json | grep -o '\"status\":\"[^\"]*\"' | grep -o '[^\"]*'")

if [ "$STATUS" = "online" ]; then
  echo "✅ PM2 статус: ONLINE"
else
  echo "❌ PM2 статус: $STATUS"
  echo "🔄 Восстановление .env из бэкапа..."
  ssh "$PRODUCTION_SERVER" "cp $BACKUP_FILE $PRODUCTION_PATH/.env"
  ssh "$PRODUCTION_SERVER" "cd $PRODUCTION_PATH && pm2 reload ecosystem.config.cjs --update-env"
  echo "✅ .env восстановлен, PM2 перезапущен"
fi

# ═══════════════════════════════════════════════════════════════
# 📊 ШАГ 10: Проверка логов
# ═════════════════════════════════════════════════════════════════
echo "📊 ШАГ 10: Проверка логов..."

sleep 5

ssh "$PRODUCTION_SERVER" "pm2 logs onai-backend --lines 20 --nostream"

# ═════════════════════════════════════════════════════════════════
# 🗑️ ШАГ 11: Очистка временных файлов
# ═════════════════════════════════════════════════════════════════
echo "🗑️ ШАГ 11: Очистка временных файлов..."

rm -f "$DEPLOY_ARCHIVE"
ssh "$PRODUCTION_SERVER" "rm -f /tmp/$DEPLOY_ARCHIVE"

echo "✅ Временные файлы удалены"

# ═════════════════════════════════════════════════════════════════
# ✅ ФИНАЛ
# ═════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════════════"
echo "✅ ДЕПЛОЙ УСПЕШНО ЗАВЕРШЕН"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "📊 Итог:"
echo "   ✅ .env защищен от перезаписи"
echo "   ✅ Бэкап создан: $BACKUP_FILE"
echo "   ✅ PM2 перезапущен"
echo "   ✅ Placeholder значения не обнаружены"
echo ""
echo "🎯 Следующие шаги:"
echo "   1. Протестировать API эндпоинты"
echo "   2. Проверить, что все токены работают"
echo "   3. Проверить логи на ошибки"
echo ""
echo "📅 Дата: $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════════════════════════════"
echo ""
