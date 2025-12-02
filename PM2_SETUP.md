# 🔄 PM2 Auto-Start Setup for onAI Academy

## Server Configuration: 178.128.203.40

### Prerequisites
- SSH access to server
- Project cloned at `/var/www/onai-integrator-login`
- Nginx configured (serving static files from `/dist` OR proxying to PM2 on port 8080)

---

## 📝 Setup Steps

### Option 1: PM2 with Nginx (Static Files) - **RECOMMENDED**

This setup serves built static files via Nginx (no PM2 needed for serving).

**This is the standard production setup** - Nginx serves the built static files directly. No PM2 required for serving the app.

### Option 2: PM2 for Development Server

If you want to use PM2 to serve the Vite dev server (not recommended for production):

#### Step 1: SSH to Server
```bash
ssh root@178.128.203.40
```

#### Step 2: Navigate to Project
```bash
cd /var/www/onai-integrator-login
```

#### Step 3: Install PM2 Globally
```bash
npm install -g pm2
```

#### Step 4: Pull Latest Changes
```bash
git pull origin main
npm install
```

#### Step 5: Build Production
```bash
npm run build
```

#### Step 6: Start with PM2
```bash
pm2 start npm --name "onai-app" -- run serve
```

#### Step 7: Save PM2 Configuration
```bash
pm2 save
```

#### Step 8: Enable Auto-Start on Reboot
```bash
pm2 startup systemd -u root --hp /root
# Copy and run the command that PM2 outputs
```

#### Step 9: Check Status
```bash
pm2 list
pm2 logs onai-app
pm2 info onai-app
```

---

## ✅ Verification

### Check PM2 is Running
```bash
pm2 list
```

Expected output:
```
┌───────┬──────────┬────────┬─────┬────────┬────────┐
│ id    │ name     │ status │ cpu │ memory │ uptime │
├───────┼──────────┼────────┼─────┼────────┼────────┤
│ 0     │ onai-app │ online │ ... │ ...    │ ...    │
└───────┴──────────┴────────┴─────┴────────┴────────┘
```

### Test Reboot (Optional)
```bash
reboot
# Wait for server to restart, then SSH back in
ssh root@178.128.203.40
pm2 list  # Should show onai-app as online
```

---

## 🔧 PM2 Commands Reference

```bash
# View all processes
pm2 list

# View logs
pm2 logs onai-app

# Stop app
pm2 stop onai-app

# Restart app
pm2 restart onai-app

# Delete app from PM2
pm2 delete onai-app

# View detailed info
pm2 info onai-app

# Save current process list
pm2 save

# Reload app (zero downtime)
pm2 reload onai-app

# Monitor resources
pm2 monit
```

---

## 📊 Nginx Configuration for PM2

If using PM2 to serve on port 8080, configure Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name 178.128.203.40;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## ⚠️ Important Notes

1. **Recommended**: Use Nginx to serve static files from `/var/www/onai-integrator-login/dist` (no PM2 needed)
2. **PM2 is optional** - only use if you need the dev server running
3. **Production best practice**: Build static files once, serve with Nginx
4. **Environment variables**: Ensure `.env` exists before building

---

## 🐛 Troubleshooting

### PM2 process not starting
```bash
# Check logs
pm2 logs onai-app --lines 50

# Check if port 8080 is in use
netstat -tulpn | grep 8080

# Restart PM2
pm2 restart onai-app
```

### PM2 doesn't auto-start after reboot
```bash
# Re-run startup command
pm2 startup systemd -u root --hp /root

# Save processes
pm2 save

# Check systemd service
systemctl status pm2-root
```

### Check PM2 daemon
```bash
pm2 kill        # Kill PM2 daemon
pm2 resurrect   # Restore saved processes
pm2 list        # Check status
```

---

**✅ After successful setup:**
- PM2 will auto-start on server reboot
- App will be available at http://178.128.203.40
- Process status can be monitored with `pm2 list`

