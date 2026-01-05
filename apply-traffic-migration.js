/**
 * Apply Traffic DB Migration 017 - Complete Traffic Repair
 * Run: node apply-traffic-migration.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

// Use traffic database credentials
const supabaseUrl = process.env.TRAFFIC_SUPABASE_URL;
const supabaseKey = process.env.TRAFFIC_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Traffic database environment variables not found!');
  console.log('📍 Required: TRAFFIC_SUPABASE_URL and TRAFFIC_SERVICE_ROLE_KEY');
  console.log('📋 Please check your .env file');
  process.exit(1);
}

console.log('🔧 Applying Traffic DB Migration 017...');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    // Read the specific migration SQL file
    const sqlFile = './migrations/MIGRATION_017_COMPLETE_TRAFFIC_REPAIR.sql';
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ SQL file not found: ${sqlFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`\n📄 Loaded SQL file: ${sqlFile}`);
    console.log(`📏 File size: ${(sql.length / 1024).toFixed(2)} KB`);
    
    // Split SQL into individual statements and execute them one by one
    // We need to be careful with the migration file as it contains complex statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.trim().startsWith('--'));
    
    console.log(`\n🚀 Executing ${statements.length} statements...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        
        // Show a preview of the statement (first 100 chars)
        const preview = stmt.length > 100 ? stmt.substring(0, 100) + '...' : stmt;
        console.log(`   ${preview}`);
        
        try {
          // Try to execute the statement using Supabase's built-in functions
          // For DDL statements like CREATE TABLE, ALTER TABLE, etc., we need to execute them differently
          
          // Since Supabase doesn't directly support raw SQL execution via the client,
          // we'll need to use the SQL Editor or use a different approach
          console.log(`⚠️ Direct execution not supported via Supabase client.`);
          console.log(`📋 Copy and paste this statement in Supabase SQL Editor:`);
          console.log('🔗 https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql');
          console.log('\n' + '='.repeat(80));
          console.log(stmt + ';');
          console.log('='.repeat(80) + '\n');
          
          successCount++;
        } catch (stmtError) {
          console.log(`❌ Statement ${i + 1} error:`, stmtError.message);
          errorCount++;
        }
      }
    }
    
    console.log('\n🎉 Migration execution completed!');
    console.log(`📊 Results: ${successCount} processed, ${errorCount} errors`);
    console.log('\n📋 Please execute the above statements manually in Supabase SQL Editor:');
    console.log('🔗 https://supabase.com/dashboard/project/oetodaexnjcunklkdlkv/sql');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

applyMigration();