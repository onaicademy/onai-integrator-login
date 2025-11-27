# 🎯 TRIPWIRE ARCHITECTURAL CONTEXT
## Deep Technical Audit of `onai-integrator-login` Repository

**Generated:** 2025-11-27  
**Purpose:** Provide complete architectural context for building the `/tripwire` section

---

## 1. CORE STYLES & DESIGN SYSTEM

### 1.1 Tailwind Configuration
**Path:** `tailwind.config.ts`

**Key Color Tokens (CYBER-ARCHITECTURE System):**

```typescript
// 🎯 Primary Colors
'cyber-void': '#030303'      // Background (Infinite Depth) - Body background
'cyber-surface': '#0A0A0A'   // Surface (Cards, Panels)
'cyber-acid': '#00FF94'      // Primary Green (Money, Growth, CTA)
'cyber-signal': '#FF3366'    // Secondary Red (Live, Errors, REC)
'cyber-white': '#FFFFFF'     // Text Main (Holo White)
'cyber-gray': '#9CA3AF'      // Text Muted (Tech Gray)

// Legacy compatibility
'brand-green': '#00FF94'
'brand-dark': '#0a0a0a'
```

**CSS Custom Properties (HSL Format):**
```css
--background: 0 0% 1.18%;        /* #030303 - Cyber Void */
--card: 0 0% 3.92%;              /* #0A0A0A - Cyber Surface */
--primary: 120 100% 50%;         /* #00FF00 - Pure Neon Green */
--neon: 120 100% 50%;            /* #00FF00 - Pure Neon Green */
--secondary: 347 100% 60%;       /* #FF3366 - Signal Red */
```

### 1.2 Typography System
**Path:** `src/index.css` + `tailwind.config.ts`

**3-Font System:**

1. **Display (Headlines):** `'Space Grotesk'`
   - Usage: H1, H2, Big Numbers
   - Weight: 700 (Bold)
   - Letter-spacing: -0.02em
   - Transform: UPPERCASE
   - Variable: `--font-display`

2. **Body (UI/Content):** `'Manrope'`
   - Usage: Body text, UI elements, Descriptions, H3-H6
   - Weight: 400 (Regular), 700 (Bold for headers)
   - Letter-spacing: -0.01em
   - Variable: `--font-body`

3. **Mono (System Labels):** `'JetBrains Mono'`
   - Usage: System labels, Micro-text (V.3.0, REC, WAITING)
   - Fallback: 'Roboto Mono'
   - Variable: `--font-mono`

**Font Import:**
- Fonts are imported in `src/index.css` (lines 1-3)
- Applied globally via CSS variables and Tailwind config

### 1.3 Special Effects & Utilities

**Glassmorphism Classes:**
```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}

.glass-panel-cyber {
  background: rgba(10, 10, 10, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

**Neon Glow Effects:**
```css
.neon-shadow {
  box-shadow: 0 0 20px rgba(0, 255, 0, 0.4);
}

.text-glow-strong {
  text-shadow: 0 0 30px rgba(0, 255, 0, 0.6), 0 0 60px rgba(0, 255, 0, 0.3);
}
```

**Animations:**
- `animate-gradient-shift` (15s ease infinite)
- `animate-float` (6s ease-in-out infinite)
- `animate-glow` (2s ease-in-out infinite)
- `animate-ripple` (0.6s ease-out)

---

## 2. REUSABLE UI COMPONENTS (shadcn/ui)

### 2.1 Component Library Location
**Base Path:** `src/components/ui/`

**Available Components:**
- `button.tsx` - Button variants (default, ghost, outline, etc.)
- `card.tsx` - Card container with header/content/footer
- `progress.tsx` - Progress bars
- `input.tsx` - Form inputs
- `avatar.tsx` - User avatars
- `badge.tsx` - Status badges
- `dialog.tsx` - Modal dialogs
- `sheet.tsx` - Slide-in panels (mobile sidebars)
- `tooltip.tsx` - Hover tooltips
- `scroll-area.tsx` - Custom scrollable areas
- `separator.tsx` - Divider lines
- `sidebar.tsx` - Sidebar primitives
- `tabs.tsx` - Tab navigation
- `select.tsx` - Dropdown selects
- `toast.tsx` / `toaster.tsx` / `sonner.tsx` - Toast notifications

### 2.2 Custom Components

**Video Player:**
- **Location:** Embedded in `src/pages/Lesson.tsx` (lines 52-150)
- **Type:** Native `<video>` element with custom controls
- **Features:** Play/Pause, Volume, Playback speed, Fullscreen, Progress tracking
- **Ref:** `videoRef` (HTMLVideoElement)
- **State:** playing, currentTime, duration, volume, muted, playbackRate

**Course Components:**
- `src/components/course/ModuleCard.tsx` - Module display card
- `src/components/course/CourseStats.tsx` - Course statistics panel

**Profile Components:**
- `src/components/profile/v2/AIChatDialog.tsx` - AI assistant chat
- `src/components/profile/v2/ProfileHeader.tsx` - User profile header
- `src/components/profile/v2/LearningStats.tsx` - Learning statistics

---

## 3. NAVIGATION & SIDEBAR (CRITICAL)

### 3.1 Main Sidebar Component
**Path:** `src/components/app-sidebar-premium.tsx`

**Key Features:**
- **Framework:** Uses `@/components/ui/sidebar` primitives
- **Icons:** `@phosphor-icons/react` (House, Brain, User, Trophy, GridNine, ChartBar, Lightning, Robot)
- **Animations:** `framer-motion` for staggered menu items
- **Collapsible:** Supports collapsed/expanded states

**Menu Structure:**
```typescript
const studentMenuItems: MenuItem[] = [
  { title: "Главная", url: "/courses", icon: House },
  { title: "NeuroHUB", url: "/neurohub", icon: Brain },
  { title: "Мой профиль", url: "/profile", icon: User },
  { title: "Достижения", url: "/achievements", icon: Trophy },
  { title: "onAIgram", url: "/messages", icon: GridNine },
  { title: "Админ панель", url: "/admin", icon: ChartBar }, // Hidden for students
];
```

### 3.2 Active State Logic

**NavLink Implementation (lines 133-186):**
```typescript
<NavLink
  to={item.url}
  end={item.url === "/"}
  className={({ isActive }) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
      isActive 
        ? "text-[#00FF00] bg-black/40 border border-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.3)]"
        : "text-gray-500 hover:text-white hover:bg-[#00FF00]/5 hover:scale-[1.01] border border-transparent"
    )
  }
>
```

**Active State Classes:**
- Text: `text-[#00FF00]`
- Background: `bg-black/40`
- Border: `border border-[#00FF00]`
- Shadow: `shadow-[0_0_8px_rgba(0,255,0,0.3)]`
- Icon weight: `weight="fill"` (active) vs `weight="duotone"` (inactive)

**Hover State Classes:**
- Text: `hover:text-white`
- Background: `hover:bg-[#00FF00]/5`
- Scale: `hover:scale-[1.01]`

### 3.3 Icons Library
**Package:** `@phosphor-icons/react`  
**Version:** Latest (check `package.json`)

**Usage Pattern:**
```typescript
import { House, Brain, User, Trophy } from '@phosphor-icons/react';

<House size={22} weight={isActive ? "fill" : "duotone"} />
```

**Icon Weights:**
- `duotone` - Default (inactive)
- `fill` - Active state
- `regular` - Labels
- `bold` - Emphasis

### 3.4 Sidebar Footer
**Content (lines 197-238):**
- Animated status indicator: `СИСТЕМА АКТИВНА` (pulsing green dot)
- Copyright: `© 2025 onAI Academy`
- Subtitle: `Premium Learning Platform`
- Robot icon from Phosphor

---

## 4. AUTHENTICATION & ROUTING

### 4.1 Auth Hook
**Path:** `src/hooks/useAuth.tsx`  
**Re-exports from:** `src/contexts/AuthContext.tsx`

**Hook Signature:**
```typescript
interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  userRole: 'admin' | 'student' | 'curator' | 'tech_support' | null;
  isInitialized: boolean;
  isLoading: boolean;
}

const { user, session, userRole, isInitialized, isLoading } = useAuth();
```

**User Type:**
```typescript
interface ExtendedUser extends User {
  full_name?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  current_streak?: number;
}
```

### 4.2 Role Check Logic

**Admin Check Pattern:**
```typescript
const { userRole } = useAuth();
const isAdmin = userRole === 'admin';
```

**AdminGuard Component:**
```typescript
// Path: src/components/AdminGuard.tsx
if (isInitialized && userRole !== 'admin') {
  return <Navigate to="/login" replace />;
}
```

### 4.3 Protected Routes

**ProtectedRoute Component:**
```typescript
// Path: src/components/ProtectedRoute.tsx
export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, userRole, isInitialized, isLoading } = useAuth();
  
  if (!isInitialized || isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" />;
  if (requireAdmin && userRole !== 'admin') return <Navigate to="/access-denied" />;
  
  return <>{children}</>;
}
```

---

## 5. ROUTING STRUCTURE

### 5.1 Main Router
**Path:** `src/App.tsx`

**Router Type:** `BrowserRouter` from `react-router-dom`

**Key Route Patterns:**

**Public Routes:**
```typescript
<Route path="/login" element={<Login />} />
<Route path="/" element={<Navigate to="/login" replace />} />
```

**Protected Routes (Student):**
```typescript
<Route path="/courses" element={
  <ProtectedRoute>
    <MainLayout><Courses /></MainLayout>
  </ProtectedRoute>
} />

<Route path="/course/:id" element={
  <ProtectedRoute>
    <MainLayout><Course /></MainLayout>
  </ProtectedRoute>
} />

<Route path="/course/:id/module/:moduleId/lesson/:lessonId" element={
  <ProtectedRoute>
    <MainLayout><Lesson /></MainLayout>
  </ProtectedRoute>
} />
```

**Admin Routes:**
```typescript
<Route path="/admin" element={
  <ProtectedRoute>
    <AdminGuard><MainLayout><AdminDashboard /></MainLayout></AdminGuard>
  </ProtectedRoute>
} />
```

**Tripwire Routes (Public Access):**
```typescript
<Route path="/tripwire" element={
  <TripwireLayout>
    <TripwireProductPage />
  </TripwireLayout>
} />

<Route path="/tripwire/profile" element={
  <TripwireLayout>
    <div>Profile Page (Coming Soon)</div>
  </TripwireLayout>
} />
```

### 5.2 Layout Components

**MainLayout:**
- **Path:** `src/components/layouts/MainLayout.tsx`
- **Structure:**
  - `SidebarProvider` wrapper
  - `AppSidebar` (left, collapsible)
  - Header with `SidebarTrigger`
  - Main content area (scrollable)

**TripwireLayout:**
- **Path:** `src/components/tripwire/TripwireLayout.tsx`
- **Structure:**
  - Mobile: Sheet sidebar (hamburger menu)
  - Desktop: Fixed sidebar + content
  - Uses `TripwireSidebar` component

---

## 6. COURSE/LESSON STRUCTURE

### 6.1 Pages

**Courses Page:**
- **Path:** `src/pages/Courses.tsx`
- Shows list of all courses

**Course Page:**
- **Path:** `src/pages/Course.tsx`
- Shows modules within a course
- URL: `/course/:id`
- Uses `ModuleCard` component
- Supports drag-and-drop reordering (admin only)
- Includes `CourseStats` sidebar

**Module Page:**
- **Path:** `src/pages/Module.tsx`
- Shows lessons within a module
- URL: `/course/:id/module/:moduleId`

**Lesson Page:**
- **Path:** `src/pages/Lesson.tsx`
- Shows video player + description + materials
- URL: `/course/:id/module/:moduleId/lesson/:lessonId`
- Video tracking with analytics

### 6.2 Module Card Component
**Path:** `src/components/course/ModuleCard.tsx`

**Props:**
```typescript
interface ModuleCardProps {
  id: number;
  title: string;
  description: string;
  progress: number;
  icon: Icon;
  index: number;
  order_index: number;
  lessons: number;
  duration: string;
  stats: {
    total_lessons: number;
    formatted_duration: string;
  };
}
```

**Visual Style:**
- Glassmorphism background
- Neon green accents
- Progress bar at bottom
- Lock icon for locked modules
- Hover scale effect

---

## 7. API CLIENT & DATA FETCHING

### 7.1 API Client
**Path:** `src/utils/apiClient.ts` (assumed)

**Usage Pattern:**
```typescript
import { api } from "@/utils/apiClient";

const { data } = await api.get(`/course/${id}/modules`);
```

### 7.2 React Query
**Provider:** `@tanstack/react-query`  
**Setup:** Configured in `App.tsx` (line 37)

---

## 8. EXISTING TRIPWIRE COMPONENTS

### 8.1 TripwireSidebar
**Path:** `src/components/tripwire/TripwireSidebar.tsx`

**Features:**
- Exact visual replica of main sidebar
- Locked menu items with:
  - Lock icon (`Lock` from Phosphor)
  - Tooltip: "Available in full program"
  - Shake animation on hover
  - `opacity-50` and `cursor-not-allowed`
- Active items: "Главная" (/tripwire), "Мой профиль" (/tripwire/profile)
- Locked items: NeuroHUB, Достижения, onAIgram, Админ панель

### 8.2 TripwireLayout
**Path:** `src/components/tripwire/TripwireLayout.tsx`

**Features:**
- Responsive: Desktop (fixed sidebar) + Mobile (sheet)
- Desktop header with `SidebarTrigger` for toggling
- Sheet has `hideClose={true}` to remove X button
- Auto-closes on navigation

### 8.3 TripwireProductPage
**Path:** `src/pages/tripwire/TripwireProductPage.tsx`

**Features:**
- Hero section: "ИНТЕГРАТОР 0 TO $1000"
- Badge: "TRIAL VERSION • 4 FOUNDATIONAL MODULES"
- 4 mock modules (1 unlocked, 3 locked)
- Progress panel: "ВАШ ПРОГРЕСС"
- **Principle:** Module = Lesson (click module → load lesson view)

---

## 9. TRIPWIRE-SPECIFIC REQUIREMENTS

### 9.1 Visual Fidelity
- **Goal:** 100% visual replication of main platform
- **Colors:** Exact same as main platform (Cyber Void, Acid Green, etc.)
- **Typography:** Space Grotesk for headers, Manrope for body
- **Effects:** Glassmorphism, neon glows, animations

### 9.2 Functional Differences
- **Access:** Public (no auth required for `/tripwire`)
- **Content:** Limited to 4 modules (1 unlocked, 3 locked)
- **Structure:** Simplified (Module = Lesson, no nested lesson lists)
- **Locked Behavior:** Visual lockout with tooltips, no actual access

### 9.3 UX Flow
1. User lands on `/tripwire`
2. Sees familiar interface (builds trust)
3. Clicks unlocked module → Immediately loads lesson view (video + description)
4. Tries locked module → Sees tooltip "Available in full program"
5. Triggers FOMO → Drives conversion

---

## 10. CRITICAL PATHS & FILES

### Files to Reference (DO NOT MODIFY):
- `tailwind.config.ts` - Color tokens, fonts
- `src/index.css` - Global styles, animations
- `src/components/app-sidebar-premium.tsx` - Sidebar structure
- `src/pages/Lesson.tsx` - Video player implementation
- `src/components/course/ModuleCard.tsx` - Module card design

### Files to Create/Modify (Tripwire):
- ✅ `src/components/tripwire/TripwireSidebar.tsx` (DONE)
- ✅ `src/components/tripwire/TripwireLayout.tsx` (DONE)
- ✅ `src/pages/tripwire/TripwireProductPage.tsx` (DONE)
- 🔜 `src/pages/tripwire/TripwireLesson.tsx` (NEXT STEP)

---

## 11. DEVELOPMENT COMMANDS

**Start Dev Server:**
```bash
cd /Users/miso/onai-integrator-login
npm run dev
```

**Access URLs:**
- Main Platform: `http://localhost:8080/courses` (requires auth)
- Tripwire: `http://localhost:8080/tripwire` (public)

**Testing:**
1. Open browser to `http://localhost:8080/tripwire`
2. Verify sidebar matches main platform
3. Click "Модуль 1" → Should load lesson view
4. Try clicking locked modules → Should show tooltip

---

## 12. DEPENDENCIES

**Key Packages:**
- `react-router-dom` - Routing
- `@phosphor-icons/react` - Icons
- `framer-motion` (or `motion`) - Animations
- `@radix-ui/*` - Shadcn UI primitives
- `tailwindcss` - Styling
- `@tanstack/react-query` - Data fetching
- `@supabase/supabase-js` - Backend API

**Check `package.json` for versions:**
```bash
cat package.json
```

---

## 13. NEXT STEPS FOR TRIPWIRE BUILD

### Phase 1: Lesson View (NEXT)
1. Create `src/pages/tripwire/TripwireLesson.tsx`
2. Copy video player structure from `src/pages/Lesson.tsx`
3. Use mock data (no API calls)
4. Match styling exactly
5. Add "Upgrade to unlock next lessons" CTA

### Phase 2: Navigation
1. Add lesson navigation (Previous/Next buttons)
2. Implement "Module = Lesson" logic
3. Update `TripwireProductPage` to link to lesson view

### Phase 3: Polish
1. Add loading states
2. Optimize animations
3. Test mobile responsiveness
4. Add conversion tracking

---

## 14. TROUBLESHOOTING

**Sidebar not showing:**
- Check `useAuth` initialization
- Verify `userRole` is set
- Check console for errors

**Styles not applying:**
- Run `npm run dev` to rebuild Tailwind
- Check `tailwind.config.ts` content paths
- Verify CSS imports in `src/index.css`

**Routes not working:**
- Check `src/App.tsx` route definitions
- Verify `BrowserRouter` is wrapping `AppRoutes`
- Check for typos in route paths

---

## 15. DESIGN SYSTEM SUMMARY

**Color Palette:**
| Token | Hex | Usage |
|-------|-----|-------|
| `cyber-void` | `#030303` | Body background |
| `cyber-surface` | `#0A0A0A` | Cards, panels |
| `cyber-acid` | `#00FF94` | Primary green, CTAs |
| `cyber-signal` | `#FF3366` | Errors, alerts |
| `cyber-white` | `#FFFFFF` | Main text |
| `cyber-gray` | `#9CA3AF` | Muted text |

**Typography Scale:**
| Element | Font | Size | Weight |
|---------|------|------|--------|
| H1 | Space Grotesk | 2xl-4xl | 700 |
| H2 | Space Grotesk | xl-3xl | 700 |
| H3-H6 | Manrope | lg-xl | 700 |
| Body | Manrope | base | 400 |
| Labels | JetBrains Mono | xs-sm | 500 |

**Spacing:**
- Container padding: `px-4 sm:px-6`
- Section gaps: `space-y-4` to `space-y-8`
- Card padding: `p-4 sm:p-6`

---

## END OF REPORT

**Last Updated:** 2025-11-27  
**Audited By:** Claude Sonnet 4.5  
**Status:** ✅ COMPLETE

For questions or updates, reference this document when building Tripwire features.


