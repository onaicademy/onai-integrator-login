#!/bin/bash
# ============================================
# 🔬 VERIFY SYSTEM SCRIPT
# ============================================
# Post-deployment verification
# ============================================

echo ""
echo "============================================"
echo "🔬 POST-DEPLOYMENT VERIFICATION"
echo "============================================"
echo ""

# Git status
echo "📌 Git Status:"
echo "  Latest commit: $(git log --oneline -1)"
echo "  Uncommitted changes: $(git status --short | wc -l)"
echo ""

# Docker status
echo "🐳 Docker Containers:"
docker ps --format "  {{.Names}}: {{.Status}}"
echo ""

# Environment check
echo "📝 Environment:"
if [ -f .env.production ]; then
    echo "  .env.production: EXISTS"
elif [ -f .env ]; then
    echo "  .env: EXISTS"
else
    echo "  ❌ No env file found!"
fi
echo ""

# Port check
echo "🔌 Ports:"
for PORT in 80 81 3000 3001 3002; do
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "  Port $PORT: IN USE"
    else
        echo "  Port $PORT: FREE"
    fi
done
echo ""

# Health endpoints
echo "🏥 Health Endpoints:"
for PORT in 3000 3001 3002; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/health 2>/dev/null)
    echo "  Port $PORT: HTTP $STATUS"
done
echo ""

# Frontend check
echo "🌐 Frontend Check:"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)
echo "  Main frontend (80): HTTP $FRONTEND_STATUS"
TRAFFIC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:81 2>/dev/null)
echo "  Traffic frontend (81): HTTP $TRAFFIC_STATUS"
echo ""

# Code fixes verification
echo "🔧 Code Fixes:"
echo "  keepAlive in pool: $(grep -c "keepAlive" backend/src/config/supabase-direct-pool.ts 2>/dev/null || echo 0)"
echo "  Manifest in vite: $(grep -c "manifest: true" vite.config.ts 2>/dev/null || echo 0)"
echo "  Smart cache in nginx: $(grep -c "\[a-f0-9\]{8}" docker/nginx.conf 2>/dev/null || echo 0)"
echo ""

echo "============================================"
echo "✅ Verification Complete"
echo "============================================"
