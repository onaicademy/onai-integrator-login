#!/bin/bash
# 🚀 PRODUCTION DEPLOYMENT SCRIPT
# Используй вместо ручного git pull

set -e  # Exit on any error

echo "=========================================="
echo "🚀 DEPLOYING TO PRODUCTION"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code pulled${NC}"
echo ""

# 2. Install ROOT dependencies (frontend)
echo -e "${YELLOW}📦 Installing root dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Root dependencies installed${NC}"
echo ""

# 3. Install BACKEND dependencies
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd backend
npm install

# 4. Verify nodemon exists
if [ -f "node_modules/.bin/nodemon" ]; then
  echo -e "${GREEN}✅ nodemon found${NC}"
else
  echo -e "${RED}⚠️  nodemon not found, installing manually...${NC}"
  npm install nodemon --save-dev
fi

cd ..
echo ""

# 5. Restart PM2 backend
echo -e "${YELLOW}🔄 Restarting backend with PM2...${NC}"
pm2 restart onai-backend
sleep 5

# 6. Check status
echo ""
echo -e "${YELLOW}📊 Checking backend status...${NC}"
pm2 status onai-backend

# 7. Check if backend is actually running
BACKEND_STATUS=$(pm2 jlist | jq -r '.[0].pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$BACKEND_STATUS" == "online" ]; then
  echo ""
  echo "=========================================="
  echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL${NC}"
  echo "=========================================="
  echo ""
  echo "Backend is running!"
  echo "API URL: https://api.onai.academy"
  echo ""
  echo "Recent logs:"
  pm2 logs onai-backend --lines 10 --nostream | tail -5
else
  echo ""
  echo "=========================================="
  echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
  echo "=========================================="
  echo ""
  echo "Backend status: $BACKEND_STATUS"
  echo ""
  echo "Error logs:"
  pm2 logs onai-backend --err --lines 20 --nostream
  exit 1
fi
