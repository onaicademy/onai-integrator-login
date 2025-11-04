#!/usr/bin/env bash

set -euo pipefail

APP_DIR="/var/www/onai-integrator-login"
CONF_DIR="/etc/nginx/sites-available"
ENABLED_DIR="/etc/nginx/sites-enabled"
CONF_FILE="$CONF_DIR/onai-integrator-login.conf"

# 1) Убедимся, что билд на месте (если нет — просто предупредим)
if [ ! -d "$APP_DIR/dist" ]; then
  echo "⚠️  Внимание: $APP_DIR/dist не найден. Страницы отдаются как SPA, но билда нет. Продолжаю."
fi

# 2) Пишем корректный SPA-конфиг (idempotent)
cat > "$CONF_FILE" <<'NGINX'
server {
    listen 80;
    server_name integratoronai.kz www.integratoronai.kz;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    # Главный блок для SPA — ВСЕ пути идут в index.html, если файла нет
    location / {
        try_files $uri $uri/ /index.html;
    }

    # (опц.) Отдача статики с кэшом
    location ~* \.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        try_files $uri =404;
        access_log off;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
NGINX

# 3) Включаем сайт
ln -sfn "$CONF_FILE" "$ENABLED_DIR/onai-integrator-login.conf"

# 4) Проверяем синтаксис и перезапускаем
nginx -t
systemctl reload nginx

echo "✅ Nginx reloaded. Проверяю статусы роутов…"

# 5) Быстрый smoke-test роутов как у SPA
for p in / /profile /welcome /admin/activity /neurohub; do
  printf "\n---- GET https://integratoronai.kz%s ----\n" "$p"
  curl -I -sS https://integratoronai.kz"$p" | head -n1 || true
done

echo -e "\n🎯 Готово. Если где-то 404 — жми Ctrl+F5 в браузере (кэш) и проверь, что в $APP_DIR/dist есть сборка."
