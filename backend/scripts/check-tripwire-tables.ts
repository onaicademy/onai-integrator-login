import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env
const envPath = path.join(__dirname, '..', 'env.env');
dotenv.config({ path: envPath });
console.log(`📦 Loading environment from: ${envPath}`);

const TRIPWIRE_URL = process.env.TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_KEY = process.env.TRIPWIRE_SERVICE_ROLE_KEY;

if (!TRIPWIRE_URL || !TRIPWIRE_KEY) {
  throw new Error('Missing Tripwire credentials');
}

const supabase = createClient(TRIPWIRE_URL, TRIPWIRE_KEY);

async function checkTables() {
  console.log('\n🔍 Checking Tripwire database schema...\n');

  // Try different table names
  const tablesToCheck = [
    'modules',
    'tripwire_modules',
    'module_unlocks',
    'lessons',
    'tripwire_lessons',
  ];

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: EXISTS (${data?.length || 0} rows sample)`);
        if (data && data.length > 0) {
          console.log(`   Sample columns:`, Object.keys(data[0]).join(', '));
        }
      }
    } catch (e: any) {
      console.log(`❌ ${tableName}: ${e.message}`);
    }
  }

  // Also try to query specific module IDs (16, 17, 18)
  console.log('\n🔍 Searching for modules 16, 17, 18...\n');
  
  for (const tableName of ['modules', 'tripwire_modules']) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id, title')
        .in('id', [16, 17, 18]);

      if (!error && data) {
        console.log(`✅ Found in ${tableName}:`, data);
      }
    } catch (e) {
      // Silent fail
    }
  }
}

checkTables().catch(console.error);
