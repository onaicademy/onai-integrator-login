-- Migration: Create tripwire_users and tripwire_user_profile tables
-- Database: Traffic Supabase (oetodaexnjcunklkdlkv)
-- Created: 2025-12-30
-- Purpose: Student accounts and profiles for Tripwire platform

-- ==========================================
-- 1. CREATE tripwire_users TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS tripwire_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID, -- Reference to auth.users
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ==========================================
-- 2. CREATE tripwire_user_profile TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES tripwire_users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  welcome_email_sent BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 0,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. CREATE INDEXES FOR tripwire_users
-- ==========================================

-- Unique index for email lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_tripwire_users_email
ON tripwire_users(email);

-- Index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_tripwire_users_user_id
ON tripwire_users(user_id)
WHERE user_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_tripwire_users_status
ON tripwire_users(status);

-- Index for recent users
CREATE INDEX IF NOT EXISTS idx_tripwire_users_created_at
ON tripwire_users(created_at DESC);

-- ==========================================
-- 4. CREATE INDEXES FOR tripwire_user_profile
-- ==========================================

-- Unique index for user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_tripwire_profile_user_id
ON tripwire_user_profile(user_id);

-- Index for welcome email tracking
CREATE INDEX IF NOT EXISTS idx_tripwire_profile_welcome_email
ON tripwire_user_profile(welcome_email_sent)
WHERE welcome_email_sent = FALSE;

-- Index for onboarding status
CREATE INDEX IF NOT EXISTS idx_tripwire_profile_onboarding
ON tripwire_user_profile(onboarding_completed)
WHERE onboarding_completed = FALSE;

-- ==========================================
-- 5. CREATE TRIGGER FOR updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_tripwire_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tripwire_users_updated_at
BEFORE UPDATE ON tripwire_users
FOR EACH ROW
EXECUTE FUNCTION update_tripwire_updated_at();

CREATE TRIGGER tripwire_profile_updated_at
BEFORE UPDATE ON tripwire_user_profile
FOR EACH ROW
EXECUTE FUNCTION update_tripwire_updated_at();

-- ==========================================
-- 6. CREATE RLS POLICIES
-- ==========================================

-- Enable Row Level Security
ALTER TABLE tripwire_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripwire_user_profile ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access to tripwire_users"
ON tripwire_users
FOR ALL
USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to tripwire_user_profile"
ON tripwire_user_profile
FOR ALL
USING (auth.role() = 'service_role');

-- Users can read their own data
CREATE POLICY "Users can read own tripwire_users record"
ON tripwire_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can read own tripwire_user_profile"
ON tripwire_user_profile
FOR SELECT
USING (
  user_id IN (
    SELECT id FROM tripwire_users WHERE user_id = auth.uid()
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own tripwire_user_profile"
ON tripwire_user_profile
FOR UPDATE
USING (
  user_id IN (
    SELECT id FROM tripwire_users WHERE user_id = auth.uid()
  )
);

-- ==========================================
-- 7. ADD COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE tripwire_users IS 'Student accounts for Tripwire platform';
COMMENT ON COLUMN tripwire_users.id IS 'Primary key UUID';
COMMENT ON COLUMN tripwire_users.email IS 'Student email address (unique)';
COMMENT ON COLUMN tripwire_users.user_id IS 'Reference to Supabase auth.users (NULL for legacy accounts)';
COMMENT ON COLUMN tripwire_users.status IS 'Account status: active, suspended, deleted';
COMMENT ON COLUMN tripwire_users.metadata IS 'Additional user metadata (JSONB)';

COMMENT ON TABLE tripwire_user_profile IS 'Student profile information and settings';
COMMENT ON COLUMN tripwire_user_profile.user_id IS 'Foreign key to tripwire_users.id';
COMMENT ON COLUMN tripwire_user_profile.welcome_email_sent IS 'Flag indicating if welcome email was sent';
COMMENT ON COLUMN tripwire_user_profile.onboarding_completed IS 'Flag indicating if onboarding tour is complete';
COMMENT ON COLUMN tripwire_user_profile.onboarding_step IS 'Current onboarding step (0-5)';
COMMENT ON COLUMN tripwire_user_profile.preferences IS 'User preferences and settings (JSONB)';

-- ==========================================
-- 8. VERIFICATION QUERIES
-- ==========================================

-- To verify tables were created:
-- SELECT COUNT(*) FROM tripwire_users;
-- SELECT COUNT(*) FROM tripwire_user_profile;

-- To test inserting a user:
-- INSERT INTO tripwire_users (email, status)
-- VALUES ('test@example.com', 'active')
-- RETURNING *;
