# 🚀 Deployment Runbook - onAI Academy Platform

**Version:** 1.0
**Last Updated:** 2025-12-29
**Branch:** hotfix/federation-stabilize

---

## 🎯 OVERVIEW

This runbook provides step-by-step deployment procedures, environment variable management, verification checklists, and rollback steps for the onAI Academy platform.

---

## 📦 ENVIRONMENT VARIABLES

### Required for ALL containers

```bash
# Supabase Main (Auth Provider)
SUPABASE_URL=https://arqhkacellqbhjhbebfh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_JWT_SECRET=<jwt_secret>

# Supabase Tripwire
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=<service_role_key>
TRIPWIRE_JWT_SECRET=<jwt_secret>

# Supabase Landing
LANDING_SUPABASE_URL=https://xikaiavwqinamgolmtcy.supabase.co
LANDING_SUPABASE_SERVICE_KEY=<service_role_key>

# Supabase Traffic
TRAFFIC_SUPABASE_URL=https://oetodaexnjcunklkdlkv.supabase.co
TRAFFIC_SERVICE_ROLE_KEY=<service_role_key>

# Redis
REDIS_HOST=shared-redis
REDIS_PORT=6379

# External Services
TELEGRAM_LEADS_BOT_TOKEN=<bot_token>
AMOCRM_ACCESS_TOKEN=<access_token>
OPENAI_API_KEY=<api_key>
GROQ_API_KEY=<api_key>
```

### ⚠️ CRITICAL RULES

1. **NEVER** put `SERVICE_ROLE_KEY` in frontend env (`VITE_*`, `NEXT_PUBLIC_*`)
2. **ALWAYS** use `ANON_KEY` for frontend
3. **BACKEND ONLY**: SERVICE_ROLE_KEY for server-side queries

---

## 🐳 DEPLOYMENT STEPS

### Pre-Deployment Checklist

- [ ] Code merged to hotfix/federation-stabilize
- [ ] All tests passing locally
- [ ] Environment variables verified in `.env`
- [ ] Backup database (if schema changes)
- [ ] Notify team about deployment window

### Step 1: Pull Latest Code

```bash
ssh root@207.154.231.30
cd /var/www/onai-integrator-login-main
git fetch origin
git checkout hotfix/federation-stabilize
git pull origin hotfix/federation-stabilize
```

### Step 2: Clean Docker (ONE-TIME, if disk full)

```bash
# Check disk space
df -h /

# If >80% full:
docker compose down
docker system prune -a -f
docker volume prune -f  # ⚠️ ONLY if Redis data can be lost
```

### Step 3: Build New Images

```bash
# Build WITHOUT cache (ensures fresh code)
docker compose build --no-cache

# Verify images built
docker images | grep onai-integrator-login-main
```

### Step 4: Deploy (Rolling Update - Minimal Downtime)

```bash
# Option A: Rolling update (recommended, ~30s downtime)
docker compose up -d

# Option B: Full restart (if cache needs clearing)
docker compose down
docker compose up -d
```

### Step 5: Verify Deployment

```bash
# Check all containers running
docker compose ps

# Check logs
docker compose logs -f --tail=50 main-backend

# Test health endpoints
curl -I https://onai.academy/health
curl -I https://api.onai.academy/health
curl -I https://traffic.onai.academy/health
curl -I https://integrator.onai.academy/health
```

---

## ✅ VERIFICATION CHECKLIST

### System Health

```bash
# 1. All containers healthy
docker compose ps | grep healthy

# 2. Disk space OK
df -h / | grep -v "100%"

# 3. Redis responsive
docker exec onai-shared-redis redis-cli ping
# Expected: PONG

# 4. Nginx config valid
nginx -t
```

### Golden Flow A: Student Login

```bash
# Login
curl -X POST https://api.onai.academy/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@student.com","password":"test123"}'

# Expected: {"access_token":"...","user":{...}}

# Get profile (replace <TOKEN>)
curl https://api.onai.academy/api/profile \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"id":"...","email":"test@student.com",...}
```

###Golden Flow B: Sales Manager

```bash
# Login as manager
curl -X POST https://api.onai.academy/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@test.com","password":"test123"}'

# Get Tripwire stats
curl https://api.onai.academy/api/admin/tripwire/stats \
  -H "Authorization: Bearer <TOKEN>"

# Expected: {"totalUsers":92,"activeUsers":...}
```

### Golden Flow C: Landing Lead

```bash
# Submit lead
curl -X POST https://api.onai.academy/api/landing/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Lead",
    "email":"test@lead.com",
    "phone":"+77001234567",
    "source":"expresscourse",
    "paymentMethod":"kaspi"
  }'

# Expected: {"success":true,"leadId":"..."}

# Verify Telegram notification (manual check)
# Verify AmoCRM deal created (manual check in CRM)
```

---

## 🔄 ROLLBACK PROCEDURES

### Emergency Rollback (Complete Failure)

```bash
# 1. Switch to main branch
cd /var/www/onai-integrator-login-main
git checkout main

# 2. Rebuild from main
docker compose down
docker compose build --no-cache
docker compose up -d

# 3. Verify
docker compose ps
curl -I https://onai.academy
```

**Time:** ~10 minutes
**Downtime:** ~5 minutes

### Phase-Specific Rollbacks

#### Rollback PHASE 1 (Auth Client)

```bash
# Revert frontend changes
git revert <commit_hash>
docker compose build --no-cache main-frontend
docker compose up -d main-frontend
```

#### Rollback PHASE 2 (Tripwire Security)

```sql
-- Connect to Tripwire Supabase
-- Disable RLS (temporary, for emergency)
ALTER TABLE public.tripwire_users DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS users_read_own_profile ON public.tripwire_users;
```

**⚠️ Only use in absolute emergency!**

#### Rollback PHASE 3 (JWT Secret)

```bash
# Restore old JWT secret in Supabase Dashboard
# Regenerate anon/service keys with old secret
# Update .env with old keys
nano /var/www/onai-integrator-login-main/.env

# Restart backends
docker compose restart main-backend tripwire-backend traffic-backend
```

---

## 📊 MONITORING COMMANDS

### Real-time Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f main-backend

# Last 100 lines with timestamps
docker compose logs --tail=100 -t main-backend
```

### Resource Usage

```bash
# CPU/Memory per container
docker stats

# Disk usage
docker system df

# Network connections
netstat -tulpn | grep -E '(3000|3001|3002|6379)'
```

### Database Queries (Troubleshooting)

```sql
-- Check Tripwire RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'tripwire_users';

-- Check active policies
SELECT * FROM pg_policies
WHERE tablename = 'tripwire_users';

-- Count users
SELECT COUNT(*) FROM public.tripwire_users;
```

---

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue 1: "Container unhealthy"

**Symptom:**
```bash
$ docker compose ps
onai-main-backend   Up 5 minutes (unhealthy)
```

**Solution:**
```bash
# Check logs
docker compose logs --tail=50 main-backend

# Common causes:
# 1. Port already in use
lsof -i :3000

# 2. Environment variable missing
docker compose config | grep SUPABASE_URL

# 3. Dependency not ready (Redis)
docker compose logs shared-redis
```

### Issue 2: "No space left on device"

**Solution:**
```bash
# Clean Docker
docker system prune -a -f

# Clean logs
truncate -s 0 /var/log/nginx/*.log
journalctl --vacuum-time=7d

# If still full, increase disk size (DigitalOcean)
```

### Issue 3: "401 Unauthorized" on all requests

**Symptom:**
Frontend makes API calls, all return 401.

**Solution:**
```bash
# Check JWT secret matches between Main and secondary DBs
grep JWT_SECRET /var/www/onai-integrator-login-main/.env

# Check token expiry
# In browser console:
localStorage.getItem('supabase_token')
# Decode JWT at jwt.io - check exp field

# Force re-login
localStorage.clear()
# Refresh page
```

### Issue 4: "Multiple GoTrueClient instances" warning

**Solution:**
Already fixed in PHASE 1. If warning persists:
```javascript
// Check: Only ONE client has persistSession: true
// All others must have auth: { persistSession: false }
```

---

## 🔐 SECURITY CHECKLIST

Before going to production:

- [ ] All `SERVICE_ROLE_KEY` removed from frontend env
- [ ] RLS enabled on all user-facing tables
- [ ] Plaintext passwords removed/hashed
- [ ] CORS configured correctly (no wildcards in prod)
- [ ] SSL certificates valid
- [ ] Firewall rules applied (only 80/443 public)
- [ ] Redis password set (if exposed)
- [ ] Regular backups configured

---

## 📞 SUPPORT CONTACTS

- **Platform Issues:** support@onai.academy
- **Infrastructure:** devops@onai.academy
- **Security:** security@onai.academy

---

**Document Maintained By:** DevOps Team
**Review Frequency:** After each deployment
