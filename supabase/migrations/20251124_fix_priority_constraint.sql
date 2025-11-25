-- Migration: Fix priority constraint to allow 'none'
-- Created: 2025-11-24
-- Purpose: Remove old constraint and add new one with 'none' value

-- 1. Drop old constraint (если существует)
ALTER TABLE public.goals
DROP CONSTRAINT IF EXISTS goals_priority_check;

-- 2. Add new constraint with 'none' included
ALTER TABLE public.goals
ADD CONSTRAINT goals_priority_check 
CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent'));

-- 3. Update existing rows with NULL priority to 'none'
UPDATE public.goals
SET priority = 'none'
WHERE priority IS NULL;

COMMENT ON CONSTRAINT goals_priority_check ON public.goals IS 'Allowed values: none, low, medium, high, urgent';






