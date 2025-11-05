#!/bin/bash

# 🔍 СКРИПТ ДЛЯ ДИАГНОСТИКИ СЕРВЕРА
# Запускается на ТВОЁМ Mac, подключается к серверу и проверяет всё

echo "======================================"
echo "🔍 ДИАГНОСТИКА СЕРВЕРА"
echo "======================================"
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="root@178.128.203.40"
PROJECT_PATH="/var/www/onai-integrator-login"

echo -e "${BLUE}Подключаюсь к серверу $SERVER...${NC}"
echo ""

# Выполняем все команды на сервере
ssh $SERVER << 'ENDSSH'
cd /var/www/onai-integrator-login

echo "======================================"
echo "1️⃣ GIT STATUS"
echo "======================================"
echo "Последний коммит:"
git log --oneline -1
echo ""
echo "Git status:"
git status --short
echo ""

echo "======================================"
echo "2️⃣ DIST FOLDER"
echo "======================================"
ls -lh dist/ 2>/dev/null | head -15 || echo "❌ Папка dist/ не найдена!"
echo ""

echo "======================================"
echo "3️⃣ NGINX STATUS"
echo "======================================"
systemctl status nginx | head -15
echo ""

echo "======================================"
echo "4️⃣ NGINX CONFIG TEST"
echo "======================================"
nginx -t
echo ""

echo "======================================"
echo "5️⃣ NGINX ERROR LOG (последние 20 строк)"
echo "======================================"
tail -20 /var/log/nginx/error.log
echo ""

echo "======================================"
echo "6️⃣ ПРОВЕРКА INDEX.HTML"
echo "======================================"
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html существует"
    echo "Размер: $(stat -c%s dist/index.html) байт"
    echo "Дата: $(stat -c%y dist/index.html)"
else
    echo "❌ dist/index.html НЕ НАЙДЕН!"
fi
echo ""

echo "======================================"
echo "7️⃣ ПРОВЕРКА HTTP LOCALHOST"
echo "======================================"
curl -I http://localhost/ 2>/dev/null | head -10
echo ""

echo "======================================"
echo "8️⃣ ПРОВЕРКА /admin/activity"
echo "======================================"
curl -I http://localhost/admin/activity 2>/dev/null | head -10
echo ""

echo "======================================"
echo "9️⃣ NODE_MODULES"
echo "======================================"
if [ -d "node_modules" ]; then
    echo "✅ node_modules существует"
    echo "Размер: $(du -sh node_modules | cut -f1)"
else
    echo "❌ node_modules НЕ НАЙДЕН!"
fi
echo ""

echo "======================================"
echo "🔟 PACKAGE.JSON"
echo "======================================"
if [ -f "package.json" ]; then
    echo "✅ package.json существует"
    echo "Имя проекта: $(grep '"name"' package.json | head -1)"
else
    echo "❌ package.json НЕ НАЙДЕН!"
fi
echo ""

echo "======================================"
echo "📊 ИТОГ"
echo "======================================"

ISSUES=0

# Проверка 1: Nginx работает
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx работает"
else
    echo "❌ Nginx НЕ работает"
    ((ISSUES++))
fi

# Проверка 2: dist существует
if [ -d "dist" ]; then
    echo "✅ dist/ существует"
else
    echo "❌ dist/ НЕ существует"
    ((ISSUES++))
fi

# Проверка 3: index.html существует
if [ -f "dist/index.html" ]; then
    echo "✅ dist/index.html существует"
else
    echo "❌ dist/index.html НЕ существует"
    ((ISSUES++))
fi

# Проверка 4: HTTP работает
if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
    echo "✅ HTTP localhost работает"
else
    echo "❌ HTTP localhost НЕ работает"
    ((ISSUES++))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo "🎉 ВСЁ РАБОТАЕТ!"
else
    echo "⚠️  НАЙДЕНО ПРОБЛЕМ: $ISSUES"
fi

echo ""
echo "======================================"
echo "Диагностика завершена"
echo "======================================"
ENDSSH

echo ""
echo -e "${GREEN}✅ Диагностика завершена!${NC}"
echo ""
echo "Скопируй весь вывод и покажи мне!"

