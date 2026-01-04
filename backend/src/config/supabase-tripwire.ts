/**
 * Tripwire Supabase Configuration (Backend)
 * 
 * ОТДЕЛЬНЫЙ Admin клиент для Tripwire с service_role_key.
 * Использует независимую базу данных.
 */

// ✅ IMPORTANT: DO NOT call dotenv.config() here!
// server.ts already loaded backend/env.env
// Calling dotenv.config() again would override correct values!
import dotenv from 'dotenv';
// ❌ REMOVED: dotenv.config(); - causes env override bug

import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL!;
// 🔥 FIX: Prefer newer key naming (TRIPWIRE_SERVICE_ROLE_KEY is the latest valid key)
const tripwireServiceRoleKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY || process.env.TRIPWIRE_SUPABASE_SERVICE_KEY!;

if (!tripwireUrl || !tripwireServiceRoleKey) {
  throw new Error('Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY/TRIPWIRE_SUPABASE_SERVICE_KEY environment variables');
}

/**
 * Tripwire Admin Supabase Client
 * 
 * ✅ Uses service_role_key (bypasses RLS)
 * ✅ Isolated from Main Platform
 * ✅ Used for:
 *    - Creating Tripwire users (Sales Manager)
 *    - Managing Tripwire progress
 *    - Admin operations
 */
export const tripwireAdminSupabase = createClient(tripwireUrl, tripwireServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'  // ← Явно указываем схему для PostgREST
  },
  global: {
    headers: {
      Authorization: `Bearer ${tripwireServiceRoleKey}`
    }
  }
});

console.log('✅ Tripwire Admin Supabase client initialized');
console.log('   URL:', tripwireUrl);
// Security: API key logging removed

/**
 * Tripwire Anon Supabase Client (для публичных операций)
 * Uses anon key (with RLS)
 */
const tripwireAnonKey = process.env.VITE_TRIPWIRE_SUPABASE_ANON_KEY!;

export const tripwireSupabase = createClient(tripwireUrl, tripwireAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

/**
 * Export default для обратной совместимости
 */
export default tripwireAdminSupabase;

