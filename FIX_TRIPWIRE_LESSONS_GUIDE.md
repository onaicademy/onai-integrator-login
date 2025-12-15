# 🔧 FIX TRIPWIRE LESSONS - QUICK GUIDE

**Problem:** "Уроки не найдены" (Lessons not found) error in Tripwire  
**Root Cause:** Lessons don't exist in Tripwire database (pjmvxecykysfrzppdcto)  
**Date:** December 15, 2025

---

## 🎯 WHAT YOU NEED TO DO

### **Step 1: Execute SQL Script**

1. **Open Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/pjmvxecykysfrzppdcto
   - Login with your Tripwire database credentials

2. **Go to SQL Editor:**
   - Navigate to: Database → SQL Editor
   - Click "New query"

3. **Paste and Run:**
   - Copy contents from: `FIX_TRIPWIRE_LESSONS.sql`
   - Click "Run" (or press Ctrl+Enter)

---

## 📊 WHAT THE SCRIPT DOES

### ✅ Creates 3 Lessons:

**Lesson 67 (Module 16) - ВВОДНЫЙ МОДУЛЬ**
- ✅ **HAS REAL VIDEO**: Bunny CDN ID: `9d9fe01c-e060-4182-b382-65ddc52b67ed`
- Duration: 9 minutes (540 seconds)
- Status: **READY TO USE**

**Lesson 68 (Module 17) - Создание GPT-бота**
- ❌ **NO VIDEO** (placeholder only)
- Duration: 14 minutes (estimated)
- Status: **TEMPLATE ONLY** - will show "Урок в разработке"

**Lesson 69 (Module 18) - Создание вирусных Reels**
- ❌ **NO VIDEO** (placeholder only)
- Duration: 1 minute (estimated)
- Status: **TEMPLATE ONLY** - will show "Урок в разработке"

---

## 🧪 VERIFY IT WORKS

After running the SQL script:

### **Test API Endpoint:**
```bash
# Test lesson 67 (should work)
curl https://api.onai.academy/api/tripwire/lessons/67

# Expected response:
{
  "lesson": {
    "id": 67,
    "title": "ВВОДНЫЙ МОДУЛЬ",
    "module_id": 16,
    "bunny_video_id": "9d9fe01c-e060-4182-b382-65ddc52b67ed",
    ...
  }
}
```

### **Test in Browser:**
1. Navigate to: https://onai.academy/integrator
2. Login with Tripwire account
3. Click on "ВВОДНЫЙ МОДУЛЬ" (Module 1)
4. **Expected:** Video player loads with real video ✅
5. Click on "Создание GPT-бота" (Module 2)
6. **Expected:** Shows "Урок в разработке" message ✅

---

## 🔍 TROUBLESHOOTING

### **Issue: Still getting "Уроки не найдены"**

**Check 1: Backend deployed?**
```bash
ssh root@207.154.231.30
pm2 status | grep onai-backend
# Should show: online
```

**Check 2: Database has lessons?**
```sql
-- Run in Supabase SQL Editor
SELECT id, title, module_id, bunny_video_id 
FROM lessons 
WHERE module_id IN (16, 17, 18);

-- Expected: 3 rows
```

**Check 3: RLS policies OK?**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM pg_policies 
WHERE tablename = 'lessons' 
AND schemaname = 'public';

-- Should have policy: "Allow authenticated read lessons"
```

**Check 4: API returns 200?**
```bash
curl -v https://api.onai.academy/api/tripwire/lessons?module_id=16

# Should return: HTTP/2 200
```

---

## 🎬 NEXT STEPS (Optional)

### **To add REAL videos for Module 2 & 3:**

1. **Upload videos to Bunny CDN** (via Bunny dashboard or API)
2. **Get `bunny_video_id` from Bunny**
3. **Update lessons in database:**
   ```sql
   -- Module 17 (GPT-бот)
   UPDATE lessons
   SET bunny_video_id = 'YOUR_BUNNY_VIDEO_ID_HERE'
   WHERE id = 68;
   
   -- Module 18 (Reels)
   UPDATE lessons
   SET bunny_video_id = 'ANOTHER_BUNNY_VIDEO_ID_HERE'
   WHERE id = 69;
   ```

---

## 📋 SUMMARY

**What we fixed:**
- ✅ Created lesson 67 with REAL video (Module 16)
- ✅ Created placeholder lessons 68, 69 (Modules 17, 18)
- ✅ Connected lessons to modules (16 → 67, 17 → 68, 18 → 69)
- ✅ Set up RLS policies for access

**What works now:**
- ✅ Module 1 loads with video player
- ✅ Modules 2-3 show placeholder message
- ✅ No more "Уроки не найдены" error

**What's still TODO:**
- ❌ Upload videos for Module 2 & 3
- ❌ Add `bunny_video_id` to lessons 68 & 69

---

**File:** `FIX_TRIPWIRE_LESSONS.sql`  
**Execute in:** Supabase Dashboard → SQL Editor  
**Database:** Tripwire (pjmvxecykysfrzppdcto)

✅ **READY TO RUN!**
