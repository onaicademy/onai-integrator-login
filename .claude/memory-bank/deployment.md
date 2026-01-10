# Production Deployment Guide

## Overview

onAI Academy использует **multi-site deployment** стратегию:
- **Main Platform**: onai.academy (основная платформа обучения)
- **Traffic Dashboard**: traffic.onai.academy (дашборд таргетологов)
- **Tripwire Course**: expresscourse.onai.academy (вводный курс)

Все 3 сайта используют:
- **Один codebase** (monorepo)
- **Один backend** (api.onai.academy)
- **Разные frontend deployments** (разные домены)

---

## Pre-Deployment Checklist

### 1. Code Quality
```bash
# Backend TypeScript compilation
cd backend && npm run build

# Frontend build test
npm run build

# Verify no TypeScript errors
```

### 2. Update BUILD_ID
**CRITICAL**: Обновить BUILD_ID в `index.html` для cache busting

```javascript
// index.html
const BUILD_ID = 'YYYYMMDD-HHMM-DESCRIPTION';

// Example:
const BUILD_ID = '20260110-1500-ADMIN-PANEL-FIX';
```

**Формат BUILD_ID**:
- Date: `YYYYMMDD` (год-месяц-день)
- Time: `HHMM` (час-минута в 24h формате)
- Description: `UPPERCASE-WITH-DASHES` (краткое описание изменения)

### 3. Git Commit
**Структура коммита**:
```
type: Short description (50 chars max)

ПРОБЛЕМЫ:
1. Problem 1
2. Problem 2

ИСПРАВЛЕНИЯ:
1. Fix 1
2. Fix 2

ТЕХНИЧЕСКИЕ ДЕТАЛИ:
- File changes with explanation
- BUILD_ID = YYYYMMDD-HHMM-DESCRIPTION

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Commit types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `security`: Security fix
- `docs`: Documentation
- `chore`: Maintenance

**Example**:
```bash
git add -A
git commit -m "$(cat <<'EOF'
fix: Admin panel Students section - fix 401 errors and responseFilter issues

ПРОБЛЕМЫ:
1. Раздел "Студенты" выдавал 401 Unauthorized
2. ResponseFilter маскировал email/phone через DataMasker

ИСПРАВЛЕНИЯ:
1. ResponseFilter: убран DataMasker из response фильтрации
2. Создан proxy endpoint /api/admin/tripwire-students

ТЕХНИЧЕСКИЕ ДЕТАЛИ:
- backend/src/middleware/responseFilter.ts: removed dataMasker
- backend/src/routes/admin-tripwire-students.ts: new proxy
- BUILD_ID = 20260110-1500-ADMIN-PANEL-FIX

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

git push origin main
```

---

## Deployment Process

### Step 1: Backend Deployment

**На production сервере** (root@188.225.46.100):

```bash
# 1. Navigate to backend directory
cd /var/www/onai-integrator-login-main/backend

# 2. Pull latest changes
git pull origin main

# 3. Install dependencies (production only)
npm install --production

# 4. Build TypeScript
npm run build

# 5. Restart PM2 services with updated env
pm2 restart backend --update-env
pm2 restart traffic-backend --update-env
pm2 restart tripwire-backend --update-env

# 6. Verify services are online
pm2 status
```

**⚠️ IMPORTANT**: Всегда используй `--update-env` чтобы PM2 подхватил новые env переменные!

### Step 2: Frontend Deployment

**Option A: Deploy from local machine** (Recommended)

```bash
# From local machine
cd /Users/miso/onai-integrator-login

# Site 1: Main Platform (onai.academy)
rsync -av --delete dist/ root@188.225.46.100:/var/www/onai-integrator-login-main/dist/

# Site 2: Traffic Dashboard (traffic.onai.academy)
rsync -av --delete dist/ root@188.225.46.100:/var/www/traffic-onai-academy/dist/

# Site 3: Tripwire Course (expresscourse.onai.academy)
rsync -av --delete dist/ root@188.225.46.100:/var/www/expresscourse-onai-academy/dist/
```

**Option B: Build on server** (Fallback)

```bash
# On production server
cd /var/www/onai-integrator-login-main
git pull origin main
npm install
npm run build

# Then copy dist to all 3 sites
rsync -av --delete dist/ /var/www/onai-integrator-login-main/dist/
rsync -av --delete dist/ /var/www/traffic-onai-academy/dist/
rsync -av --delete dist/ /var/www/expresscourse-onai-academy/dist/
```

**⚠️ IMPORTANT**:
- `--delete` удаляет старые файлы (нужно для чистоты)
- Deploy на ВСЕ 3 сайта (не забывай ни один!)

### Step 3: Verification

**Check API Health**:
```bash
# API status
curl -s https://api.onai.academy/api/health | jq -r '.status'
# Expected: "healthy"

# OpenAI services
curl -s https://api.onai.academy/api/admin/openai-status/health | jq '.'
# Expected: { "status": "healthy", "circuitBreakers": {...} }

# PM2 processes
pm2 status
# All should be "online"
```

**Check Frontend**:
```bash
# Verify BUILD_ID in browser console (all 3 sites)
# Main: https://onai.academy
# Traffic: https://traffic.onai.academy
# Tripwire: https://expresscourse.onai.academy

# Open DevTools Console → should see:
# 🧹 [CACHE CLEAR] New build detected: 20260110-1500-ADMIN-PANEL-FIX
```

**Check Logs**:
```bash
# Backend logs (last 50 lines)
pm2 logs backend --lines 50 --nostream

# Check for errors
pm2 logs backend --err --lines 20
```

---

## Environment Variables Management

### Adding New Env Variables

**1. Update `.env` file на сервере**:
```bash
# On production server
cd /var/www/onai-integrator-login-main/backend
nano .env

# Add new variable
NEW_VAR=value
```

**2. Restart with --update-env**:
```bash
pm2 restart backend --update-env
pm2 restart traffic-backend --update-env
pm2 restart tripwire-backend --update-env
```

**⚠️ CRITICAL**: БЕЗ `--update-env` PM2 НЕ подхватит новые переменные!

### Required Environment Variables

**Backend** (`/var/www/onai-integrator-login-main/backend/.env`):
```bash
# Node Environment
NODE_ENV=production

# Main Platform Supabase
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Tripwire Supabase
SUPABASE_TRIPWIRE_URL=https://pjmvxecykysfrzppdcto.supabase.co
SUPABASE_TRIPWIRE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Traffic Dashboard Supabase
TRAFFIC_SUPABASE_URL=https://qxyzabcdef.supabase.co
TRAFFIC_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret
JWT_SECRET=zZqOGzfnGF0Z7C8ACPHOAVPwA2J4nlDxBG0kJC8yckzQBMT...

# OpenAI (4 separate API keys)
OPENAI_API_KEY_CURATOR=sk-proj-U5Wh...
OPENAI_API_KEY_MENTOR=sk-proj-voWp...
OPENAI_API_KEY_ANALYST=sk-proj-wHUz...
OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID=asst_7AfwAZqewBwuOGFQXqqKvQb0

# AmoCRM
AMOCRM_CLIENT_ID=...
AMOCRM_CLIENT_SECRET=...
AMOCRM_ACCESS_TOKEN=...
AMOCRM_REFRESH_TOKEN=...
```

---

## Rollback Procedure

### If deployment fails:

**1. Rollback code**:
```bash
# Check last working commit
git log --oneline -5

# Rollback to previous commit
git revert HEAD

# Or reset to specific commit (DANGEROUS!)
git reset --hard <commit-hash>
git push --force origin main
```

**2. Rebuild and restart**:
```bash
cd /var/www/onai-integrator-login-main/backend
git pull origin main
npm run build
pm2 restart all --update-env
```

**3. Redeploy frontend**:
```bash
# From local machine with old dist/
rsync -av --delete dist/ root@188.225.46.100:/var/www/onai-integrator-login-main/dist/
rsync -av --delete dist/ root@188.225.46.100:/var/www/traffic-onai-academy/dist/
rsync -av --delete dist/ root@188.225.46.100:/var/www/expresscourse-onai-academy/dist/
```

---

## Common Issues

### Issue: PM2 not picking up new env vars

**Solution**:
```bash
pm2 restart backend --update-env
# NOT just: pm2 restart backend
```

### Issue: Frontend cache not clearing

**Solution**:
1. Verify BUILD_ID updated in index.html
2. Clear browser cache manually
3. Check Network tab → Disable cache

### Issue: 401 errors after deployment

**Solution**:
1. Check JWT_SECRET configured
2. Verify Supabase keys are correct
3. Check auth middleware in backend logs

### Issue: TypeScript compilation errors

**Solution**:
```bash
# Check errors
cd backend && npm run build

# Fix type errors
# Then rebuild
```

---

## Deployment Automation Script

**Create deployment script** (`deploy.sh`):

```bash
#!/bin/bash
set -e

echo "🚀 onAI Academy Production Deployment"
echo "======================================"

# Verify we're on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Error: Not on main branch (current: $BRANCH)"
  exit 1
fi

# Verify no uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: Uncommitted changes detected"
  git status -s
  exit 1
fi

# Build frontend locally
echo "📦 Building frontend..."
npm run build

# Git push (already committed)
echo "📤 Pushing to GitHub..."
git push origin main

# Backend deployment (on server)
echo "🔧 Deploying backend..."
ssh root@188.225.46.100 << 'ENDSSH'
cd /var/www/onai-integrator-login-main/backend
git pull origin main
npm install --production
npm run build
pm2 restart backend --update-env
pm2 restart traffic-backend --update-env
pm2 restart tripwire-backend --update-env
ENDSSH

# Frontend deployment
echo "🎨 Deploying frontend to all 3 sites..."
rsync -av --delete dist/ root@188.225.46.100:/var/www/onai-integrator-login-main/dist/
rsync -av --delete dist/ root@188.225.46.100:/var/www/traffic-onai-academy/dist/
rsync -av --delete dist/ root@188.225.46.100:/var/www/expresscourse-onai-academy/dist/

# Verify
echo "✅ Checking deployment..."
curl -s https://api.onai.academy/api/health | jq -r '.status'

echo "✅ Deployment complete!"
```

**Usage**:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## Best Practices

### 1. Always Test Before Deploy
- ✅ `npm run build` backend
- ✅ `npm run build` frontend
- ✅ Check TypeScript errors
- ✅ Test locally if possible

### 2. Update BUILD_ID Every Time
- ✅ Format: `YYYYMMDD-HHMM-DESCRIPTION`
- ✅ Prevents cache issues
- ✅ Helps track deployments

### 3. Deploy All 3 Sites
- ✅ onai.academy
- ✅ traffic.onai.academy
- ✅ expresscourse.onai.academy

### 4. Use --update-env for PM2
- ✅ `pm2 restart backend --update-env`
- ❌ NOT just `pm2 restart backend`

### 5. Verify After Deploy
- ✅ Check health endpoints
- ✅ Check PM2 status
- ✅ Check logs for errors
- ✅ Test critical features

### 6. Git Commit Best Practices
- ✅ Detailed commit message with ПРОБЛЕМЫ/ИСПРАВЛЕНИЯ
- ✅ Include BUILD_ID in commit
- ✅ Co-Authored-By: Claude
- ✅ Push to main immediately after commit

---

## Production Servers

### Main Server
- **Host**: 188.225.46.100
- **User**: root
- **Backend Path**: `/var/www/onai-integrator-login-main/backend`
- **Frontend Paths**:
  - Main: `/var/www/onai-integrator-login-main/dist`
  - Traffic: `/var/www/traffic-onai-academy/dist`
  - Tripwire: `/var/www/expresscourse-onai-academy/dist`

### PM2 Processes
- `backend` - Main Platform Backend (Port 3001)
- `traffic-backend` - Traffic Dashboard Backend (Port 3002)
- `tripwire-backend` - Tripwire Course Backend (Port 3003)

### Domains
- Main API: https://api.onai.academy
- Main Frontend: https://onai.academy
- Traffic: https://traffic.onai.academy
- Tripwire: https://expresscourse.onai.academy

---

## Security Notes

### Never Commit Secrets
- ❌ `.env` files
- ❌ API keys
- ❌ Passwords
- ❌ JWT secrets
- ❌ Database credentials

### Production Logging
- ✅ Use SecureLogger (NOT console.log)
- ✅ DataMasker for sensitive data
- ✅ No secrets in logs
- ✅ No full request/response bodies

### Environment Variables
- ✅ Always set `NODE_ENV=production`
- ✅ Use strong JWT_SECRET
- ✅ Rotate API keys regularly
- ✅ Keep `.env` file secure (600 permissions)
