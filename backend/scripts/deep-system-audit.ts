/**
 * Deep System Audit - Comprehensive Check
 * Собирает ВСЕ проблемы системы
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

const trafficDb = createClient(
  process.env.TRAFFIC_SUPABASE_URL || '',
  process.env.TRAFFIC_SERVICE_ROLE_KEY || ''
);

const landingDb = createClient(
  process.env.LANDING_SUPABASE_URL || '',
  process.env.LANDING_SUPABASE_SERVICE_KEY || ''
);

interface Issue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  problem: string;
  impact: string;
  fix: string;
}

const issues: Issue[] = [];

async function deepAudit() {
  console.log('🔍 === DEEP SYSTEM AUDIT ===\n');

  // ==========================================
  // 1. DATABASE TABLES AUDIT
  // ==========================================
  console.log('📊 1. DATABASE TABLES\n');

  // Traffic DB tables
  const trafficTables = [
    { name: 'tripwire_users', critical: true },
    { name: 'tripwire_user_profile', critical: true },
    { name: 'traffic_users', critical: true },
    { name: 'traffic_teams', critical: false },
    { name: 'traffic_stats', critical: false },
    { name: 'integration_logs', critical: false }
  ];

  for (const table of trafficTables) {
    try {
      const { error } = await trafficDb.from(table.name).select('*').limit(1);
      if (error && error.message.includes('does not exist')) {
        issues.push({
          severity: table.critical ? 'CRITICAL' : 'HIGH',
          category: 'DATABASE',
          problem: `Table ${table.name} does not exist in Traffic DB`,
          impact: table.critical ? 'System cannot function' : 'Feature unavailable',
          fix: `Execute migration to create ${table.name} table`
        });
      } else if (!error) {
        console.log(`  ✅ ${table.name} exists`);
      }
    } catch (e: any) {
      console.log(`  ⚠️  ${table.name}: ${e.message}`);
    }
  }

  // Landing DB tables
  const landingTables = [
    { name: 'all_sales_tracking', critical: true },
    { name: 'integration_logs', critical: true },
    { name: 'exchange_rates', critical: false },
    { name: 'amocrm_sales', critical: false },
    { name: 'traffic_stats', critical: false }
  ];

  for (const table of landingTables) {
    try {
      const { error } = await landingDb.from(table.name).select('*').limit(1);
      if (error && error.message.includes('does not exist')) {
        issues.push({
          severity: table.critical ? 'CRITICAL' : 'MEDIUM',
          category: 'DATABASE',
          problem: `Table ${table.name} does not exist in Landing DB`,
          impact: 'Sales tracking not working',
          fix: `Execute migration to create ${table.name} table`
        });
      } else if (!error) {
        console.log(`  ✅ ${table.name} exists`);
      }
    } catch (e: any) {
      console.log(`  ⚠️  ${table.name}: ${e.message}`);
    }
  }

  // ==========================================
  // 2. COLUMN EXISTENCE AUDIT
  // ==========================================
  console.log('\n📋 2. REQUIRED COLUMNS\n');

  // Check traffic_users columns
  try {
    const { data, error } = await trafficDb
      .from('traffic_users')
      .select('id, email, role, utm_source, funnel_type, team_id')
      .limit(1);

    if (error) {
      if (error.message.includes('utm_source')) {
        issues.push({
          severity: 'CRITICAL',
          category: 'DATABASE',
          problem: 'traffic_users.utm_source column missing',
          impact: 'Cannot link users to UTM sources',
          fix: 'ALTER TABLE traffic_users ADD COLUMN utm_source TEXT'
        });
      }
      if (error.message.includes('funnel_type')) {
        issues.push({
          severity: 'HIGH',
          category: 'DATABASE',
          problem: 'traffic_users.funnel_type column missing',
          impact: 'Cannot assign users to funnels (express/challenge3d/intensive1d)',
          fix: 'ALTER TABLE traffic_users ADD COLUMN funnel_type TEXT'
        });
      }
      if (error.message.includes('team_id')) {
        issues.push({
          severity: 'MEDIUM',
          category: 'DATABASE',
          problem: 'traffic_users.team_id column missing',
          impact: 'Cannot group users into teams',
          fix: 'ALTER TABLE traffic_users ADD COLUMN team_id UUID'
        });
      }
    } else {
      console.log('  ✅ traffic_users has required columns');
    }
  } catch (e: any) {
    console.log(`  ⚠️  traffic_users column check: ${e.message}`);
  }

  // Check all_sales_tracking columns
  try {
    const { data, error } = await landingDb
      .from('all_sales_tracking')
      .select('utm_source, utm_campaign, funnel_type, targetologist_id')
      .limit(1);

    if (error) {
      if (error.message.includes('funnel_type')) {
        issues.push({
          severity: 'HIGH',
          category: 'DATABASE',
          problem: 'all_sales_tracking.funnel_type column missing',
          impact: 'Cannot track sales by funnel',
          fix: 'ALTER TABLE all_sales_tracking ADD COLUMN funnel_type TEXT'
        });
      }
      if (error.message.includes('targetologist_id')) {
        issues.push({
          severity: 'MEDIUM',
          category: 'DATABASE',
          problem: 'all_sales_tracking.targetologist_id column missing',
          impact: 'Cannot attribute sales to specific targetologists',
          fix: 'ALTER TABLE all_sales_tracking ADD COLUMN targetologist_id UUID'
        });
      }
    } else {
      console.log('  ✅ all_sales_tracking has required columns');
    }
  } catch (e: any) {
    console.log(`  ⚠️  all_sales_tracking column check: ${e.message}`);
  }

  // ==========================================
  // 3. DATA INTEGRITY AUDIT
  // ==========================================
  console.log('\n🔍 3. DATA INTEGRITY\n');

  // Check for empty critical tables
  try {
    const { count } = await landingDb
      .from('all_sales_tracking')
      .select('*', { count: 'exact', head: true });

    if (count === 0) {
      issues.push({
        severity: 'HIGH',
        category: 'DATA',
        problem: 'all_sales_tracking table is EMPTY',
        impact: 'No sales data being tracked, UTM attribution not working',
        fix: 'Implement amoCRM webhook to populate all_sales_tracking'
      });
      console.log('  ❌ all_sales_tracking is empty');
    } else {
      console.log(`  ✅ all_sales_tracking has ${count} records`);
    }
  } catch (e: any) {
    console.log(`  ⚠️  all_sales_tracking count: ${e.message}`);
  }

  // Check for NULL user_id in tripwire_users
  try {
    const { count } = await trafficDb
      .from('tripwire_users')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null);

    if (count && count > 0) {
      issues.push({
        severity: 'MEDIUM',
        category: 'DATA',
        problem: `${count} tripwire_users have NULL user_id`,
        impact: 'Users cannot authenticate',
        fix: 'Run migration to link existing users to auth.users'
      });
      console.log(`  ⚠️  ${count} users with NULL user_id`);
    } else {
      console.log('  ✅ All users have valid user_id');
    }
  } catch (e: any) {
    console.log(`  ⚠️  tripwire_users NULL check: ${e.message}`);
  }

  // ==========================================
  // 4. FEATURE IMPLEMENTATION AUDIT
  // ==========================================
  console.log('\n⚙️  4. FEATURE IMPLEMENTATION\n');

  // Check for Force Sync endpoint
  try {
    const response = await fetch('https://api.onai.academy/api/traffic-dashboard/force-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.status === 404) {
      issues.push({
        severity: 'HIGH',
        category: 'FEATURE',
        problem: 'Force Sync endpoint not implemented',
        impact: 'Cannot manually trigger data synchronization',
        fix: 'Implement POST /api/traffic-dashboard/force-sync endpoint'
      });
      console.log('  ❌ Force Sync endpoint missing');
    } else {
      console.log('  ✅ Force Sync endpoint exists');
    }
  } catch (e: any) {
    console.log(`  ⚠️  Force Sync check: ${e.message}`);
  }

  // ==========================================
  // 5. CONFIGURATION AUDIT
  // ==========================================
  console.log('\n🔧 5. CONFIGURATION\n');

  // Check environment variables
  const requiredEnvVars = [
    'TRAFFIC_SUPABASE_URL',
    'TRAFFIC_SERVICE_ROLE_KEY',
    'LANDING_SUPABASE_URL',
    'LANDING_SUPABASE_SERVICE_KEY',
    'AMOCRM_CLIENT_ID',
    'AMOCRM_CLIENT_SECRET'
  ];

  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      issues.push({
        severity: 'CRITICAL',
        category: 'CONFIG',
        problem: `Environment variable ${envVar} is missing`,
        impact: 'System cannot connect to required services',
        fix: `Set ${envVar} in backend/env.env`
      });
      console.log(`  ❌ ${envVar} missing`);
    } else {
      console.log(`  ✅ ${envVar} configured`);
    }
  });

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n\n📊 === AUDIT SUMMARY ===\n');

  const critical = issues.filter(i => i.severity === 'CRITICAL');
  const high = issues.filter(i => i.severity === 'HIGH');
  const medium = issues.filter(i => i.severity === 'MEDIUM');
  const low = issues.filter(i => i.severity === 'LOW');

  console.log(`🔴 CRITICAL: ${critical.length}`);
  console.log(`🟠 HIGH: ${high.length}`);
  console.log(`🟡 MEDIUM: ${medium.length}`);
  console.log(`🟢 LOW: ${low.length}`);
  console.log(`\n📈 TOTAL ISSUES: ${issues.length}\n`);

  // Group by category
  const byCategory: Record<string, Issue[]> = {};
  issues.forEach(issue => {
    if (!byCategory[issue.category]) {
      byCategory[issue.category] = [];
    }
    byCategory[issue.category].push(issue);
  });

  Object.entries(byCategory).forEach(([category, categoryIssues]) => {
    console.log(`\n## ${category} (${categoryIssues.length} issues)\n`);
    categoryIssues.forEach((issue, idx) => {
      console.log(`${idx + 1}. [${issue.severity}] ${issue.problem}`);
      console.log(`   Impact: ${issue.impact}`);
      console.log(`   Fix: ${issue.fix}\n`);
    });
  });

  console.log('\n✅ === AUDIT COMPLETE ===\n');

  return issues;
}

deepAudit()
  .then(issues => {
    process.exit(issues.filter(i => i.severity === 'CRITICAL').length > 0 ? 1 : 0);
  })
  .catch(console.error);
