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

// 🔍 DEBUG: Log environment variable loading
console.log('🔍 [DEBUG] Traffic Supabase ENV variables:', {
  TRAFFIC_SUPABASE_URL: {
    exists: !!trafficUrl,
    value: trafficUrl
  },
  TRAFFIC_SUPABASE_ANON_KEY: {
    exists: !!trafficAnonKey,
    length: trafficAnonKey?.length,
    first20: trafficAnonKey?.substring(0, 20),
    last10: trafficAnonKey?.substring(trafficAnonKey.length - 10)
  },
  TRAFFIC_SERVICE_ROLE_KEY: {
    exists: !!trafficServiceKey,
    length: trafficServiceKey?.length,
    first20: trafficServiceKey?.substring(0, 20),
    last10: trafficServiceKey?.substring(trafficServiceKey.length - 10)
  }
});

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

// 🔍 DEBUG: Test actual query to verify client works
(async () => {
  try {
    const { data, error } = await trafficAdminSupabase
      .from('integration_tokens')
      .select('service_name')
      .limit(1);

    if (error) {
      console.error('❌ [DEBUG] Test query FAILED:', error.message);
    } else {
      console.log('✅ [DEBUG] Test query SUCCESS:', { rowCount: data?.length });
    }
  } catch (err: any) {
    console.error('❌ [DEBUG] Test query EXCEPTION:', err.message);
  }
})();

export default trafficAdminSupabase;

