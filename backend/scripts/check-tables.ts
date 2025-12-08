import * as dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL!;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY!;

const tripwireSupabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function checkTables() {
  // Check module_unlocks structure
  const { data, error } = await tripwireSupabase
    .from('module_unlocks')
    .select('*')
    .limit(1);
  
  console.log('module_unlocks sample:', JSON.stringify(data, null, 2));
  console.log('error:', error);
  
  process.exit(0);
}

checkTables();
