#!/bin/bash

# 🚀 Скрипт автоматического деплоя на Digital Ocean
# Сервер: root@178.128.203.40
# Проект: /var/www/onai-integrator-login

set -e  # Остановка при ошибке

echo "🚀 Начинаем деплой на Digital Ocean..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Параметры сервера
SERVER="root@178.128.203.40"
PROJECT_PATH="/var/www/onai-integrator-login"

echo -e "${BLUE}📡 Подключение к серверу: ${SERVER}${NC}"
echo ""

# Выполняем команды на сервере
ssh -o StrictHostKeyChecking=no "$SERVER" << 'ENDSSH'
    set -e
    
    echo "📂 Переход в директорию проекта..."
    cd /var/www/onai-integrator-login || exit 1
    
    echo "🧹 Сброс локальных изменений..."
    git reset --hard HEAD
    git clean -fd
    
    echo "📥 Получение последних изменений из GitHub..."
    git fetch origin main
    
    echo "📊 Проверка изменений..."
    git log HEAD..origin/main --oneline
    
    echo "⬇️  Применение изменений (git pull)..."
    git pull origin main
    
    echo "📦 Установка/обновление зависимостей..."
    npm install --production=false
    
    echo "🏗️  Сборка production билда..."
    npm run build
    
    echo "🔧 Обновление Nginx конфигурации (с сохранением SSL)..."
    # Проверяем существует ли SSL сертификат
    if [ -f "/etc/letsencrypt/live/integratoronai.kz/fullchain.pem" ]; then
        echo "✅ SSL сертификат найден, создаём HTTPS конфигурацию..."
        cat > /etc/nginx/sites-available/onai-integrator-login.conf <<'NGINX_EOF'
# HTTP -> HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name integratoronai.kz www.integratoronai.kz;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name integratoronai.kz www.integratoronai.kz;

    ssl_certificate /etc/letsencrypt/live/integratoronai.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/integratoronai.kz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINX_EOF
    else
        echo "⚠️  SSL сертификат не найден, создаём HTTP конфигурацию..."
        cat > /etc/nginx/sites-available/onai-integrator-login.conf <<'NGINX_EOF'
server {
    listen 80;
    server_name integratoronai.kz www.integratoronai.kz;
    root /var/www/onai-integrator-login/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF
    fi
    
    ln -sf /etc/nginx/sites-available/onai-integrator-login.conf /etc/nginx/sites-enabled/
    
    echo "🔧 Проверка Nginx конфигурации..."
    nginx -t
    
    echo "🔄 Перезагрузка Nginx..."
    systemctl reload nginx
    
    echo "🔄 Перезапуск приложения через PM2..."
    pm2 restart onai-app || pm2 start npm --name "onai-app" -- run dev
    
    echo "💾 Сохранение конфигурации PM2..."
    pm2 save
    
    echo ""
    echo "✅ Деплой завершён успешно!"
    echo ""
    echo "🌐 Проверь сайт: https://integratoronai.kz"
    echo ""
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ДЕПЛОЙ УСПЕШНО ЗАВЕРШЁН! 🎉       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}🌐 Сайт доступен по адресу:${NC}"
    echo -e "   ${BLUE}https://integratoronai.kz${NC}"
    echo ""
else
    echo ""
    echo -e "${YELLOW}❌ Произошла ошибка при деплое!${NC}"
    echo -e "   Проверь логи выше для деталей."
    echo ""
    exit 1
fi

