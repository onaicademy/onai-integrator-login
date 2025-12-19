#!/bin/bash

# 🔒 ENV Backup Script
# Создаёт timestamped backup ENV файла на сервере
# Использование: ./scripts/backup-env.sh

set -e

SERVER="root@207.154.231.30"
ENV_PATH="/var/www/onai-integrator-login-main/backend/env.env"
BACKUP_DIR="/var/www/onai-integrator-login-main/backend/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "🔒 Creating ENV backup on production server..."
echo ""

# Создаём директорию для backups если её нет
ssh $SERVER "mkdir -p $BACKUP_DIR"

# Создаём backup
ssh $SERVER "cp $ENV_PATH $BACKUP_DIR/env.env.backup-$TIMESTAMP"

# Проверяем что backup создан
if ssh $SERVER "test -f $BACKUP_DIR/env.env.backup-$TIMESTAMP"; then
  echo "✅ Backup created: env.env.backup-$TIMESTAMP"
  
  # Показываем последние 5 backups
  echo ""
  echo "📋 Recent backups:"
  ssh $SERVER "ls -lht $BACKUP_DIR | head -6"
  
  # Удаляем backups старше 30 дней
  echo ""
  echo "🧹 Cleaning old backups (>30 days)..."
  ssh $SERVER "find $BACKUP_DIR -name 'env.env.backup-*' -mtime +30 -delete"
  
  echo ""
  echo "✅ Backup complete!"
else
  echo "❌ Backup failed!"
  exit 1
fi
