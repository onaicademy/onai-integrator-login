import dotenv from 'dotenv';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

// Load env
const envPath = path.join(__dirname, '..', 'env.env');
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.TRIPWIRE_DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('Missing TRIPWIRE_DATABASE_URL');
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function listAllTables() {
  console.log('\n📋 Listing ALL tables in Tripwire database...\n');

  const query = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  try {
    const result = await pool.query(query);
    console.log(`✅ Found ${result.rows.length} tables:\n`);
    result.rows.forEach((row) => {
      console.log(`   - ${row.table_name}`);
    });
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

listAllTables();
