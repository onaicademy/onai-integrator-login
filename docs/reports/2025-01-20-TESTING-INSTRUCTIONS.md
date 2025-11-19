# 🧪 Testing Instructions - RLS Fix Validation

**Date:** January 20, 2025  
**Fix Applied:** Supabase Authorization header + adminSupabase client  
**Status:** Ready for testing

---

## 🎯 What Was Fixed

### Root Cause
Service role key was only setting `apikey` header, but Supabase RLS checks the `Authorization: Bearer` header.

### Solution Applied
1. Created `backend/src/config/supabase.ts` with proper Authorization header
2. Updated all backend routes to use `adminSupabase` client
3. Added backward compatibility export
4. Built successfully (0 errors)

---

## ✅ Pre-Testing Checklist

- [x] Backend build successful (`npm run build`)
- [x] All routes updated to use `adminSupabase`
- [x] Configuration file created with Authorization header
- [ ] Backend started (check logs)
- [ ] Frontend started (check localhost)
- [ ] Test video upload
- [ ] Verify database updates

---

## 🧪 Test Plan

### Test 1: Backend Health Check

**Command:**
```bash
curl http://localhost:3000/api/health
```

**Expected output:**
```json
{
  "status": "ok"
}
```

**Success criteria:** Returns 200 OK

---

### Test 2: Backend Logs - Authorization Header

**Check:**
Open backend console and look for:

```
✅ Admin Supabase client initialized with service_role_key
   URL: https://arqhkacellqbhjhbebfh.supabase.co
   Authorization: Bearer ***<last 8 chars>
```

**Success criteria:** Authorization header is logged

---

### Test 3: Video Upload (Primary Fix Test)

**Steps:**
1. Open frontend: `http://localhost:5173` or `http://localhost:8080`
2. Login as admin (email/password from your .env)
3. Navigate to any course
4. Open any module
5. Click "Добавить урок" or edit existing lesson
6. Upload a video file (any .mp4, .webm, etc.)
7. Wait for upload to complete

**Check backend logs for:**
```
📤 Загружаем видео на сервер...
  - Файл: <filename>
  - Размер: X MB
  - Длительность: Y секунд
  - Lesson ID: Z

✅ Admin Supabase client initialized with service_role_key
📊 Updating lesson Z with duration: X minutes
✅ Lesson updated: { id: Z, duration_minutes: X, video_url: '...', ... }
✅ Video_content saved: { lesson_id: Z, duration_seconds: Y, ... }
```

**Success criteria:**
- ✅ No errors in backend logs
- ✅ "Lesson updated" log shows `duration_minutes` value
- ✅ "Video_content saved" log shows `duration_seconds` value
- ✅ Frontend shows success toast
- ✅ Video appears in lesson

---

### Test 4: Database Verification

**Run in Supabase SQL Editor:**

```sql
-- Check most recent lesson with video
SELECT 
  id, 
  title, 
  duration_minutes, 
  video_url,
  updated_at
FROM lessons 
WHERE video_url IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

**Expected:**
- `duration_minutes` should have a value (NOT NULL)
- `video_url` should be Bunny CDN URL
- `updated_at` should be recent

**Check video_content table:**

```sql
SELECT 
  lesson_id,
  duration_seconds,
  file_size_bytes,
  filename,
  created_at
FROM video_content
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:**
- `duration_seconds` should match `duration_minutes * 60`
- `file_size_bytes` should match uploaded file size
- Record should exist for the lesson

---

### Test 5: Module Duration Display

**Steps:**
1. Navigate to the module that contains the uploaded video lesson
2. Check module stats at the top

**Check for:**
```
Время прохождения модуля: X часов Y минут (Z уроков)
```

**Example:**
```
Время прохождения модуля: 2 часа 15 минут (10 уроков)
```

**Success criteria:**
- Shows real duration (not "0 минут")
- Correctly sums all lesson durations
- Correct number of lessons

---

### Test 6: Drag & Drop Reordering

**Steps:**
1. Go to course page
2. Drag a module to a new position
3. Check network tab

**Expected:**
- No error toast
- Network request shows `success: true`
- Refresh page - order persists

**Success criteria:** No "Backend не возвращает success" error

---

### Test 7: Student Progress Tracking

**Steps:**
1. Login as a student (or use incognito/another browser)
2. Navigate to a module
3. Watch a video lesson
4. Mark it as completed

**Check:**
- Progress saves correctly
- Green checkmark appears
- Progress persists after refresh

---

### Test 8: Diagnostic Script (Optional)

**Run:**
```bash
cd backend
npx tsx src/scripts/test-rls.ts
```

**Expected output:**
```
🔍 Testing Supabase RLS bypass...

Test 1: Client Configuration
✅ SUPABASE_URL: https://...
✅ SERVICE_ROLE_KEY: eyJh...
✅ Admin client initialized with Authorization header

Test 2: SELECT query
✅ SELECT works: 3 rows
   Lessons: #1 - Title (5min)
            #2 - Title (10min)
            #3 - Title (15min)

Test 3: UPDATE query
   Updating lesson ID: 1
✅ UPDATE works: [...]

Test 4: Duration update
✅ Duration update works: 5 minutes

Test 5: video_content table
✅ video_content SELECT works: 3 rows

Test 6: RLS Policies
✅ RLS Policies found: 4
   - lessons.policy_name (ALL)
   - video_content.policy_name (ALL)
```

**Success criteria:** All tests show ✅

---

## 🚨 Troubleshooting

### Problem: Backend logs show "duration_minutes: NULL"

**Solution:**
1. Check if Authorization header is logged
2. Run diagnostic script
3. Check RLS policies in Supabase dashboard

### Problem: "Cannot find module '../config/supabase'"

**Solution:**
1. Verify `backend/src/config/supabase.ts` exists
2. Run `npm run build` again
3. Check for TypeScript errors

### Problem: "RLS policy violation"

**Solution:**
Run this SQL in Supabase:

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Admin full access to lessons" ON lessons;
DROP POLICY IF EXISTS "Admin full access to video_content" ON video_content;

-- Create simple policies
CREATE POLICY "Allow all for authenticated admins - lessons"
ON lessons
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for authenticated admins - video_content"
ON video_content
FOR ALL
USING (true)
WITH CHECK (true);
```

### Problem: Backend not starting

**Check:**
1. Port 3000 is not in use: `netstat -ano | findstr :3000`
2. `.env` file has correct values
3. `npm install` completed successfully

---

## 📊 Success Metrics

After testing, ALL of these should work:

1. ✅ Video duration saves to database
2. ✅ Module stats show correct duration
3. ✅ "Время прохождения модуля" displays real data
4. ✅ Drag & drop works without errors
5. ✅ Student progress tracking works
6. ✅ No RLS errors in logs
7. ✅ No "Backend не возвращает success" toasts

---

## 📝 Test Results Log

**Date:** _______________  
**Tester:** _______________

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Health Check | ⬜ Pass ⬜ Fail | |
| 2 | Authorization Header | ⬜ Pass ⬜ Fail | |
| 3 | Video Upload | ⬜ Pass ⬜ Fail | |
| 4 | Database Verification | ⬜ Pass ⬜ Fail | |
| 5 | Module Duration Display | ⬜ Pass ⬜ Fail | |
| 6 | Drag & Drop | ⬜ Pass ⬜ Fail | |
| 7 | Student Progress | ⬜ Pass ⬜ Fail | |
| 8 | Diagnostic Script | ⬜ Pass ⬜ Fail | |

**Overall Result:** ⬜ Pass ⬜ Fail

**Comments:**
_____________________________________________
_____________________________________________
_____________________________________________

---

## 🔄 Next Steps

### If All Tests Pass
1. ✅ Mark TODO #5 as completed
2. ✅ Commit changes with message: "fix: Add Authorization header to Supabase client (RLS fix)"
3. ✅ Ready for deployment to production

### If Tests Fail
1. Document which tests failed
2. Check backend logs for errors
3. Run diagnostic script
4. Review Supabase dashboard logs
5. Apply troubleshooting steps above

---

## 📚 Related Documents

- `docs/reports/2025-01-20-PERPLEXITY-RLS-INVESTIGATION.md` - Original problem research
- `docs/reports/2025-01-20-RLS-FIX-APPLIED.md` - Solution implementation details
- `backend/src/config/supabase.ts` - New configuration file
- `backend/src/scripts/test-rls.ts` - Diagnostic script

---

**Created by:** Cursor AI  
**Implementation Date:** January 20, 2025  
**Ready for Testing:** YES ✅

