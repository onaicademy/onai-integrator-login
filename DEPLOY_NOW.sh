#!/bin/bash
# 🚀 СРОЧНЫЙ ДЕПЛОЙ BACKEND FIX

set -e

echo "🚀 ДЕПЛОЙ BACKEND FIX НА PRODUCTION"
echo "=================================="

# Проверяем что на правильной ветке
if [ "$(git branch --show-current)" != "main" ]; then
  echo "❌ Не на ветке main!"
  exit 1
fi

# Проверяем что есть коммиты
if [ -z "$(git log origin/main..HEAD --oneline)" ]; then
  echo "✅ Все коммиты уже на origin/main"
else
  echo "📤 Пушим коммиты на GitHub..."
  git push origin main
fi

echo ""
echo "🔑 Подключаюсь к серверу..."
echo "=================================="

# SSH команды для деплоя
ssh root@164.90.164.107 << 'ENDSSH'
set -e

cd /root/onai-integrator-login

echo "📥 Пуллим изменения с GitHub..."
git fetch origin
git reset --hard origin/main

echo ""
echo "📦 Устанавливаем зависимости backend..."
cd backend
npm install

echo ""
echo "🔄 Перезапускаем backend через PM2..."
pm2 restart backend

echo ""
echo "✅ ДЕПЛОЙ ЗАВЕРШЕН!"
echo "=================================="
echo ""
echo "Проверяем статус PM2:"
pm2 status

echo ""
echo "Последние 20 строк логов:"
pm2 logs backend --lines 20 --nostream

ENDSSH

echo ""
echo "✅ ДЕПЛОЙ УСПЕШЕН!"
echo "=================================="
echo ""
echo "Проверь: https://onai.academy/integrator/admin/students"
echo ""


