/**
 * 🚀 TRIPWIRE SUPABASE CLIENT (UNIFIED)
 * 
 * ⚠️ This file now exports from Unified Supabase Manager
 * ⚠️ No longer creates separate client
 * ⚠️ No longer sets up separate auth listener
 * 
 * All clients are managed by supabase-manager.ts
 */

import { getSupabaseClient } from './supabase-manager';
import { devLog } from './env-utils';

devLog('✅ [supabase-tripwire.ts] Exporting unified tripwire client getter');

/**
 * Tripwire Supabase Client (Lazy loaded)
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 */
let _tripwireClient: any = null;

export const tripwireSupabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_tripwireClient) {
      _tripwireClient = getSupabaseClient('tripwire');
    }
    return _tripwireClient[prop];
  }
});

/**
 * Cleanup function (for backward compatibility)
 */
export const cleanupTripwireConnection = () => {
  devLog('[supabase-tripwire.ts] Cleanup called (managed by unified manager)');
};

