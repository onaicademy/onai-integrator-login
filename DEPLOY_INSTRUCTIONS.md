# 🚀 Deployment Instructions for IP: 178.128.203.40

## First-time SSH Connection

If you're connecting for the first time, you'll need to accept the SSH host key:

```bash
ssh root@178.128.203.40
# Type "yes" when prompted about host key
```

---

## Manual Deployment Steps

### Step 1: SSH to Server
```bash
ssh root@178.128.203.40
```

### Step 2: Navigate to Project
```bash
cd /var/www/onai-integrator-login
```

### Step 3: Pull Latest Changes
```bash
git pull origin main
```

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Create/Check .env File
```bash
# Create .env if it doesn't exist
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://capdjvokjdivxjfddmx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcGRqdm9ramRpdnhqZmRkZG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNjc5MDUsImV4cCI6MjA3Nzc0MzkwNX0.bsikIoF86BjthWauzbLXq3SZbNQFodppZ2TC64NniJs
EOF
```

### Step 6: Build Production
```bash
npm run build
```

### Step 7: Set Permissions
```bash
chown -R www-data:www-data /var/www/onai-integrator-login/dist
chmod -R 755 /var/www/onai-integrator-login/dist
```

### Step 8: Restart Nginx
```bash
systemctl restart nginx
```

### Step 9: Verify Deployment
```bash
curl http://localhost
curl http://178.128.203.40
```

---

## Quick Deployment (After First Setup)

Save this as `deploy.sh` on the server:

```bash
#!/bin/bash
set -e

cd /var/www/onai-integrator-login

echo "📥 Pulling changes..."
git pull origin main

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building production..."
npm run build

echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/onai-integrator-login/dist
chmod -R 755 /var/www/onai-integrator-login/dist

echo "🔄 Restarting Nginx..."
systemctl restart nginx

echo "✅ Deployment complete!"
```

Make it executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Nginx Configuration

Check/create Nginx config at `/etc/nginx/sites-available/default`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 178.128.203.40;

    root /var/www/onai-integrator-login/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and test:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Verify Site is Working

```bash
# From your local machine
curl http://178.128.203.40

# Or open in browser
open http://178.128.203.40
```

---

## Troubleshooting

### Check Nginx logs
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### Check if dist folder exists
```bash
ls -la /var/www/onai-integrator-login/dist
```

### Check Nginx status
```bash
systemctl status nginx
```

### Restart Nginx
```bash
systemctl restart nginx
```

### Check build output
```bash
cd /var/www/onai-integrator-login
npm run build
```

---

**✅ After deployment, site will be accessible at: http://178.128.203.40**

