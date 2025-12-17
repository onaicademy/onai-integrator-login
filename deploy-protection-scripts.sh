#!/bin/bash

# 🛡️ DEPLOY ТОЛЬКО защиты от дубликатов на Digital Ocean
# НЕ трогает другой код, только добавляет скрипты

set -e

echo "=========================================="
echo "🛡️ DEPLOYING PROTECTION SCRIPTS ONLY"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Server config
SERVER="root@207.154.231.30"
PROJECT_PATH="/var/www/onai-integrator-login-main"
BACKEND_PATH="$PROJECT_PATH/backend"

echo -e "${YELLOW}📡 Connecting to Digital Ocean server...${NC}"
echo "Server: $SERVER"
echo ""

# 1. Test SSH connection
echo -e "${YELLOW}🔍 Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo 'SSH OK'" 2>/dev/null; then
    echo -e "${RED}❌ Cannot connect to server!${NC}"
    echo "Try: ssh $SERVER"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# 2. Pull latest code (includes our commit 7f60023)
echo -e "${YELLOW}📥 Pulling latest code (commit 7f60023)...${NC}"
ssh "$SERVER" << 'ENDSSH'
cd /var/www/onai-integrator-login-main
echo "Current commit:"
git log --oneline -1

echo ""
echo "Pulling latest..."
git fetch origin main
git pull origin main

echo ""
echo "New commit:"
git log --oneline -1
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# 3. Verify scripts are present
echo -e "${YELLOW}🔍 Verifying protection scripts...${NC}"
ssh "$SERVER" << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend

echo "Checking for scripts:"
if [ -f "scripts/start-clean.sh" ]; then
    echo "✅ start-clean.sh present"
    chmod +x scripts/start-clean.sh
else
    echo "❌ start-clean.sh MISSING!"
    exit 1
fi

if [ -f "scripts/check-duplicates.sh" ]; then
    echo "✅ check-duplicates.sh present"
    chmod +x scripts/check-duplicates.sh
else
    echo "❌ check-duplicates.sh MISSING!"
    exit 1
fi

echo ""
echo "Checking package.json:"
if grep -q "dev:clean" package.json; then
    echo "✅ npm run dev:clean command added"
else
    echo "❌ dev:clean NOT in package.json!"
    exit 1
fi

if grep -q "\"check\":" package.json; then
    echo "✅ npm run check command added"
else
    echo "❌ check NOT in package.json!"
    exit 1
fi
ENDSSH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Script verification failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Scripts verified and executable${NC}"
echo ""

# 4. Test scripts work
echo -e "${YELLOW}🧪 Testing scripts...${NC}"
ssh "$SERVER" << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend

echo "Testing npm run check:"
npm run check || true
ENDSSH
echo -e "${GREEN}✅ Scripts are functional${NC}"
echo ""

# 5. Check current server status (DON'T restart yet!)
echo -e "${YELLOW}📊 Checking current server status...${NC}"
ssh "$SERVER" << 'ENDSSH'
echo "Current processes:"
ps aux | grep "[n]ode.*server" | wc -l | xargs echo "Node processes:"

echo ""
echo "Port 3000 status:"
lsof -ti:3000 | wc -l | xargs echo "Processes on port 3000:"

echo ""
echo "PM2 status:"
pm2 jlist | jq -r '.[] | select(.name=="onai-backend") | "\(.name): \(.pm2_env.status)"' || echo "PM2 not running"
ENDSSH
echo ""

# 6. Ask for restart confirmation
echo "=========================================="
echo -e "${YELLOW}⚠️  IMPORTANT DECISION${NC}"
echo "=========================================="
echo ""
echo "Scripts are deployed but server is still running old way."
echo ""
echo -e "${GREEN}Option 1 (SAFE):${NC} Don't restart now"
echo "  - Telegram continues working"
echo "  - Use scripts next restart"
echo ""
echo -e "${YELLOW}Option 2 (RESTART):${NC} Restart with protection now"
echo "  - Immediate protection from duplicates"
echo "  - 5-10 second downtime"
echo ""
read -p "Restart server now? (y/N): " -n 1 -r
echo
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🔄 Restarting server with protection...${NC}"
    
    ssh "$SERVER" << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend

echo "Killing old processes..."
killall -9 node nodemon 2>/dev/null || true
sleep 3

echo ""
echo "Starting with protection (npm run dev:clean)..."
pm2 delete onai-backend 2>/dev/null || true
pm2 start npm --name onai-backend -- run dev:clean
pm2 save

echo ""
echo "Waiting 10 seconds for startup..."
sleep 10

echo ""
echo "Final check:"
npm run check
ENDSSH
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "=========================================="
        echo -e "${GREEN}✅ DEPLOYMENT + RESTART SUCCESSFUL${NC}"
        echo "=========================================="
    else
        echo ""
        echo -e "${RED}⚠️ Restart had issues, check manually${NC}"
        exit 1
    fi
else
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL (No restart)${NC}"
    echo "=========================================="
    echo ""
    echo "Scripts deployed, use them next time:"
    echo "  ssh $SERVER"
    echo "  cd /var/www/onai-integrator-login-main/backend"
    echo "  npm run dev:clean"
fi

echo ""
echo -e "${GREEN}🎉 Done! Protection scripts are on production!${NC}"
echo ""
echo "Next manual restart, use:"
echo "  npm run dev:clean"
echo ""





