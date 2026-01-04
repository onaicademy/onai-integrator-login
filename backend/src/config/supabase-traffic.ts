/**
 * 🎯 TRAFFIC DASHBOARD - DEDICATED SUPABASE CLIENT
 * 
 * Отдельный Supabase проект для Traffic Dashboard (Target CAB)
 * Полная изоляция от Tripwire Platform DB
 */

import { createClient } from '@supabase/supabase-js';

// Traffic Dashboard DB (Target CAB) credentials
const trafficUrl = process.env.TRAFFIC_SUPABASE_URL!;
const trafficAnonKey = process.env.TRAFFIC_SUPABASE_ANON_KEY!;
const trafficServiceKey = process.env.TRAFFIC_SERVICE_ROLE_KEY!;


// Validate ENV variables
if (!trafficUrl || !trafficAnonKey || !trafficServiceKey) {
  console.error('❌ Missing Traffic Supabase credentials in ENV!');
  console.error('Required: TRAFFIC_SUPABASE_URL, TRAFFIC_SUPABASE_ANON_KEY, TRAFFIC_SERVICE_ROLE_KEY');
  throw new Error('Traffic Supabase configuration is incomplete');
}

/**
 * Public client (uses anon key, respects RLS)
 * Use for: User-facing operations, authenticated requests
 */
export const trafficSupabase = createClient(trafficUrl, trafficAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

/**
 * Admin client (uses service role key, bypasses RLS)
 * Use for: Server-side operations, admin tasks, system operations
 */
export const trafficAdminSupabase = createClient(trafficUrl, trafficServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${trafficServiceKey}`
    }
  }
});

console.log('✅ Traffic Dashboard Supabase clients initialized:', {
  url: trafficUrl,
  hasAnonKey: !!trafficAnonKey,
  hasServiceKey: !!trafficServiceKey
});

export default trafficAdminSupabase;

