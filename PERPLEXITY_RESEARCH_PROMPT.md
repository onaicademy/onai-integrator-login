# 🔍 Perplexity Research Prompt: Tripwire Platform Critical Issues

## CONTEXT
Educational LMS platform on React + TypeScript + Supabase with **7 CRITICAL BUGS** blocking students.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Auth)
- Video: Bunny CDN HLS + Plyr + hls.js
- State: React Query

## TASK
Analyze these architectural problems and provide **specific code solutions**:

---

## 🔴 PROBLEM #1: Dual Video Tracking System Conflict

**Issue:** Code references non-existent table causing data loss.

```typescript
// Hook supports 2 tables but only 1 exists
tableName: 'video_tracking' | 'tripwire_progress' = 'video_tracking'

// DB has: video_tracking ✅
// DB missing: tripwire_progress ❌
```

**Impact:**
- Progress NOT saving
- "Complete" button never activates
- 17% false completion rate

**Questions:**
1. Best practice: unified video_tracking OR split video_tracking + student_progress?
2. How to sync: video completion (80%) → student_progress.status = 'completed'?
3. Industry standard: trigger, application logic, or middleware?
4. Examples from Canvas LMS, Moodle, Open edX?

## 🔴 PROBLEM #2: Three Different User IDs for Same Person

**Issue:** Data inconsistency from mixing IDs.

```typescript
// ID #1: tripwire_users.id (separate UUID)
// ID #2: auth.users.id (Supabase Auth)
// ID #3: users.id = auth.users.id

// Video tracking uses auth.users.id
useHonestVideoTracking(lessonId, mainUserId);

// Completion API uses tripwire_users.id ❌
api.post('/api/tripwire/complete', { tripwire_user_id });
```

**Questions:**
1. Single source of truth: auth.users.id everywhere?
2. Is separate tripwire_users.id necessary or anti-pattern?
3. How do Netflix/YouTube/Coursera handle user identity in multi-tenant systems?

## 🔴 PROBLEM #3: 17% Completion Rate (Should be 80%+)

**Issue:** Funnel ignores video_tracking, counts only student_progress.status = 'completed'.

**Reality:**
- Students watch 85% video → video_tracking ✅
- Button "Complete" doesn't work → student_progress stays 'in_progress' ❌
- Stats show: NOT COMPLETED (false negative)

**Questions:**
1. Correct completion formula for LMS?
2. How to auto-sync: video_tracking.watch_percentage ≥ 80% → student_progress.completed?
3. PostgreSQL trigger vs application logic?
4. Industry examples: Udemy, Coursera completion tracking?

## 🔴 PROBLEM #4: No Video Fallback (5-10% Users Can't Play)

**Issue:** Old browsers/devices without HLS fail silently.

```typescript
if (Hls.isSupported()) { /* modern */ }
else if (video.canPlayType('application/vnd.apple.mpegurl')) { /* Safari */ }
// ❌ NO FALLBACK - video just doesn't load!
```

**Questions:**
1. Which browsers DON'T support HLS? (IE11, old Android, UC Browser?)
2. Best fallback: MP4 progressive download vs external player?
3. How does YouTube handle old browser compatibility?
4. iOS autoplay restrictions - workarounds?

## 🔴 PROBLEM #5: Race Conditions - Cascading Load Failures

**Issue:** Sequential async loads fail entire chain if one fails.

```typescript
loadUser() → loadLesson() → loadModule()
// If #1 fails → #2 never runs → user sees "Not found" ❌
```

**Questions:**
1. Best pattern: React Query orchestration vs Promise.all vs state machine?
2. Retry strategy: exponential backoff config for educational platforms?
3. How do production React apps handle cascading failures?
4. Error boundaries + Sentry setup examples?

## 🔴 PROBLEM #6: Disabled Onboarding Blocks Access

**Issue:** Comment says "students can't start learning" when onboarding disabled.

**Questions:**
1. Should onboarding be mandatory or optional?
2. Best UX: blocking onboarding vs skippable tutorial?
3. How do Duolingo/Coursera handle first-time user flow?

---

## 🎯 WHAT I NEED FROM PERPLEXITY:

### 1. Architecture Decisions
- Unified vs split tracking system (with code examples)
- User identity: auth.users.id as single source of truth?
- PostgreSQL triggers vs application logic for sync?

### 2. Code Solutions
- TypeScript code for unified tracking
- React Query retry config (exponential backoff)
- HLS fallback implementation
- Error boundary + Sentry setup

### 3. Industry Best Practices
- How do Coursera/Udemy/edX handle:
  - Video completion tracking?
  - User progress sync?
  - Mobile compatibility?
- Open-source LMS examples (Canvas, Moodle)

### 4. Mobile/Browser Compatibility
- Browsers WITHOUT HLS support (full list)
- iOS autoplay workarounds
- Progressive enhancement strategy

### 5. Statistics Formula
- Correct completion rate calculation
- Funnel conversion tracking best practices
- SQL for accurate analytics

---

## 🚀 EXPECTED OUTPUT:

1. **Root cause analysis** for each problem
2. **Specific code fixes** (TypeScript + SQL)
3. **Migration strategy** (zero-downtime)
4. **Testing approach** (what to test for each fix)
5. **Priority order** (which to fix first)

---

## ⚡ KEY QUESTIONS:

1. PostgreSQL trigger vs app logic for video_tracking → student_progress sync?
2. Which DB indexes needed for video_tracking JSONB queries?
3. WebSocket vs polling for real-time progress?
4. How to handle video load failures gracefully?

**Find real examples from production LMS systems. Code > Theory!** 🙏
