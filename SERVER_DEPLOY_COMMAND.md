# 🚀 SINGLE COMMAND DEPLOYMENT

## Step 1: Build Frontend Locally (Run this on your Mac)

```bash
cd /Users/miso/onai-integrator-login && VITE_API_URL=https://api.onai.academy npm run build && echo "✅ Frontend built successfully!"
```

## Step 2: Deploy on DigitalOcean Console

**Open DigitalOcean Console and run this SINGLE command:**

```bash
apt update && apt install -y nginx certbot python3-certbot-nginx rsync && mkdir -p /var/www/onai-academy-frontend && cat > /etc/nginx/sites-available/onai.academy << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name onai.academy www.onai.academy;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name onai.academy www.onai.academy;
    
    ssl_certificate /etc/letsencrypt/live/onai.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/onai.academy/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/onai-academy-frontend;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/javascript application/xml+rss application/json image/svg+xml;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # React Router - SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        return 200 "Frontend OK";
        add_header Content-Type text/plain;
        access_log off;
    }
}
NGINX_EOF
ln -sf /etc/nginx/sites-available/onai.academy /etc/nginx/sites-enabled/onai.academy && rm -f /etc/nginx/sites-enabled/default && nginx -t && systemctl enable nginx && systemctl restart nginx && certbot --nginx -d onai.academy -d www.onai.academy --non-interactive --agree-tos --email admin@onai.academy --redirect && systemctl restart nginx && echo "✅ Server configured! Now upload frontend files..."
```

## Step 3: Upload Frontend (Run this on your Mac)

```bash
rsync -avz --progress --delete /Users/miso/onai-integrator-login/dist/ root@207.154.231.30:/var/www/onai-academy-frontend/
```

## Step 4: Verify Deployment

```bash
curl -I https://onai.academy
curl https://api.onai.academy/api/health
```

## Expected Results:

✅ **Frontend:** `HTTP/2 200` from https://onai.academy  
✅ **Backend:** `{"status":"healthy"}` from https://api.onai.academy  
✅ **SSL:** Valid certificate from Let's Encrypt  
✅ **PM2:** Backend running with `pm2 status`

---

## Troubleshooting

If SSL fails, run separately in DigitalOcean console:
```bash
certbot --nginx -d onai.academy -d www.onai.academy --email admin@onai.academy
```

If Nginx fails to start:
```bash
nginx -t
systemctl status nginx
journalctl -u nginx -n 50
```

Check frontend files:
```bash
ls -lah /var/www/onai-academy-frontend/
```
