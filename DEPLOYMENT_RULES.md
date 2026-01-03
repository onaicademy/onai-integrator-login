# Deployment Rules - onAI Platform

## Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVER: 207.154.231.30                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FRONTENDS (все используют один и тот же исходный код dist/)                │
│  ════════════════════════════════════════════════════════════               │
│                                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────────┐               │
│  │   onai.academy          │  │   traffic.onai.academy      │               │
│  │   /var/www/onai.academy │  │   /var/www/traffic.onai.academy             │
│  │   Main Platform UI      │  │   Traffic Dashboard UI      │               │
│  └─────────────────────────┘  └─────────────────────────────┘               │
│                                                                             │
│  ┌─────────────────────────────────────────┐                                │
│  │   expresscourse.onai.academy            │                                │
│  │   /var/www/onai-integrator-login-expresscourse                           │
│  │   Tripwire Product UI                   │                                │
│  └─────────────────────────────────────────┘                                │
│                                                                             │
│  BACKENDS (PM2 Services)                                                    │
│  ════════════════════════                                                   │
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐           │
│  │ backend          │  │ traffic-backend  │  │ tripwire-backend │           │
│  │ Port: 3000       │  │ Port: 3001       │  │ Port: 3002       │           │
│  │ Main API         │  │ Traffic API      │  │ Tripwire API     │           │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Frontend Deployment Targets

| Domain | Server Directory | Description |
|--------|------------------|-------------|
| `onai.academy` | `/var/www/onai.academy` | Main Platform |
| `traffic.onai.academy` | `/var/www/traffic.onai.academy` | Traffic Dashboard |
| `expresscourse.onai.academy` | `/var/www/onai-integrator-login-expresscourse` | Tripwire Product |

## Quick Deploy Commands

### Full Frontend Deploy (All Sites)

```bash
# 1. Build frontend
npm run build

# 2. Deploy to ALL sites
rsync -avz --delete dist/ root@207.154.231.30:/var/www/onai.academy/
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/
rsync -avz --delete dist/ root@207.154.231.30:/var/www/onai-integrator-login-expresscourse/
```

### One-liner Deploy Script

```bash
npm run build && \
rsync -avz --delete dist/ root@207.154.231.30:/var/www/onai.academy/ && \
rsync -avz --delete dist/ root@207.154.231.30:/var/www/traffic.onai.academy/ && \
rsync -avz --delete dist/ root@207.154.231.30:/var/www/onai-integrator-login-expresscourse/
```

### Backend Deploy

```bash
# 1. Push code to GitHub
git add . && git commit -m "message" && git push origin main

# 2. SSH to server and pull
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git pull origin main"

# 3. Install dependencies (if changed)
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main/backend && npm install"

# 4. Restart PM2 services
ssh root@207.154.231.30 "pm2 restart all"
```

## BUILD_ID Management

### Location
The `BUILD_ID` is defined in `index.html` line ~29:
```javascript
const BUILD_ID = '20260103-1130-CHALLENGE3D';
```

### Format
```
YYYYMMDD-HHMM-DESCRIPTION
```

### Purpose
- Triggers automatic cache clear when new version is deployed
- Users see new build without manual cache clearing
- Console shows: `[CACHE CLEAR] New build detected: BUILD_ID`

### Update Process
1. Edit `index.html` - change BUILD_ID
2. Run `npm run build`
3. Deploy to all 3 directories
4. Commit change to git

## Verification Commands

### Check BUILD_ID on All Sites
```bash
ssh root@207.154.231.30 "for site in onai.academy traffic.onai.academy onai-integrator-login-expresscourse; do echo \"\$site:\"; grep -o \"BUILD_ID = '[^']*'\" /var/www/\$site/index.html; done"
```

### Check API Health
```bash
curl -s https://api.onai.academy/api/health
curl -s https://traffic.onai.academy/api/health
curl -s https://expresscourse.onai.academy/api/health
```

### Check PM2 Status
```bash
ssh root@207.154.231.30 "pm2 list"
```

## Environment Files

### Local Development (`.env.local`)
```env
VITE_API_URL=http://localhost:3001
```
**NEVER** change to production URL - used only for local dev.

### Production Build (`.env.production`)
```env
VITE_API_URL=https://api.onai.academy
```
Used automatically by `npm run build`.

### Backend Environment
Located at: `/var/www/onai-integrator-login-main/backend/.env`

## Nginx Configuration Files

| Site | Config Path |
|------|-------------|
| onai.academy | `/etc/nginx/sites-enabled/onai.academy` |
| traffic.onai.academy | `/etc/nginx/sites-enabled/traffic.onai.academy` |
| expresscourse.onai.academy | `/etc/nginx/sites-enabled/expresscourse.onai.academy` |
| API Backend | `/etc/nginx/sites-enabled/onai-backend` |

### Nginx Reload
```bash
ssh root@207.154.231.30 "nginx -t && systemctl reload nginx"
```

## API Routing

### onai.academy
- `/api/*` → `localhost:3000` (main backend)

### traffic.onai.academy
- `/api/*` → `localhost:3001` (traffic backend)

### expresscourse.onai.academy
- `/api/admin/tripwire/*` → `localhost:3000` (main backend - Sales Manager)
- `/api/tripwire/*` → `localhost:3002` (tripwire backend)
- `/api/*` → `localhost:3002` (tripwire backend)

## Troubleshooting

### Browser Shows Old Version
1. Check BUILD_ID on server matches latest
2. Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
3. If still old, check all 3 directories were updated

### API Returns 502/504
```bash
# Check if PM2 services are running
ssh root@207.154.231.30 "pm2 list"

# Restart all services
ssh root@207.154.231.30 "pm2 restart all"

# Check logs
ssh root@207.154.231.30 "pm2 logs --lines 50"
```

### AmoCRM 429 Rate Limit
- Ensure only ONE backend instance is running (local OR production)
- Kill local backend before production use: `pkill -f "tsx"`

## Pre-Deploy Checklist

- [ ] All changes committed to git
- [ ] BUILD_ID updated in `index.html`
- [ ] `npm run build` completed successfully
- [ ] rsync to ALL 3 frontend directories
- [ ] Verify BUILD_ID matches on all sites
- [ ] Test API health endpoints
- [ ] Hard refresh and verify in browser

## Git Workflow

```bash
# 1. Stage and commit
git add .
git commit -m "feat: Description of changes"

# 2. Push to GitHub
git push origin main

# 3. Pull on server (for backend)
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git stash && git pull origin main && git stash pop"
```

## Emergency Rollback

### Frontend Rollback
```bash
# Server keeps previous versions in git
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git log --oneline -5"
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git checkout <commit-hash> -- dist/"
# Then rsync dist to all 3 directories
```

### Backend Rollback
```bash
ssh root@207.154.231.30 "cd /var/www/onai-integrator-login-main && git revert HEAD && pm2 restart all"
```

---

**Last Updated:** 2026-01-03
**Build ID:** 20260103-1130-CHALLENGE3D
