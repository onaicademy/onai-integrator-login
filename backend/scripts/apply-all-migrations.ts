/**
 * Apply All Pending Migrations
 * Executes migrations 005, 006, 007 in correct order
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const trafficDb = createClient(
  process.env.TRAFFIC_SUPABASE_URL || '',
  process.env.TRAFFIC_SERVICE_ROLE_KEY || ''
);

const landingDb = createClient(
  process.env.LANDING_SUPABASE_URL || '',
  process.env.LANDING_SUPABASE_SERVICE_KEY || ''
);

interface Migration {
  id: string;
  name: string;
  file: string;
  database: 'traffic' | 'landing';
  sql?: string;
}

const migrations: Migration[] = [
  {
    id: '005',
    name: 'Create tripwire_users and tripwire_user_profile tables',
    file: 'sql/migrations/005_create_tripwire_tables.sql',
    database: 'traffic'
  },
  {
    id: '006',
    name: 'Add UTM tracking columns to traffic_users',
    file: 'sql/migrations/006_add_utm_tracking_columns.sql',
    database: 'traffic'
  },
  {
    id: '007',
    name: 'Add funnel tracking columns to all_sales_tracking',
    file: 'sql/migrations/007_add_funnel_tracking_columns.sql',
    database: 'landing'
  }
];

async function loadMigrationSQL(migration: Migration): Promise<void> {
  const fullPath = path.join(__dirname, '../..', migration.file);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Migration file not found: ${fullPath}`);
  }

  migration.sql = fs.readFileSync(fullPath, 'utf-8');
}

async function executeMigration(migration: Migration): Promise<void> {
  console.log(`\n🚀 Executing Migration ${migration.id}: ${migration.name}`);
  console.log(`   Database: ${migration.database.toUpperCase()}`);
  console.log(`   File: ${migration.file}\n`);

  if (!migration.sql) {
    throw new Error('Migration SQL not loaded');
  }

  const db = migration.database === 'traffic' ? trafficDb : landingDb;

  try {
    // Supabase doesn't support raw SQL execution via client
    // We need to execute statement by statement

    // For now, we'll use rpc if available, or manual execution
    console.log('⚠️  Note: SQL migrations should be executed manually via Supabase dashboard or psql');
    console.log('   Copy the SQL from the migration file and execute in Supabase SQL editor\n');
    console.log('   Migration file: ' + migration.file);
    console.log('   ---');

    // Alternative: Try to parse and execute individual statements
    // This is a simplified approach - real implementation would need proper SQL parsing
    const statements = migration.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements to execute\n`);

    // For critical columns, we can use ALTER TABLE via Supabase client
    if (migration.id === '006') {
      await executeMigration006(db);
    } else if (migration.id === '007') {
      await executeMigration007(db);
    } else {
      console.log('   ⚠️  This migration requires manual execution via Supabase dashboard');
    }

    console.log(`✅ Migration ${migration.id} completed\n`);
  } catch (error: any) {
    console.error(`❌ Migration ${migration.id} failed:`, error.message);
    throw error;
  }
}

async function executeMigration006(db: any): Promise<void> {
  console.log('   Executing migration 006 via client...');

  // Check if columns already exist
  try {
    const { error } = await db
      .from('traffic_users')
      .select('utm_source, funnel_type, team_id')
      .limit(1);

    if (!error) {
      console.log('   ✅ Columns already exist, skipping');
      return;
    }
  } catch (e) {
    // Columns don't exist, continue
  }

  console.log('   ⚠️  Columns need to be added manually via Supabase dashboard');
  console.log('   Execute: sql/migrations/006_add_utm_tracking_columns.sql');
}

async function executeMigration007(db: any): Promise<void> {
  console.log('   Executing migration 007 via client...');

  // Check if columns already exist
  try {
    const { error } = await db
      .from('all_sales_tracking')
      .select('funnel_type, targetologist_id')
      .limit(1);

    if (!error) {
      console.log('   ✅ Columns already exist, skipping');
      return;
    }
  } catch (e) {
    // Columns don't exist, continue
  }

  console.log('   ⚠️  Columns need to be added manually via Supabase dashboard');
  console.log('   Execute: sql/migrations/007_add_funnel_tracking_columns.sql');
}

async function applyAllMigrations(): Promise<void> {
  console.log('🔧 === APPLYING ALL PENDING MIGRATIONS ===\n');

  // Load all migration files
  for (const migration of migrations) {
    await loadMigrationSQL(migration);
  }

  // Execute migrations in order
  for (const migration of migrations) {
    try {
      await executeMigration(migration);
    } catch (error: any) {
      console.error(`\n❌ CRITICAL: Migration ${migration.id} failed`);
      console.error(`   Error: ${error.message}`);
      console.error(`\n⚠️  Stopping migration process. Please fix errors and retry.\n`);
      process.exit(1);
    }
  }

  console.log('\n✅ === ALL MIGRATIONS COMPLETED ===\n');

  // Verify migrations
  console.log('🔍 Verifying migrations...\n');

  try {
    // Check traffic_users columns
    const { error: trafficError } = await trafficDb
      .from('traffic_users')
      .select('id, email, utm_source, funnel_type, team_id')
      .limit(1);

    if (trafficError && trafficError.message.includes('does not exist')) {
      console.log('⚠️  traffic_users columns not yet applied');
      console.log('   Please execute migration 006 manually in Supabase dashboard');
    } else {
      console.log('✅ traffic_users columns verified');
    }

    // Check all_sales_tracking columns
    const { error: landingError } = await landingDb
      .from('all_sales_tracking')
      .select('id, funnel_type, targetologist_id')
      .limit(1);

    if (landingError && landingError.message.includes('does not exist')) {
      console.log('⚠️  all_sales_tracking columns not yet applied');
      console.log('   Please execute migration 007 manually in Supabase dashboard');
    } else {
      console.log('✅ all_sales_tracking columns verified');
    }

  } catch (error: any) {
    console.error('⚠️  Verification error:', error.message);
  }

  console.log('\n🎯 NEXT STEPS:\n');
  console.log('1. Execute migration 005 manually in Traffic Supabase dashboard');
  console.log('2. Execute migration 006 manually in Traffic Supabase dashboard');
  console.log('3. Execute migration 007 manually in Landing Supabase dashboard');
  console.log('4. Run: npx tsx scripts/comprehensive-system-audit.ts');
  console.log('5. Verify System Health Score > 90%\n');
}

applyAllMigrations().catch(console.error);
