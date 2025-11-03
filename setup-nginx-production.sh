#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="/var/www/onai-integrator-login"
DIST_DIR="$APP_ROOT/dist"
SITE_NAME="integratoronai.kz"
NGINX_AVAIL="/etc/nginx/sites-available/onai-integrator-login.conf"
NGINX_ENAB="/etc/nginx/sites-enabled/onai-integrator-login.conf"
CERT_DIR="/etc/letsencrypt/live/${SITE_NAME}"

echo "==> 0) Проверка наличия билда"
if [ ! -d "$DIST_DIR" ] || [ ! -f "$DIST_DIR/index.html" ]; then
  echo "  • Папки dist или index.html нет. Собираю проект…" >&2
  cd "$APP_ROOT"
  npm ci || npm i
  npm run build
fi

echo "==> 1) Отключаю дефолтный сервер Nginx (чтобы не конфликтовал)"
if [ -f /etc/nginx/sites-enabled/default ]; then
  rm -f /etc/nginx/sites-enabled/default
  echo "  • Убран /etc/nginx/sites-enabled/default"
fi

echo "==> 2) Бэкап текущего конфига (если есть)"
if [ -f "$NGINX_AVAIL" ]; then
  cp -f "$NGINX_AVAIL" "${NGINX_AVAIL}.$(date +%Y%m%d-%H%M%S).bak"
  echo "  • Бэкап: ${NGINX_AVAIL}.<timestamp>.bak"
fi

echo "==> 3) Генерирую корректный конфиг для SPA (try_files -> index.html)"
if [ -d "$CERT_DIR" ] && [ -f "$CERT_DIR/fullchain.pem" ] && [ -f "$CERT_DIR/privkey.pem" ]; then
  echo "  • Найдены сертификаты — настраиваю HTTPS + редирект с http -> https"
  cat > "$NGINX_AVAIL" <<'EOF'
server {
    listen 80;
    server_name integratoronai.kz www.integratoronai.kz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name integratoronai.kz www.integratoronai.kz;

    ssl_certificate     /etc/letsencrypt/live/integratoronai.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/integratoronai.kz/privkey.pem;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    # Ключевой блок для SPA
    location / {
        try_files $uri /index.html;
    }

    # Если когда-то проксируешь API — пример:
    # location /api/ {
    #     proxy_pass http://127.0.0.1:3000;
    # }

    # На случай 404 — тоже вернуть SPA
    error_page 404 /index.html;
}
EOF
else
  echo "  • Сертификатов нет — настраиваю только HTTP"
  cat > "$NGINX_AVAIL" <<'EOF'
server {
    listen 80;
    server_name integratoronai.kz www.integratoronai.kz;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    error_page 404 /index.html;
}
EOF
fi

ln -sf "$NGINX_AVAIL" "$NGINX_ENAB"

echo "==> 4) Проверка синтаксиса и рестарт Nginx"
nginx -t
systemctl restart nginx
sleep 1
systemctl status nginx --no-pager | sed -n '1,12p'

echo "==> 5) Быстрая проверка маршрутов (HTTP-коды)"
for path in "/" "/welcome" "/profile" "/neurohub" "/admin/activity" "/course/1"; do
  code=$(curl -sk -o /dev/null -w "%{http_code}" "https://${SITE_NAME}${path}")
  echo "  https://${SITE_NAME}${path}  ->  ${code}"
done

echo "==> 6) Если что-то пошло не так — последние строки из логов:"
echo "---- access.log (последние 20) ----"; tail -n 20 /var/log/nginx/access.log || true
echo "---- error.log  (последние 20) ----"; tail -n 20 /var/log/nginx/error.log  || true

echo "==> Готово. Если коды 200/304 — роутинг работает. Если 404 — пришли вывод логов выше."

