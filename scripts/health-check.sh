#!/bin/bash

# Health check script for monitoring

echo "🏥 Backend Health Check"
echo "======================="
echo ""

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status onai-backend

echo ""
echo "📝 Recent logs:"
pm2 logs onai-backend --lines 5 --nostream

echo ""
echo "🧪 API Health:"
curl -s https://api.onai.academy/api/health | jq '.' || echo "❌ API not responding"

echo ""
echo "💾 nodemon location:"
find /var/www/onai-integrator-login-main/backend -name "nodemon" -type f 2>/dev/null

echo ""
echo "✅ Health check complete"
