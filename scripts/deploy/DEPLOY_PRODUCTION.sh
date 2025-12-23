#!/bin/bash
# Full Production Deployment Script

echo "🚀 Starting production deployment..."

# 1. Deploy Backend
echo "📦 Deploying backend files..."
cd /Users/miso/onai-integrator-login
rsync -avz --exclude='node_modules' --exclude='*.log' backend/src/ root@89.23.100.220:/root/onai-integrator-login/backend/src/

# 2. Restart Backend
echo "🔄 Restarting backend..."
ssh root@89.23.100.220 "cd /root/onai-integrator-login/backend && pm2 restart onai-backend"

# 3. Wait for restart
echo "⏳ Waiting for backend to restart..."
sleep 5

# 4. Test webhook health
echo "🧪 Testing webhook endpoint..."
curl -s https://api.onai.academy/api/amocrm/funnel-sale/health | jq '.'

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Apply migrations in Supabase Dashboard"
echo "2. Create test deal in AmoCRM"
echo "3. Verify data in dashboard"
