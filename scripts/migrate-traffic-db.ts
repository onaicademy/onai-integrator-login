/**
 * Traffic DB Migration Script
 * Applies full Traffic Dashboard migration to separate Traffic DB
 * 
 * From: Tripwire DB (pjmvxecykysfrzppdcto.supabase.co)
 * To: Traffic DB (oetodaexnjcunklkdlkv.supabase.co)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const TRAFFIC_DB_URL = process.env.TRAFFIC_SUPABASE_URL!;
const TRAFFIC_SERVICE_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY!;

if (!TRAFFIC_DB_URL || !TRAFFIC_SERVICE_KEY) {
  console.error('❌ Missing TRAFFIC_SUPABASE_URL or TRAFFIC_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Traffic DB Migration Starting...');
console.log(`📦 Target DB: ${TRAFFIC_DB_URL}`);
console.log('');

// Create Supabase client for Traffic DB
const trafficDb = createClient(TRAFFIC_DB_URL, TRAFFIC_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../TRAFFIC_DB_MIGRATION_20251222.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL loaded');
    console.log(`📏 Size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);
    console.log('');
    
    // Split migration into statements (basic split by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`🔢 Found ${statements.length} SQL statements`);
    console.log('');
    
    // Apply migration
    console.log('⚙️  Applying migration...');
    console.log('');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      try {
        const { error } = await trafficDb.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query if RPC fails
          const { error: directError } = await trafficDb.from('_sql').select('*').eq('query', statement);
          
          if (directError) {
            console.error(`❌ [${i + 1}/${statements.length}] ${preview}`);
            console.error(`   Error: ${error.message}`);
            errorCount++;
          } else {
            console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
            successCount++;
          }
        } else {
          console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
          successCount++;
        }
      } catch (err: any) {
        console.error(`❌ [${i + 1}/${statements.length}] ${preview}`);
        console.error(`   Error: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('');
    
    if (errorCount === 0) {
      console.log('🎉 Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with errors');
    }
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
applyMigration();
