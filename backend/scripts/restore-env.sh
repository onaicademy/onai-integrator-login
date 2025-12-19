#!/bin/bash

# 🔒 ENV Restore Script
# Восстанавливает ENV файл из backup
# Использование: ./scripts/restore-env.sh [backup-filename]

set -e

SERVER="root@207.154.231.30"
ENV_PATH="/var/www/onai-integrator-login-main/backend/env.env"
BACKUP_DIR="/var/www/onai-integrator-login-main/backend/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔒 ENV Restore Script"
echo ""

# Если не указан файл backup, показываем список
if [ -z "$1" ]; then
  echo "📋 Available backups:"
  echo ""
  ssh $SERVER "ls -lht $BACKUP_DIR | head -10"
  echo ""
  echo -e "${YELLOW}Usage:${NC} ./scripts/restore-env.sh [backup-filename]"
  echo -e "${YELLOW}Example:${NC} ./scripts/restore-env.sh env.env.backup-20251219-120000"
  exit 0
fi

BACKUP_FILE="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Проверяем что backup существует
if ! ssh $SERVER "test -f $BACKUP_PATH"; then
  echo -e "${RED}❌ Backup file not found: $BACKUP_FILE${NC}"
  echo ""
  echo "Available backups:"
  ssh $SERVER "ls -1 $BACKUP_DIR"
  exit 1
fi

# Подтверждение
echo -e "${YELLOW}⚠️  WARNING: This will replace current env.env with backup!${NC}"
echo ""
echo "Backup file: $BACKUP_FILE"
ssh $SERVER "ls -lh $BACKUP_PATH"
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "🔄 Restoring ENV from backup..."

# Создаём backup текущего файла перед restore
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ssh $SERVER "cp $ENV_PATH $BACKUP_DIR/env.env.before-restore-$TIMESTAMP"
echo "✅ Current ENV backed up as: env.env.before-restore-$TIMESTAMP"

# Restore
ssh $SERVER "cp $BACKUP_PATH $ENV_PATH"
echo "✅ ENV restored from: $BACKUP_FILE"

# Restart backend
echo ""
echo "🔄 Restarting backend..."
ssh $SERVER "pm2 restart onai-backend"

echo ""
echo -e "${GREEN}✅ ENV RESTORED SUCCESSFULLY!${NC}"
echo ""
echo "📋 Next steps:"
echo "  1. Check backend logs: ssh root@207.154.231.30 'pm2 logs onai-backend'"
echo "  2. Test API: curl https://api.onai.academy/health"
echo ""
