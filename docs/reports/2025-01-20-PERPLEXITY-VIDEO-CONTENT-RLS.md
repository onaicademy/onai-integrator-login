# 🔍 PERPLEXITY AI RESEARCH REQUEST: Supabase RLS for video_content Table

**Date:** January 20, 2025  
**Priority:** CRITICAL 🔥  
**Topic:** Supabase Row Level Security policies blocking service_role_key operations  
**Context:** Educational platform with video upload functionality

---

## 📋 RESEARCH REQUEST

### Primary Question

**How to configure Supabase RLS policies for a `video_content` table so that:**

1. **Service role key (backend with Authorization header) can perform ALL operations** (INSERT, UPDATE, DELETE, SELECT) **WITHOUT being blocked by RLS**
2. **Regular users (students) can only SELECT (read)**
3. **Admin users (via JWT role claim) can perform all operations**

**Current problem:** INSERT/UPDATE into `video_content` is being BLOCKED even with `service_role_key` and explicit `Authorization: Bearer {service_role_key}` header.

---

## 🎯 SPECIFIC QUESTIONS

### Question 1: Service Role Key Bypass

**Does `service_role_key` automatically bypass RLS in all cases?**

- We've added explicit `Authorization: Bearer {service_role_key}` header
- Backend uses isolated client (no user session contamination)
- But INSERT/UPDATE still returns EMPTY result (silent failure)

**Current policy has:**
```sql
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
WITH CHECK (null)  -- ❌ Is this blocking service_role_key?
```

**Questions:**
- Does `auth.uid()` work with `service_role_key`? (We suspect it returns NULL)
- Does `WITH CHECK (null)` block INSERT/UPDATE even for service_role_key?
- Should policies use `USING (true)` and `WITH CHECK (true)` for service_role_key operations?

### Question 2: WITH CHECK Clause

**Is `WITH CHECK` required for INSERT/UPDATE to work?**

From Supabase docs:
> "The WITH CHECK clause is used to validate the data before allowing the operation."

**Our observation:**
- Policy has `WITH CHECK (null)`
- INSERT returns `{ data: null, error: null }` (silent failure)
- No rows are inserted into `video_content`

**Questions:**
- Is `WITH CHECK (null)` the same as "block all writes"?
- Do we need `WITH CHECK (true)` for service_role_key to bypass?
- What's the correct approach for policies that should allow service_role_key but restrict regular users?

### Question 3: Multiple Policies Interaction

**We have TWO policies on `video_content`:**

```json
[
  {
    "policyname": "Only admins can manage video content",
    "cmd": "ALL",
    "qual": "(EXISTS (...profiles...))",
    "with_check": null
  },
  {
    "policyname": "Video content is viewable by everyone",
    "cmd": "SELECT",
    "qual": "true",
    "with_check": null
  }
]
```

**Questions:**
- Do multiple policies with different commands (ALL vs SELECT) conflict?
- Does the ALL policy override the SELECT policy?
- Should we separate policies by operation (INSERT, UPDATE, DELETE, SELECT)?

### Question 4: UPSERT with UNIQUE Constraint

**Table has UNIQUE constraint on `lesson_id`:**

```sql
CREATE TABLE video_content (
  id BIGINT PRIMARY KEY,
  lesson_id BIGINT UNIQUE REFERENCES lessons(id),
  duration_seconds INTEGER,
  -- ...
);
```

**Backend uses UPSERT:**

```typescript
await supabase
  .from('video_content')
  .upsert({
    lesson_id: 37,
    duration_seconds: 120
  }, {
    onConflict: 'lesson_id'
  });
```

**Questions:**
- Does UPSERT with `onConflict` require BOTH INSERT and UPDATE policies?
- Could the UNIQUE constraint interaction with RLS cause silent failures?
- Do we need separate `WITH CHECK` for INSERT vs UPDATE in UPSERT scenario?

---

## 📊 CURRENT SETUP

### Backend Client Configuration

```typescript
// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false  // No session contamination
  },
  global: {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`  // Explicit header
    }
  }
});
```

### Backend UPSERT Code

```typescript
// backend/src/routes/videos.ts
const { data: videoContent, error: videoError } = await adminSupabase
  .from('video_content')
  .upsert({
    lesson_id: parseInt(lessonId),
    video_url: cdnUrl,
    filename: videoFile.originalname,
    file_size_bytes: videoFile.size,
    duration_seconds: durationSeconds,
    created_at: new Date().toISOString()
  }, {
    onConflict: 'lesson_id'  // UPDATE if exists
  })
  .select()
  .single();

if (videoError) {
  console.error('⚠️ Video_content save warning:', videoError);
} else {
  console.log('✅ Video_content saved:', videoContent);
}
```

**Result:**
```
videoError: null
videoContent: null  // ❌ EMPTY! Should have inserted row!
```

### Database Query Result

```sql
SELECT * FROM video_content WHERE lesson_id = 37;
-- Returns: 0 rows (INSERT was blocked)
```

---

## 🔍 WHAT WE'VE TRIED

### Attempt 1: Simple Policies (FAILED)

```sql
CREATE POLICY "Allow all" 
ON video_content 
FOR ALL 
USING (true);
```

**Result:** Still blocked (suspected reason: missing `WITH CHECK`)

### Attempt 2: WITH CHECK (true) (NOT TESTED YET)

```sql
DROP POLICY IF EXISTS "Only admins can manage video content" ON video_content;

CREATE POLICY "Allow all with check"
ON video_content
FOR ALL
USING (true)
WITH CHECK (true);
```

**Status:** Waiting for confirmation this is correct approach

### Attempt 3: Separate Policies (CONSIDERING)

```sql
-- For SELECT (everyone)
CREATE POLICY "Allow SELECT" 
ON video_content 
FOR SELECT 
USING (true);

-- For INSERT/UPDATE/DELETE (service_role only)
CREATE POLICY "Allow INSERT" 
ON video_content 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow UPDATE" 
ON video_content 
FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow DELETE" 
ON video_content 
FOR DELETE 
USING (true);
```

**Question:** Is this necessary or overkill?

---

## 🎯 WHAT WE NEED FROM PERPLEXITY

### Request 1: Correct RLS Policies

**Find production examples** of Supabase RLS policies for a similar use case:

- **Table:** `video_content` (metadata for uploaded videos)
- **Backend:** Node.js/Express with `service_role_key`
- **Frontend:** React with student/admin roles
- **Operations:**
  - Backend UPSERT (service_role_key)
  - Students SELECT (read-only)
  - Admins ALL operations (via JWT role)

**Sources to check:**
- GitHub: Supabase repos with video/file upload
- GitHub: Production apps using service_role_key with RLS
- Stack Overflow: "supabase service role key rls not working"
- Supabase Discord: Common RLS patterns
- Supabase docs: Best practices for service_role_key + RLS

### Request 2: WITH CHECK Clause Best Practices

**Research:**
- When is `WITH CHECK` required vs optional?
- What does `WITH CHECK (null)` mean?
- Does `service_role_key` require `WITH CHECK (true)` to bypass?
- Examples of INSERT/UPDATE policies with proper `WITH CHECK`

**Find:**
- Official Supabase documentation on `WITH CHECK`
- GitHub issues where missing `WITH CHECK` caused problems
- Production examples with working `WITH CHECK` policies

### Request 3: Service Role Key Behavior

**Research:**
- Does `auth.uid()` return NULL for service_role_key?
- Should policies check for service_role_key explicitly?
- How to write policies that allow service_role_key but restrict users?

**Find:**
- Supabase documentation on service_role_key and RLS
- GitHub examples of policies that work with service_role_key
- Common pitfalls when using service_role_key with RLS enabled

### Request 4: UPSERT with RLS

**Research:**
- Does UPSERT require both INSERT and UPDATE policies?
- How does `onConflict` interact with RLS?
- Examples of UPSERT working with RLS policies

**Find:**
- Supabase documentation on UPSERT and RLS
- Production code using UPSERT with RLS
- Common issues with UPSERT and RLS

---

## 📝 DESIRED OUTPUT

### 1. SQL Script (CRITICAL)

**Provide a complete, tested SQL script** that:

```sql
-- Drop existing problematic policies
DROP POLICY IF EXISTS "..." ON video_content;

-- Create correct policies
CREATE POLICY "..." 
ON video_content 
FOR ... 
USING (...) 
WITH CHECK (...);

-- Verify policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'video_content';
```

### 2. Explanation

**Explain:**
- Why previous policies were blocking
- What each clause does (USING vs WITH CHECK)
- Why this approach works for service_role_key
- How to handle JWT role-based access (optional)

### 3. Testing Steps

**Provide:**
- SQL queries to test policies work
- Expected results for each test
- How to verify service_role_key can INSERT/UPDATE

### 4. Best Practices

**Document:**
- Should RLS be enabled for tables accessed by service_role_key?
- Is `USING (true)` + `WITH CHECK (true)` safe for service_role_key tables?
- How to structure policies for multi-tenant / role-based access?

---

## 🚨 CONSTRAINTS

### Must Work

1. ✅ Backend (service_role_key) can INSERT/UPDATE/DELETE `video_content`
2. ✅ Backend SELECT with JOIN returns `video_content` data
3. ✅ Frontend can read `video_content` (via backend API)
4. ✅ UPSERT with `onConflict: 'lesson_id'` works

### Nice to Have

1. Role-based access control (admin vs student)
2. Security: Students can only read, not write
3. Best practices for production deployment

### Must Avoid

1. ❌ Silent failures (INSERT returns null without error)
2. ❌ Overly permissive policies (disable RLS completely)
3. ❌ Breaking existing functionality

---

## 🔗 SEARCH QUERIES FOR PERPLEXITY

### Suggested Queries

1. **"supabase service role key with check rls policy not working"**
2. **"supabase rls policy with check clause insert blocked"**
3. **"supabase service_role_key auth.uid() returns null"**
4. **"supabase upsert with rls policies onconflict"**
5. **"supabase video content table rls best practices"**
6. **"supabase rls policy all vs separate insert update"**

### GitHub Searches

```
repo:supabase/supabase "WITH CHECK" "service_role" is:issue is:closed
repo:supabase/supabase "service_role_key" "rls" "not working"
language:sql "CREATE POLICY" "video_content" "WITH CHECK (true)"
```

### Stack Overflow

```
[supabase] service_role_key rls
[supabase] WITH CHECK null
[supabase] upsert rls policy
```

---

## 📊 SUCCESS CRITERIA

### Solution is correct if:

1. **Backend logs show:**
   ```
   ✅ Video_content saved: { id: X, duration_seconds: Y, ... }
   ```
   (Not `null`)

2. **Database query shows:**
   ```sql
   SELECT * FROM video_content WHERE lesson_id = 37;
   -- Returns: 1 row with duration_seconds populated
   ```

3. **Frontend shows:**
   ```
   Время прохождения модуля: 1 час 30 минут (3 урока)
   ```
   (Not "0 минут")

4. **Backend SELECT with JOIN works:**
   ```typescript
   const { data: lessons } = await supabase
     .from('lessons')
     .select('*, video_content (*)');
   
   console.log(lessons[0].video_content); 
   // [{ id: X, duration_seconds: Y }]  ✅
   // Not []  ❌
   ```

---

## 🎯 DELIVERABLES EXPECTED

### From Perplexity AI:

1. **Complete SQL script** to fix RLS policies ✅
2. **Explanation** of what was wrong and why fix works ✅
3. **3-5 production examples** from GitHub with similar setup ✅
4. **Testing queries** to verify policies work ✅
5. **Best practices** document for service_role_key + RLS ✅

### Confidence Level Needed:

**90%+ confidence** that solution will work based on:
- Multiple production examples
- Official Supabase documentation
- Closed GitHub issues with same problem
- Stack Overflow accepted answers

---

## 📚 CONTEXT LINKS

### Our Documentation

- `2025-01-20-VIDEO-CONTENT-RLS-ISSUE.md` - This detailed problem report
- `2025-01-20-RLS-FIX-APPLIED.md` - Previous Authorization header fix
- `2025-01-20-PERPLEXITY-RLS-INVESTIGATION.md` - Original RLS research

### Official Docs

- https://supabase.com/docs/guides/auth/row-level-security
- https://supabase.com/docs/guides/api/using-custom-schemas
- https://www.postgresql.org/docs/current/sql-createpolicy.html

### Our Tech Stack

- **Backend:** Node.js 18, Express, TypeScript
- **Frontend:** React 18, TypeScript, Vite
- **Database:** Supabase (PostgreSQL 15)
- **Storage:** Bunny CDN (videos)
- **Auth:** Supabase Auth with JWT

---

## 🙏 THANK YOU

This research is **CRITICAL** for our production deployment.

We've spent 4+ hours debugging and identified the exact problem, but need expert guidance on correct RLS policy syntax for our use case.

**Any help is greatly appreciated!** 🚀

---

**Created by:** Cursor AI + Development Team  
**Date:** January 20, 2025  
**Status:** AWAITING PERPLEXITY AI RESEARCH  
**Priority:** CRITICAL 🔥

