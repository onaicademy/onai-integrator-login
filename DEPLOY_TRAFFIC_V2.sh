#!/bin/bash

# 🚀 TRAFFIC DASHBOARD V2 - DEPLOY SCRIPT
# Дата: 19 декабря 2025

set -e  # Exit on error

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 TRAFFIC DASHBOARD V2 - DEPLOY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Build frontend
echo "📦 Step 1: Building frontend..."
npm run build
echo "✅ Build complete!"
echo ""

# Step 2: Create archive
echo "📦 Step 2: Creating archive..."
tar -czf traffic-v2-deploy.tar.gz dist/
echo "✅ Archive created: traffic-v2-deploy.tar.gz"
echo ""

# Step 3: Upload to server
echo "📤 Step 3: Uploading to server..."
scp traffic-v2-deploy.tar.gz root@207.154.231.30:/tmp/
echo "✅ Upload complete!"
echo ""

# Step 4: Deploy on server
echo "🚀 Step 4: Deploying on server..."
ssh root@207.154.231.30 << 'ENDSSH'
  set -e
  
  echo "🗑️  Removing old frontend..."
  cd /var/www/onai-integrator-login-main
  rm -rf dist/*
  
  echo "📦 Extracting new frontend..."
  tar -xzf /tmp/traffic-v2-deploy.tar.gz -C dist/ --strip-components=1
  
  echo "🔒 Setting permissions..."
  chown -R www-data:www-data dist
  chmod -R 755 dist
  
  echo "🔄 Reloading Nginx..."
  systemctl reload nginx
  
  echo "✅ Deploy complete on server!"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOY SUCCESSFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 URL: https://traffic.onai.academy"
echo "📝 Не забудь:"
echo "   1. Очистить кеш браузера (Cmd+Shift+R / Ctrl+Shift+R)"
echo "   2. Протестировать все функции"
echo "   3. Отправить инструкции таргетологам"
echo ""
echo "📄 Инструкции:"
echo "   - TRAFFIC_TARGETOLOGIST_INSTRUCTION.md"
echo "   - TRAFFIC_ADMIN_CREDENTIALS.md"
echo ""
