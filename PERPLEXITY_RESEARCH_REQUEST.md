# Research Request for Perplexity AI

## Problem Description

PostgreSQL function `update_student_ranking()` is failing with the following error:

```
ERROR: 0A000: DISTINCT is not implemented for window functions
```

### Context

- **Database:** PostgreSQL (Supabase)
- **Function:** `update_student_ranking()` - triggered on DELETE from `student_progress` table
- **Error Location:** Window function with `COUNT(DISTINCT sp.user_id) OVER ()`

### Failing SQL Query

```sql
WITH ranked AS (
  SELECT 
    sp.user_id as id,
    COUNT(sp.id) FILTER (WHERE sp.is_completed = true) as completed_lessons,
    COALESCE(SUM(sp.xp_earned), 0) as total_xp,
    ROW_NUMBER() OVER (
      ORDER BY 
        COUNT(sp.id) FILTER (WHERE sp.is_completed = true) DESC,
        COALESCE(SUM(sp.xp_earned), 0) DESC
    ) as position,
    COUNT(DISTINCT sp.user_id) OVER () as total_students  -- ❌ THIS LINE FAILS
  FROM student_progress sp
  GROUP BY sp.user_id
)
INSERT INTO student_rankings (
  user_id, total_completed_lessons, total_xp, 
  rank_position, percentile, last_updated
)
SELECT 
  id, completed_lessons, total_xp, position::INT,
  ROUND((1 - (position::DECIMAL / NULLIF(total_students, 0))) * 100, 2),
  NOW()
FROM ranked
ON CONFLICT (user_id) DO UPDATE SET
  total_completed_lessons = EXCLUDED.total_completed_lessons,
  total_xp = EXCLUDED.total_xp,
  rank_position = EXCLUDED.rank_position,
  percentile = EXCLUDED.percentile,
  last_updated = NOW();
```

## Research Questions

1. **Why does PostgreSQL reject `COUNT(DISTINCT column) OVER ()`?**
   - What is the technical limitation?
   - Which PostgreSQL versions have this limitation?

2. **What are the recommended solutions?**
   - How to calculate total distinct count in a window function context?
   - Performance implications of different approaches

3. **Best practice alternatives:**
   - Subquery approach
   - CTE approach
   - Cross join approach
   - Any PostgreSQL-specific optimizations

## Expected Output

Please provide:

1. **Root cause explanation** - Why this error occurs
2. **3-5 working solutions** with SQL examples
3. **Performance comparison** of solutions
4. **Recommended best practice** for this specific use case (student ranking system)
5. **Any PostgreSQL version considerations**

## Use Case Details

- **Table:** `student_progress` with ~1000-10000 rows
- **Goal:** Calculate student rankings based on completed lessons and XP
- **Need:** Total student count for percentile calculation
- **Trigger:** Function runs on INSERT/UPDATE/DELETE operations

## Priority

**HIGH** - Blocking production feature (AI Mentor gamification system)

---

**Note to Perplexity:** Please focus on PostgreSQL-compatible solutions that work in Supabase environment. Include code examples that can be directly implemented.



















