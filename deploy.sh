#!/bin/bash

# 🚀 PRODUCTION DEPLOYMENT SCRIPT - Digital Ocean
# Usage: ./deploy.sh
# Based on: 🚀_DEPLOY_PRODUCTION_GUIDE.md

set -e

echo "🚀 Starting deployment to Digital Ocean..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 0. BACKUP (CRITICAL - guide line 195)
echo -e "${YELLOW}📦 Step 0: Creating backup...${NC}"
ssh root@onai.academy "tar -czf /root/backup-onai-academy-\$(date +%Y%m%d-%H%M).tar.gz /var/www/onai.academy/"
echo -e "${GREEN}✅ Backup created${NC}"

# 1. Push to GitHub
echo -e "${BLUE}📦 Step 1: Pushing to GitHub...${NC}"
git push origin main

# 2. Pull on server
echo -e "${BLUE}📥 Step 2: Pulling latest code on server...${NC}"
ssh root@onai.academy "cd /var/www/onai-integrator-login-main && git pull origin main"

# 3. Install backend dependencies
echo -e "${BLUE}📦 Step 3: Installing backend dependencies...${NC}"
ssh root@onai.academy "cd /var/www/onai-integrator-login-main/backend && npm install"

# 4. Build frontend locally
echo -e "${BLUE}🏗️  Step 4: Building frontend...${NC}"
rm -rf dist
npm run build

# 5. Sync dist with CORRECT permissions (guide line 147-158)
echo -e "${BLUE}🔄 Step 5: Syncing frontend files to server...${NC}"

# Sync to onai.academy (NGINX ROOT - primary location) with --chown
rsync -avz --delete \
  --chown=www-data:www-data \
  dist/ root@onai.academy:/var/www/onai.academy/

# Backup sync to onai-integrator-login-main/dist
rsync -avz --delete dist/ root@onai.academy:/var/www/onai-integrator-login-main/dist/

echo -e "${GREEN}✅ Files synced with correct permissions${NC}"

# 6. Fix permissions (guide line 251-253)
echo -e "${BLUE}🔐 Step 6: Fixing permissions...${NC}"
ssh root@onai.academy "chown -R www-data:www-data /var/www/onai.academy/ && chmod -R 755 /var/www/onai.academy/"
echo -e "${GREEN}✅ Permissions fixed${NC}"

# 7. Restart backend
echo -e "${BLUE}🔄 Step 7: Restarting backend...${NC}"
ssh root@onai.academy "pm2 restart onai-backend"

# 8. Restart Nginx (guide line 267)
echo -e "${BLUE}🔄 Step 8: Restarting Nginx...${NC}"
ssh root@onai.academy "systemctl restart nginx"

# 9. Wait for services
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 5

# 10. Verify deployment (guide line 512-542)
echo -e "${BLUE}🧪 Step 9: Verifying deployment...${NC}"

# Check file timestamp (guide line 273)
TIMESTAMP=$(ssh root@onai.academy "stat -c '%y' /var/www/onai.academy/index.html")
echo -e "${BLUE}📅 Timestamp: ${TIMESTAMP}${NC}"

# Check owner (guide line 256)
OWNER=$(ssh root@onai.academy "ls -la /var/www/onai.academy/ | head -3 | tail -1 | awk '{print \$3\":\"\$4}'")
if [ "$OWNER" = "www-data:www-data" ]; then
  echo -e "${GREEN}✅ Owner: www-data:www-data${NC}"
else
  echo -e "${RED}❌ Owner: ${OWNER} (should be www-data:www-data)${NC}"
fi

# Check backend
BACKEND_STATUS=$(ssh root@onai.academy "pm2 list | grep onai-backend | grep online" && echo "OK" || echo "FAIL")
if [ "$BACKEND_STATUS" = "OK" ]; then
  echo -e "${GREEN}✅ Backend: Online${NC}"
else
  echo -e "${RED}❌ Backend: Failed${NC}"
  exit 1
fi

# Check API
API_STATUS=$(curl -s https://onai.academy/api/traffic-dashboard/funnel | jq -r '.success' 2>/dev/null)
if [ "$API_STATUS" = "true" ]; then
  echo -e "${GREEN}✅ API: Working${NC}"
else
  echo -e "${RED}❌ API: Failed${NC}"
  exit 1
fi

# Check frontend (guide line 522)
FRONTEND_STATUS=$(curl -s https://onai.academy/ | grep "onAI Academy" && echo "OK" || echo "FAIL")
if [ "$FRONTEND_STATUS" = "OK" ]; then
  echo -e "${GREEN}✅ Frontend: Deployed${NC}"
else
  echo -e "${RED}❌ Frontend: Failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "🌐 URLs:"
echo "  - Main: https://onai.academy/"
echo "  - Traffic: https://onai.academy/traffic/login"
echo "  - API: https://onai.academy/api/traffic-dashboard/funnel"
echo ""
echo "📊 PM2 Status:"
ssh root@onai.academy "pm2 list | grep onai-backend"
echo ""
echo "📦 Last Backup:"
ssh root@onai.academy "ls -lht /root/backup-onai-academy-*.tar.gz | head -1"
echo ""
echo "🎯 Next: Test in browser (use Incognito mode + Hard Refresh: Cmd+Shift+R)"
