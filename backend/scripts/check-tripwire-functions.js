require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.TRIPWIRE_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkFunctions() {
  try {
    console.log('🔍 Проверяю RPC функции в Tripwire DB...\n');
    
    const result = await pool.query(`
      SELECT 
        proname as function_name,
        pg_get_function_identity_arguments(oid) as arguments
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
        AND proname LIKE 'rpc_%'
      ORDER BY proname;
    `);
    
    console.log(`📊 Найдено функций: ${result.rows.length}\n`);
    
    if (result.rows.length === 0) {
      console.log('❌ RPC ФУНКЦИИ НЕ СОЗДАНЫ В TRIPWIRE DB!');
      console.log('   Нужно создать их через SQL миграцию!');
    } else {
      result.rows.forEach(row => {
        console.log(`✅ ${row.function_name}(${row.arguments})`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkFunctions();

