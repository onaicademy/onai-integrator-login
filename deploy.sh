#!/bin/bash

set -e

echo "🚀 Деплой на Digital Ocean..."

ssh root@178.128.203.40 << 'ENDSSH'
  cd /var/www/onai-integrator-login
  
  echo "📦 Git pull..."
  git pull origin main
  
  echo "📚 npm install..."
  npm install
  
  echo "🔨 npm build..."
  npm run build
  
  echo "🔄 pm2 restart..."
  pm2 restart onai-app
  
  echo "✅ Готово!"
ENDSSH

echo "🎉 Деплой завершён!"
echo "🌐 Проверь сайт: https://onai.academy"
