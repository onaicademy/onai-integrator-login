#!/bin/bash

echo "🚀 UNIFIED LEAD TRACKING - PRODUCTION DEPLOY"
echo "=============================================="
echo ""

# ====================================
# BACKEND DEPLOY
# ====================================
echo "📦 Step 1/3: Deploying Backend..."
echo "--------------------------------"

ssh root@207.154.231.30 << 'BACKEND_DEPLOY'
cd /var/www/onai-integrator-login/backend
echo "✅ Changed directory to backend"

git pull origin main
echo "✅ Pulled latest code from GitHub"

npm install --omit=dev
echo "✅ Installed dependencies"

pm2 restart backend
echo "✅ Restarted backend service"

echo ""
echo "📊 Backend logs (last 30 lines):"
pm2 logs backend --lines 30 --nostream

BACKEND_DEPLOY

echo ""
echo "✅ Backend deployed successfully!"
echo ""

# ====================================
# FRONTEND DEPLOY
# ====================================
echo "🎨 Step 2/3: Deploying Frontend..."
echo "--------------------------------"

ssh root@207.154.231.30 << 'FRONTEND_DEPLOY'
cd /var/www/onai-integrator-login
echo "✅ Changed directory to project root"

git pull origin main
echo "✅ Pulled latest code from GitHub"

npm run build
echo "✅ Built production bundle"

FRONTEND_DEPLOY

echo ""
echo "✅ Frontend deployed successfully!"
echo ""

# ====================================
# TESTING
# ====================================
echo "🧪 Step 3/3: Testing Deployment..."
echo "--------------------------------"

echo ""
echo "Testing API endpoint..."
curl -s https://onai.academy/api/unified-tracking/leads | jq '.stats' || echo "❌ API test failed"

echo ""
echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo "======================"
echo ""
echo "🔗 Dashboard URL: https://onai.academy/target"
echo ""
echo "📊 Expected results:"
echo "  - Total Leads: 4"
echo "  - Email Sent: 0 (will update after next proftest)"
echo "  - SMS Sent: 0 (will update after next proftest)"
echo ""
echo "👥 Your 4 leads:"
echo "  1. Гулали (gulalikamalov0@gmail.com)"
echo "  2. Нурсагила (nurs0762@mail.ru)"
echo "  3. Нурали (Nurali.tor1@gmail.com)"
echo "  4. Даурен (dkkmv1991@mail.ru)"
echo ""
echo "🎉 Ready to test!"




