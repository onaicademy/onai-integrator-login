#!/bin/bash
# Fix Admin Visibility Script
# Deploys the auth middleware fix to production

echo "🚀 Deploying auth middleware fix..."

# Copy the fixed middleware to server
scp /Users/miso/onai-integrator-login/backend/src/middleware/auth.ts onai-backend:/var/www/onai-integrator-login-main/backend/src/middleware/auth.ts

# Rebuild on server
ssh onai-backend << 'EOF'
cd /var/www/onai-integrator-login-main/backend
echo "📦 Building TypeScript..."
npx tsc --skipLibCheck 2>&1 | tail -10

echo "🔄 Restarting PM2..."
pm2 restart onai-backend

echo "✅ Done!"
EOF

echo "🎉 Deployment complete!"
