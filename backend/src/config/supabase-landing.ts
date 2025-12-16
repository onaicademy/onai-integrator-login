/**
 * Supabase Landing Configuration
 * 
 * 🎯 LANDING DATABASE - для лидов с лендингов (proftest, expresscourse)
 * 
 * Эта база данных используется для:
 * - Хранения лидов с лендингов
 * - Отправки лидов в AmoCRM
 * - Хранения токенов интеграций (AmoCRM, Mobizon)
 * - Unified Lead Tracking
 */

import { createClient } from '@supabase/supabase-js';

const landingSupabaseUrl = process.env.LANDING_SUPABASE_URL!;
const landingServiceRoleKey = process.env.LANDING_SUPABASE_SERVICE_KEY!;

if (!landingSupabaseUrl || !landingServiceRoleKey) {
  throw new Error('Missing LANDING_SUPABASE_URL or LANDING_SUPABASE_SERVICE_KEY');
}

/**
 * Landing Supabase Client
 * 
 * ✅ Используется для работы с лидами
 * ✅ Хранит токены AmoCRM
 * ✅ Unified Lead Tracking
 */
export const landingSupabase = createClient(landingSupabaseUrl, landingServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${landingServiceRoleKey}`
    }
  }
});

console.log('✅ Landing Supabase client initialized');
console.log('   URL:', landingSupabaseUrl);
console.log('   Authorization: Bearer ***' + landingServiceRoleKey.slice(-8));

