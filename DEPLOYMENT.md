# 🚀 DigitalOcean Deployment Guide

## Production Deployment Steps

### Prerequisites
- DigitalOcean server with Nginx installed
- Domain configured: `onaiacademy.kz` pointing to server IP
- SSH access to server
- Project already cloned at `/var/www/onai-integrator-login`

---

## 📝 Deployment Commands

Execute these commands on your DigitalOcean server:

```bash
# 1. Navigate to project directory
cd /var/www/onai-integrator-login

# 2. Pull latest changes from GitHub
git pull origin main

# 3. Install dependencies
npm install

# 4. Build production version
npm run build

# 5. Set proper permissions
sudo chown -R www-data:www-data /var/www/onai-integrator-login/dist
sudo chmod -R 755 /var/www/onai-integrator-login/dist

# 6. Restart Nginx
sudo systemctl restart nginx

# 7. Verify deployment
curl http://localhost
```

---

## 🔧 Nginx Configuration

Create/edit: `/etc/nginx/sites-available/onaiacademy.kz`

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name onaiacademy.kz www.onaiacademy.kz;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Error pages
    error_page 404 /index.html;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/onaiacademy.kz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SSL/HTTPS Setup (Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d onaiacademy.kz -d www.onaiacademy.kz

# Auto-renewal (already configured by certbot)
```

---

## 🔑 Environment Variables

**IMPORTANT**: Create `.env` file on server with production values:

```bash
cd /var/www/onai-integrator-login
nano .env
```

Add:
```
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Rebuild after changing .env**:
```bash
npm run build
sudo systemctl restart nginx
```

---

## 🔄 Quick Deployment Script

Save this as `deploy.sh` in project root:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /var/www/onai-integrator-login

echo "📥 Pulling latest changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building production..."
npm run build

echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /var/www/onai-integrator-login/dist
sudo chmod -R 755 /var/www/onai-integrator-login/dist

echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ Deployment complete!"
echo "📍 Site: https://onaiacademy.kz"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run deployment:
```bash
./deploy.sh
```

---

## 🧪 Verification

After deployment:

1. **Check Nginx status**:
```bash
sudo systemctl status nginx
```

2. **Test locally**:
```bash
curl http://localhost
```

3. **Check domain**:
```bash
curl https://onaiacademy.kz
```

4. **View Nginx logs**:
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 🐛 Troubleshooting

### Build fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Nginx 502 error
```bash
# Check file permissions
sudo chown -R www-data:www-data /var/www/onai-integrator-login/dist

# Verify dist folder exists
ls -la /var/www/onai-integrator-login/dist
```

### Static assets not loading
```bash
# Check Nginx config syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Environment variables not working
- Rebuild after changing `.env`: `npm run build`
- Check that `.env` is in project root
- Verify variables start with `VITE_`

---

## 📊 Monitoring

```bash
# Check disk space
df -h

# Check Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Monitor system resources
htop

# Check Git status
cd /var/www/onai-integrator-login && git status
```

---

**✅ After successful deployment, site will be live at: https://onaiacademy.kz**

