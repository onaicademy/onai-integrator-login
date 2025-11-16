#!/bin/bash

# 🚀 DEPLOY BACKEND НА DIGITALOCEAN
# Сервер: 207.154.231.30
# User: root
# Путь: /var/www/onai-integrator-login-main/backend

echo "🚀 Starting Backend Deploy..."
echo ""

ssh root@207.154.231.30 << 'EOF'
echo "📦 Pulling latest changes from GitHub..."
cd /var/www/onai-integrator-login-main
git pull origin main

echo ""
echo "📦 Installing dependencies..."
cd backend
npm install --production

echo ""
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🔄 Restarting PM2 process..."
pm2 restart onai-backend

echo ""
echo "📋 Recent logs:"
pm2 logs onai-backend --lines 20

echo ""
echo "✅ Backend deployed!"
EOF

echo ""
echo "🔍 Testing API..."
sleep 3
curl https://api.onai.academy/api/health

echo ""
echo ""
echo "✅ Deploy completed!"

