#!/bin/bash
# Скрипт для исправления Nginx конфигурации для SPA маршрутов

echo "🔧 Исправляем Nginx конфигурацию для SPA..."
echo ""

# Проверяем текущую конфигурацию
echo "📋 Текущая конфигурация:"
cat /etc/nginx/sites-available/onai-integrator-login.conf
echo ""
echo "---"
echo ""

# Создаем резервную копию
echo "💾 Создаем резервную копию..."
cp /etc/nginx/sites-available/onai-integrator-login.conf /etc/nginx/sites-available/onai-integrator-login.conf.backup
echo "✅ Backup создан: onai-integrator-login.conf.backup"
echo ""

# Создаем новую конфигурацию
echo "📝 Создаем новую конфигурацию с поддержкой SPA..."
cat > /etc/nginx/sites-available/onai-integrator-login.conf << 'EOF'
server {
    server_name integratoronai.kz www.integratoronai.kz;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    # ВАЖНО: эта строка обеспечивает работу React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кеширование статических файлов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/integratoronai.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/integratoronai.kz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name integratoronai.kz www.integratoronai.kz;
    return 301 https://$host$request_uri;
}
EOF

echo "✅ Новая конфигурация создана"
echo ""

# Проверяем конфигурацию
echo "🔍 Проверяем конфигурацию Nginx..."
if nginx -t; then
    echo ""
    echo "✅ Конфигурация корректна!"
    echo ""
    
    # Перезапускаем Nginx
    echo "🔄 Перезапускаем Nginx..."
    systemctl restart nginx
    
    if systemctl is-active --quiet nginx; then
        echo "✅ Nginx успешно перезапущен!"
        echo ""
        echo "🎉 ГОТОВО! Теперь страницы должны работать:"
        echo "   - https://integratoronai.kz/profile"
        echo "   - https://integratoronai.kz/welcome"
        echo "   - https://integratoronai.kz/admin/activity"
        echo ""
    else
        echo "❌ Ошибка при перезапуске Nginx"
        systemctl status nginx
    fi
else
    echo ""
    echo "❌ Ошибка в конфигурации Nginx!"
    echo "Восстанавливаем из backup..."
    cp /etc/nginx/sites-available/onai-integrator-login.conf.backup /etc/nginx/sites-available/onai-integrator-login.conf
    systemctl restart nginx
    echo "✅ Конфигурация восстановлена из backup"
fi
