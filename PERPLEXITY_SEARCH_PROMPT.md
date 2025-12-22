# 🔍 PERPLEXITY SEARCH PROMPT - Supabase PostgREST Schema Cache Issue

**Date:** December 22, 2025  
**Problem:** Supabase PostgREST не обновляет schema cache для новых RPC функций в локальной разработке  
**Status:** 🔴 CRITICAL - блокирует локальное тестирование

---

## 📋 PROBLEM DESCRIPTION

### **Main Issue:**
Supabase PostgREST (REST API layer) не видит новые PostgreSQL RPC функции в schema cache при локальной разработке через Node.js backend.

### **Error Message:**
```json
{
  "code": "PGRST202",
  "details": "Searched for the function public.get_targetologist_by_email with parameter p_email or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.",
  "hint": null,
  "message": "Could not find the function public.get_targetologist_by_email(p_email) in the schema cache"
}
```

### **Symptoms:**
- ✅ Функция **существует** в PostgreSQL (подтверждено прямыми SQL запросами)
- ✅ Функция **работает** при вызове через SQL напрямую
- ❌ Функция **не видна** для PostgREST API через `supabase.rpc()`
- ✅ На **production** (DigitalOcean) всё работает отлично
- ❌ На **localhost** (local development) постоянно получаем PGRST202

---

## 🛠️ TECHNICAL STACK

### **Environment:**
- **OS:** macOS (darwin 25.1.0)
- **Node.js:** v22+ (tsx loader)
- **Backend:** Express.js + TypeScript
- **Database:** Supabase PostgreSQL (Cloud)
- **ORM/Client:** @supabase/supabase-js v2.x
- **Development:** localhost:3000 (backend), localhost:8080 (frontend)
- **Production:** DigitalOcean (Nginx + PM2)

### **Supabase Configuration:**
```typescript
// backend/src/config/supabase-traffic.ts
import { createClient } from '@supabase/supabase-js';

const trafficUrl = process.env.TRAFFIC_SUPABASE_URL!;
const trafficServiceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY!;

export const trafficAdminSupabase = createClient(trafficUrl, trafficServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});
```

### **RPC Function (PostgreSQL):**
```sql
CREATE OR REPLACE FUNCTION get_targetologist_by_email(p_email text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  team text,
  role text,
  password_hash text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.email,
    t.full_name,
    t.team,
    t.role,
    t.password_hash,
    t.is_active,
    t.created_at,
    t.updated_at
  FROM traffic_targetologists t
  WHERE t.email = p_email AND t.is_active = true
  LIMIT 1;
END;
$$;
```

### **Backend Usage (Node.js):**
```typescript
// backend/src/routes/traffic-auth.ts
const { data: users, error } = await trafficAdminSupabase
  .rpc('get_targetologist_by_email', { 
    p_email: email.toLowerCase().trim() 
  });

// Returns PGRST202 error on localhost
// Works perfectly on production
```

---

## 🔍 WHAT WE'VE TRIED

### ✅ **1. Created RPC Function with SECURITY DEFINER:**
```sql
CREATE OR REPLACE FUNCTION get_targetologist_by_email(p_email text)
RETURNS TABLE (...)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```
**Result:** Function exists in DB, but PostgREST can't see it locally.

### ✅ **2. Tried Using Legacy Anon Key:**
Changed from new publishable key to legacy JWT:
```env
# OLD (publishable)
TRAFFIC_SUPABASE_ANON_KEY=sb_publishable_JW787-Fq3qFe70KJSfJmEw_bx5ncvUI

# NEW (legacy JWT)
TRAFFIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Result:** Still PGRST202 error.

### ✅ **3. Tried Direct Table Query (instead of RPC):**
```typescript
const { data: users, error } = await trafficAdminSupabase
  .from('traffic_targetologists')
  .select('*')
  .eq('email', email)
  .limit(1);
```
**Result:** PGRST205 error - "Could not find the table 'traffic_targetologists' in the schema cache"

### ✅ **4. Verified Function Exists:**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_targetologist_by_email';
-- Returns: get_targetologist_by_email ✅

SELECT * FROM get_targetologist_by_email('kenesary@onai.academy');
-- Returns: User data ✅
```

### ✅ **5. Restarted Backend Multiple Times:**
- Killed all Node.js processes
- Restarted with fresh `npm run dev`
- Cleared all caches
**Result:** Still PGRST202.

### ❌ **6. Attempted Direct PostgreSQL Connection:**
```typescript
import pg from 'pg';
const pgPool = new pg.Pool({
  connectionString: process.env.TRAFFIC_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
```
**Result:** "Tenant or user not found" error (incorrect connection string format).

---

## ✅ WHAT WORKS ON PRODUCTION

**On DigitalOcean (207.154.231.30):**
- ✅ Same RPC function works perfectly
- ✅ Login authentication works
- ✅ All database queries work
- ✅ No schema cache issues

**Why it works on production:**
- PostgREST schema cache is updated during deployment/restart
- Nginx proxies requests to backend
- PM2 manages Node.js process

---

## 🎯 WHAT WE NEED TO FIND

**Primary Question:**
> How to force Supabase PostgREST to refresh/reload its schema cache for newly created RPC functions and tables when developing locally with Node.js backend?

**Specific Solutions We're Looking For:**

1. **Supabase CLI command** to refresh schema cache locally
2. **PostgREST configuration** to disable schema caching in development
3. **Environment variable** to force schema reload on each request
4. **API endpoint** to trigger schema cache refresh programmatically
5. **Workaround** to use direct PostgreSQL connection without PostgREST layer
6. **Best practice** for local development with Supabase + custom RPC functions

---

## 🔗 SEARCH KEYWORDS

Please search on these platforms:
- ✅ **Supabase GitHub Issues** (github.com/supabase/supabase/issues)
- ✅ **PostgREST GitHub Issues** (github.com/PostgREST/postgrest/issues)
- ✅ **Supabase Discord/Community** discussions
- ✅ **Stack Overflow** (tags: supabase, postgrest, schema-cache)
- ✅ **Reddit** (r/supabase, r/PostgreSQL)
- ✅ **Supabase Documentation** (supabase.com/docs)

**Relevant Keywords:**
- `supabase postgrest schema cache`
- `postgrest PGRST202 error`
- `supabase rpc function not found`
- `postgrest refresh schema cache`
- `supabase local development rpc`
- `postgrest schema cache reload`
- `supabase-js rpc error PGRST202`

---

## 📊 ADDITIONAL CONTEXT

### **Database Structure:**
```
public.traffic_targetologists (table) ✅ EXISTS
├─ id (uuid)
├─ email (text)
├─ password_hash (text)
├─ team (text)
├─ role (text)
└─ is_active (boolean)

public.get_targetologist_by_email(text) (function) ✅ EXISTS
```

### **Expected Behavior:**
```typescript
// This should work locally (like it does on production)
const { data, error } = await supabase.rpc('get_targetologist_by_email', {
  p_email: 'user@example.com'
});

// Expected: { data: [{ id: '...', email: '...', ... }], error: null }
// Actual: { data: null, error: { code: 'PGRST202', message: '...' } }
```

### **Workaround (Production Only):**
Current temporary solution is to test on production, but this is not ideal for development workflow.

---

## 🎯 DESIRED OUTCOME

**Goal:**
Local development environment where:
1. ✅ Create new RPC functions in Supabase PostgreSQL
2. ✅ Immediately call them via `supabase.rpc()` in Node.js backend
3. ✅ No manual schema cache refresh needed
4. ✅ Same code works both locally and on production

**Acceptable Solutions:**
- CLI command to run after creating functions
- Environment variable to disable caching
- Direct PostgreSQL connection approach
- PostgREST configuration change
- Any reliable workaround that doesn't require deploying to test

---

## 📝 NOTES

- This is a **development blocker** - we can't test authentication locally
- Same exact code **works perfectly on production** (DigitalOcean)
- Problem is **specific to PostgREST schema cache** in local development
- We're using **Supabase Cloud** (not self-hosted)
- Backend runs on **localhost:3000**, frontend on **localhost:8080**

---

## 🚀 DELIVERABLES

Please provide:
1. **Root cause** explanation of why schema cache isn't updating
2. **Step-by-step solution** to fix it locally
3. **Code examples** if configuration changes needed
4. **CLI commands** if applicable
5. **Alternative approaches** if direct fix isn't possible
6. **Links to official documentation** or GitHub issues

---

**Priority:** 🔴 HIGH  
**Blocking:** Local development testing  
**Works on:** Production (DigitalOcean)  
**Fails on:** Localhost (macOS development)

---

## 💬 EXAMPLE SEARCH QUERIES FOR PERPLEXITY:

1. "Supabase PostgREST schema cache not updating for new RPC functions in local development"

2. "How to force PostgREST to reload schema cache after creating PostgreSQL functions"

3. "PGRST202 error: function not found in schema cache Supabase local development solution"

4. "Supabase RPC function works in production but not localhost schema cache issue"

5. "PostgREST schema cache refresh command for local development with Supabase"

---

**END OF PROMPT**

Copy this entire document and paste it into Perplexity Pro for comprehensive search across technical forums, GitHub issues, and documentation.
