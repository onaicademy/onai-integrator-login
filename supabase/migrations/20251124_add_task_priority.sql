-- Migration: Add priority and reminder_before fields to goals table
-- Created: 2025-11-24
-- Purpose: Support task priorities and customizable reminder times

-- Add priority field with enum-like check constraint
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS reminder_before INTEGER DEFAULT 30 CHECK (reminder_before > 0);

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_goals_priority ON public.goals(priority);

-- Add comments
COMMENT ON COLUMN public.goals.priority IS 'Task priority: none, low, medium, high, urgent';
COMMENT ON COLUMN public.goals.description IS 'Detailed task description';
COMMENT ON COLUMN public.goals.reminder_before IS 'Minutes before due_date to send reminder (default: 30)';






