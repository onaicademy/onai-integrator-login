# 🏗️ ТЕХНИЧЕСКОЕ ЗАДАНИЕ: Унифицированная Архитектура Видео-Трекинга

**Дата:** 29 ноября 2025  
**Заказчик:** onAI Academy  
**Цель:** Создать единую систему авторизации и видео-аналитики для Tripwire и основной платформы

---

## 📋 ПРОБЛЕМА (Текущее Состояние)

### Tripwire Product
```typescript
// Авторизация: 
tripwire_user_id = "tripwire_tofrug7865" (cookie/localStorage)

// API Endpoints:
GET /api/tripwire/progress/29?tripwire_user_id=tripwire_tofrug7865
POST /api/tripwire/progress/update (?)

// Проблема:
❌ Нет JWT токена
❌ Endpoint /api/progress/update требует JWT → 401 Unauthorized
❌ Видео трекинг не работает
```

### Main Platform
```typescript
// Авторизация:
JWT token в localStorage (sb-arqhkacellqbhjhbebfh-auth-token)
user_id из Supabase auth

// API Endpoints:
POST /api/progress/update (требует Authorization: Bearer {JWT})

// Проблема:
❌ Tripwire пользователи не имеют JWT
❌ Разные схемы авторизации
```

---

## 🎯 ТРЕБОВАНИЯ

### Функциональные Требования

**FR-1: Унифицированная Авторизация**
- Tripwire и Main Platform должны использовать **одинаковый** механизм авторизации
- Если пользователь на Tripwire → создать "виртуальный" JWT для него
- Если пользователь на Main Platform → использовать Supabase JWT

**FR-2: Единый Endpoint для Video Progress**
- Один endpoint: `POST /api/progress/update`
- Должен работать для ОБЕИХ платформ
- Должен принимать JWT (реальный или виртуальный)

**FR-3: Identical Video Tracking Logic**
- Tripwire и Main Platform используют **одинаковый** VideoPlayer компонент
- Одинаковые events (play, pause, timeupdate)
- Одинаковые telemetry data

**FR-4: Database Schema Compatibility**
- Таблица `video_tracking` должна работать для обеих платформ
- `user_id` может быть:
  - Реальный Supabase user_id (Main Platform)
  - Виртуальный user_id из tripwire_user_id (Tripwire)

---

## 🏗️ ПРЕДЛАГАЕМАЯ АРХИТЕКТУРА

### ВАРИАНТ A: Virtual JWT для Tripwire (Рекомендуется)

#### Backend Changes

**1. Создать endpoint для генерации Virtual JWT**

```typescript
// backend/src/routes/tripwire.ts

/**
 * POST /api/tripwire/auth/token
 * 
 * Generates a temporary JWT for Tripwire users
 * Input: { tripwire_user_id: "tripwire_xxx" }
 * Output: { token: "eyJhbGc...", expires_in: 86400 }
 */
router.post('/auth/token', async (req, res) => {
  const { tripwire_user_id } = req.body;
  
  if (!tripwire_user_id || !tripwire_user_id.startsWith('tripwire_')) {
    return res.status(400).json({ error: 'Invalid tripwire_user_id' });
  }
  
  // Check if tripwire user exists in DB (or create virtual user)
  let user = await db.getOrCreateTripwireUser(tripwire_user_id);
  
  // Generate JWT (same format as Supabase)
  const token = jwt.sign(
    {
      sub: user.id, // user_id for video_tracking
      tripwire_user_id,
      role: 'tripwire_student',
      aud: 'authenticated',
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  res.json({
    token,
    user_id: user.id,
    expires_in: 86400,
  });
});
```

**2. Update Progress Endpoint to Accept Both Auth Types**

```typescript
// backend/src/routes/progress.ts

import { verifyJWT } from '../middleware/auth';

router.post('/update', verifyJWT, async (req, res) => {
  // Extract user_id from JWT (works for both Tripwire and Main)
  const userId = req.user.sub; // From JWT payload
  const isTripwire = req.user.role === 'tripwire_student';
  
  const {
    lesson_id,
    video_id,
    current_time,
    percentage,
    watched_segments,
    total_play_time,
    // ... other telemetry fields
  } = req.body;
  
  console.log(`📊 [Progress] Update from ${isTripwire ? 'Tripwire' : 'Main'} user: ${userId}`);
  
  // Upsert to video_tracking table
  const { data, error } = await adminSupabase
    .from('video_tracking')
    .upsert({
      user_id: userId,
      lesson_id,
      video_id,
      current_time,
      percentage,
      watched_segments,
      total_play_time,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,lesson_id'
    });
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  
  res.json({ success: true, data });
});
```

**3. Middleware: Unified JWT Verification**

```typescript
// backend/src/middleware/auth.ts

export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized: Invalid or missing authentication token' 
    });
  }
  
  const token = authHeader.substring(7);
  
  try {
    // Try Supabase JWT verification first
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (supabaseError) {
    try {
      // Fallback: Verify as Tripwire Virtual JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (tripwireError) {
      return res.status(401).json({ 
        error: 'Unauthorized: Invalid token' 
      });
    }
  }
};
```

#### Frontend Changes

**1. Create Tripwire Auth Hook**

```typescript
// src/hooks/useTripwireAuth.ts

export const useTripwireAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const tripwireUserId = getTripwireUserId(); // From cookie/localStorage
    
    const fetchToken = async () => {
      const response = await fetch('/api/tripwire/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripwire_user_id: tripwireUserId }),
      });
      
      const data = await response.json();
      
      // Store JWT in localStorage (same place as Main Platform)
      localStorage.setItem('tripwire_jwt', data.token);
      setToken(data.token);
      setUserId(data.user_id);
    };
    
    fetchToken();
  }, []);
  
  return { token, userId };
};
```

**2. Update VideoPlayer Usage in Tripwire**

```typescript
// src/pages/tripwire/TripwireLesson.tsx

import { useTripwireAuth } from '@/hooks/useTripwireAuth';

export const TripwireLesson = () => {
  const { token, userId } = useTripwireAuth();
  
  // Wait until we have token
  if (!token) {
    return <div>Initializing...</div>;
  }
  
  return (
    <VideoPlayer 
      videoId={video.bunny_video_id}
      mode="iframe" // Use simple iframe for Tripwire
      onTimeUpdate={(telemetry) => {
        // This will now work because we have JWT token
        updateProgress(telemetry, token);
      }}
    />
  );
};
```

**3. Update API Client to Use Tripwire Token**

```typescript
// src/utils/apiClient.ts

const getAuthToken = (): string | null => {
  // Try main platform token first
  const mainToken = localStorage.getItem('sb-arqhkacellqbhjhbebfh-auth-token');
  if (mainToken) {
    const session = JSON.parse(mainToken);
    return session.access_token;
  }
  
  // Fallback to Tripwire virtual JWT
  const tripwireToken = localStorage.getItem('tripwire_jwt');
  return tripwireToken;
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };
  
  // ... rest of apiRequest logic
};
```

---

### ВАРИАНТ B: Separate Endpoints (Проще, но дублирование)

#### Backend

```typescript
// Keep separate endpoints:
POST /api/tripwire/progress/update (no JWT, uses tripwire_user_id in body)
POST /api/progress/update (requires JWT for main platform)

// Both endpoints write to same video_tracking table
```

**Плюсы:**
- Проще реализовать
- Не нужен Virtual JWT

**Минусы:**
- Дублирование кода
- Разная логика авторизации
- Сложнее поддерживать

---

## 🗄️ DATABASE SCHEMA

### Users Table Enhancement

```sql
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tripwire_user_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS is_tripwire_user BOOLEAN DEFAULT FALSE;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_tripwire_id ON users(tripwire_user_id);
```

### Video Tracking Table (Already Exists)

```sql
CREATE TABLE IF NOT EXISTS video_tracking (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  lesson_id INTEGER NOT NULL,
  video_id VARCHAR(100),
  current_time INTEGER DEFAULT 0,
  percentage INTEGER DEFAULT 0,
  watched_segments JSONB DEFAULT '[]'::jsonb,
  total_play_time INTEGER DEFAULT 0,
  seek_forward_count INTEGER DEFAULT 0,
  seek_backward_count INTEGER DEFAULT 0,
  max_position_reached INTEGER DEFAULT 0,
  playback_speed_avg NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);
```

---

## 🔐 AUTHENTICATION FLOW

### Main Platform User
```
1. User logs in via Supabase Auth
2. Frontend receives JWT from Supabase
3. Store in localStorage: sb-arqhkacellqbhjhbebfh-auth-token
4. All API calls use: Authorization: Bearer {SUPABASE_JWT}
5. Backend verifies with SUPABASE_JWT_SECRET
```

### Tripwire User (NEW FLOW)
```
1. User visits /tripwire URL
2. Frontend generates tripwire_user_id (if not exists)
3. Call POST /api/tripwire/auth/token { tripwire_user_id }
4. Backend creates virtual user in DB (or finds existing)
5. Backend generates Virtual JWT with payload:
   {
     sub: user_id (UUID from DB),
     tripwire_user_id: "tripwire_xxx",
     role: "tripwire_student"
   }
6. Frontend stores in localStorage: tripwire_jwt
7. All API calls use: Authorization: Bearer {VIRTUAL_JWT}
8. Backend verifies with JWT_SECRET
```

---

## 🎬 VIDEO PLAYER ARCHITECTURE

### Component Hierarchy

```
VideoPlayer (Smart Wrapper)
  ├─ Mode Detection (automatic)
  │   ├─ Check: Is user authenticated with Supabase? → mode="hls"
  │   └─ Check: Is user on Tripwire? → mode="iframe"
  │
  ├─ MODE: HLS (Plyr + HLS.js)
  │   ├─ Full analytics
  │   ├─ Heatmap tracking
  │   ├─ Seek detection
  │   └─ Custom UI
  │
  └─ MODE: IFRAME (Bunny Embed)
      ├─ Simple postMessage events
      ├─ Safety Net timer
      ├─ Basic tracking
      └─ Reliable playback
```

### Unified Interface

```typescript
interface VideoPlayerProps {
  videoId: string;
  title?: string;
  onTimeUpdate?: (telemetry: VideoTelemetry) => void;
  onEnded?: () => void;
  autoPlay?: boolean;
  // NO mode prop - auto-detected
}

// Same telemetry format for both modes
interface VideoTelemetry {
  currentTime: number;
  duration: number;
  percentage: number;
  watchedSegments: [number, number][];
  totalPlayTime: number;
  seekForwardCount: number;
  seekBackwardCount: number;
  playbackSpeedAvg: number;
  maxPositionReached: number;
}
```

---

## 🔧 IMPLEMENTATION CHECKLIST

### Backend Tasks

- [ ] **Task 1:** Create `POST /api/tripwire/auth/token` endpoint
  - Input: `{ tripwire_user_id }`
  - Output: `{ token, user_id, expires_in }`
  - Logic: Get or create user, generate Virtual JWT

- [ ] **Task 2:** Create helper: `getOrCreateTripwireUser(tripwire_user_id)`
  ```sql
  INSERT INTO users (tripwire_user_id, is_tripwire_user, email, full_name)
  VALUES ('tripwire_xxx', true, 'tripwire_xxx@virtual.onai', 'Tripwire Student')
  ON CONFLICT (tripwire_user_id) DO UPDATE SET updated_at = NOW()
  RETURNING id;
  ```

- [ ] **Task 3:** Update `verifyJWT` middleware to accept BOTH:
  - Supabase JWT (verified with `SUPABASE_JWT_SECRET`)
  - Virtual JWT (verified with `JWT_SECRET`)

- [ ] **Task 4:** Update `POST /api/progress/update`:
  - Remove tripwire-specific logic
  - Extract `user_id` from `req.user.sub` (works for both)
  - No breaking changes to existing Main Platform users

- [ ] **Task 5:** Add migration:
  ```sql
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS tripwire_user_id VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_tripwire_user BOOLEAN DEFAULT FALSE;
  ```

### Frontend Tasks

- [ ] **Task 6:** Create `src/hooks/useTripwireAuth.ts`
  - Auto-generate `tripwire_user_id` if not exists
  - Call `/api/tripwire/auth/token` on mount
  - Store Virtual JWT in localStorage

- [ ] **Task 7:** Update `src/utils/apiClient.ts`
  - Check for Tripwire JWT first: `localStorage.getItem('tripwire_jwt')`
  - Fallback to Supabase JWT: `sb-arqhkacellqbhjhbebfh-auth-token`
  - Add to all requests: `Authorization: Bearer {token}`

- [ ] **Task 8:** Update `src/pages/tripwire/TripwireLesson.tsx`
  - Add `useTripwireAuth()` hook at component start
  - Wait for token before rendering VideoPlayer
  - Pass token to API calls

- [ ] **Task 9:** Update `VideoPlayer` component
  - Keep both modes: `iframe` and `hls`
  - Default to `iframe` for Tripwire (safer, no Plyr conflicts)
  - Default to `hls` for Main Platform (full analytics)

- [ ] **Task 10:** Update `src/hooks/useProgressUpdate.ts`
  - Should work identically for both platforms
  - No changes needed (uses apiClient which now handles both tokens)

---

## 🧪 TESTING SCENARIOS

### Test Case 1: Tripwire User - First Visit
```
1. User visits: http://localhost:8080/tripwire/module/1/lesson/29
2. Frontend generates: tripwire_user_id = "tripwire_abc123"
3. Call: POST /api/tripwire/auth/token
4. Receive Virtual JWT
5. Store in localStorage
6. VideoPlayer renders with mode="iframe"
7. User plays video
8. Every 10s: POST /api/progress/update with Virtual JWT
9. Backend saves to video_tracking table
10. Check DB: video_tracking has record for virtual user
```

### Test Case 2: Main Platform User
```
1. User logs in: saint@onaiacademy.kz
2. Supabase returns JWT
3. Store in localStorage
4. User visits: /course/1/module/1/lesson/5
5. VideoPlayer renders with mode="hls" (Plyr)
6. User plays video
7. Every 10s: POST /api/progress/update with Supabase JWT
8. Backend saves to video_tracking table
9. Check DB: video_tracking has record for real user
```

### Test Case 3: Tripwire User Completes Lesson
```
1. Tripwire user watches video for 80%
2. Progress updates every 10s
3. When percentage >= 80:
   - Button "ПОСМОТРИТЕ ВИДЕО" becomes enabled
4. User clicks "Complete Lesson"
5. POST /api/tripwire/progress/complete
6. lesson_progress table updated
```

---

## 📊 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED AUTH LAYER                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Main Platform User          Tripwire User                  │
│  ↓                           ↓                               │
│  Supabase Login              tripwire_user_id generated     │
│  ↓                           ↓                               │
│  JWT from Supabase           POST /tripwire/auth/token      │
│  ↓                           ↓                               │
│  Store: sb-xxx-auth-token    Virtual JWT created            │
│                              ↓                               │
│                              Store: tripwire_jwt            │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ↓
         ┌─────────────────────┐
         │   apiClient.ts      │
         │  (Auto-selects JWT) │
         └──────────┬──────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │ Authorization Header │
         │  Bearer {JWT}        │
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Backend Middleware  │
         │   verifyJWT()        │
         │  (Accepts both)      │
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  Extract user_id     │
         │  from JWT payload    │
         └──────────┬───────────┘
                    │
                    ↓
         ┌──────────────────────┐
         │  video_tracking DB   │
         │  (Same schema)       │
         └──────────────────────┘
```

---

## 🎯 SUCCESS CRITERIA

### Backend
- ✅ Virtual JWT endpoint works: `POST /api/tripwire/auth/token`
- ✅ Unified auth middleware accepts both JWT types
- ✅ Progress endpoint works for BOTH platforms
- ✅ No code duplication between Tripwire and Main

### Frontend
- ✅ Tripwire users automatically get Virtual JWT on page load
- ✅ Main Platform users continue using Supabase JWT
- ✅ Same VideoPlayer component works for both
- ✅ Same telemetry format sent to backend

### Database
- ✅ `video_tracking` table has records from BOTH platforms
- ✅ Virtual users stored in `users` table with `is_tripwire_user=true`
- ✅ No conflicts between user_id types

### UX
- ✅ Tripwire users don't see any auth prompts
- ✅ Video plays immediately on both platforms
- ✅ Progress tracks accurately on both platforms
- ✅ "Complete Lesson" button unlocks at 80% on both platforms

---

## ⚠️ SECURITY CONSIDERATIONS

### Virtual JWT Security
```typescript
// MUST include in Virtual JWT payload:
{
  sub: user_id,           // UUID from DB
  tripwire_user_id,       // For audit trail
  role: "tripwire_student", // Limited permissions
  exp: Date.now() + 86400, // 24h expiry
  iss: "onai-academy",    // Issuer
}

// MUST NOT allow Virtual JWT to:
- Access admin endpoints
- Modify other users' data
- Access paid content (unless tripwire grants access)
```

### Rate Limiting
```typescript
// Prevent abuse of /tripwire/auth/token endpoint
app.use('/api/tripwire/auth/token', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP
}));
```

---

## 📈 MIGRATION PLAN

### Phase 1: Backend (No Breaking Changes)
1. Add Virtual JWT endpoint
2. Update auth middleware
3. Deploy to staging
4. Test with curl

### Phase 2: Frontend (Backwards Compatible)
1. Add `useTripwireAuth` hook
2. Update `apiClient` to check both token types
3. Deploy to staging
4. Test on Tripwire pages

### Phase 3: Validation
1. Monitor logs for both auth types
2. Check `video_tracking` table for new records
3. Verify progress updates work on both platforms

### Phase 4: Production
1. Deploy backend first
2. Deploy frontend second
3. Monitor errors for 24h

---

## 🚀 DELIVERABLES

### Code Files to Create/Update

**Backend:**
1. `backend/src/routes/tripwire.ts` - Add `/auth/token` endpoint
2. `backend/src/middleware/auth.ts` - Update `verifyJWT`
3. `backend/src/routes/progress.ts` - Simplify to use unified auth
4. `backend/src/helpers/tripwireUser.ts` - Helper functions

**Frontend:**
5. `src/hooks/useTripwireAuth.ts` - NEW
6. `src/utils/apiClient.ts` - Update token selection
7. `src/pages/tripwire/TripwireLesson.tsx` - Add auth hook
8. `src/components/VideoPlayer/BunnyPlayer.tsx` - Keep hybrid approach

**Database:**
9. Migration: `add_tripwire_user_columns.sql`

**Documentation:**
10. `AUTHENTICATION_ARCHITECTURE.md` - Complete auth flow docs
11. `VIDEO_TRACKING_API.md` - API documentation

---

## 💡 RECOMMENDED APPROACH

**Я рекомендую ВАРИАНТ A (Virtual JWT)** потому что:

✅ **Единый code path** - один endpoint для прогресса  
✅ **Безопасность** - JWT стандарт, проверенный временем  
✅ **Масштабируемость** - легко добавить новые типы пользователей  
✅ **Maintenance** - меньше дублирования кода  
✅ **Testing** - проще тестировать один endpoint  

---

## ⏱️ ESTIMATE

- **Backend implementation:** 4 часа
- **Frontend integration:** 3 часа
- **Testing:** 2 часа
- **Documentation:** 1 час
- **Total:** ~10 часов (1-2 рабочих дня)

---

## 🎬 NEXT ACTIONS

**Вопросы для Принятия Решений:**

1. **Virtual JWT или Separate Endpoints?**
   - Рекомендация: Virtual JWT (Вариант A)

2. **Какой режим VideoPlayer для Tripwire?**
   - Рекомендация: `mode="iframe"` (надежнее, нет React конфликтов)

3. **Создавать ли реальные user records для Tripwire?**
   - Рекомендация: ДА (для совместимости с video_tracking FK)

4. **JWT Secret - использовать отдельный или общий?**
   - Рекомендация: Отдельный `JWT_SECRET` для Virtual JWT (безопаснее)

---

**Жду ваших решений по этим пунктам, чтобы начать имплементацию!** 🚀

---

**Автор:** AI Architect  
**Статус:** Awaiting Product Owner Decision  
**Приоритет:** HIGH (блокирует видео-трекинг на Tripwire)

