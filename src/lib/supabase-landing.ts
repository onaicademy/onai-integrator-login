/**
 * 🚀 LANDING SUPABASE CLIENT (UNIFIED)
 * 
 * ⚠️ This file now exports from Unified Supabase Manager
 * ⚠️ No longer creates separate client
 * ⚠️ No longer sets up separate auth listener
 * 
 * All clients are managed by supabase-manager.ts
 */

import { getSupabaseClient } from './supabase-manager';
import { devLog } from './env-utils';
import type { SupabaseClient } from '@supabase/supabase-js';

devLog('✅ [supabase-landing.ts] Exporting unified landing client');

/**
 * Landing Supabase Client
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 */
export const landingSupabase = getSupabaseClient('landing');

/**
 * Get Landing Supabase (for backward compatibility)
 */
export function getLandingSupabase(): SupabaseClient | null {
  try {
    return getSupabaseClient('landing');
  } catch (e) {
    console.warn('[supabase-landing.ts] Could not get landing client');
    return null;
  }
}
