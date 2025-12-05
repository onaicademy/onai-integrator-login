require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function applySchema() {
  try {
    console.log('🚀 Applying Tripwire DB schema...\n');
    
    const sqlPath = path.join(__dirname, '../../TRIPWIRE_NEW_DB_FULL_SCHEMA.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 SQL file loaded:', sqlPath);
    console.log('📏 SQL size:', sql.length, 'bytes\n');
    
    console.log('🔄 Executing schema migration...');
    await pool.query(sql);
    
    console.log('✅ Schema applied successfully!\n');
    
    // Проверяем таблицы
    const result = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log(`✅ Создано таблиц: ${result.rows.length}\n`);
    
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.tablename}`);
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

applySchema();

