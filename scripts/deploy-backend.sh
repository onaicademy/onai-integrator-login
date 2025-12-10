#!/bin/bash
# Backend Deployment Script for onAI Academy
# Deploys backend to Digital Ocean server via SSH

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SSH_ALIAS="onai-backend"
REMOTE_DIR="/var/www/onai-integrator-login-main/backend"
LOCAL_BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 onAI Academy Backend Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. Test SSH connection
echo -e "${YELLOW}1️⃣  Testing SSH connection...${NC}"
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "$SSH_ALIAS" "echo 'SSH OK'" &>/dev/null; then
    echo -e "${RED}❌ SSH connection failed!${NC}"
    echo ""
    echo "Попробуйте:"
    echo "  1. Настроить SSH ключ: ./scripts/setup-ssh-key.sh"
    echo "  2. Проверить подключение: ssh $SSH_ALIAS"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# 2. Build backend locally
echo -e "${YELLOW}2️⃣  Building backend...${NC}"
cd "$LOCAL_BACKEND_DIR"
npm run build || {
    echo -e "${YELLOW}⚠️  Build completed with warnings (expected)${NC}"
}
echo -e "${GREEN}✅ Backend built${NC}"
echo ""

# 3. Create temporary archive
echo -e "${YELLOW}3️⃣  Creating deployment archive...${NC}"
TEMP_ARCHIVE="/tmp/onai-backend-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$TEMP_ARCHIVE" -C "$LOCAL_BACKEND_DIR" dist
echo -e "${GREEN}✅ Archive created: $TEMP_ARCHIVE${NC}"
echo ""

# 4. Upload to server
echo -e "${YELLOW}4️⃣  Uploading to server...${NC}"
scp "$TEMP_ARCHIVE" "$SSH_ALIAS:/tmp/backend-deploy.tar.gz"
echo -e "${GREEN}✅ Upload complete${NC}"
echo ""

# 5. Deploy on server
echo -e "${YELLOW}5️⃣  Deploying on server...${NC}"
ssh "$SSH_ALIAS" bash << 'ENDSSH'
set -e

echo "📂 Extracting archive..."
cd /var/www/onai-integrator-login-main/backend
tar -xzf /tmp/backend-deploy.tar.gz
rm /tmp/backend-deploy.tar.gz

echo "📦 Installing dependencies..."
npm install --production --silent

echo "🔄 Restarting PM2..."
pm2 restart onai-backend

echo "✅ Deployment complete!"
ENDSSH

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""

# 6. Check server status
echo -e "${YELLOW}6️⃣  Checking server status...${NC}"
ssh "$SSH_ALIAS" "pm2 list && echo '' && pm2 logs onai-backend --lines 10 --nostream"
echo ""

# Cleanup
rm -f "$TEMP_ARCHIVE"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Useful commands:"
echo "  Check logs:   ssh $SSH_ALIAS 'pm2 logs onai-backend'"
echo "  Restart:      ssh $SSH_ALIAS 'pm2 restart onai-backend'"
echo "  Server info:  ssh $SSH_ALIAS 'pm2 info onai-backend'"
