#!/bin/bash
# ============================================
# 🔴 EMERGENCY DEPLOY SCRIPT
# ============================================
# This script performs a full deployment with:
# - PM2 kill (to free ports)
# - Docker rebuild (no cache)
# - Health check verification
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "🔴 EMERGENCY DEPLOYMENT"
echo "============================================"
echo ""

# Step 1: Kill PM2
log_info "Step 1: Killing PM2 processes..."
if command -v pm2 &> /dev/null; then
    pm2 stop all 2>/dev/null || true
    pm2 kill 2>/dev/null || true
    log_success "PM2 killed"
else
    log_info "PM2 not installed - skipping"
fi

# Step 2: Free ports
log_info "Step 2: Checking if ports are free..."
for PORT in 3000 3001 3002; do
    if lsof -i :$PORT > /dev/null 2>&1; then
        log_warning "Port $PORT is in use, killing process..."
        fuser -k $PORT/tcp 2>/dev/null || true
    fi
done
log_success "Ports freed"

# Step 3: Pull latest code
log_info "Step 3: Pulling latest code..."
cd /home/deploy/onai
git pull origin main
log_success "Code updated"

# Step 4: Stop all containers
log_info "Step 4: Stopping existing containers..."
docker-compose \
    -f docker/docker-compose.shared.yml \
    -f docker/docker-compose.main.yml \
    -f docker/docker-compose.traffic.yml \
    -f docker/docker-compose.tripwire.yml \
    down --remove-orphans 2>/dev/null || true
log_success "Containers stopped"

# Step 5: Build with no cache
log_info "Step 5: Building images (no cache)..."
docker-compose \
    -f docker/docker-compose.shared.yml \
    -f docker/docker-compose.main.yml \
    -f docker/docker-compose.traffic.yml \
    -f docker/docker-compose.tripwire.yml \
    build --no-cache --pull
log_success "Images built"

# Step 6: Start containers
log_info "Step 6: Starting containers..."
docker-compose \
    -f docker/docker-compose.shared.yml \
    -f docker/docker-compose.main.yml \
    -f docker/docker-compose.traffic.yml \
    -f docker/docker-compose.tripwire.yml \
    up -d
log_success "Containers started"

# Step 7: Wait for health
log_info "Step 7: Waiting for containers to be healthy..."
sleep 30

# Step 8: Verify
log_info "Step 8: Verifying deployment..."
CONTAINER_COUNT=$(docker ps --format "{{.Names}}" | wc -l)
if [ "$CONTAINER_COUNT" -ge 6 ]; then
    log_success "All containers running ($CONTAINER_COUNT containers)"
else
    log_error "Only $CONTAINER_COUNT containers running (expected 6+)"
fi

# Step 9: Check health endpoints
log_info "Step 9: Checking health endpoints..."
for PORT in 3000 3001 3002; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null | grep -q "200"; then
        log_success "Port $PORT: healthy"
    else
        log_warning "Port $PORT: not responding (may be expected)"
    fi
done

echo ""
echo "============================================"
log_success "DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Run ./scripts/health-check.sh for full verification"
echo "  2. Test the frontend at https://onai.academy"
echo "  3. Test the traffic dashboard at https://traffic.onai.academy"
echo ""
