#!/bin/bash

# 🚀 Ручной деплой всех продуктов
# Используйте этот скрипт пока не решена проблема с GitHub Actions billing

set -e

echo "🚀 Ручной деплой на DigitalOcean"
echo "================================"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для деплоя
deploy_product() {
    local product_name=$1
    local server_dir=$2
    local deploy_type=$3  # frontend или backend

    echo -e "${BLUE}📦 Деплой: $product_name${NC}"

    if [ "$deploy_type" = "frontend" ]; then
        # Frontend деплой
        echo "🔨 Building frontend..."
        npm run build

        echo "📦 Creating archive..."
        ARCHIVE="deploy-${product_name}-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf "$ARCHIVE" dist/

        echo "🚀 Uploading to server..."
        scp "$ARCHIVE" root@207.154.231.30:/tmp/deploy-new.tar.gz

        echo "🔄 Deploying on server..."
        ssh root@207.154.231.30 << ENDSSH
set -e
cd $server_dir
tar -czf /tmp/${product_name}-backup-\$(date +%Y%m%d-%H%M%S).tar.gz assets/ index.html 2>/dev/null || true
rm -rf assets/* index.html
tar -xzf /tmp/deploy-new.tar.gz --strip-components=1
chown -R www-data:www-data $server_dir
chmod -R 755 $server_dir
systemctl reload nginx
echo "✅ $product_name deployed!"
ENDSSH

        rm -f "$ARCHIVE"

    elif [ "$deploy_type" = "backend" ]; then
        # Backend деплой
        echo "🔄 Deploying backend..."
        ssh root@207.154.231.30 << 'ENDSSH'
set -e
cd /var/www/onai-integrator-login-main
git fetch origin main
git reset --hard origin/main
cd backend
npm install --production
npm run build
pm2 restart onai-backend --update-env
pm2 save
echo "✅ Backend deployed!"
ENDSSH
    fi

    echo -e "${GREEN}✅ $product_name деплой завершён!${NC}"
    echo ""
}

# Меню выбора
echo "Выберите что деплоить:"
echo "1) Traffic Dashboard"
echo "2) Main Platform"
echo "3) Tripwire"
echo "4) Backend API"
echo "5) ВСЁ (Full Deploy)"
echo ""
read -p "Ваш выбор (1-5): " choice

case $choice in
    1)
        deploy_product "traffic" "/var/www/traffic.onai.academy" "frontend"
        ;;
    2)
        deploy_product "main" "/var/www/onai.academy" "frontend"
        ;;
    3)
        deploy_product "tripwire" "/var/www/expresscourse.onai.academy" "frontend"
        ;;
    4)
        deploy_product "backend" "/var/www/onai-integrator-login-main/backend" "backend"
        ;;
    5)
        echo "🚀 Полный деплой всех продуктов..."
        echo ""

        # Backend сначала
        deploy_product "backend" "/var/www/onai-integrator-login-main/backend" "backend"

        # Frontend products
        deploy_product "traffic" "/var/www/traffic.onai.academy" "frontend"
        deploy_product "main" "/var/www/onai.academy" "frontend"
        deploy_product "tripwire" "/var/www/expresscourse.onai.academy" "frontend"

        echo -e "${GREEN}🎉 Полный деплой завершён!${NC}"
        ;;
    *)
        echo -e "${RED}❌ Неверный выбор${NC}"
        exit 1
        ;;
esac

echo ""
echo "🔍 Проверка деплоя..."
echo ""

# Health checks
echo "📊 Traffic Dashboard:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://traffic.onai.academy/ || echo "⚠️ Недоступен"

echo "🎓 Main Platform:"
curl -s -o /dev/null -w "HTTP %{http_code}\n" https://onai.academy/ || echo "⚠️ Недоступен"

echo "🔧 Backend API:"
curl -s https://api.onai.academy/api/health | head -1 || echo "⚠️ Недоступен"

echo ""
echo "🎉 Готово!"
