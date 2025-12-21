-- Migration: Create user_activity_logs table for per-user error tracking
-- Purpose: Track all errors, events, and activities for each Tripwire student

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL, 
  -- Types: 'CLIENT_ERROR', 'API_ERROR', 'LOGIN', 'LOGOUT', 
  --        'VIDEO_VIEW', 'HOMEWORK_SUBMIT', 'LESSON_COMPLETE', 'USER_CREATED'
  
  event_category VARCHAR(20) NOT NULL, 
  -- Categories: 'error', 'auth', 'content', 'activity'
  
  message TEXT NOT NULL,
  
  metadata JSONB DEFAULT '{}',
  -- Flexible metadata storage:
  -- {
  --   stack?: string,
  --   url?: string,
  --   userAgent?: string,
  --   endpoint?: string,
  --   statusCode?: number,
  --   lessonId?: number,
  --   videoId?: number,
  --   created_by?: string,
  --   manager_name?: string
  -- }
  
  severity VARCHAR(20) DEFAULT 'info',
  -- Levels: 'critical', 'error', 'warning', 'info', 'debug'
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint (with CASCADE delete)
-- Note: We reference tripwire_users(user_id), not auth.users
ALTER TABLE user_activity_logs
ADD CONSTRAINT fk_user_activity_logs_user_id
FOREIGN KEY (user_id) REFERENCES tripwire_users(user_id) ON DELETE CASCADE;

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id 
ON user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_event_type 
ON user_activity_logs(event_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_created_at 
ON user_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_severity 
ON user_activity_logs(severity);

CREATE INDEX IF NOT EXISTS idx_user_activity_event_category
ON user_activity_logs(event_category);

-- Enable Row Level Security
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admin and sales roles can view user logs
CREATE POLICY "Admin and Sales can view all user logs"
ON user_activity_logs FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'role') IN ('admin', 'sales')
);

-- RLS Policy: Only admin and sales can insert logs (backend uses service_role_key, bypasses RLS)
CREATE POLICY "Admin and Sales can insert user logs"
ON user_activity_logs FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role') IN ('admin', 'sales')
);

-- Add phone column to tripwire_users if it doesn't exist
ALTER TABLE tripwire_users 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Create indexes on tripwire_users for fast search
CREATE INDEX IF NOT EXISTS idx_tripwire_users_email 
ON tripwire_users(email);

CREATE INDEX IF NOT EXISTS idx_tripwire_users_phone 
ON tripwire_users(phone) 
WHERE phone IS NOT NULL;

-- Add comment for documentation
COMMENT ON TABLE user_activity_logs IS 'Tracks all user activities, errors, and events for debugging and analytics';
COMMENT ON COLUMN user_activity_logs.user_id IS 'References tripwire_users.user_id';
COMMENT ON COLUMN user_activity_logs.event_type IS 'Type of event: CLIENT_ERROR, API_ERROR, LOGIN, LOGOUT, VIDEO_VIEW, HOMEWORK_SUBMIT, LESSON_COMPLETE, USER_CREATED';
COMMENT ON COLUMN user_activity_logs.event_category IS 'Category: error, auth, content, activity';
COMMENT ON COLUMN user_activity_logs.severity IS 'Severity level: critical, error, warning, info, debug';
COMMENT ON COLUMN user_activity_logs.metadata IS 'Flexible JSONB storage for event-specific data';
