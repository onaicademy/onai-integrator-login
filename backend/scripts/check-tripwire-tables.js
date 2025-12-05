require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    console.log('🔍 Проверяю таблицы в Tripwire DB...\n');
    
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    
    console.log(`📊 Найдено таблиц: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ ТАБЛИЦ НЕТ В PUBLIC SCHEMA!');
    } else {
      result.rows.forEach(row => {
        console.log(`  ✅ ${row.tablename}`);
      });
    }
    
    console.log('\n🔍 Проверяю нужные таблицы:\n');
    
    const needed = ['tripwire_users', 'sales_activity_log', 'users'];
    for (const table of needed) {
      const exists = result.rows.some(r => r.tablename === table);
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkTables();

