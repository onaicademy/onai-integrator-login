#!/bin/bash

# 🚀 Production Deploy Script
# Дата: 23 декабря 2025

set -e

echo "════════════════════════════════════════════════════════════"
echo "🚀 PRODUCTION DEPLOY - FULL PACKAGE"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Git Pull
echo -e "${BLUE}[1/6]${NC} Git pull origin main..."
cd /var/www/onai-integrator-login
git pull origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Git pull successful${NC}"
else
    echo -e "${RED}❌ Git pull failed${NC}"
    exit 1
fi

echo ""

# 2. Check .env
echo -e "${BLUE}[2/6]${NC} Checking .env configuration..."

if grep -q "FACEBOOK_ADS_TOKEN=" /var/www/onai-integrator-login/backend/.env; then
    echo -e "${GREEN}✅ FACEBOOK_ADS_TOKEN found${NC}"
else
    echo -e "${YELLOW}⚠️  FACEBOOK_ADS_TOKEN not found in .env${NC}"
    echo "Please add manually:"
    echo "  nano /var/www/onai-integrator-login/backend/.env"
    echo "  Add: FACEBOOK_ADS_TOKEN=EAAQiCZBWgZAvcBO..."
fi

if grep -q "TRIPWIRE_SUPABASE_URL=" /var/www/onai-integrator-login/backend/.env; then
    echo -e "${GREEN}✅ TRIPWIRE_SUPABASE_URL found${NC}"
else
    echo -e "${RED}❌ TRIPWIRE_SUPABASE_URL not found${NC}"
fi

echo ""

# 3. PM2 Restart
echo -e "${BLUE}[3/6]${NC} Restarting backend with PM2..."
pm2 restart backend

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend restarted${NC}"
else
    echo -e "${RED}❌ PM2 restart failed${NC}"
    exit 1
fi

echo ""
sleep 5

# 4. Check Logs
echo -e "${BLUE}[4/6]${NC} Checking backend logs..."
pm2 logs backend --lines 30 --nostream | tail -20

echo ""

# 5. Test Funnel API
echo -e "${BLUE}[5/6]${NC} Testing Funnel API..."

FUNNEL_STAGES=$(curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq -r '.stages | length' 2>/dev/null)

if [ "$FUNNEL_STAGES" == "5" ]; then
    echo -e "${GREEN}✅ Funnel API: 5 stages (correct!)${NC}"
else
    echo -e "${YELLOW}⚠️  Funnel API: $FUNNEL_STAGES stages (expected 5)${NC}"
fi

EXPRESS_STUDENTS=$(curl -s https://api.onai.academy/api/traffic-dashboard/funnel | jq -r '.stages[3].metrics.express_students' 2>/dev/null)

if [ "$EXPRESS_STUDENTS" == "77" ]; then
    echo -e "${GREEN}✅ Express students: 77 (correct!)${NC}"
else
    echo -e "${YELLOW}⚠️  Express students: $EXPRESS_STUDENTS (expected 77)${NC}"
fi

echo ""

# 6. Summary
echo -e "${BLUE}[6/6]${NC} Deployment Summary"
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Git pull: SUCCESS${NC}"
echo -e "${GREEN}✅ PM2 restart: SUCCESS${NC}"
echo -e "${GREEN}✅ Backend: RUNNING${NC}"

if [ "$FUNNEL_STAGES" == "5" ] && [ "$EXPRESS_STUDENTS" == "77" ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${GREEN}🎉 DEPLOY SUCCESSFUL! ALL TESTS PASSED! 🔥${NC}"
    echo "════════════════════════════════════════════════════════════"
else
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo -e "${YELLOW}⚠️  DEPLOY COMPLETED WITH WARNINGS${NC}"
    echo "Check logs: pm2 logs backend"
    echo "════════════════════════════════════════════════════════════"
fi

echo ""
echo "Next steps:"
echo "1. Open https://onai.academy/traffic/cabinet/kenesary"
echo "2. Check funnel (should show 5 stages)"
echo "3. Check 77 students in Express Course"
echo "4. Load Facebook Ads data:"
echo "   POST /api/facebook-ads-loader/load-yesterday"
echo ""
