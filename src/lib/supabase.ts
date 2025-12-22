/**
 * 🚀 MAIN SUPABASE CLIENT (UNIFIED)
 * 
 * ⚠️ This file now exports from Unified Supabase Manager
 * ⚠️ No longer creates separate client
 * ⚠️ No longer sets up separate auth listener
 * 
 * All clients are managed by supabase-manager.ts
 */

import { getSupabaseClient } from './supabase-manager';
import { devLog } from './env-utils';

devLog('✅ [supabase.ts] Exporting unified main client getter');

/**
 * Main Supabase Client (Lazy loaded)
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 * 
 * Note: This is a getter that returns the client when accessed
 * This ensures manager is initialized before client is accessed
 */
let _supabaseClient: any = null;

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!_supabaseClient) {
      _supabaseClient = getSupabaseClient('main');
    }
    return _supabaseClient[prop];
  }
});

/**
 * Cleanup function (for backward compatibility)
 */
export const cleanupSupabaseConnection = () => {
  devLog('[supabase.ts] Cleanup called (managed by unified manager)');
};

