#!/bin/bash
# 🚀 DEPLOY SCRIPT - Traffic Dashboard Optimizations
# Дата: 20 декабря 2024

set -e

echo "================================================"
echo "🚀 DEPLOYING TRAFFIC DASHBOARD OPTIMIZATIONS"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SERVER="137.184.27.189"
USER="root"
REMOTE_DIR="/var/www/onai-integrator-login-main"

echo -e "${YELLOW}📋 Что изменилось:${NC}"
echo "  ✅ Числа теперь полные: ₸1,234,567 вместо ₸1.2K"
echo "  ✅ Добавлен полный перевод на казахский язык"
echo "  ✅ Проверена и оптимизирована производительность API"
echo ""

# Step 1: Test SSH connection
echo -e "${YELLOW}1️⃣  Проверка SSH подключения...${NC}"
if ssh -o ConnectTimeout=5 -o BatchMode=yes "$USER@$SERVER" "echo 'SSH OK'" &>/dev/null; then
    echo -e "${GREEN}✅ SSH соединение работает${NC}"
else
    echo -e "${RED}❌ SSH не настроен!${NC}"
    echo ""
    echo -e "${YELLOW}Чтобы настроить SSH:${NC}"
    echo "  1. На локальной машине: cat ~/.ssh/id_ed25519.pub"
    echo "  2. Скопируйте ключ"
    echo "  3. На сервере: echo 'ВАШ_КЛЮЧ' >> ~/.ssh/authorized_keys"
    echo "  4. На сервере: chmod 600 ~/.ssh/authorized_keys"
    echo ""
    exit 1
fi
echo ""

# Step 2: Create deployment archive
echo -e "${YELLOW}2️⃣  Создание архива для деплоя...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="traffic-dashboard-${TIMESTAMP}.tar.gz"
tar -czf "/tmp/$ARCHIVE_NAME" dist/
echo -e "${GREEN}✅ Архив создан: /tmp/$ARCHIVE_NAME${NC}"
echo ""

# Step 3: Upload to server
echo -e "${YELLOW}3️⃣  Загрузка на сервер...${NC}"
scp "/tmp/$ARCHIVE_NAME" "$USER@$SERVER:/tmp/"
echo -e "${GREEN}✅ Файлы загружены${NC}"
echo ""

# Step 4: Deploy on server
echo -e "${YELLOW}4️⃣  Распаковка и деплой на сервере...${NC}"
ssh "$USER@$SERVER" bash <<ENDSSH
set -e
echo "📂 Backup старой версии..."
cd $REMOTE_DIR
if [ -d "dist" ]; then
    mv dist dist.backup.\$(date +%Y%m%d_%H%M%S)
fi

echo "📦 Распаковка новой версии..."
tar -xzf /tmp/$ARCHIVE_NAME
rm /tmp/$ARCHIVE_NAME

echo "🔄 Перезагрузка Nginx..."
nginx -s reload || systemctl reload nginx

echo "✅ Деплой завершен!"
ENDSSH

echo -e "${GREEN}✅ Деплой успешен!${NC}"
echo ""

# Step 5: Cleanup
rm -f "/tmp/$ARCHIVE_NAME"

echo "================================================"
echo -e "${GREEN}🎉 ВСЕ ГОТОВО!${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}📝 Что нужно сделать:${NC}"
echo "  1. Открыть: https://traffic.onai.academy"
echo "  2. Очистить кэш: Cmd+Shift+R (Mac) или Ctrl+Shift+R (Windows)"
echo "  3. Проверить:"
echo "     - Числа показываются полностью (₸1,234,567)"
echo "     - Переключение языка работает (RU ↔️ KZ)"
echo "     - Все метрики корректны"
echo ""
echo -e "${GREEN}Подробный отчет: TRAFFIC_DASHBOARD_OPTIMIZATION_REPORT.md${NC}"
echo ""

