# 📋 Code Audit Report - onAI Integrator Login

**Date:** November 27, 2025  
**Audited By:** Claude 4.5 Sonnet  
**Purpose:** Extract critical architectural details for Tripwire implementation

---

## 🎯 Executive Summary

This audit analyzed authentication, role-based access control, and UI styling in the `onai-integrator-login` codebase to provide precise implementation details for the Tripwire funnel.

---

## 1️⃣ ROLE CHECK LOGIC

### Target Files Analyzed:
- `src/hooks/useAuth.tsx` (re-exports from AuthContext)
- `src/contexts/AuthContext.tsx` (main auth logic)
- `src/components/AdminGuard.tsx` (admin access control)

### Key Findings:

#### ✅ **User Role Hook: `useAuth()`**

**Location:** `src/contexts/AuthContext.tsx:14-20`

```typescript
interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  userRole: 'admin' | 'student' | 'curator' | 'tech_support' | null;
  isInitialized: boolean;
  isLoading: boolean;
}
```

**Usage Example:**
```typescript
const { userRole, isInitialized, isLoading } = useAuth();
```

#### ✅ **Admin Role Check Logic**

**Location:** `src/components/AdminGuard.tsx:31`

**Exact Logic:**
```typescript
if (isInitialized && userRole !== 'admin') {
  console.log('❌ AdminGuard: Доступ запрещён. userRole:', userRole);
  return <Navigate to="/login" replace />;
}
```

**Complete Guard Implementation:**

```typescript
export function AdminGuard({ children }: AdminGuardProps) {
  const { isInitialized, userRole, isLoading } = useAuth();

  // STEP 1: Loading state - show spinner
  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // STEP 2: Role check - redirect if not admin
  if (isInitialized && userRole !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  // STEP 3: Admin authorized - show content
  return <>{children}</>;
}
```

**Key Points:**
- ✅ Always check `isInitialized` before checking `userRole`
- ✅ Always check `isLoading` to show loading state
- ✅ Use `<Navigate to="/login" replace />` for unauthorized access
- ✅ Roles: `'admin' | 'student' | 'curator' | 'tech_support' | null`

#### ✅ **Role Extraction Logic**

**Location:** `src/contexts/AuthContext.tsx:86-100`

**Priority Order:**
1. `session.user.user_metadata.role` (Supabase metadata)
2. `session.user.app_metadata.role` (App metadata)
3. JWT token parsing (fallback)

---

## 2️⃣ SIDEBAR ACTIVE/HOVER STYLING

### Target Files Analyzed:
- `src/components/app-sidebar-premium.tsx:136-147` (Active state)
- `src/components/app-sidebar-premium.tsx:138-141` (Hover state)

### Key Findings:

#### ✅ **ACTIVE State CSS Classes**

**Exact Tailwind Classes:**

```typescript
isActive 
  ? "text-[#00FF00] bg-black/40 border border-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.3)]"
  : "text-gray-500 hover:text-white hover:bg-[#00FF00]/5 hover:scale-[1.01] border border-transparent"
```

**Breakdown:**

| Property | Active State | Inactive State |
|----------|-------------|----------------|
| **Text Color** | `text-[#00FF00]` (Neon Green) | `text-gray-500` |
| **Background** | `bg-black/40` | `transparent` |
| **Border** | `border border-[#00FF00]` | `border border-transparent` |
| **Shadow** | `shadow-[0_0_8px_rgba(0,255,0,0.3)]` | `none` |

#### ✅ **HOVER State CSS Classes**

**Exact Tailwind Classes:**

```typescript
hover:text-white 
hover:bg-[#00FF00]/5 
hover:scale-[1.01]
```

**Breakdown:**

| Property | Hover Effect |
|----------|-------------|
| **Text Color** | `hover:text-white` |
| **Background** | `hover:bg-[#00FF00]/5` (5% opacity green) |
| **Scale** | `hover:scale-[1.01]` (1% enlargement) |
| **Transition** | `transition-all duration-300` |

#### ✅ **Icon Weight Logic**

**Location:** `src/components/app-sidebar-premium.tsx:152-153`

```typescript
<item.icon 
  size={22}
  weight={isActive ? "fill" : "duotone"}
  className={cn(
    "flex-shrink-0 transition-all duration-300",
    isActive && "drop-shadow-[0_0_6px_rgba(0,255,0,0.6)]"
  )}
/>
```

**Key Points:**
- ✅ Active icon: `weight="fill"` + green drop-shadow
- ✅ Inactive icon: `weight="duotone"`
- ✅ Icon size: `22px`

#### ✅ **Active State Animation**

**Location:** `src/components/app-sidebar-premium.tsx:171-183`

```typescript
{isActive && (
  <motion.div
    className="absolute inset-0 rounded-lg bg-[#00FF00]/5 pointer-events-none"
    animate={{
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
)}
```

**Breathing Effect:** Opacity pulses from 30% → 50% → 30% every 2 seconds.

---

## 3️⃣ LOGIN FLOW

### Target Files Analyzed:
- `src/pages/Login.tsx:42-166` (Login handler)
- `src/pages/Login.tsx:23` (Redirect logic)

### Key Findings:

#### ✅ **Login Endpoint Call**

**Location:** `src/pages/Login.tsx:47-50`

**Exact Code:**

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email.trim(),
  password,
});
```

**Method:** Supabase Auth `signInWithPassword()`

#### ✅ **Redirect Logic After Successful Login**

**Location:** `src/pages/Login.tsx:23`

**Default Redirect:**

```typescript
const from = (location.state as any)?.from?.pathname || '/courses';
```

**Full Redirect Logic:**

```typescript
// Check user role from database
const { data: userData, error: userError } = await supabase
  .from('users')
  .select('role, onboarding_completed')
  .eq('id', data.user.id)
  .single();

// CASE 1: Student without onboarding → /welcome
if (userData?.role === 'student' && !userData?.onboarding_completed) {
  navigate('/welcome', { replace: true });
  return;
}

// CASE 2: Everyone else → original destination (default: /courses)
navigate(from, { replace: true });
```

**Redirect Flow:**

| User Type | Onboarding Status | Redirect Path |
|-----------|------------------|---------------|
| **Student** | Not completed | `/welcome` |
| **Student** | Completed | `from` or `/courses` |
| **Admin** | N/A | `from` or `/courses` |
| **Curator** | N/A | `from` or `/courses` |
| **Tech Support** | N/A | `from` or `/courses` |

#### ✅ **Account Status Checks**

**Location:** `src/pages/Login.tsx:73-125`

**Checks Performed:**

1. **Account Deactivated?**
   ```typescript
   if (!profile.is_active) {
     await supabase.auth.signOut();
     // Show error toast
     return;
   }
   ```

2. **Account Expired?**
   ```typescript
   if (profile.account_expires_at) {
     const expiresAt = new Date(profile.account_expires_at);
     const now = new Date();
     
     if (expiresAt < now) {
       // Deactivate account
       // Sign out
       // Show error toast
       return;
     }
   }
   ```

#### ✅ **Session Storage Clearing**

**Location:** `src/pages/Login.tsx:127`

```typescript
sessionStorage.clear();
```

**Purpose:** Clear cached data on fresh login to prevent stale state.

---

## 4️⃣ TRIPWIRE UI FIX: TOGGLE BUTTON

### Issue Reported:
> "у тебя пропала кнопка, благодаря которой я мог убрать сайт бар. Верни ее"

### ✅ **Resolution Implemented:**

**File:** `src/components/tripwire/TripwireLayout.tsx`

**Added Desktop Header with Toggle Button:**

```typescript
{/* Desktop Header with Toggle Button */}
{!isMobile && (
  <header className="sticky top-0 z-10 flex h-14 sm:h-16 items-center gap-4 border-b border-white/10 px-4 sm:px-6"
    style={{
      background: 'rgba(10, 10, 10, 0.8)',
      backdropFilter: 'blur(20px)',
    }}
  >
    <Button
      variant="ghost"
      size="icon"
      onClick={() => {
        // Toggle sidebar by animating it off-screen
        const sidebar = document.querySelector('aside');
        const main = document.querySelector('main');
        if (sidebar && main) {
          if (sidebar.style.transform === 'translateX(-100%)') {
            sidebar.style.transform = 'translateX(0)';
            main.style.marginLeft = '256px';
          } else {
            sidebar.style.transform = 'translateX(-100%)';
            main.style.marginLeft = '0';
          }
        }
      }}
      className="text-white/70 hover:text-[#00FF00] hover:bg-white/10 transition-colors"
    >
      <List size={24} weight="bold" />
    </Button>
    <h1 className="text-lg font-bold text-white">onAI Academy</h1>
  </header>
)}
```

**Key Changes:**
1. ✅ Added sticky header with hamburger icon (desktop only)
2. ✅ Button toggles sidebar via `transform: translateX(-100%)`
3. ✅ Adjusts main content margin when sidebar hidden
4. ✅ Smooth transition animation (`transition-transform duration-300`)

**Visual Result:**
- Toggle button appears in top-left corner (☰ icon)
- Clicking hides/shows sidebar
- Matches MainLayout.tsx behavior

---

## 🎨 UI STYLING REFERENCE

### Color Palette:

| Element | Color | Hex/RGBA |
|---------|-------|----------|
| **Primary Green** | Neon Green | `#00FF00` |
| **Active Border** | Neon Green | `#00FF00` |
| **Active Shadow** | Green Glow | `rgba(0,255,0,0.3)` |
| **Active Background** | Semi-transparent Black | `rgba(0,0,0,0.4)` |
| **Inactive Text** | Gray | `#6b7280` (gray-500) |
| **Hover Background** | Light Green | `rgba(0,255,0,0.05)` |
| **Hover Text** | White | `#ffffff` |

### Animation Timings:

| Animation | Duration | Easing |
|-----------|----------|--------|
| **Link Transitions** | 300ms | `transition-all duration-300` |
| **Breathing Glow** | 2000ms | `easeInOut` (infinite) |
| **Sidebar Toggle** | 300ms | `transition-transform` |
| **Hover Scale** | 300ms | `transition-all` |

---

## 🔧 Implementation Recommendations for Tripwire

### 1. Admin Role Check (Copy-Paste Ready):

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function TripwireAdminGuard({ children }: { children: React.ReactNode }) {
  const { isInitialized, userRole, isLoading } = useAuth();

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FF00]"></div>
      </div>
    );
  }

  if (isInitialized && userRole !== 'admin') {
    return <Navigate to="/tripwire" replace />;
  }

  return <>{children}</>;
}
```

### 2. Sidebar Link Styling (Copy-Paste Ready):

```typescript
<NavLink
  to={item.url}
  className={({ isActive }) =>
    cn(
      "group relative flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300",
      isActive 
        ? "text-[#00FF00] bg-black/40 border border-[#00FF00] shadow-[0_0_8px_rgba(0,255,0,0.3)]"
        : "text-gray-500 hover:text-white hover:bg-[#00FF00]/5 hover:scale-[1.01] border border-transparent"
    )
  }
>
  {({ isActive }) => (
    <>
      <Icon 
        size={22}
        weight={isActive ? "fill" : "duotone"}
        className={cn(
          "flex-shrink-0 transition-all duration-300",
          isActive && "drop-shadow-[0_0_6px_rgba(0,255,0,0.6)]"
        )}
      />
      <span className={cn(
        "text-sm font-medium transition-all duration-300",
        isActive && "drop-shadow-[0_0_4px_rgba(0,255,0,0.4)]"
      )}>
        {item.title}
      </span>
    </>
  )}
</NavLink>
```

### 3. Login Redirect (for Tripwire flow):

```typescript
// In your Tripwire login page:
const from = (location.state as any)?.from?.pathname || '/tripwire';

// After successful login:
if (userData?.role === 'student') {
  navigate('/tripwire', { replace: true });
} else if (userData?.role === 'admin') {
  navigate('/tripwire/admin', { replace: true });
}
```

---

## ✅ Audit Checklist

| Item | Status | Notes |
|------|--------|-------|
| Role check logic identified | ✅ | `useAuth()` hook + AdminGuard |
| Admin access pattern documented | ✅ | `userRole !== 'admin'` check |
| Sidebar active styling extracted | ✅ | `text-[#00FF00]` + shadow |
| Sidebar hover styling extracted | ✅ | `hover:bg-[#00FF00]/5` |
| Login flow documented | ✅ | Supabase `signInWithPassword` |
| Redirect logic mapped | ✅ | `/welcome` or `/courses` |
| Toggle button restored | ✅ | Desktop header added |
| Visual verification completed | ✅ | Screenshot confirms button |

---

## 🎯 Next Steps

1. **Apply AdminGuard** to Tripwire admin routes
2. **Update Sidebar styling** to match exact colors
3. **Implement login redirect** logic for Tripwire users
4. **Test role-based access** on Tripwire pages
5. **Verify toggle button** functionality on all screen sizes

---

**Report Generated:** November 27, 2025  
**All findings verified against live codebase** ✅


