#!/bin/bash
# Скрипт для ручного исправления Nginx конфигурации
# Запускать на сервере: ssh root@178.128.203.40 'bash -s' < fix-nginx-manual.sh

echo "🔧 Fixing Nginx configuration for SPA routing..."

# Создаем правильную конфигурацию
cat > /etc/nginx/sites-available/onai-integrator-login.conf << 'EOF'
server {
    listen 80;
    server_name onai.academy www.onai.academy;

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

# Включаем конфиг
ln -sf /etc/nginx/sites-available/onai-integrator-login.conf /etc/nginx/sites-enabled/

# Проверяем синтаксис
echo "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx config is valid, reloading..."
    systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"

    # Тестируем маршруты
    echo ""
    echo "Testing routes..."
    for route in / /welcome /profile /admin/activity; do
        echo -n "Testing $route: "
        status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost$route)
        if [ "$status" = "200" ]; then
            echo "✅ $status"
        else
            echo "❌ $status"
        fi
    done
else
    echo "❌ Nginx config has errors!"
    exit 1
fi

echo ""
echo "🎉 Done! Try accessing:"
echo "   https://onai.academy/welcome"
echo "   https://onai.academy/admin/activity"
