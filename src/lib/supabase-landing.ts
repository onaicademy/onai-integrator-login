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

devLog('✅ [supabase-landing.ts] Exporting unified landing client getter');

/**
 * Landing Supabase Client (Lazy loaded)
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 */
let _landingClient: any = null;

export const landingSupabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_landingClient) {
      _landingClient = getSupabaseClient('landing');
    }
    return _landingClient[prop];
  }
});

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
