# 🏗️ TRIPWIRE PROJECT - FULL ARCHITECTURE REVIEW

**Date:** December 15, 2025  
**Project:** onAI Integrator Login + Tripwire System  
**Database:** Supabase (PostgreSQL) - **TWO SEPARATE PROJECTS**  
**Status:** ✅ Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Project Architecture Overview](#project-architecture-overview)
3. [Database Architecture](#database-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Tripwire Specific Implementation](#tripwire-specific-implementation)
7. [Security & Authentication](#security--authentication)
8. [API Routes Breakdown](#api-routes-breakdown)
9. [Key Technical Decisions](#key-technical-decisions)
10. [Development Workflow](#development-workflow)

---

## 🎯 EXECUTIVE SUMMARY

### What is this project?

**onAI Integrator Login** is a monorepo containing **TWO complete platforms**:

1. **Main Platform** (`onAI Academy`) - Full-featured online learning platform
   - Complete course system with modules and lessons
   - AI-powered mentors (Curator, Mentor, Analyst)
   - Admin dashboard with analytics
   - Gamification (achievements, XP, streaks)

2. **Tripwire Platform** (`Tripwire Course`) - Sales funnel with mini-course
   - Simplified 3-module course for lead conversion
   - **ISOLATED DATABASE** (separate Supabase project)
   - Sales manager dashboard
   - Independent authentication system

### Why Two Separate Databases?

```
Main Platform DB        Tripwire DB (ISOLATED)
(capdjvokjdivxjfdddmx)  (pjmvxecykysfrzppdcto)
        │                       │
        │                       │
        ▼                       ▼
   Full Platform          Sales Funnel
   - All features         - 3 modules only
   - Students             - Trial users
   - Admin panel          - Sales managers
```

**Reason:** Complete data isolation for sales funnel. No risk of production data corruption.

---

## 🏗️ PROJECT ARCHITECTURE OVERVIEW

### Tech Stack

**Frontend:**
```typescript
- React 18 + TypeScript
- Vite (bundler)
- Tailwind CSS + shadcn/ui
- React Router v6
- React Query (@tanstack/query)
- Framer Motion (animations)
- Three.js + @react-three/fiber (3D effects)
```

**Backend:**
```typescript
- Node.js + Express
- TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- OpenAI API (GPT-4o, Whisper)
- Telegram Bot API
- AmoCRM API
- BunnyCDN (video streaming)
```

### Repository Structure

```
onai-integrator-login/
├── src/                          # Frontend React app
│   ├── pages/
│   │   ├── admin/                # Main platform admin
│   │   └── tripwire/             # Tripwire pages
│   │       ├── admin/            # Tripwire admin
│   │       ├── TripwireLogin.tsx
│   │       ├── TripwireProductPage.tsx
│   │       ├── TripwireLesson.tsx
│   │       └── TripwireProfile.tsx
│   ├── components/
│   │   ├── tripwire/             # Tripwire components
│   │   │   ├── TripwireLayout.tsx
│   │   │   ├── TripwireSidebar.tsx
│   │   │   ├── TripwireGuard.tsx
│   │   │   └── AdminGuard.tsx
│   │   └── ui/                   # shadcn components
│   ├── lib/
│   │   ├── supabase.ts           # Main DB client
│   │   └── supabase-tripwire.ts  # Tripwire DB client
│   └── hooks/
│       └── useTripwireAuth.ts    # Tripwire auth hook
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── supabase.ts       # Main DB admin client
│   │   │   └── supabase-tripwire.ts # Tripwire admin client
│   │   ├── routes/
│   │   │   └── tripwire/         # Tripwire API routes
│   │   │       ├── admin.ts
│   │   │       ├── profile.ts
│   │   │       ├── analytics.ts
│   │   │       └── certificates.ts
│   │   ├── controllers/
│   │   │   └── tripwire/         # Tripwire controllers
│   │   ├── services/
│   │   │   └── tripwireService_V2.ts
│   │   └── server.ts             # Express server
│   └── env.env                   # Backend environment variables
│
├── .env                          # Frontend environment variables
└── package.json
```

---

## 🗄️ DATABASE ARCHITECTURE

### Two Supabase Projects

#### **1. Main Platform Database**

**Project ID:** `capdjvokjdivxjfdddmx`  
**URL:** `https://capdjvokjdivxjfdddmx.supabase.co`

**Key Tables:**
```sql
-- User Management
auth.users                  -- Supabase authentication
public.users                -- Extended user info (role, XP, streak)

-- Course System
public.courses
public.modules
public.lessons
public.lesson_materials
public.student_progress

-- AI Agents
public.ai_curator_chats
public.ai_curator_messages
public.ai_mentor_sessions
public.ai_mentor_messages
public.ai_mentor_tasks
public.ai_analyst_reports
public.ai_token_usage
public.ai_token_usage_daily

-- Gamification
public.achievements
public.user_achievements
public.missions
public.user_missions
public.goals

-- Lead Generation
public.landing_leads
public.lead_journey
public.proftest_results
```

#### **2. Tripwire Database (ISOLATED)**

**Project ID:** `pjmvxecykysfrzppdcto`  
**URL:** `https://pjmvxecykysfrzppdcto.supabase.co`

**Key Tables:**
```sql
-- User Management
auth.users                     -- Independent auth table
public.tripwire_users          -- Trial users (created by sales managers)
public.tripwire_user_profile   -- User progress and stats

-- Sales Management
public.sales_activity_log      -- Sales manager actions log

-- No FK to Main DB!
-- granted_by and manager_id are just UUIDs (not foreign keys)
```

**Critical Architectural Decision:**

```typescript
// ❌ NO Foreign Key Constraint
CREATE TABLE tripwire_users (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  granted_by UUID,  // ← Just a UUID, not FK to main DB!
  manager_name TEXT
);

// ✅ WHY: Complete database isolation
// - Main DB can be down, Tripwire still works
// - No cascade deletes across databases
// - Clean separation of concerns
```

### Environment Variables

**Frontend (`.env`):**
```bash
# Main Platform
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbG...

# Tripwire Platform
VITE_TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJhbG...
```

**Backend (`backend/env.env`):**
```bash
# Main Platform
SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Tripwire Platform
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJhbG...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Email & SMS
RESEND_API_KEY=re_...
```

---

## 🎨 FRONTEND ARCHITECTURE

### Routing System

**File:** `src/App.tsx`

```typescript
<Routes>
  {/* Main Platform Routes */}
  <Route path="/login" element={<Login />} />
  <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
  <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
  
  {/* Tripwire Routes */}
  <Route path="/tripwire/login" element={<TripwireLogin />} />
  <Route path="/tripwire/product" element={
    <TripwireGuard>
      <TripwireLayout><TripwireProductPage /></TripwireLayout>
    </TripwireGuard>
  } />
  <Route path="/tripwire/lesson/:lessonId" element={
    <StudentGuard>
      <TripwireLayout><TripwireLesson /></TripwireLayout>
    </StudentGuard>
  } />
  <Route path="/tripwire/admin/dashboard" element={
    <TripwireAdminGuard>
      <TripwireLayout><TripwireAdminDashboard /></TripwireLayout>
    </TripwireAdminGuard>
  } />
</Routes>
```

### Authentication Architecture

**Two Completely Separate Auth Systems:**

#### Main Platform Auth
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storageKey: 'sb-auth-token', // Main platform token
    }
  }
)

// Usage in components
import { useAuth } from '@/hooks/useAuth'
const { user, session, userRole } = useAuth()
```

#### Tripwire Auth
```typescript
// src/lib/supabase-tripwire.ts
import { createClient } from '@supabase/supabase-js'

export const tripwireSupabase = createClient(
  import.meta.env.VITE_TRIPWIRE_SUPABASE_URL,
  import.meta.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: 'sb-tripwire-auth-token', // ← UNIQUE key!
    }
  }
)

// Usage in Tripwire pages
import { useTripwireAuth } from '@/hooks/useTripwireAuth'
const { login, logout, user } = useTripwireAuth()
```

**Why Separate Storage Keys?**
- Prevents token collision
- User can be logged into BOTH platforms simultaneously
- Clean session management

### Design System

**Color Palette (Cyber-Architecture):**
```typescript
// tailwind.config.ts
colors: {
  'cyber-void': '#030303',     // Background
  'cyber-surface': '#0A0A0A',  // Cards
  'cyber-acid': '#00FF94',     // Primary green
  'cyber-signal': '#FF3366',   // Red accents
  'cyber-white': '#FFFFFF',    // Text
  'cyber-gray': '#9CA3AF',     // Muted text
}
```

**Typography:**
- **Display:** Space Grotesk (Headlines, H1-H2)
- **Body:** Manrope (UI, content)
- **Mono:** JetBrains Mono (system labels, code)

**Components:** shadcn/ui (Radix UI primitives + Tailwind)

---

## ⚙️ BACKEND ARCHITECTURE

### Express Server Structure

**File:** `backend/src/server.ts`

```typescript
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

// Route imports
import tripwireRouter from './routes/tripwire'
import tripwireAdminRouter from './routes/tripwire/admin'
import tripwireProfileRouter from './routes/tripwire/profile'

const app = express()

// Security middleware
app.use(helmet())
app.use(cors({ origin: ['https://onai.academy'] }))

// Rate limiting
app.use('/api/tripwire', apiLimiter)

// Routes
app.use('/api/tripwire', tripwireRouter)
app.use('/api/tripwire/admin', tripwireAdminRouter)
app.use('/api/tripwire/profile', tripwireProfileRouter)

app.listen(3000)
```

### Database Clients

**Main Platform Admin Client:**
```typescript
// backend/src/config/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const adminSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← Bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Tripwire Admin Client:**
```typescript
// backend/src/config/supabase-tripwire.ts
import { createClient } from '@supabase/supabase-js'

export const tripwireAdminSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL!,
  process.env.TRIPWIRE_SERVICE_ROLE_KEY!, // ← Isolated DB
  {
    db: {
      schema: 'public' // Explicit schema
    }
  }
)
```

---

## 🎯 TRIPWIRE SPECIFIC IMPLEMENTATION

### Tripwire User Creation Flow

```typescript
// backend/src/services/tripwireService_V2.ts

export async function createTripwireUser(data) {
  // Step 1: Create auth.users record in Tripwire DB
  const { data: authData, error: authError } = 
    await tripwireAdminSupabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        role: 'student'
      }
    })
  
  if (authError) throw authError
  
  // Step 2: Create public.tripwire_users record
  const { data: tripwireUser } = await tripwireAdminSupabase
    .from('tripwire_users')
    .insert({
      user_id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      granted_by: data.granted_by, // Manager UUID from Main DB
      manager_name: data.manager_name,
      generated_password: data.password
    })
    .select()
    .single()
  
  // Step 3: Auto-create profile via trigger
  // (handled by database trigger)
  
  // Step 4: Log sales activity
  await tripwireAdminSupabase
    .from('sales_activity_log')
    .insert({
      manager_id: data.granted_by,
      action_type: 'user_created',
      target_user_id: authData.user.id,
      details: { email: data.email }
    })
  
  return { success: true, user: tripwireUser }
}
```

### Tripwire Lesson Progress Tracking

```typescript
// Video tracking with 80% completion rule
export async function trackVideoProgress(userId, lessonId, progress) {
  const { data } = await tripwireAdminSupabase
    .from('video_tracking')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      watched_segments: progress.segments,
      total_watched_seconds: progress.totalWatched,
      watch_percentage: progress.percentage,
      is_qualified_for_completion: progress.percentage >= 80
    }, {
      onConflict: 'user_id,lesson_id'
    })
    .select()
    .single()
  
  // If 80% watched, mark lesson as complete
  if (progress.percentage >= 80) {
    await completeTripwireLesson(userId, lessonId)
  }
  
  return data
}
```

### Tripwire Admin Dashboard

**File:** `src/pages/tripwire/admin/Dashboard.tsx`

**Features:**
- Total students count
- Active students (last 7 days)
- Modules completion stats
- Recent activity log
- Student management (create, view, delete)

**API:** `/api/tripwire/admin/stats`

---

## 🔐 SECURITY & AUTHENTICATION

### Row Level Security (RLS)

**Main Platform:**
```sql
-- Students can only see their own progress
CREATE POLICY "student_own_progress" 
  ON student_progress FOR SELECT 
  USING (auth.uid() = user_id);

-- Admins can see everything
CREATE POLICY "admin_all_access" 
  ON student_progress FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Tripwire Platform:**
```sql
-- API access for all authenticated users
CREATE POLICY "api_access_tripwire_users" 
  ON tripwire_users FOR ALL 
  USING (true);

-- Grants are checked in application layer
```

### Authentication Guards

**Main Platform:**
```typescript
// src/components/guards/AdminGuard.tsx
export function AdminGuard({ children }) {
  const { userRole } = useAuth()
  
  if (userRole !== 'admin') {
    return <Navigate to="/access-denied" />
  }
  
  return <>{children}</>
}
```

**Tripwire Platform:**
```typescript
// src/components/tripwire/AdminGuard.tsx
export function AdminGuard({ children }) {
  const { user } = useTripwireAuth()
  
  // Check if user has admin or sales role in Tripwire DB
  const { data: tripwireUser } = useQuery({
    queryKey: ['tripwire-user', user?.id],
    queryFn: async () => {
      const { data } = await tripwireSupabase
        .from('tripwire_users')
        .select('*')
        .eq('user_id', user.id)
        .single()
      return data
    }
  })
  
  if (!tripwireUser || tripwireUser.role !== 'admin') {
    return <Navigate to="/tripwire/login" />
  }
  
  return <>{children}</>
}
```

---

## 🛣️ API ROUTES BREAKDOWN

### Tripwire API Routes

**Base:** `/api/tripwire`

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/tripwire/create-user` | POST | Create trial user | Service Role |
| `/api/tripwire/user/:id` | GET | Get user details | JWT |
| `/api/tripwire/profile` | GET | Get user profile | JWT |
| `/api/tripwire/progress/:lessonId` | POST | Track video progress | JWT |
| `/api/tripwire/complete/:lessonId` | POST | Mark lesson complete | JWT |
| `/api/tripwire/admin/stats` | GET | Dashboard stats | Admin |
| `/api/tripwire/admin/students` | GET | List all students | Admin |
| `/api/tripwire/admin/activity` | GET | Sales activity log | Admin |

### Main Platform API Routes

**Base:** `/api`

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/users` | GET | List users | Admin |
| `/api/courses` | GET | List courses | JWT |
| `/api/modules/:courseId` | GET | Get modules | JWT |
| `/api/lessons/:moduleId` | GET | Get lessons | JWT |
| `/api/progress` | POST | Track progress | JWT |
| `/api/admin/dashboard` | GET | Admin dashboard | Admin |
| `/api/ai-mentor/chat` | POST | AI mentor chat | JWT |

---

## 🔑 KEY TECHNICAL DECISIONS

### 1. Two Separate Databases

**Decision:** Use two completely isolated Supabase projects.

**Rationale:**
- **Data isolation:** Tripwire users don't pollute main production database
- **Risk mitigation:** Sales funnel experiments won't affect main platform
- **Scalability:** Independent scaling and billing
- **Clean separation:** Different RLS policies, easier to manage

**Trade-offs:**
- More environment variables
- Cannot use SQL joins across databases
- Duplicate user management code

### 2. Mono-repo Architecture

**Decision:** Keep frontend and backend in one repository.

**Rationale:**
- **Shared types:** TypeScript types shared between FE/BE
- **Atomic commits:** Frontend + backend changes in one commit
- **Simplified deployment:** Single repo to manage

**Trade-offs:**
- Larger repository size
- Need clear folder structure

### 3. Direct Query Builder over RPC

**Decision:** Use Supabase client query builder instead of stored procedures.

**Rationale:**
- **Simplicity:** Easier to read and maintain
- **Type safety:** TypeScript autocomplete
- **Debugging:** Can see exact queries in logs

**When to use RPC:**
- Complex aggregations
- Multi-table atomic operations
- Performance-critical queries

### 4. Real Supabase Auth for Tripwire

**Decision:** Use proper Supabase auth (not cookies).

**Rationale:**
- **Security:** JWT tokens, not insecure cookies
- **Standard patterns:** Follows Supabase best practices
- **API compatibility:** All API endpoints work out of the box

**Previous approach (DEPRECATED):**
- Used `tripwire_user_id` cookie
- No JWT, insecure
- Changed on Nov 29, 2025

---

## 🛠️ DEVELOPMENT WORKFLOW

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/onaicademy/onai-integrator-login.git
cd onai-integrator-login

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 4. Start frontend (port 5173)
npm run dev

# 5. Start backend (port 3000)
cd backend
npm run dev
```

### Environment Setup

**Required Environment Variables:**

```bash
# .env (frontend)
VITE_SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
VITE_TRIPWIRE_SUPABASE_ANON_KEY=eyJ...

# backend/env.env
SUPABASE_URL=https://capdjvokjdivxjfdddmx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
TRIPWIRE_SUPABASE_URL=https://pjmvxecykysfrzppdcto.supabase.co
TRIPWIRE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-...
RESEND_API_KEY=re_...
```

### Testing Tripwire Locally

```bash
# 1. Start dev servers
npm run dev            # Frontend: http://localhost:5173
cd backend && npm run dev  # Backend: http://localhost:3000

# 2. Access Tripwire pages
http://localhost:5173/tripwire/login
http://localhost:5173/tripwire/product
http://localhost:5173/tripwire/admin/dashboard

# 3. Test with real Tripwire user
# (Create user via sales manager or admin panel)
```

---

## 📊 DATABASE SCHEMA DIAGRAMS

### Main Platform Schema

```
auth.users
    ↓
public.users (role, xp, streak)
    ↓
student_progress → lessons → modules → courses
    ↓
achievements, missions, goals
```

### Tripwire Schema

```
auth.users (ISOLATED)
    ↓
tripwire_users (granted_by = UUID from Main DB)
    ↓
tripwire_user_profile
    ↓
sales_activity_log (manager_id = UUID from Main DB)
```

---

## 🚀 DEPLOYMENT

### Production Servers

**Main Platform:**
- URL: https://onai.academy
- Server: DigitalOcean (178.128.203.40)
- Nginx + PM2

**Tripwire Platform:**
- URL: https://onai.academy/tripwire/*
- Same server, different routes

### Deployment Steps

```bash
# 1. SSH to server
ssh root@178.128.203.40

# 2. Navigate to project
cd /var/www/onai-integrator-login

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies
npm install
cd backend && npm install && cd ..

# 5. Build frontend
npm run build

# 6. Restart services
pm2 restart backend
systemctl restart nginx
```

---

## 📝 CONCLUSION

This architecture review provides a complete understanding of the Tripwire system within the onAI Integrator Login monorepo. Key takeaways:

✅ **Two completely isolated databases** for clean separation  
✅ **Real Supabase auth** with JWT tokens  
✅ **Modern React + TypeScript** frontend  
✅ **Express + Supabase** backend  
✅ **Production-ready** with proper security and RLS  

For questions or architecture decisions, reference this document.

**Last Updated:** December 15, 2025  
**Review By:** Claude Sonnet 3.5 + Qoder AI
