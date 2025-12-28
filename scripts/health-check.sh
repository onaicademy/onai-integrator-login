#!/bin/bash
# ============================================
# 🔍 HEALTH CHECK SCRIPT
# ============================================
# Comprehensive health check for all systems
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; ((PASS++)); }
check_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((FAIL++)); }
check_warn() { echo -e "${YELLOW}⚠️ WARN${NC}: $1"; ((WARN++)); }

echo ""
echo "============================================"
echo "🔍 SYSTEM HEALTH CHECK"
echo "============================================"
echo ""

# === GIT STATUS ===
echo -e "${BLUE}[1/10] GIT STATUS${NC}"
LATEST_COMMIT=$(git log --oneline -1 2>/dev/null)
if [ -n "$LATEST_COMMIT" ]; then
    check_pass "Latest commit: $LATEST_COMMIT"
else
    check_fail "Cannot read git log"
fi

# === PM2 STATUS ===
echo ""
echo -e "${BLUE}[2/10] PM2 STATUS${NC}"
if command -v pm2 &> /dev/null; then
    PM2_COUNT=$(pm2 list 2>&1 | grep -c "online" || echo "0")
    if [ "$PM2_COUNT" -eq 0 ]; then
        check_pass "PM2 not running (expected)"
    else
        check_fail "PM2 has $PM2_COUNT processes running (should be 0)"
    fi
else
    check_pass "PM2 not installed (OK for Docker-only setup)"
fi

# === DOCKER CONTAINERS ===
echo ""
echo -e "${BLUE}[3/10] DOCKER CONTAINERS${NC}"
CONTAINER_COUNT=$(docker ps --format "{{.Names}}" 2>/dev/null | wc -l)
if [ "$CONTAINER_COUNT" -ge 6 ]; then
    check_pass "$CONTAINER_COUNT containers running"
    docker ps --format "  - {{.Names}}: {{.Status}}" 2>/dev/null
else
    check_fail "Only $CONTAINER_COUNT containers running (expected 6+)"
fi

# === DOCKER IMAGES ===
echo ""
echo -e "${BLUE}[4/10] DOCKER IMAGES${NC}"
LATEST_IMAGE=$(docker images --format "{{.CreatedAt}}" 2>/dev/null | head -1)
if [ -n "$LATEST_IMAGE" ]; then
    check_pass "Latest image built: $LATEST_IMAGE"
else
    check_warn "Cannot read image dates"
fi

# === ENVIRONMENT FILE ===
echo ""
echo -e "${BLUE}[5/10] ENVIRONMENT FILE${NC}"
if [ -f .env.production ] || [ -f .env ]; then
    check_pass "Environment file exists"
else
    check_fail ".env.production or .env not found"
fi

# === REDIS ===
echo ""
echo -e "${BLUE}[6/10] REDIS${NC}"
REDIS_PING=$(docker exec -it shared-redis redis-cli ping 2>/dev/null | tr -d '\r')
if [ "$REDIS_PING" = "PONG" ]; then
    check_pass "Redis responding"
else
    check_fail "Redis not responding"
fi

# === BACKEND HEALTH ===
echo ""
echo -e "${BLUE}[7/10] BACKEND HEALTH${NC}"
for PORT in 3000 3001 3002; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null)
    if [ "$STATUS" = "200" ]; then
        check_pass "Port $PORT healthy (HTTP 200)"
    else
        check_warn "Port $PORT: $STATUS"
    fi
done

# === FRONTEND CACHE ===
echo ""
echo -e "${BLUE}[8/10] FRONTEND CACHE HEADERS${NC}"
CACHE_HEADER=$(curl -sI http://localhost:80 2>/dev/null | grep -i "Cache-Control" | head -1)
if echo "$CACHE_HEADER" | grep -q "no-cache"; then
    check_pass "HTML not cached (good)"
else
    check_warn "Cache header: $CACHE_HEADER"
fi

# === SUPABASE POOL CONFIG ===
echo ""
echo -e "${BLUE}[9/10] SUPABASE POOL CONFIG${NC}"
if grep -q "keepAlive" backend/src/config/supabase-direct-pool.ts 2>/dev/null; then
    check_pass "Pool has keepAlive configured"
else
    check_fail "Pool missing keepAlive"
fi

# === VITE MANIFEST ===
echo ""
echo -e "${BLUE}[10/10] VITE MANIFEST${NC}"
if grep -q "manifest: true" vite.config.ts 2>/dev/null; then
    check_pass "Vite manifest enabled"
else
    check_fail "Vite manifest not configured"
fi

# === SUMMARY ===
echo ""
echo "============================================"
echo "📊 SUMMARY"
echo "============================================"
echo -e "${GREEN}PASSED${NC}: $PASS"
echo -e "${RED}FAILED${NC}: $FAIL"
echo -e "${YELLOW}WARNINGS${NC}: $WARN"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CRITICAL CHECKS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ SOME CHECKS FAILED - REVIEW REQUIRED${NC}"
    exit 1
fi
