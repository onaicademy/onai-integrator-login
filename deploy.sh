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

