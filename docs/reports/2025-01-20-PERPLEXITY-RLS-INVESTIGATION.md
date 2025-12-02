# 🔍 Perplexity AI Investigation Request: Supabase RLS Silent Failures

**Дата**: 20 января 2025  
**Приоритет**: 🔴 КРИТИЧЕСКИЙ  
**Тип запроса**: Комплексное исследование + примеры решений  

---

## 📋 Executive Summary

**Problem**: Video duration metadata (`duration_minutes`, `duration_seconds`) не сохраняется в Supabase БД после загрузки файла через Multer + Express.js, несмотря на правильную реализацию FormData и backend логики.

**Hypothesis**: Supabase Row Level Security (RLS) policies блокируют UPDATE операции **без вывода ошибок** (silent failure).

**Goal**: Найти корневую причину и рабочее решение с примерами из реальных проектов на GitHub.

---

## 🎯 Main Research Questions

### 1. Supabase RLS Silent Failures Pattern Recognition

**Question**: What are the most common patterns of Supabase RLS policies that cause **silent UPDATE failures** (returns empty array but no error) in production applications?

**Context**:
- UPDATE query returns: `{ data: [], error: null }`
- Database schema has RLS enabled
- Backend uses `service_role_key` (should bypass RLS, but doesn't always)
- Frontend uses JWT auth with role-based access

**Search Focus**:
- GitHub issues in `supabase/supabase` repository
- Stack Overflow questions tagged `supabase` + `row-level-security` + `update-fails`
- Real-world solutions from production codebases
- Supabase Discord community known issues

### 2. Service Role Key vs RLS Bypass

**Question**: Under what conditions does Supabase `service_role_key` **FAIL** to bypass RLS policies, and how to fix it?

**Known Symptoms**:
- Backend uses `service_role_key` correctly
- RLS policies exist on tables
- SELECT works, but UPDATE returns empty data
- No error messages in Supabase logs

**Research Topics**:
- Service role key initialization issues
- RLS policy WITH CHECK vs USING clauses
- Auth context in server-side operations
- Common misconfigurations

### 3. Multer + Supabase + RLS Interaction Issues

**Question**: Are there documented cases where **file upload operations** (Multer/FormData) interact badly with Supabase RLS policies?

**Specific Scenario**:
```
1. User uploads video file via Multer
2. Backend saves file to Bunny CDN (success)
3. Backend attempts UPDATE to Supabase:
   UPDATE lessons SET video_url = '...', duration_minutes = 5
   WHERE id = 18
4. Result: { data: [], error: null }
```

**Investigation Areas**:
- Transaction isolation issues
- Auth context loss during multipart uploads
- Service role key scope in middleware
- Request lifecycle timing problems

---

## 🏗️ Technical Stack Details

### Backend Stack
```typescript
- Node.js v18+
- Express.js
- TypeScript
- Multer (multipart/form-data handling)
- @supabase/supabase-js (JS Client)
- Bunny CDN (external file storage)
```

### Database
```sql
PostgreSQL 15 (via Supabase)
- Tables: lessons, video_content
- RLS: Enabled on both tables
- Auth: JWT tokens + role-based access (admin/student)
```

### Frontend
```typescript
- React 18 + TypeScript
- FormData for file uploads
- JWT stored in localStorage
- Fetch API with Authorization headers
```

---

## 🔴 Current Implementation

### Backend Initialization

```typescript
// backend/src/routes/videos.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ⚠️ Using service role key
);

router.post('/upload/:lessonId', upload, async (req, res) => {
  // ... file upload to Bunny CDN ...
  
  // ❌ UPDATE fails silently
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .update({
      video_url: cdnUrl,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString()
    })
    .eq('id', parseInt(lessonId))
    .select()
    .single();
  
  console.log('Result:', lesson);  // null or []
  console.log('Error:', lessonError);  // null
});
```

### Database Schema

```sql
-- lessons table
CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  module_id uuid REFERENCES modules(id),
  title text NOT NULL,
  description text,
  duration_minutes integer,  -- ❌ Not updating
  video_url text,
  order_index integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS enabled
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- video_content table
CREATE TABLE video_content (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id uuid REFERENCES lessons(id),
  filename text,
  file_size_bytes bigint,
  duration_seconds integer,  -- ❌ Not updating
  video_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE video_content ENABLE ROW LEVEL SECURITY;
```

### Current RLS Policies (Unknown - Need to Check)

```sql
-- ❓ UNKNOWN: What policies exist?
-- ❓ UNKNOWN: Are there USING/WITH CHECK clauses?
-- ❓ UNKNOWN: Do they reference auth.uid() or auth.role()?
```

---

## 💡 Hypotheses & Investigation Paths

### Hypothesis 1: Missing WITH CHECK Clause

**Theory**: RLS policy has `USING` clause but missing `WITH CHECK` clause for UPDATE operations.

**Evidence from Reddit/StackOverflow**:
> "If your UPDATE policy has empty fields in USING or CHECK, you will get zero rows returned, no row updated and NO error message."

**Questions for Perplexity**:
1. What's the difference between `USING` and `WITH CHECK` in Supabase RLS?
2. How to diagnose missing `WITH CHECK` clauses?
3. What are the default policies if none are explicitly set?
4. Can you show real examples from GitHub where this was fixed?

**Search Query Suggestions**:
- `"supabase" "WITH CHECK" "update failed" "no error"`
- `"supabase" "RLS" "silent failure" "empty data"`
- `github:supabase/supabase issue:"update returns empty"`

---

### Hypothesis 2: Service Role Key Not Bypassing RLS

**Theory**: Service role key should bypass RLS, but in some configurations it doesn't.

**Questions for Perplexity**:
1. When does `service_role_key` **FAIL** to bypass RLS?
2. Are there middleware or initialization issues that break service_role_key?
3. Does request context (Multer, Express middleware order) affect auth context?
4. How to verify service role key is actually being used in a query?

**Search Query Suggestions**:
- `"supabase" "service_role_key" "not bypassing RLS"`
- `"supabase" "service role" "update failed" site:github.com`
- `"supabase-js" "createClient" "service_role_key" "middleware"`

---

### Hypothesis 3: Auth Context Loss in Multipart Requests

**Theory**: Multer multipart requests lose auth context mid-stream, causing Supabase to reject updates.

**Questions for Perplexity**:
1. Can Multer middleware interfere with Supabase auth context?
2. Are there known issues with file uploads + Supabase updates in the same request?
3. Should file upload and DB update be split into separate requests?
4. How do production apps handle this pattern?

**Search Query Suggestions**:
- `"multer" "supabase" "auth context" "file upload"`
- `"express" "multipart" "supabase" "update fails"`
- `site:github.com "multer" "supabase" "service_role_key"`

---

### Hypothesis 4: Foreign Key or Constraint Issues

**Theory**: Foreign key constraints or triggers are silently blocking the update.

**Questions for Perplexity**:
1. Can foreign key constraints cause silent Supabase update failures?
2. How to check for triggers or constraints blocking updates?
3. What PostgreSQL logs should we check?
4. Are there Supabase dashboard tools to diagnose this?

**Search Query Suggestions**:
- `"supabase" "foreign key" "update blocked" "no error"`
- `"postgresql" "update returns empty" "constraint violation"`
- `"supabase" "trigger" "silent failure"`

---

### Hypothesis 5: Incorrect Policy for Admin Role

**Theory**: RLS policy expects `auth.jwt()->>'role' = 'admin'` but backend doesn't provide this.

**Questions for Perplexity**:
1. How should RLS policies handle service_role_key requests?
2. What's the correct way to check for admin role in Supabase RLS?
3. Do service role key requests have `auth.uid()` available?
4. Show examples of admin-only RLS policies that work with service_role_key.

**Search Query Suggestions**:
- `"supabase" "RLS" "admin" "service_role_key" "policy"`
- `"supabase" "auth.uid()" "service role" "undefined"`
- `site:supabase.com/docs "service_role_key" "RLS" "bypass"`

---

## 🎯 Specific Research Requests

### Request 1: GitHub Code Examples

**Please find and analyze 5-10 production repositories on GitHub that**:
1. Use Supabase + Multer + File Uploads
2. Handle RLS policies for admin operations
3. Have solved similar "silent update failure" issues
4. Show working RLS policy configurations

**Search Parameters**:
```
language:typescript
"@supabase/supabase-js"
"multer"
"service_role_key"
".update()"
stars:>100
```

### Request 2: Supabase GitHub Issues Analysis

**Find and summarize the top 10 most relevant issues from**:
- `supabase/supabase` repository
- Issues tagged: `rls`, `update-failed`, `silent-failure`, `service-role-key`
- Status: Closed (with solutions)
- Created: Last 2 years

**Key Information Needed**:
- Root cause
- Solution implemented
- Code examples
- Common patterns

### Request 3: Stack Overflow Best Answers

**Find top-voted answers for**:
```
[supabase] [row-level-security] update fails silently
[supabase] service_role_key not bypassing RLS
[supabase] WITH CHECK clause missing
```

### Request 4: Supabase Discord Known Issues

**If accessible, check Supabase Discord for**:
- #help-and-questions channel
- Common patterns around RLS update failures
- Maintainer responses about service_role_key behavior

---

## 🔧 Desired Output Format

Please provide:

### 1. Root Cause Analysis
- Most likely cause based on symptom pattern
- Common misconfigurations in similar projects
- Why service_role_key might not be bypassing RLS

### 2. Step-by-Step Diagnostic Process
```sql
-- Step 1: Check current RLS policies
SELECT ...

-- Step 2: Verify service_role_key is active
...

-- Step 3: Test UPDATE without RLS
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
...
```

### 3. Working Solution Examples

**Example A: From GitHub Project X**
```sql
-- Their RLS policy that works
CREATE POLICY "admin_all_access" ON lessons
FOR ALL
USING (
  -- Their solution
)
WITH CHECK (
  -- Their solution
);
```

**Example B: From Stack Overflow Answer**
```typescript
// Their backend implementation
const supabase = createClient(...);
// Their fix
```

### 4. Prevention Best Practices
- How to structure RLS policies for admin/student roles
- How to test RLS policies before deploying
- Common pitfalls to avoid

---

## 📊 Expected Deliverables

1. **Root Cause Identification** (with 90%+ confidence)
2. **3-5 Working Code Examples** from real projects
3. **SQL Scripts** to diagnose and fix RLS policies
4. **TypeScript/Node.js** code patterns that work
5. **Testing Strategy** to verify the fix

---

## 🔗 Additional Context

### Working Features (for comparison)
- ✅ Video upload to Bunny CDN works
- ✅ `video_url` field updates successfully
- ✅ SELECT queries return data correctly
- ✅ Other CRUD operations work (except UPDATE with RLS)

### Failed Features
- ❌ `duration_minutes` stays NULL after UPDATE
- ❌ `duration_seconds` in video_content stays NULL
- ❌ No error messages anywhere (backend, Supabase logs, browser)

### Environment
- Supabase Project: Production tier
- PostgreSQL: 15.x (Supabase managed)
- Node.js: 18.x
- Region: AWS (closest to user)

---

## 💬 Direct Questions for Perplexity

1. **What is the #1 most common cause of "Supabase UPDATE returns empty data with no error" in production apps?**

2. **Show me 3 real GitHub repositories that solved this exact problem. Include links and code snippets.**

3. **What's the correct RLS policy syntax for allowing service_role_key to bypass all restrictions?**

4. **How do I diagnose RLS issues step-by-step using Supabase dashboard and SQL queries?**

5. **Are there Supabase CLI commands or logs I should check to see RLS policy evaluation?**

6. **What's the difference between these two policies, and which one allows service_role_key updates?**
   ```sql
   -- Policy A
   USING (auth.uid() = user_id)
   
   -- Policy B  
   USING (true)
   WITH CHECK (auth.role() = 'authenticated')
   ```

7. **In a Multer + Express + Supabase stack, where should I initialize the Supabase client to ensure service_role_key works correctly?**

8. **Can you show a complete working example of RLS policies for a lessons table with admin/student roles?**

---

## 🎯 Success Criteria

A successful investigation will:
1. ✅ Identify the exact root cause with high confidence
2. ✅ Provide 3+ working code examples from production projects
3. ✅ Include SQL scripts to diagnose and fix the issue
4. ✅ Explain WHY the issue happens (not just HOW to fix)
5. ✅ Offer prevention strategies for future development

---

## 📎 Files for Reference

If Perplexity needs code context:
- Backend: `backend/src/routes/videos.ts` (video upload endpoint)
- Database schema: See "Database Schema" section above
- Frontend: `src/components/admin/LessonEditDialog.tsx` (file upload)

---

**Please conduct a comprehensive investigation focusing on real-world solutions from GitHub, Stack Overflow, and Supabase community resources. Prioritize examples with working code over theoretical explanations.**

---

**Prepared by**: AI Assistant (Claude)  
**For**: onAI Academy Platform  
**Investigation Type**: Root Cause Analysis + Solution Research  
**Expected Research Time**: 10-15 minutes for Perplexity AI  
**Priority**: 🔴 CRITICAL - Blocks all video metadata functionality

