# ⚡ TRIPWIRE QUICK REFERENCE

**Last Updated:** 2024-12-04

---

## 🎯 WHAT IS TRIPWIRE?

Trial learning platform for "Integrator: 0 to $1000" course.
- **3 Modules** (sequential unlock)
- **Video Lessons** (Bunny Stream HLS)
- **3 Achievements** (one per module)
- **Certificate** (after all 3 modules)
- **AI Curator** (24/7 chat assistant)

---

## ❌ WHAT TRIPWIRE **DOES NOT** HAVE

```
❌ XP / Levels
❌ Streaks
❌ Leaderboards
❌ Weekly Goals
❌ Missions / Quests
❌ Homework Submission
```

**⚠️ DO NOT BUILD THESE!**

---

## ✅ WHAT TRIPWIRE **DOES** HAVE

```
✅ 3 Modules (IDs: 16, 17, 18)
✅ Video Progress Tracking (80% threshold)
✅ Lesson Materials (PDFs)
✅ AI Curator (text, voice, files)
✅ 3 Achievements (module completion)
✅ Certificate Generation
✅ Profile Page
```

---

## 🗄️ DATABASE TABLES (REQUIRED)

### **tripwire_user_profile**
```
user_id, modules_completed, total_modules (=3), 
completion_percentage, certificate_issued, certificate_url
```

### **tripwire_progress**
```
tripwire_user_id, lesson_id, video_progress_percent,
watch_time_seconds, is_completed, completed_at
```

### **tripwire_achievements**
```
user_id, achievement_type, title, description, icon,
unlocked, unlocked_at
```

### **tripwire_certificates**
```
user_id, certificate_url, issued_at, full_name
```

### **tripwire_materials**
```
lesson_id, filename, display_name, file_url, file_size_bytes
```

---

## 🎓 3 MODULES

| ID  | Title                  | Duration | Lessons | Icon       | Status        |
|-----|------------------------|----------|---------|------------|---------------|
| 16  | Вводный модуль         | 45 min   | 1       | Brain      | Always Active |
| 17  | Создание GPT-бота      | 60 min   | 1       | Bot        | Locked        |
| 18  | Создание вирусных Reels| 50 min   | 1       | Clapperboard | Locked      |

**Unlock Logic:**
- Module 1: Always unlocked
- Module 2: Unlocks when Module 1 is 100% complete
- Module 3: Unlocks when Module 2 is 100% complete

---

## 🏆 3 ACHIEVEMENTS

| Type                | Title                  | Icon                              | Color     |
|---------------------|------------------------|-----------------------------------|-----------|
| module_1_completed  | ПЕРВЫЙ ШАГ             | solar:cup-star-bold-duotone       | #00FF94   |
| module_2_completed  | НА ПУТИ К МАСТЕРСТВУ   | fluent:rocket-24-filled           | #3B82F6   |
| module_3_completed  | ПОЧТИ У ЦЕЛИ           | solar:bolt-circle-bold-duotone    | #F59E0B   |

---

## 📹 VIDEO TRACKING (HONEST)

**Rule:** Only count seconds where video is ACTIVELY PLAYING (no rewind/seek)

```javascript
// CORRECT Algorithm
onTimeUpdate(currentTime) {
  if (!isSeeking && currentTime > lastPosition) {
    const delta = currentTime - lastPosition;
    if (delta > 0 && delta < 2) { // Reasonable delta
      totalWatchedSeconds += delta;
    }
  }
  lastPosition = currentTime;
}

// Completion Threshold
const progress = (totalWatchedSeconds / videoDuration) * 100;
const canComplete = progress >= 80; // 80% rule
```

---

## 🌐 CRITICAL API ENDPOINTS

```
POST   /api/tripwire/login
GET    /api/tripwire/lessons?module_id=:id
GET    /api/tripwire/lessons/:id
GET    /api/tripwire/videos/:lessonId
GET    /api/tripwire/materials/:lessonId
GET    /api/tripwire/progress/:lessonId?tripwire_user_id=:id
POST   /api/tripwire/progress
POST   /api/tripwire/complete
GET    /api/tripwire/module-progress/:moduleId
POST   /api/tripwire/unlock-achievement
GET    /api/tripwire/module-unlocks/:userId
POST   /api/tripwire/module-unlocks/mark-shown
```

---

## 🎨 BRAND COLORS

```css
--neon-green: #00FF88  /* Primary CTA */
--void: #030303        /* Background */
--surface: #0A0A0A     /* Cards */
--panel: #0F0F0F       /* Panels */
--text-dim: #9CA3AF    /* Secondary text */
```

---

## 🚀 USER FLOW (5 STEPS)

```
1. Login → /tripwire/login
2. Landing → /tripwire/home (course overview)
3. Product Page → /tripwire (3 modules)
4. Lesson Page → /tripwire/module/:id/lesson/:id
5. Profile → /tripwire/profile (achievements, certificate)
```

---

## ⚠️ COMMON MISTAKES

1. ❌ Adding XP/Levels fields → **NOT NEEDED**
2. ❌ Counting rewind as watch time → **MUST BE HONEST**
3. ❌ Allowing completion before 80% → **ENFORCE THRESHOLD**
4. ❌ Using 24 achievements → **ONLY 3**
5. ❌ Using `video_url` → **USE `bunny_video_id`**

---

## ✅ VALIDATION CHECKLIST

Before deploying services:

- [ ] No XP/Levels/Streaks fields in DB
- [ ] Honest video tracking (80% threshold)
- [ ] 3 achievements (not 24)
- [ ] Module unlock is sequential
- [ ] Bunny Stream HLS (not Storage)
- [ ] AI Curator endpoints ready
- [ ] Certificate generation works
- [ ] Materials table exists
- [ ] Tripwire DB isolated from Main DB

---

**Full Spec:** `TRIPWIRE_PRODUCT_SPEC_FROM_UI.md`

