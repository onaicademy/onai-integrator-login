# 🔴 URGENT: Perplexity AI Query - Data Not Showing Despite Fixes

## Problem Summary

Despite implementing all recommended fixes from the previous comprehensive report, the following issues persist:

### Issues Still Present

1. ❌ **Module duration displays "0 minutes"** even when lessons have videos
2. ❌ **Lesson count not displaying correctly** in modules
3. ❌ **Video duration_minutes not being saved** to database even with new uploads
4. ❌ **Backend fallback logic not working** - `duration_minutes` stays null even when `video_content.duration_seconds` exists

### What We've Already Done

✅ Implemented HTML5 Video API duration calculation on frontend  
✅ Send `duration_seconds` to backend during video upload  
✅ Backend receives and calculates `duration_minutes` from `duration_seconds`  
✅ Added fallback logic in backend to calculate from `video_content.duration_seconds`  
✅ Added fallback logic in frontend to calculate from `video_content`  
✅ Killed all processes and restarted with clean build  
✅ Browser cache cleared  

### Current Behavior

**API Response (GET /api/lessons?module_id=1):**
```json
{
  "lessons": [
    {
      "id": 18,
      "title": "Lesson Title",
      "duration_minutes": null,  // ❌ Still null!
      "video_url": "https://...",
      "video_content": [
        {
          "id": "...",
          "duration_seconds": null  // ❌ Also null!
        }
      ]
    }
  ]
}
```

**Frontend Display:**
- "Время прохождения модуля: 0 минут (2 урока)" ❌

## Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Video Storage**: Bunny CDN
- **API Client**: Custom fetch wrapper (`src/utils/apiClient.ts`)

## Code Implemented

### Frontend: Duration Calculation (src/components/admin/LessonEditDialog.tsx)

```typescript
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.round(video.duration);
      console.log(`⏱️ Длительность видео: ${duration} секунд`);
      resolve(duration);
    };
    
    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(0);
    };
    
    video.src = URL.createObjectURL(file);
  });
};

// During upload
const durationSeconds = await getVideoDuration(videoFile);
const formData = new FormData();
formData.append('video', videoFile);
formData.append('duration_seconds', durationSeconds.toString());
await api.post(`/api/videos/upload/${lessonId}`, formData);
```

### Backend: Video Upload (backend/src/routes/videos.ts)

```typescript
const durationSeconds = req.body.duration_seconds ? parseInt(req.body.duration_seconds) : null;
const durationMinutes = durationSeconds ? Math.round(durationSeconds / 60) : null;

const updateData: any = { video_url: cdnUrl };
if (durationMinutes && durationMinutes > 0) {
  updateData.duration_minutes = durationMinutes;
  console.log(`✅ Сохраняем длительность: ${durationMinutes} минут`);
}

const { data: lesson, error } = await supabase
  .from('lessons')
  .update(updateData)
  .eq('id', parseInt(lessonId))
  .select()
  .single();
```

### Backend: Fallback Logic (backend/src/routes/lessons.ts)

```typescript
if (lessons) {
  for (const lesson of lessons) {
    const hasDuration = lesson.duration_minutes && lesson.duration_minutes > 0;
    const hasVideo = lesson.video_content && Array.isArray(lesson.video_content) && lesson.video_content.length > 0;
    
    if (!hasDuration && hasVideo) {
      const video = lesson.video_content[0];
      if (video && video.duration_seconds && video.duration_seconds > 0) {
        lesson.duration_minutes = Math.round(video.duration_seconds / 60);
        console.log(`✅ Вычислена длительность: ${lesson.duration_minutes} минут`);
      }
    }
  }
}
```

## Database Schema

### Tables

**lessons:**
```sql
- id (uuid)
- module_id (uuid, FK)
- title (text)
- description (text)
- duration_minutes (integer) -- ❌ Always null
- video_url (text)
- order_index (integer)
- created_at (timestamp)
- updated_at (timestamp)
```

**video_content:**
```sql
- id (uuid)
- lesson_id (uuid, FK)
- filename (text)
- file_size_bytes (bigint)
- duration_seconds (integer) -- ❌ Always null
- video_url (text)
- r2_object_key (text)
- created_at (timestamp)
```

## Questions for Perplexity AI

### Primary Question

**Why is `duration_minutes` not being saved to the database even though:**
1. Frontend calculates duration correctly (verified in console)
2. Frontend sends `duration_seconds` in FormData
3. Backend receives the data (should be in `req.body.duration_seconds`)
4. Backend code updates the `lessons` table with `duration_minutes`

### Specific Issues to Address

1. **FormData not parsed correctly?**
   - Backend uses `multer` for multipart form data
   - Does `req.body.duration_seconds` work with `multer`?
   - Should we use `req.file` metadata instead?

2. **Supabase update not working?**
   - Is the `update()` query syntax correct?
   - Should we use `upsert()` instead?
   - Are there any Supabase-specific issues with updating after file upload?

3. **Database constraints?**
   - Could there be triggers or constraints preventing the update?
   - Should we check foreign key relationships?

4. **video_content table not being used?**
   - We're updating `lessons.duration_minutes` directly
   - Should we be creating/updating a record in `video_content` table instead?
   - Is there a relationship issue between `lessons` and `video_content`?

5. **Multer + FormData issue?**
   - When using `multer.single('video')`, can we also access `req.body.duration_seconds`?
   - Or should we use `multer.fields()` to handle both file and fields?

### Example Implementation Request

Please provide a **working example** of:

1. **Frontend**: How to send video file + metadata (duration) in a single request
2. **Backend**: How to receive and save both the file and metadata using:
   - Express.js + TypeScript
   - Multer for file upload
   - Supabase JS Client for database
3. **Database**: Proper schema for storing video metadata

### Additional Context

- We're using **Bunny CDN** for video storage, not Supabase Storage
- Video upload works fine - videos appear on CDN and `video_url` is saved
- Only the **duration metadata** is not being saved
- We need to support **both new uploads** and **existing videos** (fallback from `video_content.duration_seconds`)

## Expected Solution

We need a solution that:

1. ✅ Saves `duration_minutes` to `lessons` table during video upload
2. ✅ Optionally saves `duration_seconds` to `video_content` table
3. ✅ Works with existing Multer + Bunny CDN setup
4. ✅ Properly parses FormData with both file and text fields
5. ✅ Provides fallback for existing videos without duration

## Code References

- Frontend upload: `src/components/admin/LessonEditDialog.tsx` (lines 318-371)
- Backend video route: `backend/src/routes/videos.ts` (lines 125-201)
- Backend lessons route: `backend/src/routes/lessons.ts` (lines 1-100)
- API Client: `src/utils/apiClient.ts`

## Priority

🔴 **CRITICAL** - This blocks the entire platform's ability to show module completion times to students.

---

**Please provide a detailed, working solution with code examples that addresses the root cause of why metadata is not being saved alongside file uploads in our specific stack.**

