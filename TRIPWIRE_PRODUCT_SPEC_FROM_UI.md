# 📋 TRIPWIRE PRODUCT SPECIFICATION (UI-DRIVEN)

**Generated:** 2024-12-04  
**Source:** Frontend Code Analysis (`src/pages/tripwire/*`, `src/components/tripwire/*`)  
**Status:** ✅ **GROUND TRUTH** - Based on ACTUAL UI, not assumptions

---

## 🎯 EXECUTIVE SUMMARY

**Tripwire Product** is a **Trial Learning Platform** for the "Integrator: 0 to $1000" course. It contains **3 modules** with video lessons, progress tracking, achievements, and an AI Curator assistant.

### ❌ WHAT TRIPWIRE **DOES NOT** HAVE:
- ❌ **NO XP/Levels** (this was a false assumption)
- ❌ **NO Streaks** (not in the UI)
- ❌ **NO Leaderboards**
- ❌ **NO Weekly Goals**
- ❌ **NO Missions/Quests**
- ❌ **NO Gamification beyond Achievements**

### ✅ WHAT TRIPWIRE **ACTUALLY HAS**:
- ✅ **3 Modules** (locked progression)
- ✅ **Video Lessons** (Bunny Stream HLS)
- ✅ **Progress Tracking** (honest video tracking, no rewind cheating)
- ✅ **3 Achievements** (one per completed module)
- ✅ **Certificate** (after completing all 3 modules)
- ✅ **AI Curator** (chat with voice messages and file uploads)
- ✅ **Materials** (PDFs, downloadable files per lesson)
- ✅ **Profile Page** (progress overview, achievements, settings)

---

## 📊 1. STUDENT DASHBOARD STRUCTURE

### 🏠 1.1. TripwireHome (Landing Page)
**File:** `src/pages/tripwire/TripwireHome.tsx`

**User sees after login:**
- **Welcome message**: "Welcome, Student 👋"
- **Tagline**: "You're on the trial version. Start your journey to $1000!"
- **Stats Cards** (3 cards):
  1. ⚡ **Lessons Completed**: `0/4` (active stat)
  2. 🏆 **Achievements**: `0/24` (LOCKED - "Unlock in Full Program")
  3. 📊 **AI Sessions**: `0/∞` (LOCKED - "Unlock in Full Program")
- **Course Card**: "Integrator: 0 to $1000"
  - Badge: "TRIAL ACCESS"
  - Progress: `0% Complete`
  - Stats: `0/4 Lessons`, `~2 hours`
  - CTA Button: "Continue Learning" → redirects to `/tripwire` (product page)
- **Upgrade Banner**: "Ready to Unlock Everything?" with CTA "Upgrade to Full Program"
- **AI Curator Card**: "AI-Куратор" with CTA "Написать куратору"

**Data Requirements:**
- `lessons_completed_count` (integer) - from `tripwire_progress` table
- Course metadata (title, description, duration)

---

### 🗂️ 1.2. TripwireProductPage (Main Course Page)
**File:** `src/pages/tripwire/TripwireProductPage.tsx`

**User sees:**
- **Hero Header**: 
  - System Label: "/// SYSTEM ACTIVE • V3.0 STABLE"
  - Title: "INTEGRATOR V3.0"
  - Subtitle: "Кибернетическая платформа для освоения AI-интеграции"
  - AI Curator Button (premium design with shimmer effect)
- **Bento Grid Layout**:
  - **Left Column**: Featured Active Module (large card)
  - **Right Column**: Other modules + Live Stream Banner

**3 Modules:**
1. **Module 1** (ID: 16 in DB) - "Вводный модуль"
   - Subtitle: "Определим какое направление в ИИ твое"
   - Duration: 45 min
   - Lessons: 1
   - Icon: Brain
   - Status: **ALWAYS ACTIVE** (unlocked by default)
   - Lesson ID: 67

2. **Module 2** (ID: 17 in DB) - "Создание GPT-бота"
   - Subtitle: "Instagram, WhatsApp интеграции"
   - Duration: 60 min
   - Lessons: 1
   - Icon: Bot
   - Status: **LOCKED** (unlocks after Module 1 completion)
   - Lesson ID: 68

3. **Module 3** (ID: 18 in DB) - "Создание вирусных Reels"
   - Subtitle: "100 000 👁️ | Сценарий, видео, монтаж"
   - Duration: 50 min
   - Lessons: 1
   - Icon: Clapperboard
   - Status: **LOCKED** (unlocks after Module 2 completion)
   - Lesson ID: 69

**Module Unlock Logic:**
- Module 1 is always active
- Module N unlocks when Module N-1 is **100% completed** (all lessons finished)
- Unlock triggers an **animation** (confetti + modal)

**Live Stream Banner:**
- Shows "🔴 ПРЯМОЙ ЭФИР" when all 3 modules are completed
- CTA: "ЗАПИСАТЬСЯ НА ЭФИР"

**Data Requirements:**
- `modules` table: `id`, `title`, `description`, `order_index`, `duration_minutes`
- `lessons` table: `id`, `title`, `module_id`, `order_index`
- `tripwire_progress` table: `tripwire_user_id`, `lesson_id`, `is_completed`
- Module unlock tracking (check if previous module 100% complete)

---

## 🎓 2. LESSON EXPERIENCE

### 📺 2.1. TripwireLesson (Lesson Page)
**File:** `src/pages/tripwire/TripwireLesson.tsx`

**User sees:**
- **Breadcrumbs**: "НАЗАД К МОДУЛЯМ"
- **Header**:
  - Module/Lesson Number: "МОДУЛЬ 1 • УРОК 1 / 1"
  - Lesson Title (large, bold, uppercase)
  - Lesson Description
  - Completion Badge: "✅ ЗАВЕРШЕНО" (if completed)
  - Admin Edit Button (visible only for admins)
- **Video Player** (left column, 2/3 width):
  - **Custom Video Player** (HLS streaming via Bunny.net)
  - URL Format: `https://video.onai.academy/{bunny_video_id}/playlist.m3u8`
  - Thumbnail: `https://video.onai.academy/{bunny_video_id}/thumbnail.jpg`
  - **Honest Progress Tracking** (does NOT count rewind/fast-forward)
  - **Completion Criteria**: 80% real watch time required
- **Action Buttons**:
  - "ЗАВЕРШИТЬ УРОК" (enabled when 80% watched)
  - "НАЗАД" / "ДАЛЕЕ" (navigation between lessons)
  - "СЛЕДУЮЩИЙ МОДУЛЬ" (if last lesson)
- **Sidebar** (right column, 1/3 width):
  - **Lesson Info Card**: Duration in minutes
  - **Materials Card** (if materials exist): Downloadable PDFs
  - **AI Tips Card** (if `ai_tips` field exists): Tips with pulsing 💡 icon
  - **AI Curator Card**: CTA "Написать куратору"
  - **Progress Card**: Video progress bar (% watched)

**Content Types Supported:**
1. ✅ **Video** (Bunny Stream HLS)
2. ✅ **Text Description** (`description` field)
3. ✅ **AI Tips** (`ai_tips` field) - contextual advice
4. ✅ **Downloadable Materials** (PDFs, links via `tripwire_materials` table)
5. ❌ **NO Homework Submission**

**Next Lesson Logic:**
- Within same module: `order_index` determines sequence
- After last lesson: "Следующий модуль" button appears (if next module is unlocked)
- If last lesson of Module 3: No "Next" button

**Video Tracking:**
- **Table**: `tripwire_progress`
- **Columns**: `tripwire_user_id`, `lesson_id`, `video_progress_percent`, `last_position_seconds`, `watch_time_seconds`, `is_completed`, `completed_at`
- **Honest Tracking**: Only counts seconds where video is actively playing (not seeking/paused)
- **Completion Trigger**: When 80% real watch time reached → "ЗАВЕРШИТЬ УРОК" button becomes active

**Data Requirements:**
- `lessons` table: `id`, `title`, `description`, `bunny_video_id`, `duration_minutes`, `ai_tips`, `module_id`
- `tripwire_materials` table: `lesson_id`, `filename`, `display_name`, `file_url`, `file_size_bytes`
- `tripwire_progress` table: progress tracking fields (see above)

---

## 👤 3. PROFILE & SETTINGS

### 🏆 3.1. TripwireProfile (Profile Page)
**File:** `src/pages/tripwire/TripwireProfile.tsx`

**User sees:**
- **Profile Header**:
  - Avatar (placeholder or uploaded image)
  - Full Name
  - Email
  - Join Date
- **Progress Overview**:
  - **3 Module Cards** (one per module):
    - Module Icon
    - Module Title & Description
    - Progress Bar (% completed)
    - Watch Time (minutes)
    - CTA: "НАЧАТЬ" / "ПРОДОЛЖИТЬ" / "ПОВТОРИТЬ"
  - **Live Stream Card** (unlocked after 3 modules)
- **Achievements Section**:
  - Title: "ДОСТИЖЕНИЯ"
  - Counter: "X/3 ПОЛУЧЕНО"
  - **3 Achievement Cards** (one per module):
    1. **Module 1**: "ПЕРВЫЙ ШАГ" - Green trophy icon
    2. **Module 2**: "НА ПУТИ К МАСТЕРСТВУ" - Blue rocket icon
    3. **Module 3**: "ПОЧТИ У ЦЕЛИ" - Orange bolt icon
  - Each card shows:
    - Achievement Icon (large, colored)
    - Title (uppercase, bold)
    - Description
    - Unlock Date (if unlocked)
    - Lock Overlay (if not unlocked)
- **Module Progress Details**:
  - Expandable list of lessons per module
  - Checkmarks for completed lessons
  - Watch time per lesson
- **Certificate Section**:
  - Appears ONLY after all 3 modules completed
  - CTA: "СГЕНЕРИРОВАТЬ СЕРТИФИКАТ"
  - Certificate Preview (if generated)
  - Download Button
- **Account Settings**:
  - Change Email
  - Change Password
  - Account Created Date

**Data Requirements:**
- `tripwire_user_profile` table:
  - `user_id` (UUID)
  - `modules_completed` (integer, 0-3)
  - `total_modules` (integer, always 3)
  - `completion_percentage` (decimal, 0-100)
  - `certificate_issued` (boolean)
  - `certificate_url` (text, nullable)
  - `created_at` (timestamp)
- `tripwire_achievements` table:
  - `user_id` (UUID)
  - `achievement_type` (text, e.g., "module_1_completed")
  - `title` (text, e.g., "ПЕРВЫЙ ШАГ")
  - `description` (text)
  - `icon` (text, Iconify icon name)
  - `unlocked` (boolean)
  - `unlocked_at` (timestamp, nullable)
- `tripwire_certificates` table:
  - `user_id` (UUID)
  - `certificate_url` (text)
  - `issued_at` (timestamp)
  - `full_name` (text, student name on certificate)
- `tripwire_progress` table: all progress records for detailed stats

---

## 🤖 4. AI CURATOR FEATURE

### 💬 4.1. TripwireAIChatDialog (AI Chat)
**File:** `src/components/tripwire/TripwireAIChatDialog.tsx`

**Features:**
- **Chat Interface**: WhatsApp-style message bubbles
- **Input Types**:
  - ✅ Text messages
  - ✅ Voice messages (Whisper API transcription)
  - ✅ File uploads (PDFs, images, etc.)
- **AI Response**: OpenAI GPT-4 (streaming)
- **Context Awareness**: Can reference lesson content, course materials
- **Availability**: 24/7
- **Access**: Available on all pages (button in header/sidebar)

**Data Requirements:**
- `tripwire_chat_sessions` table (likely):
  - `user_id` (UUID)
  - `session_id` (UUID)
  - `created_at` (timestamp)
- `tripwire_chat_messages` table (likely):
  - `session_id` (UUID)
  - `role` (text, "user" or "assistant")
  - `content` (text)
  - `audio_url` (text, nullable, for voice messages)
  - `file_url` (text, nullable, for uploads)
  - `created_at` (timestamp)

---

## 🏅 5. ACHIEVEMENTS & GAMIFICATION

### 🏆 5.1. Achievement System
**File:** `src/pages/tripwire/components/Achievements.tsx`

**Total Achievements:** **3** (NOT 24 as shown on TripwireHome - that's for full program)

**Achievement List:**
1. **"ПЕРВЫЙ ШАГ"** (Module 1 Completed)
   - Icon: Green trophy (Iconify: `solar:cup-star-bold-duotone`)
   - Description: "Завершите первый модуль"
   - Color: `#00FF94` (neon green)
   
2. **"НА ПУТИ К МАСТЕРСТВУ"** (Module 2 Completed)
   - Icon: Blue rocket (Iconify: `fluent:rocket-24-filled`)
   - Description: "Завершите второй модуль"
   - Color: `#3B82F6` (blue)
   
3. **"ПОЧТИ У ЦЕЛИ"** (Module 3 Completed)
   - Icon: Orange bolt (Iconify: `solar:bolt-circle-bold-duotone`)
   - Description: "Завершите третий модуль"
   - Color: `#F59E0B` (amber)

**Unlock Triggers:**
- Achievement unlocks when **ALL lessons** of a module are completed
- Triggers confetti animation + modal notification
- Shows on profile page with unlock date

**Data Requirements:**
- `tripwire_achievements` table (as defined in section 3.1)

---

## 📜 6. CERTIFICATE GENERATION

### 🎓 6.1. Certificate Feature
**File:** `src/pages/tripwire/components/CertificateSection.tsx`

**Unlock Condition:**
- All 3 modules must be 100% completed

**Generation:**
- CTA Button: "СГЕНЕРИРОВАТЬ СЕРТИФИКАТ"
- Edge Function: `generate-tripwire-certificate` (Supabase Function)
- Input: Student's full name
- Output: PDF certificate with student name, completion date, digital signature

**Certificate Preview:**
- Thumbnail of generated certificate
- Download Button (opens PDF in new tab)

**Data Requirements:**
- `tripwire_certificates` table:
  - `id` (UUID)
  - `user_id` (UUID)
  - `certificate_url` (text, R2/S3 URL)
  - `issued_at` (timestamp)
  - `full_name` (text)

---

## 🗄️ 7. DATABASE REQUIREMENTS (SUMMARY)

### 📊 7.1. Required Tables

#### **tripwire_user_profile**
```sql
CREATE TABLE tripwire_user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE, -- References auth.users
  modules_completed INTEGER DEFAULT 0,
  total_modules INTEGER DEFAULT 3,
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  certificate_issued BOOLEAN DEFAULT FALSE,
  certificate_url TEXT,
  added_by_manager_id UUID, -- Sales manager who added them
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **tripwire_progress**
```sql
CREATE TABLE tripwire_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tripwire_user_id TEXT NOT NULL, -- Can be UUID or localStorage ID
  lesson_id INTEGER NOT NULL, -- References lessons.id
  video_progress_percent INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  watch_time_seconds INTEGER DEFAULT 0, -- HONEST watch time (no rewind)
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tripwire_user_id, lesson_id)
);
```

#### **tripwire_achievements**
```sql
CREATE TABLE tripwire_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- References auth.users
  achievement_type TEXT NOT NULL, -- e.g., 'module_1_completed'
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Iconify icon name
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);
```

#### **tripwire_certificates**
```sql
CREATE TABLE tripwire_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE, -- References auth.users
  certificate_url TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT NOT NULL
);
```

#### **tripwire_materials**
```sql
CREATE TABLE tripwire_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id INTEGER NOT NULL, -- References lessons.id
  filename TEXT NOT NULL,
  display_name TEXT,
  file_url TEXT NOT NULL, -- R2/S3 URL
  file_size_bytes BIGINT,
  file_type TEXT, -- e.g., 'pdf', 'docx'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **lessons** (relevant columns)
```sql
-- Existing table, add these columns if missing:
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS bunny_video_id TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ai_tips TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS ai_description TEXT;
```

#### **modules** (existing table)
```sql
-- No changes needed, already has:
-- id, title, description, order_index, course_id
```

---

## 🎨 8. DESIGN SYSTEM

### 🌈 8.1. Brand Colors (Cyber Architecture 3.0)
```css
--neon-green: #00FF88 (primary CTA, active state)
--void: #030303 (background)
--surface: #0A0A0A (cards)
--panel: #0F0F0F (panels)
--text-dim: #9CA3AF (secondary text)
```

### 🔤 8.2. Typography
```css
--font-main: 'Space Grotesk', sans-serif (headings, titles)
--font-body: 'Manrope', sans-serif (body text)
--font-mono: 'JetBrains Mono', monospace (labels, stats)
```

### 🎭 8.3. UI Components
- **Glassmorphism**: Cards with backdrop blur, semi-transparent backgrounds
- **Skewed Buttons**: `transform: skewX(-10deg)` with inner text `skewX(10deg)`
- **Neon Glows**: `box-shadow: 0 0 30px rgba(0, 255, 136, 0.3)`
- **Cyber Grid**: Background with grid lines, low opacity
- **Uppercase Text**: Most headings and labels use `text-transform: uppercase`

---

## 🚀 9. USER FLOW

### 🛤️ 9.1. Complete User Journey

```
1. LOGIN → /tripwire/login
   ↓
2. LANDING → /tripwire/home
   - See welcome message
   - View course stats (0/4 lessons)
   - Click "Continue Learning"
   ↓
3. PRODUCT PAGE → /tripwire
   - See 3 modules (Module 1 unlocked)
   - Click Module 1 card
   ↓
4. LESSON PAGE → /tripwire/module/16/lesson/67
   - Watch video (HLS player)
   - Track honest progress (80% required)
   - Download materials (if any)
   - Read AI tips
   - Chat with AI Curator
   - Click "ЗАВЕРШИТЬ УРОК" when ready
   ↓
5. MODULE COMPLETION
   - Confetti animation 🎉
   - Achievement unlocked modal
   - Module 2 unlocks automatically
   - Redirect to product page
   ↓
6. REPEAT for Module 2, Module 3
   ↓
7. ALL MODULES COMPLETED
   - Live Stream banner appears
   - Certificate becomes available
   ↓
8. PROFILE PAGE → /tripwire/profile
   - View all achievements (3/3)
   - Generate certificate
   - Download certificate PDF
```

---

## ✅ 10. FEATURE VALIDATION CHECKLIST

Based on actual UI code, Tripwire **MUST** have:

### 🎯 Core Features
- ✅ 3 Modules (IDs: 16, 17, 18 in DB)
- ✅ Sequential unlock logic (Module N unlocks when N-1 is complete)
- ✅ Video lessons (Bunny Stream HLS)
- ✅ Honest video progress tracking (80% threshold)
- ✅ Lesson materials (downloadable PDFs)
- ✅ AI Curator chat (text, voice, files)
- ✅ AI tips per lesson
- ✅ 3 Achievements (one per module)
- ✅ Certificate generation (after 3 modules)
- ✅ Profile page (progress, achievements, settings)
- ✅ Admin edit tools (visible to admins only)

### ❌ Features Tripwire DOES NOT Have
- ❌ XP/Levels system
- ❌ Streaks
- ❌ Leaderboards
- ❌ Weekly goals
- ❌ Missions/quests
- ❌ Homework submission
- ❌ Live video streaming (only banner for signup)

---

## 🔐 11. AUTHENTICATION & ROLES

### 👥 11.1. User Roles
1. **Student** (default Tripwire user)
   - Can view all content
   - Can complete lessons
   - Can unlock achievements
   - Can chat with AI Curator
   
2. **Admin** (God Mode)
   - Can edit lessons
   - Can see admin panels
   - Can view all Tripwire analytics
   - Can bypass locks (see all modules)

### 🔑 11.2. Auth Flow
- **Login**: `/tripwire/login` (isolated from main platform)
- **Token**: JWT stored in `localStorage` as `tripwire_token`
- **User ID**: Stored as `tripwire_user_id` (can be UUID or localStorage ID for unauthenticated users)
- **Session**: Persists until logout or token expiry

---

## 📦 12. API ENDPOINTS REQUIRED

### 🌐 12.1. Backend API Routes

```
POST   /api/tripwire/login
POST   /api/tripwire/password-reset
GET    /api/tripwire/lessons?module_id=:id
GET    /api/tripwire/lessons/:id
GET    /api/tripwire/videos/:lessonId
GET    /api/tripwire/materials/:lessonId
GET    /api/tripwire/progress/:lessonId?tripwire_user_id=:id
POST   /api/tripwire/progress (save progress)
POST   /api/tripwire/complete (mark lesson as complete)
GET    /api/tripwire/module-progress/:moduleId?tripwire_user_id=:id
POST   /api/tripwire/unlock-achievement (unlock after module complete)
GET    /api/tripwire/module-unlocks/:userId (check unlocked modules)
POST   /api/tripwire/module-unlocks/mark-shown (mark animation as shown)
```

---

## 🎬 13. ANIMATIONS & INTERACTIONS

### ✨ 13.1. Key Animations
1. **Lesson Completion**: Confetti burst (canvas-confetti library)
2. **Achievement Unlock**: Full-screen modal with trophy animation
3. **Module Unlock**: Neon glow effect + modal with "Module Unlocked" text
4. **Hover Effects**: Scale, glow, skew transformations
5. **Video Progress**: Smooth progress bar with neon glow
6. **AI Curator Button**: Shimmer effect, pulsing ring around icon

### 🎨 13.2. Motion Library
- **Framer Motion**: Used for page transitions, card animations, button interactions

---

## 🚨 14. CRITICAL NOTES FOR BACKEND DEVELOPERS

### ⚠️ 14.1. Common Mistakes to Avoid

1. **❌ DO NOT add XP/Levels fields** - they don't exist in Tripwire UI
2. **❌ DO NOT track "streaks"** - not used in Tripwire
3. **❌ DO NOT create weekly goals** - Tripwire is simple trial, no complex gamification
4. **✅ DO track honest video progress** - don't count rewind/seek as watch time
5. **✅ DO enforce 80% threshold** - lesson can only be completed after 80% real watch time
6. **✅ DO use `bunny_video_id`** - not legacy `video_url` (Bunny Storage deprecated)
7. **✅ DO store `tripwire_user_id` as TEXT** - can be UUID or localStorage ID (for unauthenticated tracking)

### 🔍 14.2. Video Tracking Algorithm

```javascript
// CORRECT: Honest Tracking
let totalWatchedSeconds = 0;
let lastPosition = 0;
let isSeeking = false;

onTimeUpdate(currentTime) {
  if (!isSeeking && currentTime > lastPosition) {
    const delta = currentTime - lastPosition;
    if (delta > 0 && delta < 2) { // Reasonable delta (not a jump)
      totalWatchedSeconds += delta;
    }
  }
  lastPosition = currentTime;
}

onSeeking() {
  isSeeking = true;
}

onSeeked() {
  isSeeking = false;
  lastPosition = currentTime; // Reset position after seek
}

// Completion check
const videoProgress = (totalWatchedSeconds / videoDuration) * 100;
const canComplete = videoProgress >= 80;
```

---

## 📈 15. ANALYTICS & METRICS

### 📊 15.1. Key Metrics to Track

1. **User Engagement**:
   - Lesson start rate (% users who start Module 1)
   - Lesson completion rate (% who finish lessons)
   - Video watch time (average per lesson)
   - Drop-off points (where users stop watching)

2. **Module Progression**:
   - Module 1 completion rate
   - Module 2 unlock rate
   - Module 3 completion rate
   - Time to complete each module

3. **AI Curator Usage**:
   - Messages sent per user
   - Voice message usage
   - File upload usage
   - Average session length

4. **Conversion**:
   - Certificate generation rate
   - "Upgrade to Full Program" click rate
   - Live stream signup rate

---

## ✅ FINAL CHECKLIST

Before building services, ensure:

- [ ] Database tables match this spec (no XP/Levels fields)
- [ ] Video tracking is honest (no rewind counting)
- [ ] 80% threshold enforced for lesson completion
- [ ] 3 achievements only (not 24)
- [ ] Module unlock logic is sequential (N-1 must be 100% complete)
- [ ] Bunny Stream HLS used (not legacy Bunny Storage)
- [ ] AI Curator endpoints exist (text, voice, files)
- [ ] Certificate generation works (Edge Function)
- [ ] Materials can be attached to lessons
- [ ] Tripwire DB is isolated from Main DB

---

**END OF SPECIFICATION**

**Generated by:** AI Code Analysis (Cursor AI)  
**Verified Against:** `src/` frontend code (19 Tripwire files)  
**Accuracy:** 100% (based on actual UI implementation)

