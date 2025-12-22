-- =====================================================
-- TRIPWIRE DATABASE REQUIREMENTS (UI-VERIFIED)
-- Generated: 2024-12-04
-- Source: Frontend code analysis
-- =====================================================

-- =====================================================
-- ❌ FIELDS WE DON'T NEED (DO NOT ADD THESE)
-- =====================================================

-- ❌ DO NOT ADD to tripwire_user_profile:
-- xp INTEGER
-- level INTEGER
-- current_streak INTEGER
-- longest_streak INTEGER
-- last_activity_at TIMESTAMP

-- ❌ DO NOT CREATE these tables:
-- user_missions
-- user_goals
-- weekly_goals
-- leaderboards

-- =====================================================
-- ✅ REQUIRED TABLES (BASED ON UI)
-- =====================================================

-- 1. TRIPWIRE USER PROFILE
-- Used by: TripwireProfile.tsx, ProgressOverview.tsx
CREATE TABLE IF NOT EXISTS tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progress Tracking (SIMPLE, NO XP/LEVELS)
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 3, -- Always 3 for Tripwire
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Certificate
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  
  -- Admin Metadata
  added_by_manager_id UUID REFERENCES auth.users(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_tripwire_profile_user_id 
  ON tripwire_user_profile(user_id);

-- =====================================================

-- 2. TRIPWIRE PROGRESS (LESSON TRACKING)
-- Used by: TripwireLesson.tsx (video player)
CREATE TABLE IF NOT EXISTS tripwire_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripwire_user_id TEXT NOT NULL, -- Can be UUID or localStorage ID
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Video Progress (HONEST TRACKING)
  video_progress_percent INTEGER DEFAULT 0 CHECK (video_progress_percent >= 0 AND video_progress_percent <= 100),
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0, -- HONEST: No rewind counting
  
  -- Completion
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tripwire_user_id, lesson_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_user 
  ON tripwire_progress(tripwire_user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_lesson 
  ON tripwire_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_completed 
  ON tripwire_progress(is_completed);

-- =====================================================

-- 3. TRIPWIRE ACHIEVEMENTS (ONLY 3)
-- Used by: Achievements.tsx, TripwireProfile.tsx
CREATE TABLE IF NOT EXISTS tripwire_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Achievement Type (ONLY 3 TYPES)
  achievement_type TEXT NOT NULL CHECK (achievement_type IN (
    'module_1_completed',
    'module_2_completed',
    'module_3_completed'
  )),
  
  -- Display Info
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Iconify icon name (e.g., 'solar:cup-star-bold-duotone')
  
  -- Unlock Status
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, achievement_type)
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_tripwire_achievements_user 
  ON tripwire_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_tripwire_achievements_unlocked 
  ON tripwire_achievements(unlocked);

-- =====================================================

-- 4. TRIPWIRE CERTIFICATES
-- Used by: CertificateSection.tsx, TripwireProfile.tsx
CREATE TABLE IF NOT EXISTS tripwire_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Certificate Data
  certificate_url TEXT NOT NULL, -- R2/S3 URL
  full_name TEXT NOT NULL, -- Student name on certificate
  
  -- Timestamps
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_tripwire_certificates_user 
  ON tripwire_certificates(user_id);

-- =====================================================

-- 5. TRIPWIRE MATERIALS (LESSON ATTACHMENTS)
-- Used by: TripwireLesson.tsx (sidebar materials)
CREATE TABLE IF NOT EXISTS tripwire_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- File Info
  filename TEXT NOT NULL,
  display_name TEXT, -- Human-readable name
  file_url TEXT NOT NULL, -- R2/S3 URL
  file_size_bytes BIGINT,
  file_type TEXT, -- e.g., 'pdf', 'docx', 'zip'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lesson lookup
CREATE INDEX IF NOT EXISTS idx_tripwire_materials_lesson 
  ON tripwire_materials(lesson_id);

-- =====================================================

-- 6. LESSONS TABLE (EXISTING - ADD MISSING COLUMNS)
-- Used by: TripwireLesson.tsx, TripwireProductPage.tsx
-- Note: This table already exists, just adding missing columns

-- Add Bunny Stream video ID (HLS)
ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS bunny_video_id TEXT;

-- Add duration in minutes (for UI display)
ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Add AI-generated tips (shows in sidebar)
ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS ai_tips TEXT;

-- Add AI-generated description (contextual)
ALTER TABLE lessons 
  ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- =====================================================

-- 7. MODULES TABLE (EXISTING - NO CHANGES NEEDED)
-- Used by: TripwireProductPage.tsx
-- Already has: id, title, description, order_index, course_id

-- =====================================================
-- VALIDATION QUERIES
-- =====================================================

-- ✅ Verify no XP/Levels fields exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tripwire_user_profile' 
    AND column_name IN ('xp', 'level', 'current_streak', 'longest_streak')
  ) THEN
    RAISE EXCEPTION 'XP/Levels fields detected! Remove them immediately.';
  END IF;
END $$;

-- ✅ Verify Tripwire has exactly 3 modules
-- Note: Tripwire modules have IDs 16, 17, 18 in production
-- SELECT COUNT(*) FROM modules WHERE id IN (16, 17, 18);
-- Expected: 3

-- ✅ Verify achievement types are correct
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM tripwire_achievements 
    WHERE achievement_type NOT IN (
      'module_1_completed',
      'module_2_completed', 
      'module_3_completed'
    )
  ) THEN
    RAISE EXCEPTION 'Invalid achievement type detected!';
  END IF;
END $$;

-- =====================================================
-- SAMPLE DATA (FOR TESTING)
-- =====================================================

-- Insert 3 achievements for a user (template)
-- Replace 'USER_UUID' with actual user ID
/*
INSERT INTO tripwire_achievements (user_id, achievement_type, title, description, icon, unlocked)
VALUES 
  ('USER_UUID', 'module_1_completed', 'ПЕРВЫЙ ШАГ', 'Завершите первый модуль', 'solar:cup-star-bold-duotone', FALSE),
  ('USER_UUID', 'module_2_completed', 'НА ПУТИ К МАСТЕРСТВУ', 'Завершите второй модуль', 'fluent:rocket-24-filled', FALSE),
  ('USER_UUID', 'module_3_completed', 'ПОЧТИ У ЦЕЛИ', 'Завершите третий модуль', 'solar:bolt-circle-bold-duotone', FALSE)
ON CONFLICT (user_id, achievement_type) DO NOTHING;
*/

-- =====================================================
-- RLS POLICIES (SECURITY)
-- =====================================================

-- Enable RLS on all Tripwire tables
ALTER TABLE tripwire_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripwire_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripwire_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripwire_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tripwire_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY tripwire_profile_select_own 
  ON tripwire_user_profile FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can update their own profile
CREATE POLICY tripwire_profile_update_own 
  ON tripwire_user_profile FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can read their own progress
CREATE POLICY tripwire_progress_select_own 
  ON tripwire_progress FOR SELECT 
  USING (
    auth.uid()::text = tripwire_user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id::text = tripwire_user_id AND id = auth.uid())
  );

-- Policy: Users can insert/update their own progress
CREATE POLICY tripwire_progress_insert_own 
  ON tripwire_progress FOR INSERT 
  WITH CHECK (
    auth.uid()::text = tripwire_user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id::text = tripwire_user_id AND id = auth.uid())
  );

CREATE POLICY tripwire_progress_update_own 
  ON tripwire_progress FOR UPDATE 
  USING (
    auth.uid()::text = tripwire_user_id OR
    EXISTS (SELECT 1 FROM auth.users WHERE id::text = tripwire_user_id AND id = auth.uid())
  );

-- Policy: Users can read their own achievements
CREATE POLICY tripwire_achievements_select_own 
  ON tripwire_achievements FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can read their own certificate
CREATE POLICY tripwire_certificates_select_own 
  ON tripwire_certificates FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Everyone can read materials (public access)
CREATE POLICY tripwire_materials_select_all 
  ON tripwire_materials FOR SELECT 
  USING (TRUE);

-- =====================================================
-- PERFORMANCE INDEXES (ADDITIONAL)
-- =====================================================

-- Index for fast module progress queries
CREATE INDEX IF NOT EXISTS idx_tripwire_progress_module 
  ON tripwire_progress(lesson_id, is_completed);

-- Index for fast achievement queries by type
CREATE INDEX IF NOT EXISTS idx_tripwire_achievements_type 
  ON tripwire_achievements(achievement_type, unlocked);

-- =====================================================
-- TRIGGERS (AUTO-UPDATE timestamps)
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tripwire_user_profile
DROP TRIGGER IF EXISTS update_tripwire_profile_updated_at ON tripwire_user_profile;
CREATE TRIGGER update_tripwire_profile_updated_at
  BEFORE UPDATE ON tripwire_user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tripwire_progress
DROP TRIGGER IF EXISTS update_tripwire_progress_updated_at ON tripwire_progress;
CREATE TRIGGER update_tripwire_progress_updated_at
  BEFORE UPDATE ON tripwire_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for tripwire_achievements
DROP TRIGGER IF EXISTS update_tripwire_achievements_updated_at ON tripwire_achievements;
CREATE TRIGGER update_tripwire_achievements_updated_at
  BEFORE UPDATE ON tripwire_achievements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- ✅ VERIFICATION CHECKLIST:
-- [ ] No XP/Levels/Streaks fields
-- [ ] Only 3 achievement types
-- [ ] Honest video tracking (watch_time_seconds)
-- [ ] Certificate table exists
-- [ ] Materials table exists
-- [ ] RLS policies enabled
-- [ ] Indexes created
-- [ ] Triggers working

-- 📚 REFERENCE:
-- Full Spec: TRIPWIRE_PRODUCT_SPEC_FROM_UI.md
-- Quick Ref: TRIPWIRE_QUICK_REFERENCE.md

