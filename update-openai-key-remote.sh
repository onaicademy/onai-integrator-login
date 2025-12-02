#!/bin/bash
# Обновление OpenAI API ключа на сервере
# Использование: передать ключ через переменную NEW_KEY

cd /var/www/onai-integrator-login-main/backend

# Backup
BACKUP_FILE=".env.backup-$(date +%Y%m%d-%H%M%S)"
cp .env "$BACKUP_FILE"
echo "✅ Backup создан: $BACKUP_FILE"

# Обновление ключа (если передан через NEW_KEY)
if [ -n "$NEW_KEY" ]; then
  sed -i "s|^OPENAI_API_KEY=.*|OPENAI_API_KEY=$NEW_KEY|" .env
  echo "✅ Ключ обновлён"
else
  echo "⚠️ NEW_KEY не передан, ключ не обновлён"
fi

# Перезапуск
pm2 reload onai-backend --update-env
echo "✅ Backend перезапущен"

# Проверка
sleep 3
curl -s http://localhost:3000/api/debug/env | grep -E 'OPENAI_API_KEY_FIRST_20|OPENAI_API_KEY_LENGTH'


