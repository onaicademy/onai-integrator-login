#!/bin/bash

# 🚀 БЕЗОПАСНОЕ ОБНОВЛЕНИЕ BACKEND НА PRODUCTION
# Эти команды предотвращают откаты и конфликты

set -e  # Остановить при ошибке

echo "🔧 Starting safe backend update..."

# 1. Перейти в backend директорию
cd /var/www/onai-integrator-login/backend || cd ~/onai-integrator-login/backend || {
    echo "❌ Backend directory not found!"
    exit 1
}

echo "📂 Current directory: $(pwd)"

# 2. Показать текущий commit
echo "📋 Current commit:"
git log --oneline -1

# 3. Сохранить локальные изменения (если есть)
echo "💾 Stashing local changes..."
git stash save "Auto-stash before update $(date)"

# 4. Fetch remote changes
echo "📥 Fetching from GitHub..."
git fetch origin

# 5. Hard reset to remote main (БЕЗ ОТКАТОВ!)
echo "🔄 Resetting to origin/main..."
git reset --hard origin/main

# 6. Показать новый commit
echo "✅ Updated to commit:"
git log --oneline -1

# 7. Установить/обновить зависимости
echo "📦 Installing dependencies..."
npm install --production

# 8. Проверить что критические файлы существуют
echo "🔍 Checking critical files..."
if [ -f "src/config/tripwire-db.ts" ]; then
    echo "  ✅ tripwire-db.ts exists"
else
    echo "  ❌ tripwire-db.ts MISSING!"
fi

if [ -f "src/routes/tripwire-lessons.ts" ]; then
    echo "  ✅ tripwire-lessons.ts exists"
else
    echo "  ❌ tripwire-lessons.ts MISSING!"
fi

# 9. Перезапустить PM2
echo "🔄 Restarting PM2..."
pm2 restart all

# 10. Подождать 3 секунды
sleep 3

# 11. Показать статус
echo "📊 PM2 Status:"
pm2 list

# 12. Показать последние логи
echo "📋 Recent logs:"
pm2 logs --lines 30 --nostream

echo ""
echo "✅ Backend update complete!"
echo "🔗 Test at: https://api.onai.academy/api/tripwire/stats"
echo ""
echo "🧪 Test completion button:"
echo "   1. Open: https://onai.academy/tripwire/lesson/67"
echo "   2. Skip to 80%"
echo "   3. Click 'ЗАВЕРШИТЬ УРОК'"
echo "   4. Should work without 500 error"























