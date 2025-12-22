#!/bin/bash
# 🚀 Production Deployment Script
# For Digital Ocean server: 207.154.231.30

set -e  # Exit on error

echo ""
echo "🚀 ═══════════════════════════════════════════"
echo "   PRODUCTION DEPLOYMENT - OnAI Academy"
echo "═══════════════════════════════════════════"
echo ""

SERVER="root@207.154.231.30"
FRONTEND_PATH="/var/www/onai.academy"
BACKEND_PATH="/var/www/onai-integrator-login-main/backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ====================================
# STEP 1: Backup current version
# ====================================
echo "📦 Step 1/7: Creating backup..."
BACKUP_NAME="backup-onai-academy-$(date +%Y%m%d-%H%M).tar.gz"
ssh $SERVER "tar -czf /root/$BACKUP_NAME /var/www/onai.academy/ 2>/dev/null" || echo "⚠️ Backup warning (ignore)"
echo -e "${GREEN}✅ Backup created: $BACKUP_NAME${NC}"
echo ""

# ====================================
# STEP 2: Build Frontend
# ====================================
echo "🏗️  Step 2/7: Building frontend..."
rm -rf dist node_modules/.vite
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# ====================================
# STEP 3: Deploy Frontend
# ====================================
echo "📤 Step 3/7: Deploying frontend to $SERVER..."
rsync -avz --delete \
  --chown=www-data:www-data \
  dist/ \
  $SERVER:$FRONTEND_PATH/
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

# ====================================
# STEP 4: Update Backend Code
# ====================================
echo "🔄 Step 4/7: Updating backend code..."

# Copy new files (jobs, routes, services)
echo "  - Copying new jobs/dailyDebugReport.ts..."
scp backend/src/jobs/dailyDebugReport.ts $SERVER:$BACKEND_PATH/src/jobs/

echo "  - Updating error-reports.ts..."
scp backend/src/routes/error-reports.ts $SERVER:$BACKEND_PATH/src/routes/

echo "  - Updating errorTrackingService.ts..."
scp backend/src/services/errorTrackingService.ts $SERVER:$BACKEND_PATH/src/services/

echo "  - Updating server.ts..."
scp backend/src/server.ts $SERVER:$BACKEND_PATH/src/

echo -e "${GREEN}✅ Backend code updated${NC}"
echo ""

# ====================================
# STEP 5: Update Production ENV
# ====================================
echo "⚠️  Step 5/7: ENV variables update required"
echo ""
echo "${YELLOW}═══════════════════════════════════════════${NC}"
echo "${YELLOW}   MANUAL ACTION REQUIRED!${NC}"
echo "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
echo "SSH to server and add these variables to env.env:"
echo ""
echo -e "${YELLOW}ssh $SERVER${NC}"
echo -e "${YELLOW}cd $BACKEND_PATH${NC}"
echo -e "${YELLOW}nano env.env${NC}"
echo ""
echo "Add these lines:"
echo ""
cat << 'EOF'
# 🤖 Telegram Debugger Bot (@oapdbugger_bot)
TELEGRAM_ANALYTICS_BOT_TOKEN=8206369316:AAGX278b_TMrWSxjy6hJOzo2DacElC84HK8
TELEGRAM_ANALYTICS_CHAT_ID=789638302

# 📊 Traffic Analytics Bot (@analisistonaitrafic_bot)
TELEGRAM_TRAFFIC_ANALYTICS_BOT_TOKEN=8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4
TELEGRAM_TRAFFIC_ANALYTICS_CHAT_ID=-1002480099602

# 🐛 GROQ Debugger API
GROQ_DEBUGGER_API_KEY=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
EOF
echo ""
echo "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""
read -p "Press ENTER after you've updated env.env on server..."
echo ""

# ====================================
# STEP 6: Restart Backend
# ====================================
echo "♻️  Step 6/7: Restarting backend..."
ssh $SERVER "pm2 restart onai-backend"
sleep 3
ssh $SERVER "pm2 logs onai-backend --lines 20 --nostream"
echo -e "${GREEN}✅ Backend restarted${NC}"
echo ""

# ====================================
# STEP 7: Reload Nginx
# ====================================
echo "🌐 Step 7/7: Reloading Nginx..."
ssh $SERVER "systemctl reload nginx"
echo -e "${GREEN}✅ Nginx reloaded${NC}"
echo ""

# ====================================
# VERIFICATION
# ====================================
echo "🔍 Verification..."
echo ""

echo "📅 Frontend timestamp:"
ssh $SERVER "stat -c '%y' $FRONTEND_PATH/index.html"
echo ""

echo "👤 Frontend owner:"
ssh $SERVER "ls -la $FRONTEND_PATH/ | head -3"
echo ""

echo "⚙️  Backend status:"
ssh $SERVER "pm2 status | grep onai-backend"
echo ""

echo "🌍 HTTP status:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://onai.academy/)
if [ "$HTTP_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Status: $HTTP_STATUS (OK)${NC}"
else
  echo -e "${RED}❌ Status: $HTTP_STATUS (ERROR)${NC}"
fi
echo ""

echo "🧪 Test error reporting:"
TEST_RESPONSE=$(curl -s -X POST https://api.onai.academy/api/error-reports/test -H "Content-Type: application/json" -d '{}')
if echo "$TEST_RESPONSE" | grep -q "success.*true"; then
  echo -e "${GREEN}✅ Error reporting: Working${NC}"
else
  echo -e "${YELLOW}⚠️  Error reporting: Check manually${NC}"
  echo "   Response: $TEST_RESPONSE"
fi
echo ""

# ====================================
# SUCCESS
# ====================================
echo ""
echo "${GREEN}🎉 ═══════════════════════════════════════════${NC}"
echo "${GREEN}   DEPLOYMENT SUCCESSFUL!${NC}"
echo "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "📝 Next steps:"
echo "  1. Check https://onai.academy in Incognito mode"
echo "  2. Test error reporting (trigger any error)"
echo "  3. Wait for 23:00 Almaty for first debug report"
echo "  4. Monitor PM2 logs: pm2 logs onai-backend"
echo ""
echo "📋 Rollback (if needed):"
echo "  ssh $SERVER \"tar -xzf /root/$BACKUP_NAME -C /\""
echo ""
echo "✅ Deployment completed at $(date)"
echo ""
