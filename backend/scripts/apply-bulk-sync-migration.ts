/**
 * Apply bulk sync tables migration to Supabase
 */
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment
dotenv.config({ path: path.join(__dirname, '../../.env') });

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || '';
const LANDING_SUPABASE_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || '';

if (!LANDING_SUPABASE_URL || !LANDING_SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing LANDING_SUPABASE_URL or LANDING_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(LANDING_SUPABASE_URL, LANDING_SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log('📥 Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../migrations/003_bulk_sync_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Applying migration to Supabase...');
    console.log('SQL length:', sql.length, 'characters');
    
    // Note: Supabase doesn't have a direct SQL execution API for the client
    // We need to use the Supabase SQL Editor or REST API
    // For now, let's output the SQL for manual execution
    
    console.log('\n==============================================');
    console.log('⚠️  MANUAL STEP REQUIRED');
    console.log('==============================================\n');
    console.log('Please apply this migration manually in Supabase SQL Editor:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project (Landing DB)');
    console.log('3. Go to SQL Editor');
    console.log('4. Run the following SQL:\n');
    console.log('Migration file:', migrationPath);
    console.log('\n==============================================\n');
    
    // Alternatively, we can try to create tables using individual queries
    console.log('🔄 Attempting to create tables via Supabase client...\n');
    
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('landing_leads')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      process.exit(1);
    }
    
    console.log('✅ Connection to Supabase successful');
    
    // Since Supabase client doesn't support raw SQL execution,
    // we'll output instructions
    console.log('\n📋 MIGRATION INSTRUCTIONS:');
    console.log('');
    console.log('Run this command on the production server:');
    console.log('');
    console.log('```bash');
    console.log(`cat /var/www/onai-integrator-login-main/backend/migrations/003_bulk_sync_tables.sql | \\`);
    console.log(`  psql "${LANDING_SUPABASE_URL.replace('https://', 'postgresql://postgres:')}"`);
    console.log('```');
    console.log('');
    console.log('OR apply it manually in Supabase Dashboard > SQL Editor');
    console.log('');
    
  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMigration();

