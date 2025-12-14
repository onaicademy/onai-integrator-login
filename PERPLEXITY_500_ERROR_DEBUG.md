# Perplexity Query: 500 Error on Lesson Completion Endpoint (After Implementing Best Practices)

## Problem

We implemented **ALL** Perplexity best practices for lesson completion flow, but the backend endpoint returns **500 Internal Server Error** when frontend tries to mark lesson as complete.

### Frontend (React 18 + TypeScript) - WORKS ✅

```typescript
// Logs show handleComplete executes correctly:
✅ handleComplete FIRED!
🎯 Завершаем урок 67 (модуль 16) для пользователя 23408904-cb2f-4b11-92a6-f435fb7c3905
🌐 API Request: POST http://localhost:3000/api/tripwire/complete
📤 Body: {lesson_id: 67, module_id: 16, tripwire_user_id: "23408904-cb2f-4b11-92a6-f435fb7c3905"}

❌ API Error 500: Failed to complete lesson
```

### Backend (Node.js/Express + PostgreSQL) - FAILS ❌

```typescript
// POST /api/tripwire/complete - With ACID Transaction
router.post('/complete', async (req, res) => {
  const { tripwirePool } = await import('../config/tripwire-db');
  const client = await tripwirePool.connect();

  try {
    const { lesson_id, module_id, tripwire_user_id } = req.body;

    // ✅ Validation
    if (!lesson_id || !module_id || !tripwire_user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🎯 [Complete] User ${tripwire_user_id} completing lesson ${lesson_id}`);

    // ACID TRANSACTION
    await client.query('BEGIN');

    try {
      // ✅ STEP 1: Security check - verify 80% watched
      const progressCheck = await client.query(`
        SELECT 
          COALESCE(MAX(tp.video_progress_percent), 0) as max_progress
        FROM tripwire_progress tp
        WHERE tp.tripwire_user_id = $1::uuid
        AND tp.lesson_id = $2::integer
      `, [tripwire_user_id, lesson_id]);

      const watchedPercentage = progressCheck.rows[0]?.max_progress || 0;

      if (watchedPercentage < 80) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: 'Video not watched enough (need 80%)',
          watched: Math.round(watchedPercentage),
        });
      }

      // ✅ STEP 2: Mark lesson as completed
      const progressResult = await client.query(`
        INSERT INTO student_progress (
          user_id, module_id, lesson_id, status, completed_at, updated_at
        )
        VALUES ($1::uuid, $2::integer, $3::integer, 'completed', NOW(), NOW())
        ON CONFLICT (user_id, module_id, lesson_id)
        DO UPDATE SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        RETURNING *
      `, [tripwire_user_id, module_id, lesson_id]);

      // ✅ STEP 3: Check if all lessons in module are complete
      const allLessonsResult = await client.query(`
        SELECT id FROM tripwire_lessons
        WHERE module_id = $1::integer
        ORDER BY order_index ASC
      `, [module_id]);

      const completedLessonsResult = await client.query(`
        SELECT DISTINCT lesson_id FROM student_progress
        WHERE user_id = $1::uuid AND module_id = $2::integer AND status = 'completed'
      `, [tripwire_user_id, module_id]);

      const moduleCompleted = allLessonsResult.rows.length === completedLessonsResult.rows.length;

      // ✅ STEP 4: If module complete → unlock next module + create achievement
      if (moduleCompleted) {
        const nextModuleId = module_id + 1;
        await client.query(`
          UPDATE tripwire_modules
          SET is_locked = false, updated_at = NOW()
          WHERE id = $1::integer
          RETURNING id
        `, [nextModuleId]);

        await client.query(`
          INSERT INTO user_achievements (user_id, achievement_type, module_id, earned_at)
          VALUES ($1::uuid, $2::text, $3::integer, NOW())
          ON CONFLICT (user_id, achievement_type) DO NOTHING
          RETURNING *
        `, [tripwire_user_id, `module_${module_id}_complete`, module_id]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        moduleCompleted,
        progress: progressResult.rows[0],
      });

    } catch (transactionError) {
      await client.query('ROLLBACK');
      throw transactionError;
    }

  } catch (error: any) {
    console.error('❌ [Complete] Error:', error.message);
    res.status(500).json({
      error: 'Failed to complete lesson',
      details: error.message,
    });

  } finally {
    client.release();
  }
});
```

---

## Database Schema (PostgreSQL 17 via Supabase)

```sql
-- Tables that EXIST in Tripwire DB:
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  module_id INTEGER CHECK (module_id IN (16, 17, 18)),
  lesson_id INTEGER CHECK (lesson_id IN (67, 68, 69)),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module_id, lesson_id)
);

CREATE TABLE tripwire_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tripwire_user_id UUID REFERENCES auth.users(id),
  module_id INTEGER CHECK (module_id IN (16, 17, 18)),
  lesson_id INTEGER CHECK (lesson_id IN (67, 68, 69)),
  is_completed BOOLEAN DEFAULT false,
  watch_time_seconds INTEGER DEFAULT 0 CHECK (watch_time_seconds >= 0),
  video_progress_percent INTEGER, -- ❓ THIS FIELD EXISTS?
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tripwire_user_id, lesson_id)
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  achievement_id TEXT CHECK (achievement_id IN ('first_module_complete', 'second_module_complete', 'third_module_complete', 'tripwire_graduate')),
  current_value INTEGER DEFAULT 0,
  required_value INTEGER DEFAULT 1,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id) -- ❓ OR achievement_type?
);

-- ❌ Tables that DO NOT EXIST:
-- tripwire_modules (no such table in Tripwire DB!)
-- tripwire_lessons (no such table in Tripwire DB!)
```

---

## What We Know

1. **Frontend works**: `handleComplete` fires, request is sent with correct body
2. **Backend receives request**: Returns 500 error (not 400, so validation passes)
3. **Database tables**: Some tables referenced in SQL **do NOT exist**:
   - `tripwire_modules` ❌ (doesn't exist)
   - `tripwire_lessons` ❌ (doesn't exist)
   - These are probably in **Main Platform** DB, not Tripwire DB!

4. **Video tracking saves to wrong DB**: Frontend logs show:
   ```
   arqhkacellqbhjhbebfh.supabase.co/rest/v1/video_tracking?on_conflict=user_id%2Clesson_id:1  
   Failed to load resource: the server responded with a status of 400 ()
   ❌ [HonestTracking] Save error
   ```
   This is **Main Platform** Supabase URL, not Tripwire!

5. **Direct DB queries via `tripwirePool`**: Used to bypass PostgREST schema cache

---

## Questions for Perplexity

### 1. **Database Schema Mismatch**
- Why would backend code reference tables (`tripwire_modules`, `tripwire_lessons`) that don't exist in database?
- Should lesson/module data live in **separate "content" database** vs. **user progress database**?
- How do production LMS systems handle this separation?

### 2. **ACID Transaction Error Handling**
- If one SQL query in transaction fails (e.g., table doesn't exist), does entire transaction rollback?
- How to debug **which SQL statement** caused 500 error in ACID transaction block?
- Best practices for logging errors **inside transaction try/catch** without breaking transaction?

### 3. **Multi-Database Architecture**
- Frontend uses **two Supabase instances**:
  - `supabase` (Main Platform) - has `modules`, `lessons`, `video_tracking` tables
  - `tripwireSupabase` (Tripwire) - has `student_progress`, `tripwire_progress`, `user_achievements` tables
- Backend uses:
  - `adminSupabase` (Main Platform)
  - `tripwirePool` (Direct PostgreSQL to Tripwire)
- **Question**: Should backend fetch module/lesson data from Main Platform, but save progress to Tripwire?
- How to properly structure API endpoints that span multiple databases?

### 4. **PostgREST vs Direct Queries**
- We use Direct DB (`pg.Pool`) to bypass PostgREST schema cache
- Does this mean we **cannot use `adminSupabase.from('table')`** for Tripwire tables?
- Should **ALL Tripwire DB operations** go through `tripwirePool.query()`?
- How to handle transactions that span both databases?

### 5. **Column Name Discrepancies**
- Code references `video_progress_percent` column
- Does this column exist in `tripwire_progress` table?
- Frontend logs show `video_tracking` table (Main Platform) fails with 400 error
- Should video progress save to `tripwire_progress` instead?

### 6. **Error Debugging Strategy**
- Backend returns 500 but **no error logs** in console
- Transaction might fail silently?
- How to add **detailed logging** inside ACID transaction without breaking it?
- Best tools/techniques for debugging Express + PostgreSQL transaction errors?

### 7. **Achievement System Schema**
- Code uses `achievement_type` column
- Database shows `achievement_id` column
- Are these the same? Or schema mismatch?
- Should achievement creation use:
  ```sql
  INSERT INTO user_achievements (user_id, achievement_type, ...)
  -- OR
  INSERT INTO user_achievements (user_id, achievement_id, ...)
  ```

---

## Expected Perplexity Output

1. **Root cause analysis**: Why 500 error occurs (most likely table name mismatch)
2. **Correct database architecture** for LMS with separate content DB and progress DB
3. **Step-by-step fix** for multi-database lesson completion flow
4. **Debugging commands** to inspect:
   - Which SQL statement failed
   - PostgreSQL error logs
   - Transaction rollback reasons
5. **Corrected SQL queries** that work with actual database schema
6. **Best practices** for:
   - Multi-database transactions
   - Error logging in ACID transactions
   - Schema validation before deploying code

---

## Shortened Query for Perplexity

**"We implemented a lesson completion endpoint with ACID transactions following best practices, but it returns 500 error. Frontend logs show request succeeds until backend, where it fails. Code references tables `tripwire_modules` and `tripwire_lessons` that DON'T EXIST in our Tripwire database. Our architecture has:**

**- Main Platform DB: Contains `modules`, `lessons`, `video_tracking` tables**
**- Tripwire DB: Contains `student_progress`, `tripwire_progress`, `user_achievements` tables**

**Backend uses Direct PostgreSQL connection (`pg.Pool`) to bypass PostgREST cache. Transaction fails silently with 500 error, no error logs in console.**

**Questions:**
1. **Why no error logs despite try/catch in transaction?**
2. **Should lesson completion endpoint query Main Platform DB for lesson data, then save progress to Tripwire DB?**
3. **How to properly handle ACID transactions that span multiple databases?**
4. **Best debugging strategy for PostgreSQL transaction errors in Express?**
5. **How to validate table/column names before executing SQL in transaction?**

**Tech stack: Node.js/Express, PostgreSQL 17 via Supabase, Direct DB queries via pg.Pool, React 18 frontend. Need corrected architecture and SQL queries that work with actual schema."**
