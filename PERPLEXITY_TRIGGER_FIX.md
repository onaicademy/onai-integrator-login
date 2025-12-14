# PostgreSQL Trigger Error Fix Request

## Problem Description

Attempting to INSERT test data into `student_progress` table fails with:

```
ERROR: 22P02: invalid input syntax for type uuid: "4"
CONTEXT: PL/pgSQL function calculate_module_progress() line 9 at SQL statement
```

## Current Trigger Configuration

The following triggers are active on `student_progress`:

1. **auto_update_module_progress** (INSERT, UPDATE) → `calculate_module_progress()`
2. **student_progress_update_trigger** (INSERT, UPDATE, DELETE) → `update_student_ranking()`
3. **trg_auto_update_module_progress** (INSERT, UPDATE) → `auto_update_module_progress()`

## The Failing INSERT Statement

```sql
INSERT INTO student_progress (
  user_id,      -- UUID
  lesson_id,    -- INTEGER
  module_id,    -- INTEGER
  is_started,
  is_completed,
  completed_at,
  video_progress_percent,
  xp_earned,
  completion_percentage
)
SELECT 
  v_saint_id,   -- UUID variable
  l.id,         -- INTEGER from lessons.id
  l.module_id,  -- INTEGER from lessons.module_id
  true,
  true,
  NOW() - (INTERVAL '1 day' * ROW_NUMBER() OVER (ORDER BY l.order_index)),
  100,
  50,
  100
FROM lessons l
WHERE l.is_archived = false
ORDER BY l.order_index ASC
LIMIT 11;
```

## Schema Information

**student_progress table:**
- user_id: UUID
- lesson_id: INTEGER
- module_id: INTEGER

**lessons table:**
- id: INTEGER
- module_id: INTEGER

**modules table:**
- id: INTEGER (assumed)

## Error Context

The error occurs inside `calculate_module_progress()` trigger function at line 9. The error message "invalid input syntax for type uuid: '4'" suggests the function is trying to use an INTEGER (value: 4) where a UUID is expected.

## Questions for Research

1. **How to safely disable specific triggers temporarily in PostgreSQL?**
   - Disable only `auto_update_module_progress` and `trg_auto_update_module_progress`
   - Keep system triggers (foreign keys) active
   - Re-enable after data insertion

2. **What is likely wrong in `calculate_module_progress()` function?**
   - Line 9 is mixing INTEGER/UUID types
   - How to debug PL/pgSQL functions to find the exact line?
   - Best practices for type-safe trigger functions

3. **Alternative approaches for bulk test data insertion:**
   - Can we use `ALTER TABLE ... DISABLE TRIGGER trigger_name` for specific triggers?
   - Should we fix the trigger function instead?
   - Is there a way to bypass triggers for a single transaction?

4. **How to inspect the actual trigger function code?**
   - Query to view function definition
   - Tools to debug line-by-line

## Expected Solutions

Please provide:

1. **SQL to view the `calculate_module_progress()` function source code**
2. **Method to temporarily disable specific triggers (not all)**
3. **Fix for the type mismatch in the trigger function**
4. **Best practice for inserting test data with complex triggers**

## Environment

- **Database:** PostgreSQL 12+ (Supabase)
- **Use Case:** Inserting test data for gamification/progress tracking system
- **Constraint:** Cannot drop/recreate triggers (production-like environment)

## Priority

HIGH - Blocking test data creation for development/testing

---

**Goal:** Insert 11 completed lessons for user `saint@onaiacademy.kz` without triggering the UUID type error.



















