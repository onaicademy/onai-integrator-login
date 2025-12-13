#!/bin/bash

# 🚀 PRODUCTION DEPLOYMENT SCRIPT - FIXED VERSION
# This script ensures nodemon is always installed in the correct location

set -e  # Exit on any error

echo "=========================================="
echo "🚀 DEPLOYING TO PRODUCTION"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="/var/www/onai-integrator-login-main"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Ensure we're in the right directory
cd "$PROJECT_ROOT" || exit 1

# 1. PULL LATEST CODE
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git fetch origin main
git reset --hard origin/main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# 2. CLEAN OLD NODE_MODULES (if needed)
echo -e "${YELLOW}🧹 Cleaning old dependencies...${NC}"
if [ -d "$BACKEND_DIR/node_modules" ]; then
  # Check if nodemon exists
  if [ ! -f "$BACKEND_DIR/node_modules/.bin/nodemon" ]; then
    echo -e "${RED}⚠️ nodemon missing, cleaning node_modules...${NC}"
    rm -rf "$BACKEND_DIR/node_modules"
  fi
fi
echo ""

# 3. INSTALL ROOT DEPENDENCIES (Frontend)
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
npm install --legacy-peer-deps
echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
echo ""

# 4. INSTALL BACKEND DEPENDENCIES (CRITICAL)
echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
cd "$BACKEND_DIR"

# Use --legacy-peer-deps to avoid conflicts
npm install --legacy-peer-deps

# CRITICAL: Verify nodemon exists
if [ ! -f "node_modules/.bin/nodemon" ]; then
  echo -e "${RED}❌ nodemon still missing after npm install!${NC}"
  echo -e "${YELLOW}🔧 Installing nodemon manually...${NC}"
  npm install nodemon@^3.1.11 tsx@^4.7.0 --save-dev --legacy-peer-deps
  
  # Double-check
  if [ ! -f "node_modules/.bin/nodemon" ]; then
    echo -e "${RED}❌ CRITICAL ERROR: Cannot install nodemon${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Backend dependencies installed${NC}"
echo -e "${GREEN}✅ nodemon verified at: $BACKEND_DIR/node_modules/.bin/nodemon${NC}"
cd "$PROJECT_ROOT"
echo ""

# 5. UPDATE PM2 ECOSYSTEM CONFIG
echo -e "${YELLOW}🔧 Updating PM2 configuration...${NC}"
if pm2 describe onai-backend &>/dev/null; then
  # Backend is running, delete it
  pm2 delete onai-backend
fi

# Start with ecosystem config (correct cwd)
pm2 start ecosystem.config.cjs
pm2 save
echo -e "${GREEN}✅ PM2 configured and started${NC}"
echo ""

# 6. WAIT FOR BACKEND TO START
echo -e "${YELLOW}⏳ Waiting for backend to start (10 seconds)...${NC}"
sleep 10

# 7. CHECK BACKEND STATUS
echo -e "${YELLOW}📊 Checking backend status...${NC}"
BACKEND_STATUS=$(pm2 jlist | jq -r '.[] | select(.name=="onai-backend") | .pm2_env.status' 2>/dev/null || echo "unknown")

if [ "$BACKEND_STATUS" == "online" ]; then
  echo ""
  echo "=========================================="
  echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL${NC}"
  echo "=========================================="
  echo ""
  echo -e "${GREEN}Backend Status: ${BACKEND_STATUS}${NC}"
  echo "API URL: https://api.onai.academy"
  echo ""
  echo -e "${BLUE}Recent logs:${NC}"
  pm2 logs onai-backend --lines 10 --nostream | tail -5
  
  # Test API endpoint
  echo ""
  echo -e "${YELLOW}🧪 Testing API endpoint...${NC}"
  if curl -s -f https://api.onai.academy/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API is responding${NC}"
  else
    echo -e "${RED}⚠️ API not responding yet (may take a minute)${NC}"
  fi
  
else
  echo ""
  echo "=========================================="
  echo -e "${RED}❌ DEPLOYMENT FAILED${NC}"
  echo "=========================================="
  echo ""
  echo -e "${RED}Backend Status: ${BACKEND_STATUS}${NC}"
  echo ""
  echo -e "${RED}Error logs (last 30 lines):${NC}"
  pm2 logs onai-backend --err --lines 30 --nostream
  echo ""
  echo -e "${YELLOW}💡 Try running manually:${NC}"
  echo "   cd $BACKEND_DIR"
  echo "   npm run dev"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
