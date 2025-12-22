# 🔧 TECHNICAL ISSUE REPORT - Supabase Schema Cache

**Date:** December 22, 2025  
**Status:** 🔴 BLOCKING LOCAL DEVELOPMENT  
**Severity:** HIGH  
**Impact:** Cannot test Traffic Dashboard authentication locally

---

## 📋 EXECUTIVE SUMMARY

**Problem:**
Supabase PostgREST не обновляет schema cache для новых RPC функций при локальной разработке через Node.js backend, что делает невозможным тестирование authentication flow на localhost.

**Status:**
- ✅ **Production:** Полностью работает (DigitalOcean)
- ❌ **Localhost:** PGRST202 error - функция не найдена в schema cache

**Impact:**
Разработчики не могут тестировать изменения локально и вынуждены деплоить на production для каждого теста.

---

## 🎯 CURRENT SITUATION

### ✅ What Works:
1. Multi-page onboarding deployed to production ✅
2. Authentication works on production (207.154.231.30) ✅
3. All 8 users created with correct passwords ✅
4. RPC function exists in database and works via direct SQL ✅
5. Frontend code works correctly ✅

### ❌ What Doesn't Work:
1. Same authentication fails on localhost with PGRST202 ❌
2. PostgREST can't see RPC function in schema cache ❌
3. Direct table queries also fail with PGRST205 ❌
4. Multiple restarts don't help ❌

---

## 🔍 ROOT CAUSE ANALYSIS

### **Problem Type:**
Supabase PostgREST Schema Cache Issue

### **Technical Details:**
PostgREST (REST API layer над PostgreSQL) кэширует database schema при старте и не обновляет его автоматически при изменениях схемы (новые таблицы, функции, views).

### **Why It Happens:**
1. **Performance optimization:** PostgREST кэширует schema для быстрого доступа
2. **Local development:** В локальной разработке нет механизма обновления cache
3. **Production difference:** На production cache обновляется при deploy/restart

### **Error Code:**
```
PGRST202: Could not find the function in the schema cache
```

---

## 📊 IMPACT ASSESSMENT

### **Development Impact:**
- 🔴 **Critical:** Невозможно тестировать authentication локально
- 🔴 **Critical:** Каждое изменение требует deploy на production
- 🟡 **Medium:** Замедление development workflow
- 🟡 **Medium:** Риск багов на production из-за отсутствия local testing

### **Business Impact:**
- ⏱️ **Time Loss:** ~30-60 минут на каждый цикл тестирования
- 💰 **Cost:** Увеличение deployment costs
- 🐛 **Quality:** Снижение качества из-за отсутствия local testing
- 👥 **Team:** Фрустрация разработчиков

---

## 🛠️ ATTEMPTED SOLUTIONS

### ❌ Solution 1: Recreate RPC Function with SECURITY DEFINER
**Tried:**
```sql
DROP FUNCTION IF EXISTS get_targetologist_by_email(text);
CREATE OR REPLACE FUNCTION get_targetologist_by_email(p_email text)
RETURNS TABLE (...) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```
**Result:** Function exists, but PostgREST still can't see it.

### ❌ Solution 2: Switch to Legacy Anon Key
**Tried:** Changed from `sb_publishable_*` to JWT `eyJhbGc...`  
**Result:** Same PGRST202 error.

### ❌ Solution 3: Direct Table Query (bypass RPC)
**Tried:**
```typescript
await supabase.from('traffic_targetologists').select('*')
```
**Result:** PGRST205 - table not found in schema cache.

### ❌ Solution 4: Multiple Backend Restarts
**Tried:** Killed all Node.js processes, restarted fresh  
**Result:** Cache persists, same error.

### ❌ Solution 5: Direct PostgreSQL Connection
**Tried:**
```typescript
import pg from 'pg';
const pgPool = new pg.Pool({ connectionString: ... });
```
**Result:** "Tenant or user not found" (connection string issue).

---

## 🎯 NEXT STEPS

### **Option 1: Research Solution (RECOMMENDED)**
Use Perplexity Pro to search for solutions across:
- Supabase GitHub Issues
- PostgREST Documentation
- Stack Overflow
- Reddit (r/supabase)
- Discord Communities

**Prompt file created:** `PERPLEXITY_SEARCH_PROMPT.md`

### **Option 2: Workaround (TEMPORARY)**
Continue testing on production until solution found:
- URL: https://onai.academy/#/traffic/login
- Login: kenesary@onai.academy / changeme123
- Works perfectly ✅

### **Option 3: Alternative Approach**
Implement direct PostgreSQL connection with correct connection string:
- Requires correct `DATABASE_URL` from Supabase dashboard
- Bypasses PostgREST entirely
- May have security implications

---

## 📝 RECOMMENDATIONS

### **Short-term (Today):**
1. ✅ Use production for testing (works perfectly)
2. 🔍 Run Perplexity search with provided prompt
3. 📚 Review Supabase/PostgREST documentation

### **Medium-term (This Week):**
1. Implement solution found via Perplexity
2. Document fix for team
3. Create best practices guide

### **Long-term (This Month):**
1. Consider self-hosted Supabase for better control
2. Implement automated schema sync in CI/CD
3. Add local development setup guide

---

## 🔗 RESOURCES

### **Created Files:**
- `PERPLEXITY_SEARCH_PROMPT.md` - Detailed search prompt
- `TECHNICAL_ISSUE_REPORT.md` - This file
- `ТЕСТИРУЙ_НА_PRODUCTION.txt` - Quick production testing guide

### **Relevant URLs:**
- Production: https://onai.academy/#/traffic/login
- Supabase Dashboard: https://supabase.com/dashboard
- PostgREST Docs: https://postgrest.org/en/stable/

### **GitHub Issues to Check:**
- github.com/supabase/supabase/issues?q=schema+cache
- github.com/PostgREST/postgrest/issues?q=PGRST202

---

## 💬 SUMMARY FOR TEAM

**Current Status:**
Production работает отлично, локалка имеет schema cache issue.

**Action Required:**
1. Прочитай `PERPLEXITY_SEARCH_PROMPT.md`
2. Запусти поиск в Perplexity Pro
3. Примени найденное решение
4. Протестируй локально

**Fallback Plan:**
Если решение не найдено - продолжаем тестить на production.

---

**Priority:** 🔴 HIGH  
**Assigned To:** Development Team  
**Due Date:** ASAP  
**Blocking:** Local development workflow

---

**END OF REPORT**
