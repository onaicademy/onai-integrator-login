#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🔑 ОБНОВЛЕНИЕ OPENAI API КЛЮЧА НА СЕРВЕРЕ
# ═══════════════════════════════════════════════════════════════
# Использование: ./update-openai-key.sh <NEW_API_KEY>
# ═══════════════════════════════════════════════════════════════

set -e

NEW_KEY="$1"
BACKEND_DIR="/var/www/onai-integrator-login-main/backend"
ENV_FILE="$BACKEND_DIR/.env"

if [ -z "$NEW_KEY" ]; then
  echo "❌ Ошибка: Не указан новый API ключ"
  echo "Использование: $0 <NEW_API_KEY>"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "🔑 ОБНОВЛЕНИЕ OPENAI API КЛЮЧА"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Backup .env
echo "📦 Шаг 1: Создание backup .env..."
BACKUP_FILE="$ENV_FILE.backup-$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo "✅ Backup создан: $BACKUP_FILE"
echo ""

# 2. Обновление ключа
echo "🔧 Шаг 2: Обновление OPENAI_API_KEY в .env..."
if grep -q "^OPENAI_API_KEY=" "$ENV_FILE"; then
  # Заменяем существующий ключ
  sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$NEW_KEY|" "$ENV_FILE"
  echo "✅ Ключ обновлён в .env"
else
  # Добавляем новый ключ если его нет
  echo "OPENAI_API_KEY=$NEW_KEY" >> "$ENV_FILE"
  echo "✅ Ключ добавлен в .env"
fi
echo ""

# 3. Проверка обновления
echo "🔍 Шаг 3: Проверка обновления..."
if grep -q "^OPENAI_API_KEY=$NEW_KEY" "$ENV_FILE"; then
  KEY_PREVIEW=$(echo "$NEW_KEY" | head -c 20)
  echo "✅ Ключ успешно обновлён (первые 20 символов: $KEY_PREVIEW...)"
else
  echo "❌ Ошибка: Ключ не обновлён!"
  exit 1
fi
echo ""

# 4. Перезапуск PM2 с обновлением env
echo "🔄 Шаг 4: Перезапуск backend с обновлёнными переменными..."
pm2 reload onai-backend --update-env
echo "✅ Backend перезапущен"
echo ""

# 5. Проверка статуса
echo "📊 Шаг 5: Проверка статуса PM2..."
pm2 status onai-backend
echo ""

# 6. Проверка загрузки ключа через debug endpoint
echo "🔍 Шаг 6: Проверка загрузки ключа..."
sleep 3
curl -s http://localhost:3000/api/debug/env | jq '.OPENAI_API_KEY, .OPENAI_API_KEY_FIRST_20, .OPENAI_API_KEY_LENGTH' || echo "⚠️ Debug endpoint недоступен"
echo ""

echo "═══════════════════════════════════════════════════════════════"
echo "✅ ОБНОВЛЕНИЕ ЗАВЕРШЕНО"
echo "═══════════════════════════════════════════════════════════════"


