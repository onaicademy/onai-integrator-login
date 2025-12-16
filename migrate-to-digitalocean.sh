#!/bin/bash
#
# 🚀 АВТОМАТИЧЕСКАЯ МИГРАЦИЯ НА DIGITALOCEAN
# ==================================================
# Этот скрипт выполняет полную миграцию frontend + backend
# на DigitalOcean с профессиональной архитектурой
#

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="207.154.231.30"
SSH_USER="root"
FRONTEND_DIR="/var/www/onai-academy-frontend"
BACKEND_DIR="/var/www/onai-integrator-login-main/backend"

echo -e "${GREEN}🚀 ============================================${NC}"
echo -e "${GREEN}🚀 FULL MIGRATION TO DIGITALOCEAN${NC}"
echo -e "${GREEN}🚀 ============================================${NC}"
echo ""

# ==========================================
# PHASE 1: BUILD FRONTEND
# ==========================================
echo -e "${YELLOW}📦 PHASE 1/6: Building Frontend...${NC}"
export VITE_API_URL=https://api.onai.academy
npm run build
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

# ==========================================
# PHASE 2: PREPARE SERVER
# ==========================================
echo -e "${YELLOW}🔧 PHASE 2/6: Preparing DigitalOcean Server...${NC}"

echo "Creating directories on server..."
ssh ${SSH_USER}@${SERVER} << 'REMOTE_SCRIPT'
# Create frontend directory
mkdir -p /var/www/onai-academy-frontend

# Install Nginx and Certbot if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt update
    apt install -y nginx certbot python3-certbot-nginx
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo "✅ Server prepared"
REMOTE_SCRIPT

echo -e "${GREEN}✅ Server prepared${NC}"
echo ""

# ==========================================
# PHASE 3: UPLOAD FRONTEND
# ==========================================
echo -e "${YELLOW}📤 PHASE 3/6: Uploading Frontend...${NC}"
rsync -avz --delete ./dist/ ${SSH_USER}@${SERVER}:${FRONTEND_DIR}/
echo -e "${GREEN}✅ Frontend uploaded${NC}"
echo ""

# ==========================================
# PHASE 4: CONFIGURE NGINX
# ==========================================
echo -e "${YELLOW}⚙️  PHASE 4/6: Configuring Nginx...${NC}"

# Upload Nginx configuration
scp ./nginx-frontend.conf ${SSH_USER}@${SERVER}:/etc/nginx/sites-available/onai.academy

# Enable site
ssh ${SSH_USER}@${SERVER} << 'NGINX_CONFIG'
# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Enable onai.academy site
ln -sf /etc/nginx/sites-available/onai.academy /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t

# Reload Nginx
systemctl reload nginx

echo "✅ Nginx configured"
NGINX_CONFIG

echo -e "${GREEN}✅ Nginx configured${NC}"
echo ""

# ==========================================
# PHASE 5: SSL CERTIFICATES
# ==========================================
echo -e "${YELLOW}🔐 PHASE 5/6: Setting up SSL Certificates...${NC}"

ssh ${SSH_USER}@${SERVER} << 'SSL_SETUP'
# Check if certificate already exists
if [ ! -f /etc/letsencrypt/live/onai.academy/fullchain.pem ]; then
    echo "Obtaining SSL certificate..."
    certbot --nginx -d onai.academy -d www.onai.academy --non-interactive --agree-tos --email admin@onai.academy
else
    echo "SSL certificate already exists"
    certbot renew --dry-run
fi

echo "✅ SSL configured"
SSL_SETUP

echo -e "${GREEN}✅ SSL certificates configured${NC}"
echo ""

# ==========================================
# PHASE 6: VERIFY DEPLOYMENT
# ==========================================
echo -e "${YELLOW}🔍 PHASE 6/6: Verifying Deployment...${NC}"

# Test frontend
echo "Testing frontend..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://onai.academy)
if [ "$FRONTEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Frontend: https://onai.academy (Status: $FRONTEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Frontend: https://onai.academy (Status: $FRONTEND_STATUS)${NC}"
fi

# Test backend
echo "Testing backend..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.onai.academy/api/health)
if [ "$BACKEND_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend: https://api.onai.academy (Status: $BACKEND_STATUS)${NC}"
else
    echo -e "${RED}❌ Backend: https://api.onai.academy (Status: $BACKEND_STATUS)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 ============================================${NC}"
echo -e "${GREEN}🎉 MIGRATION COMPLETE!${NC}"
echo -e "${GREEN}🎉 ============================================${NC}"
echo ""
echo -e "📍 ${YELLOW}URLS:${NC}"
echo -e "   Frontend: ${GREEN}https://onai.academy${NC}"
echo -e "   Backend:  ${GREEN}https://api.onai.academy${NC}"
echo ""
echo -e "📊 ${YELLOW}NEXT STEPS:${NC}"
echo -e "   1. Update DNS to point to: ${SERVER}"
echo -e "   2. Disable Vercel deployment"
echo -e "   3. Monitor PM2: ${GREEN}ssh ${SSH_USER}@${SERVER} 'pm2 logs onai-backend'${NC}"
echo -e "   4. Setup PM2 startup: ${GREEN}ssh ${SSH_USER}@${SERVER} 'pm2 startup && pm2 save'${NC}"
echo ""
