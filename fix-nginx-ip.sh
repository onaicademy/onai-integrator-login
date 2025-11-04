#!/bin/bash
# Скрипт для настройки Nginx с IP адресом (без домена)
# Запускать на сервере

echo "🔧 Configuring Nginx for IP-based access (178.128.203.40)..."

cat > /etc/nginx/sites-available/onai-integrator-login.conf << 'EOF'
server {
    listen 80;
    server_name 178.128.203.40;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static files caching
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF

# Enable config
ln -sf /etc/nginx/sites-available/onai-integrator-login.conf /etc/nginx/sites-enabled/

# Test and reload
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Config valid, reloading Nginx..."
    systemctl reload nginx
    echo "✅ Done!"
    echo ""
    echo "Access your site at:"
    echo "  http://178.128.203.40/"
    echo "  http://178.128.203.40/welcome"
    echo "  http://178.128.203.40/profile"
    echo "  http://178.128.203.40/admin/activity"
else
    echo "❌ Nginx config error!"
    exit 1
fi
