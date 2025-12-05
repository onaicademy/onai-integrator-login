/**
 * FORCE CREATE - Bypass schema cache
 */

import 'dotenv/config';
import postgres from 'postgres';

const connectionString = process.env.TRIPWIRE_DATABASE_URL || 
  `postgresql://postgres.pjmvxecykysfrzppdcto:${process.env.TRIPWIRE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;

async function main() {
  console.log('🚀 Direct PostgreSQL connection...\n');

  const sql = postgres(connectionString, {
    ssl: 'require',
    max: 1,
  });

  try {
    const result = await sql`
      INSERT INTO public.users (id, email, full_name, role, platform, created_at, updated_at)
      VALUES 
        ('fdf3cdc5-a6a5-4105-8922-003eb7ee5bb9', 'amina@onaiacademy.kz', 'Amina Sales Manager', 'sales', 'tripwire', NOW(), NOW()),
        ('82ae50d4-46bc-4ca4-842d-fd909aa85620', 'rakhat@onaiacademy.kz', 'Rakhat Sales Manager', 'sales', 'tripwire', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name,
        updated_at = NOW()
      RETURNING id, email, role, platform
    `;

    console.log('✅ SUCCESS:');
    console.table(result);

    await sql.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await sql.end();
    process.exit(1);
  }
}

main();

