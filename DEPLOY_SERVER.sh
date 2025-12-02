#!/bin/bash
# Deployment script for DigitalOcean server

SERVER_IP="178.128.203.40"
SERVER_USER="root"
PROJECT_PATH="/var/www/onai-integrator-login"

echo "🚀 Deploying onAI Academy to $SERVER_IP"
echo ""

# Connect and deploy
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

echo "✅ Connected to server"
cd /var/www/onai-integrator-login

echo "📥 Pulling latest changes from GitHub..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building production version..."
npm run build

echo "🔐 Setting proper permissions..."
chown -R www-data:www-data /var/www/onai-integrator-login/dist
chmod -R 755 /var/www/onai-integrator-login/dist

echo "🔄 Restarting Nginx..."
systemctl restart nginx

echo "✅ Deployment complete!"
echo "📍 Site should be available at: http://178.128.203.40"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
VITE_SUPABASE_URL=https://capdjvokjdivxjfddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs
EOF
    echo "✅ .env file created"
    # Rebuild after creating .env
    npm run build
    chown -R www-data:www-data /var/www/onai-integrator-login/dist
    systemctl restart nginx
else
    echo "✅ .env file already exists"
fi

ENDSSH

echo ""
echo "✅ Deployment script completed!"

