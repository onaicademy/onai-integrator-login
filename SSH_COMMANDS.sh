#!/bin/bash

# 🚀 PRODUCTION BACKEND UPDATE SCRIPT
# Выполнить на production сервере

echo "🔧 Updating backend on production..."

# 1. Navigate to backend directory
cd /var/www/onai-integrator-login/backend || cd ~/onai-integrator-login/backend

# 2. Check current commit
echo "📋 Current commit:"
git log --oneline -1

# 3. Fetch and pull latest changes
echo "📥 Fetching latest changes from GitHub..."
git fetch origin
git pull origin main

# 4. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 5. Restart PM2
echo "🔄 Restarting PM2..."
pm2 restart all

# 6. Check PM2 status
echo "✅ PM2 Status:"
pm2 list

# 7. Check logs
echo "📋 Recent logs:"
pm2 logs --lines 20

echo "✅ Backend updated! Test at: https://api.onai.academy"


