#!/bin/bash
# 🚀 Ручной деплой на production сервер
# Использование: ./manual-deploy.sh

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 РУЧНОЙ ДЕПЛОЙ НА PRODUCTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📍 Сервер:${NC} onai.academy (178.128.203.40)"
echo -e "${YELLOW}📂 Путь:${NC} /var/www/onai-integrator-login"
echo ""

# Подтверждение
read -p "❓ Продолжить деплой? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${RED}❌ Деплой отменен${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Запуск деплоя...${NC}"
echo ""

# Подключение к серверу и выполнение команд
ssh root@178.128.203.40 << 'ENDSSH'
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 Переход в папку проекта..."
cd /var/www/onai-integrator-login

echo ""
echo "📥 Получение последних изменений с GitHub..."
git pull origin main

echo ""
echo "📦 Установка зависимостей..."
npm install

echo ""
echo "🔨 Сборка production версии..."
npm run build

echo ""
echo "🔐 Установка прав доступа..."
chown -R www-data:www-data dist
chmod -R 755 dist

echo ""
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📍 Сайт доступен по адресу: https://onai.academy"
echo ""

ENDSSH

# Проверка успешности
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ДЕПЛОЙ УСПЕШНО ВЫПОЛНЕН НА СЕРВЕРЕ${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}📍 Проверьте сайт:${NC} https://onai.academy"
    echo ""
else
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}❌ ОШИБКА ПРИ ДЕПЛОЕ${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Проверьте логи выше для деталей"
    exit 1
fi

