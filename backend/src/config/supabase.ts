/**
 * Supabase Configuration
 * 
 * 🔥 CRITICAL: Service Role Key requires BOTH apikey AND Authorization headers
 * to properly bypass RLS policies.
 * 
 * Source: Supabase official troubleshooting docs
 * "RLS is enforced based on the Authorization header and not the apikey header."
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

/**
 * Admin Supabase Client
 * 
 * ✅ Uses service_role_key with explicit Authorization header
 * ✅ Bypasses RLS policies
 * ✅ Isolated from user sessions (no persistence)
 * 
 * Use this for ALL admin operations (CRUD, file uploads, etc.)
 */
export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false  // Prevent session contamination
  },
  global: {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`  // 🔥 CRITICAL: Explicit Bearer token
    }
  }
});

console.log('✅ Admin Supabase client initialized with service_role_key');
console.log('   URL:', supabaseUrl);
console.log('   Authorization: Bearer ***' + serviceRoleKey.slice(-8));

/**
 * Backward Compatibility Export
 * 
 * For existing code that imports 'supabase', provide adminSupabase as default.
 * This ensures all existing code automatically uses the fixed client.
 * 
 * ⚠️ Gradually migrate all imports to use 'adminSupabase' explicitly.
 */
export const supabase = adminSupabase;

/**
 * NEVER use this client for user-facing operations!
 * Service role key has unrestricted access to the database.
 * 
 * For user operations, create a separate client with anon_key.
 */
