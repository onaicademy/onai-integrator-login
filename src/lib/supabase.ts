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

devLog('✅ [supabase.ts] Exporting unified main client');

/**
 * Main Supabase Client
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 */
export const supabase = getSupabaseClient('main');

/**
 * Cleanup function (for backward compatibility)
 */
export const cleanupSupabaseConnection = () => {
  devLog('[supabase.ts] Cleanup called (managed by unified manager)');
};

