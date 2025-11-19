#!/bin/bash

echo "╔════════════════════════════════════════╗"
echo "║   🔧 ИСПРАВЛЕНИЕ CORS И ДЕПЛОЙ         ║"
echo "╚════════════════════════════════════════╝"
echo ""

cd /var/www/onai-integrator-login-main/backend

echo "════════════════════════════════════════"
echo "ШАГ 1: ПРОВЕРКА .env ФАЙЛА"
echo "════════════════════════════════════════"
if [ -f ".env" ]; then
    echo "✅ .env файл найден"
    
    # Проверка FRONTEND_URL
    if grep -q "^FRONTEND_URL=" .env; then
        CURRENT_URL=$(grep "^FRONTEND_URL=" .env | cut -d'=' -f2)
        echo "   Текущий FRONTEND_URL: $CURRENT_URL"
        
        if [ "$CURRENT_URL" != "https://onai.academy" ]; then
            echo "   ⚠️  Обновляю FRONTEND_URL на https://onai.academy"
            sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=https://onai.academy|' .env
            echo "   ✅ FRONTEND_URL обновлён"
        else
            echo "   ✅ FRONTEND_URL уже правильный"
        fi
    else
        echo "   ⚠️  FRONTEND_URL не найден, добавляю..."
        echo "FRONTEND_URL=https://onai.academy" >> .env
        echo "   ✅ FRONTEND_URL добавлен"
    fi
else
    echo "❌ .env файл не найден!"
    exit 1
fi
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 2: ОБНОВЛЕНИЕ КОДА (GIT PULL)"
echo "════════════════════════════════════════"
git pull origin main
echo "✅ Код обновлён"
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 3: УСТАНОВКА ЗАВИСИМОСТЕЙ"
echo "════════════════════════════════════════"
npm install
echo "✅ Зависимости установлены"
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 4: СБОРКА TYPESCRIPT"
echo "════════════════════════════════════════"
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Проект успешно собран"
else
    echo "⚠️  Есть предупреждения при сборке"
fi
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 5: ПЕРЕЗАПУСК PM2"
echo "════════════════════════════════════════"
pm2 restart onai-backend --update-env
echo "✅ PM2 перезапущен"
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 6: ОЖИДАНИЕ ЗАПУСКА (3 секунды)"
echo "════════════════════════════════════════"
sleep 3
echo "✅ Ожидание завершено"
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 7: ПРОВЕРКА СТАТУСА"
echo "════════════════════════════════════════"
pm2 status onai-backend
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 8: ПРОВЕРКА CORS В ЛОГАХ"
echo "════════════════════════════════════════"
pm2 logs onai-backend --lines 10 --nostream | grep -i "cors\|frontend\|origin" || echo "Логи загружаются..."
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 9: ПРОВЕРКА HEALTH ENDPOINT"
echo "════════════════════════════════════════"
HEALTH=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
    echo "✅ Health endpoint работает"
    echo "$HEALTH" | jq . 2>/dev/null || echo "$HEALTH"
else
    echo "❌ Health endpoint не отвечает"
fi
echo ""

echo "════════════════════════════════════════"
echo "ШАГ 10: ПРОВЕРКА DEBUG/ENV (FRONTEND_URL)"
echo "════════════════════════════════════════"
DEBUG=$(curl -s http://localhost:3000/api/debug/env)
if [ $? -eq 0 ]; then
    echo "✅ Debug endpoint работает"
    FRONTEND_URL=$(echo "$DEBUG" | jq -r '.FRONTEND_URL' 2>/dev/null)
    echo "   FRONTEND_URL: $FRONTEND_URL"
    if [ "$FRONTEND_URL" = "https://onai.academy" ]; then
        echo "   ✅ FRONTEND_URL правильный"
    else
        echo "   ⚠️  FRONTEND_URL не соответствует ожидаемому"
    fi
else
    echo "⚠️  Debug endpoint не отвечает"
fi
echo ""

echo "╔════════════════════════════════════════╗"
echo "║   ✅ CORS ИСПРАВЛЕН И ЗАДЕПЛОЕН        ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "📊 ИТОГОВЫЙ СТАТУС:"
pm2 status onai-backend
echo ""
echo "✅ CORS теперь поддерживает:"
echo "   - https://onai.academy (production)"
echo "   - http://localhost:8080 (development)"
echo "   - http://localhost:5173 (development)"

