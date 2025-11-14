import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Загружаем .env СРАЗУ при импорте модуля
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('[Supabase Config] Initializing Supabase client...');
console.log('[Supabase Config] SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('[Supabase Config] SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? `SET (${process.env.SUPABASE_SERVICE_ROLE_KEY.length} chars)` : 'NOT SET');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Supabase Config] ❌ Missing environment variables!');
  throw new Error('Missing Supabase environment variables');
}

// Backend использует service_role_key для полного доступа к БД
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('[Supabase Config] ✅ Supabase client initialized successfully');

export default supabase;

