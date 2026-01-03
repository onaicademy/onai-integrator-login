/**
 * Comprehensive System Audit Script
 * Проверяет все аспекты системы перед продакшеном
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

async function comprehensiveAudit() {
  console.log('🔍 === COMPREHENSIVE SYSTEM AUDIT ===\n');

  const issues: string[] = [];
  const warnings: string[] = [];
  const passed: string[] = [];

  // ==========================================
  // 1. CHECK MIGRATION 004 - integration_logs
  // ==========================================
  console.log('📋 MIGRATION 004: integration_logs table\n');

  try {
    // Check table exists
    const { data: ilData, error: ilError } = await landingDb
      .from('integration_logs')
      .select('*')
      .limit(1);

    if (ilError) {
      issues.push(`❌ integration_logs table: ${ilError.message}`);
    } else {
      passed.push('✅ integration_logs table exists');

      // Check if table has correct columns
      const { data: sample } = await landingDb
        .from('integration_logs')
        .select('service_name, action, status, related_entity_type, duration_ms')
        .limit(1);

      if (sample) {
        passed.push('✅ integration_logs has correct schema');
      }
    }

    // Check indexes exist (query pg_indexes)
    const { data: indexes, error: indexError } = await landingDb
      .rpc('execute_sql', {
        query: `
          SELECT indexname
          FROM pg_indexes
          WHERE tablename = 'integration_logs'
          AND schemaname = 'public'
        `
      }).catch(() => ({ data: null, error: { message: 'RPC not available' } }));

    if (!indexError && indexes) {
      passed.push(`✅ integration_logs indexes: ${indexes.length} found`);
    } else {
      warnings.push('⚠️ Could not verify indexes (RPC not available)');
    }

  } catch (err: any) {
    issues.push(`❌ integration_logs check failed: ${err.message}`);
  }

  // ==========================================
  // 2. CHECK tripwire_users TABLE
  // ==========================================
  console.log('\n👤 TRIPWIRE USERS TABLE\n');

  try {
    const { data: users, error: usersError } = await trafficDb
      .from('tripwire_users')
      .select('id, email, user_id, status')
      .limit(10);

    if (usersError) {
      issues.push(`❌ tripwire_users: ${usersError.message}`);
    } else {
      passed.push(`✅ tripwire_users table exists - ${users?.length || 0} sample users`);

      // Check for NULL user_id
      const { count: nullUserIdCount } = await trafficDb
        .from('tripwire_users')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null);

      if (nullUserIdCount && nullUserIdCount > 0) {
        warnings.push(`⚠️ Found ${nullUserIdCount} users with NULL user_id`);
      } else {
        passed.push('✅ No NULL user_id found');
      }
    }
  } catch (err: any) {
    issues.push(`❌ tripwire_users check failed: ${err.message}`);
  }

  // ==========================================
  // 3. CHECK tripwire_user_profile TABLE
  // ==========================================
  console.log('\n📊 TRIPWIRE USER PROFILES\n');

  try {
    const { data: profiles, error: profilesError } = await trafficDb
      .from('tripwire_user_profile')
      .select('user_id, welcome_email_sent, onboarding_completed')
      .limit(10);

    if (profilesError) {
      issues.push(`❌ tripwire_user_profile: ${profilesError.message}`);
    } else {
      passed.push(`✅ tripwire_user_profile exists - ${profiles?.length || 0} profiles`);

      // Check welcome_email_sent flags
      if (profiles && profiles.length > 0) {
        const withWelcomeEmail = profiles.filter(p => p.welcome_email_sent).length;
        console.log(`   Welcome emails sent: ${withWelcomeEmail}/${profiles.length}`);
      }
    }
  } catch (err: any) {
    issues.push(`❌ tripwire_user_profile check failed: ${err.message}`);
  }

  // ==========================================
  // 4. CHECK all_sales_tracking TABLE
  // ==========================================
  console.log('\n💰 SALES TRACKING\n');

  try {
    const { count: salesCount } = await landingDb
      .from('all_sales_tracking')
      .select('*', { count: 'exact', head: true });

    if (salesCount === 0) {
      warnings.push('⚠️ all_sales_tracking table is EMPTY');
    } else {
      passed.push(`✅ all_sales_tracking has ${salesCount} records`);
    }

    // Check for UTM attribution
    const { data: withUTM } = await landingDb
      .from('all_sales_tracking')
      .select('utm_source, utm_campaign')
      .not('utm_source', 'is', null)
      .limit(5);

    if (withUTM && withUTM.length > 0) {
      passed.push(`✅ UTM attribution working - ${withUTM.length} sales with UTM`);
    } else {
      warnings.push('⚠️ No sales with UTM attribution found');
    }

  } catch (err: any) {
    issues.push(`❌ all_sales_tracking check failed: ${err.message}`);
  }

  // ==========================================
  // 5. CHECK traffic_users TABLE
  // ==========================================
  console.log('\n🚦 TRAFFIC USERS (Admin Panel)\n');

  try {
    const { data: trafficUsers, error: trafficError } = await trafficDb
      .from('traffic_users')
      .select('email, role, is_active, utm_source')
      .eq('is_active', true);

    if (trafficError) {
      issues.push(`❌ traffic_users: ${trafficError.message}`);
    } else {
      passed.push(`✅ traffic_users table exists - ${trafficUsers?.length || 0} active users`);

      // Check for UTM assignment
      const withUTM = trafficUsers?.filter(u => u.utm_source) || [];
      if (withUTM.length > 0) {
        passed.push(`✅ UTM assignment: ${withUTM.length} users have utm_source`);
      } else {
        warnings.push('⚠️ No users have utm_source assigned');
      }
    }
  } catch (err: any) {
    issues.push(`❌ traffic_users check failed: ${err.message}`);
  }

  // ==========================================
  // 6. CHECK exchange_rates TABLE
  // ==========================================
  console.log('\n💱 EXCHANGE RATES\n');

  try {
    const { data: rates, error: ratesError } = await landingDb
      .from('exchange_rates')
      .select('date, usd_to_kzt, source')
      .order('date', { ascending: false })
      .limit(3);

    if (ratesError) {
      issues.push(`❌ exchange_rates: ${ratesError.message}`);
    } else if (!rates || rates.length === 0) {
      warnings.push('⚠️ exchange_rates table is empty');
    } else {
      passed.push(`✅ exchange_rates has ${rates.length} recent rates`);
      const latest = rates[0];
      console.log(`   Latest: ${latest.date} - $1 = ${latest.usd_to_kzt} KZT (${latest.source})`);

      // Check if rate is recent (within 7 days)
      const latestDate = new Date(latest.date);
      const daysOld = Math.floor((Date.now() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOld > 7) {
        warnings.push(`⚠️ Latest exchange rate is ${daysOld} days old`);
      } else {
        passed.push(`✅ Exchange rate is fresh (${daysOld} days old)`);
      }
    }
  } catch (err: any) {
    issues.push(`❌ exchange_rates check failed: ${err.message}`);
  }

  // ==========================================
  // FINAL REPORT
  // ==========================================
  console.log('\n\n📊 === AUDIT SUMMARY ===\n');

  console.log(`✅ PASSED CHECKS: ${passed.length}`);
  passed.forEach(p => console.log(p));

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${warnings.length}`);
    warnings.forEach(w => console.log(w));
  }

  if (issues.length > 0) {
    console.log(`\n❌ CRITICAL ISSUES: ${issues.length}`);
    issues.forEach(i => console.log(i));
  }

  const healthScore = Math.round((passed.length / (passed.length + warnings.length + issues.length * 2)) * 100);

  console.log(`\n🎯 SYSTEM HEALTH SCORE: ${healthScore}%`);

  if (healthScore >= 90) {
    console.log('✅ System is PRODUCTION READY');
  } else if (healthScore >= 70) {
    console.log('⚠️  System needs minor fixes before production');
  } else {
    console.log('❌ System requires CRITICAL fixes before production');
  }

  console.log('\n✅ === AUDIT COMPLETE ===\n');
}

comprehensiveAudit().catch(console.error);
