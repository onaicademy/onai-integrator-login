# 📊 Supabase Database Migration Guide

## Database Schema for onAI Academy

This guide will help you set up the complete database schema for the onAI Academy educational platform.

---

## 🗂️ Database Structure

### Tables Overview

1. **users** - User accounts and profiles
2. **courses** - Course catalog
3. **modules** - Course modules
4. **lessons** - Individual lessons
5. **progress** - Student progress tracking
6. **achievements** - Achievement definitions
7. **user_achievements** - User achievement unlocks
8. **user_activity** - User activity logs

### Relationships

```
users
 ├─ user_activity
 ├─ progress
 ├─ user_achievements
courses
 ├─ modules
     ├─ lessons
         ├─ progress
```

---

## 🚀 Quick Apply Migration

### Option 1: Supabase Dashboard SQL Editor

1. **Open Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project: **onai-academy** (capdjvokjdivxjfddmx)

2. **Open SQL Editor**:
   - Click **SQL Editor** in the sidebar
   - Click **New query**

3. **Copy and Run Schema**:
   - Open `supabase/schema.sql` from this project
   - Copy **entire contents**
   - Paste into SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Tables**:
   - Go to **Table Editor**
   - You should see 8 tables created

### Option 2: Supabase CLI

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref capdjvokjdivxjfddmx

# Apply migration
supabase db push
```

---

## 📋 Schema Details

### 1. users
```sql
- id (uuid, PK)
- email (text, unique)
- full_name (text)
- avatar_url (text)
- role ('student' | 'admin')
- created_at (timestamp)
```

**RLS Policy**: Users can only read/edit their own data

---

### 2. courses
```sql
- id (uuid, PK)
- title (text)
- description (text)
- cover_image (text)
- total_xp (integer)
- created_at (timestamp)
```

**RLS Policy**: All authenticated users can read

---

### 3. modules
```sql
- id (uuid, PK)
- course_id (uuid, FK → courses.id)
- title (text)
- description (text)
- order_index (integer)
- created_at (timestamp)
```

**RLS Policy**: All authenticated users can read

---

### 4. lessons
```sql
- id (uuid, PK)
- module_id (uuid, FK → modules.id)
- title (text)
- video_url (text)
- duration (integer, seconds)
- order_index (integer)
- created_at (timestamp)
```

**RLS Policy**: All authenticated users can read

---

### 5. progress
```sql
- id (uuid, PK)
- user_id (uuid, FK → users.id)
- lesson_id (uuid, FK → lessons.id)
- is_completed (boolean)
- xp_earned (integer)
- updated_at (timestamp)
```

**RLS Policy**: Users can only manage their own progress

---

### 6. achievements
```sql
- id (uuid, PK)
- title (text)
- description (text)
- icon (text)
- rarity ('common' | 'rare' | 'epic' | 'legendary')
```

**RLS Policy**: All authenticated users can read

---

### 7. user_achievements
```sql
- id (uuid, PK)
- user_id (uuid, FK → users.id)
- achievement_id (uuid, FK → achievements.id)
- unlocked_at (timestamp)
```

**RLS Policy**: Users can only view their own achievements

---

### 8. user_activity
```sql
- id (uuid, PK)
- user_id (uuid, FK → users.id)
- page (text)
- action (text)
- meta (jsonb)
- created_at (timestamp)
```

**RLS Policy**: Users can only insert/view their own activity

---

## 🔒 Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

### Public Read Access
- courses
- modules  
- lessons
- achievements

### User-Specific Access
- users - own data only
- progress - own progress only
- user_achievements - own achievements only
- user_activity - own activity only

### Policy Examples

```sql
-- Example: Users can only see their own progress
CREATE POLICY "Users can manage only their own progress"
  ON progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Example: Anyone can read courses
CREATE POLICY "All users can read courses"
  ON courses FOR SELECT
  USING (true);
```

---

## ✅ Verification Steps

After applying migration:

### 1. Check Tables Created
```bash
# In Supabase Table Editor, you should see:
- users
- courses
- modules
- lessons
- progress
- achievements
- user_achievements
- user_activity
```

### 2. Check RLS Enabled
```sql
-- Run this query in SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'courses', 'modules', 'lessons', 
                    'progress', 'achievements', 'user_achievements', 'user_activity');
-- All should show: rowsecurity = true
```

### 3. Check Policies
```sql
-- View all policies
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 4. Test Data Insert
```sql
-- Test insert (should work)
INSERT INTO courses (title, description) 
VALUES ('Test Course', 'Testing the schema');

-- Test with authentication (in app)
const { data, error } = await supabase
  .from('courses')
  .select('*');
```

---

## 🧪 Sample Data (Optional)

After migration, you can add sample data:

```sql
-- Insert sample course
INSERT INTO courses (title, description, cover_image, total_xp) VALUES
('AI для бизнеса', 'Освойте искусственный интеллект для автоматизации бизнес-процессов', '/images/course-ai.jpg', 1000);

-- Get course ID (replace with actual ID)
INSERT INTO modules (course_id, title, description, order_index) VALUES
('YOUR_COURSE_ID', 'Введение в AI', 'Основы искусственного интеллекта', 1);

-- Insert sample achievement
INSERT INTO achievements (title, description, icon, rarity) VALUES
('Первый шаг', 'Заверши свой первый урок', '🎯', 'common');
```

---

## 🔄 If Migration Fails

### Re-run Migration

The `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so it's **safe to re-run**.

Just execute the script again in SQL Editor.

### Drop and Recreate (DANGER: Deletes all data!)

```sql
-- Only if you need to start fresh
DROP TABLE IF EXISTS user_activity CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS modules CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Then re-run schema.sql
```

### Fix Specific Policy

If a policy creation fails:

```sql
-- Drop the policy
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Recreate it from schema.sql
```

---

## 📊 Using in Application

### TypeScript Types

The generated types are in: `src/integrations/supabase/types.ts`

### Example Queries

```typescript
import { supabase } from '@/lib/supabase';

// Get all courses
const { data: courses } = await supabase
  .from('courses')
  .select('*');

// Get user progress
const { data: progress } = await supabase
  .from('progress')
  .select('*, lessons(*)')
  .eq('user_id', userId);

// Log user activity
await supabase
  .from('user_activity')
  .insert({
    page: '/course/123',
    action: 'view',
    meta: { course_id: '123' }
  });
```

---

## 🔗 Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/capdjvokjdivxjfddmx
- **SQL Editor**: https://supabase.com/dashboard/project/capdjvokjdivxjfddmx/sql
- **Table Editor**: https://supabase.com/dashboard/project/capdjvokjdivxjfddmx/editor
- **Authentication**: https://supabase.com/dashboard/project/capdjvokjdivxjfddmx/auth/users

---

## ✅ Success Checklist

After migration:

- [ ] All 8 tables created
- [ ] RLS enabled on all tables
- [ ] Policies created successfully
- [ ] Can insert test data
- [ ] Can query from application
- [ ] Users can only see own data
- [ ] Courses are publicly readable

---

**🎉 Database schema is ready for onAI Academy!**

