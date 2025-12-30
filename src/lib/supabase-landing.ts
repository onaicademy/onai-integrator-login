/**
 * 🚀 LANDING SUPABASE CLIENT (UNIFIED)
 * 
 * ⚠️ Uses PostgREST client to avoid GoTrueClient warnings
 * ⚠️ No auth/session handling on the frontend
 */

import { devLog } from './env-utils';
import PostgrestClient from '@supabase/postgrest-js';

devLog('✅ [supabase-landing.ts] Exporting unified landing client getter');

/**
 * Landing Supabase Client (Lazy loaded)
 * 
 * ✅ Uses unified auth manager
 * ✅ No duplicate auth listeners
 * ✅ Backward compatible with existing code
 */
let _landingClient: PostgrestClient | null = null;

const initLandingClient = (): PostgrestClient | null => {
  if (_landingClient) return _landingClient;

  const landingUrl = import.meta.env.VITE_LANDING_SUPABASE_URL;
  const landingKey = import.meta.env.VITE_LANDING_SUPABASE_ANON_KEY;

  if (!landingUrl || !landingKey) {
    console.warn('[supabase-landing.ts] Missing landing Supabase credentials');
    return null;
  }

  _landingClient = new PostgrestClient(`${landingUrl}/rest/v1`, {
    headers: {
      apikey: landingKey,
      Authorization: `Bearer ${landingKey}`,
    },
  });

  return _landingClient;
};

export const landingSupabase = new Proxy({} as PostgrestClient, {
  get(_target, prop) {
    const client = initLandingClient();
    if (!client) return undefined;
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

/**
 * Get Landing Supabase (for backward compatibility)
 */
export function getLandingSupabase(): PostgrestClient | null {
  return initLandingClient();
}
