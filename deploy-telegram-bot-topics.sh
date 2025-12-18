#!/bin/bash
set -e

echo "🚀 ДЕПЛОЙ: Telegram Bot Topics Support"
echo "======================================="
echo ""

# Check if already pushed
git push origin main 2>/dev/null || echo "✅ Already pushed to GitHub"

echo ""
echo "📡 Connecting to production server..."
echo ""

# Deploy to production
ssh root@164.90.164.107 << 'ENDSSH'
set -e

echo "📦 Pulling latest changes..."
cd /root/onai-integrator-login
git fetch origin
git reset --hard origin/main

echo ""
echo "📦 Installing dependencies..."
cd backend
npm install --production

echo ""
echo "🔄 Restarting backend..."
pm2 restart backend

echo ""
echo "📋 Backend status:"
pm2 status backend

echo ""
echo "📊 Recent logs:"
pm2 logs backend --lines 30 --nostream

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ГОТОВО! Telegram Bot Topics поддержка активирована"
echo ""
echo "📝 СЛЕДУЮЩИЕ ШАГИ:"
echo ""
echo "1. Открой группу 'Результаты трафика по командам'"
echo "2. Открой топик 'Отчеты' (или создай его)"
echo "3. Напиши в топике: /start"
echo "4. Напиши в топике: 2134"
echo "5. Бот подтвердит активацию ✅"
echo ""
echo "📊 Отчеты будут приходить:"
echo "   🌅 10:00 - Вчерашний отчет"
echo "   📊 16:00 - Текущий статус"
echo "   🌙 22:00 - Дневной отчет"
echo "   📅 Пн 10:00 - Недельный отчет"
echo ""
echo "📖 Полная инструкция: 🎯_TELEGRAM_BOT_TOPICS_ИНСТРУКЦИЯ.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
