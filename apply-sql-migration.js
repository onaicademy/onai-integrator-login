/**
 * Apply SQL migration file to Supabase
 * Run: node apply-sql-migration.js
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: './backend/env.env' });

const supabaseUrl = process.env.VITE_LANDING_SUPABASE_URL || process.env.LANDING_SUPABASE_URL;
const supabaseKey = process.env.LANDING_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Environment variables not found!');
  console.log('📍 Required: VITE_LANDING_SUPABASE_URL and LANDING_SERVICE_ROLE_KEY');
  console.log('📋 Please check your backend/env.env file');
  process.exit(1);
}

console.log('🔧 Applying SQL migration...');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    // Read the SQL file
    const sqlFile = process.argv[2] || './sql/FIX_SALES_ATTRIBUTION_AND_ADVANCED_ANALYTICS.sql';
    
    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ SQL file not found: ${sqlFile}`);
      process.exit(1);
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`\n📄 Loaded SQL file: ${sqlFile}`);
    console.log(`📏 File size: ${sql.length} characters`);
    
    // Execute the SQL
    console.log('\n🚀 Executing migration...');
    
    // Split SQL into individual statements and execute them one by one
    const statements = sql.split(/;\s*(?=\n|$)/g).filter(stmt => stmt.trim() !== '');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`\n📝 Executing statement ${i + 1}/${statements.length}:`);
        
        // Show a preview of the statement (first 100 chars)
        const preview = stmt.length > 100 ? stmt.substring(0, 100) + '...' : stmt;
        console.log(`   ${preview}`);
        
        try {
          // For complex statements like CREATE MATERIALIZED VIEW, we need to use raw SQL
          const { error } = await supabase.rpc('exec_sql', {
            sql: stmt
          });
          
          if (error) {
            console.log(`⚠️ RPC failed, trying alternative method...`);
            
            // Alternative: Try to execute using a raw query
            // This is a workaround since Supabase doesn't directly support raw SQL execution
            console.log(`❌ Direct execution not supported. Please run manually in Supabase SQL Editor:`);
            console.log(`🔗 https://supabase.com/dashboard/project/[your-project-id]/sql`);
            console.log('\n📋 Copy this SQL:\n');
            console.log(stmt);
            console.log('\n' + '='.repeat(80) + '\n');
            continue;
          }
          
          console.log(`✅ Statement ${i + 1} executed successfully`);
        } catch (stmtError) {
          console.log(`⚠️ Statement ${i + 1} error:`, stmtError.message);
        }
      }
    }
    
    console.log('\n🎉 Migration execution completed!');
    console.log('\n📋 Note: Some complex statements (like CREATE MATERIALIZED VIEW) may require manual execution in Supabase SQL Editor');
    console.log('🔗 https://supabase.com/dashboard/project/[your-project-id]/sql');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 Please apply manually via Supabase Dashboard SQL Editor:');
    console.log('🔗 https://supabase.com/dashboard/project/[your-project-id]/sql');
    process.exit(1);
  }
}

applyMigration();