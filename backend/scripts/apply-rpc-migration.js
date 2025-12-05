require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('🚀 Applying RPC migration to Tripwire DB...\n');
    
    const sqlPath = path.join(__dirname, '../src/scripts/final-rpc-fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded:', sqlPath);
    console.log('📏 SQL size:', sql.length, 'bytes\n');
    
    console.log('🔄 Executing migration...');
    await pool.query(sql);
    
    console.log('✅ Migration applied successfully!\n');
    
    // Проверяем функции
    const result = await pool.query(`
      SELECT 
        proname as function_name,
        pg_get_function_identity_arguments(oid) as arguments
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname LIKE 'rpc_%'
      ORDER BY proname;
    `);
    
    console.log(`✅ Создано функций: ${result.rows.length}\n`);
    
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.function_name}(${row.arguments})`);
    });
    
    await pool.end();
    console.log('\n🎉 SUCCESS!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error.detail || '');
    await pool.end();
    process.exit(1);
  }
}

applyMigration();

