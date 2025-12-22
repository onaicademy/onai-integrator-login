import { createClient } from '@supabase/supabase-js';

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL;
const LANDING_SERVICE_ROLE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY; // ⚠️ Note: SERVICE_KEY not SERVICE_ROLE_KEY

if (!LANDING_SUPABASE_URL || !LANDING_SERVICE_ROLE_KEY) {
  throw new Error('❌ Missing LANDING_SUPABASE_URL or LANDING_SUPABASE_SERVICE_KEY in env.env');
}

export const landingSupabase = createClient(
  LANDING_SUPABASE_URL,
  LANDING_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: { schema: 'public' }
  }
);

console.log('✅ Landing Supabase client initialized:', LANDING_SUPABASE_URL.substring(0, 30) + '...');
