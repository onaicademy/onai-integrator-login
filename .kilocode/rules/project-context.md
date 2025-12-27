# Project Context: onAI Academy & Traffic Dashboard

## 1. Architecture Overview
This is a monorepo-style project containing two distinct logical parts:
- **LMS Platform (Integrator):** For students. Uses Supabase Auth (`AuthContext`).
- **Traffic Dashboard:** For targetologists and admins. Uses Custom Auth (`AuthManager` class via LocalStorage).

## 2. Tech Stack
- **Frontend:** React (Vite), TypeScript, Tailwind CSS.
- **Backend:** Node.js (Express) & Supabase Edge Functions.
- **Database:** Supabase (PostgreSQL).
- **State Management:** React Context API & LocalStorage (for Traffic).

## 3. Critical Rules for Traffic Dashboard
- **Authentication:** NEVER use `useAuth()` from Supabase context for Traffic Dashboard routes (`/traffic/*`). Always use `AuthManager` from `src/lib/auth.ts`.
- **Routing:** Traffic routes are protected by `TrafficGuard`.
- **Revenue Logic:** "Flagman" sales are >= 50,000 KZT. "Express" sales are < 50,000 KZT.
- **Role:** Admin has `role: 'admin'` and `team: null`. Targetologists have `role: 'targetologist'` and `team: 'team_name'`.

## 4. Coding Standards
- Use **TypeScript** strictly. No `any` types.
- Use **Functional Components** with Hooks.
- Styles: Use Tailwind CSS utility classes.
- Language: Read code in English, but **EXPLAIN and COMMENT in Russian**.