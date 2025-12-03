/**
 * Tripwire Supabase Configuration (Backend)
 * 
 * ОТДЕЛЬНЫЙ Admin клиент для Tripwire с service_role_key.
 * Использует независимую базу данных.
 */

import { createClient } from '@supabase/supabase-js';

const tripwireUrl = process.env.TRIPWIRE_SUPABASE_URL!;
const tripwireServiceRoleKey = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

if (!tripwireUrl || !tripwireServiceRoleKey) {
  throw new Error('Missing TRIPWIRE_SUPABASE_URL or TRIPWIRE_SERVICE_ROLE_KEY environment variables');
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
  global: {
    headers: {
      Authorization: `Bearer ${tripwireServiceRoleKey}`
    }
  }
});

console.log('✅ Tripwire Admin Supabase client initialized');
console.log('   URL:', tripwireUrl);
console.log('   Authorization: Bearer ***' + tripwireServiceRoleKey.slice(-8));

/**
 * Export default для обратной совместимости
 */
export default tripwireAdminSupabase;

