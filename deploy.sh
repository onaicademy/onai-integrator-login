#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════
# onAI Platform - Universal Deploy Script
# ═══════════════════════════════════════════════════════════════════════════
# Usage: ./deploy.sh [frontend|backend|all]
#   frontend - Deploy only frontend to all 3 sites
#   backend  - Deploy only backend (git pull + pm2 restart)
#   all      - Full deployment (default)

set -e

SERVER="root@207.154.231.30"
SERVER_ALIAS="root@onai.academy"

# All 3 frontend directories
FRONTEND_DIRS=(
    "/var/www/onai.academy"
    "/var/www/traffic.onai.academy"
    "/var/www/onai-integrator-login-expresscourse"
)

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

MODE="${1:-all}"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║              onAI Platform - Deploy Script                       ║"
echo "║              Mode: ${MODE}                                            ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ═══════════════════════════════════════════════════════════════════════════
# FRONTEND DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════
deploy_frontend() {
    echo -e "${BLUE}🏗️  Building frontend...${NC}"
    rm -rf dist
    npm run build

    # Show BUILD_ID
    BUILD_ID=$(grep -o "BUILD_ID = '[^']*'" dist/index.html | head -1)
    echo -e "${GREEN}📦 Build ID: ${BUILD_ID}${NC}"
    echo ""

    echo -e "${BLUE}🚀 Deploying frontend to ALL sites...${NC}"
    echo ""

    for dir in "${FRONTEND_DIRS[@]}"; do
        echo -e "${YELLOW}→ Deploying to ${dir}${NC}"
        rsync -avz --delete dist/ "${SERVER}:${dir}/" --quiet
        echo -e "${GREEN}✓ Done${NC}"
    done

    echo ""
    echo -e "${BLUE}🔍 Verifying BUILD_ID on all sites...${NC}"
    echo ""

    for dir in "${FRONTEND_DIRS[@]}"; do
        REMOTE_BUILD=$(ssh ${SERVER} "grep -o \"BUILD_ID = '[^']*'\" ${dir}/index.html 2>/dev/null" || echo "ERROR")
        echo -e "${GREEN}✓ ${dir}${NC}"
        echo -e "  ${REMOTE_BUILD}"
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# BACKEND DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════
deploy_backend() {
    echo -e "${BLUE}📦 Pushing to GitHub...${NC}"
    git push origin main 2>/dev/null || echo "Nothing to push"

    echo -e "${BLUE}📥 Pulling latest code on server...${NC}"
    ssh ${SERVER} "cd /var/www/onai-integrator-login-main && git stash 2>/dev/null; git pull origin main; git stash pop 2>/dev/null || true"

    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    ssh ${SERVER} "cd /var/www/onai-integrator-login-main/backend && npm install --silent"

    echo -e "${BLUE}🔄 Restarting PM2 services...${NC}"
    ssh ${SERVER} "pm2 restart all"

    echo ""
    echo -e "${BLUE}📊 PM2 Status:${NC}"
    ssh ${SERVER} "pm2 list"
}

# ═══════════════════════════════════════════════════════════════════════════
# VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════
verify_deployment() {
    echo ""
    echo -e "${BLUE}🏥 Checking API health...${NC}"
    echo ""

    ENDPOINTS=(
        "https://api.onai.academy/api/health"
        "https://traffic.onai.academy/api/health"
        "https://expresscourse.onai.academy/api/health"
    )

    for endpoint in "${ENDPOINTS[@]}"; do
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" 2>/dev/null || echo "000")
        if [ "$STATUS" == "200" ]; then
            echo -e "${GREEN}✓ ${endpoint} - OK${NC}"
        else
            echo -e "${RED}✗ ${endpoint} - HTTP ${STATUS}${NC}"
        fi
    done
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════════════
case $MODE in
    frontend)
        deploy_frontend
        verify_deployment
        ;;
    backend)
        deploy_backend
        verify_deployment
        ;;
    all)
        deploy_backend
        deploy_frontend
        verify_deployment
        ;;
    *)
        echo "Usage: ./deploy.sh [frontend|backend|all]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    DEPLOY COMPLETED                              ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📋 Sites deployed:"
echo "   • https://onai.academy"
echo "   • https://traffic.onai.academy"
echo "   • https://expresscourse.onai.academy"
echo ""
echo -e "${YELLOW}💡 If browser shows old version, press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)${NC}"
