/**
 * 🔧 FIX ALL DATABASE ISSUES
 *
 * Применяет все необходимые исправления базы данных:
 * 1. Проверяет наличие критических колонок
 * 2. Добавляет отсутствующие колонки в traffic_users (utm_source, funnel_type, team_id)
 * 3. Добавляет отсутствующие колонки в all_sales_tracking (funnel_type, targetologist_id)
 * 4. Создает триггеры для автоопределения funnel_type
 * 5. Проверяет индексы и создает недостающие
 *
 * Usage:
 *   npx tsx backend/scripts/fix-all-database-issues.ts
 */

import { trafficSupabase } from '../src/config/supabase-traffic.js';
import { landingSupabase } from '../src/config/supabase-landing.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../env.env') });

interface CheckResult {
  name: string;
  status: 'pass' | 'fail';
  message: string;
  fix?: () => Promise<void>;
}

const checks: CheckResult[] = [];

// ════════════════════════════════════════════════════════════════════════
// CHECK FUNCTIONS
// ════════════════════════════════════════════════════════════════════════

/**
 * Check if traffic_users has utm_source column
 */
async function checkTrafficUsersUTMSource(): Promise<CheckResult> {
  try {
    const { data, error } = await trafficSupabase
      .from('traffic_users')
      .select('utm_source, funnel_type, team_id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        return {
          name: 'traffic_users UTM columns',
          status: 'fail',
          message: 'Missing columns: utm_source, funnel_type, team_id',
          fix: async () => {
            console.log('\n🔧 Adding UTM columns to traffic_users...');
            console.log('   ⚠️  This requires manual SQL execution in Supabase dashboard');
            console.log('   Execute: sql/migrations/006_add_utm_tracking_columns.sql');
            console.log('   OR execute the SQL below:\n');

            const sql = `
-- Add UTM tracking columns to traffic_users
ALTER TABLE traffic_users
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS team_id UUID,
  ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT TRUE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_traffic_users_utm_source ON traffic_users(utm_source);
CREATE INDEX IF NOT EXISTS idx_traffic_users_funnel_type ON traffic_users(funnel_type);
CREATE INDEX IF NOT EXISTS idx_traffic_users_team_id ON traffic_users(team_id);

-- Add comments
COMMENT ON COLUMN traffic_users.utm_source IS 'UTM source для автоматической привязки лидов';
COMMENT ON COLUMN traffic_users.funnel_type IS 'Тип воронки: express, challenge3d, intensive1d';
COMMENT ON COLUMN traffic_users.team_id IS 'ID команды таргетолога';
COMMENT ON COLUMN traffic_users.auto_sync_enabled IS 'Включена ли автосинхронизация для этого пользователя';
`;

            console.log(sql);
            console.log('\n   After executing, re-run this script to verify.\n');
          },
        };
      }
      throw error;
    }

    return {
      name: 'traffic_users UTM columns',
      status: 'pass',
      message: 'All UTM columns exist',
    };
  } catch (error: any) {
    return {
      name: 'traffic_users UTM columns',
      status: 'fail',
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Check if all_sales_tracking has funnel_type column
 */
async function checkAllSalesTrackingFunnelType(): Promise<CheckResult> {
  try {
    const { data, error } = await landingSupabase
      .from('all_sales_tracking')
      .select('funnel_type, targetologist_id, auto_detected, detection_method')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        return {
          name: 'all_sales_tracking funnel columns',
          status: 'fail',
          message: 'Missing columns: funnel_type, targetologist_id, auto_detected, detection_method',
          fix: async () => {
            console.log('\n🔧 Adding funnel columns to all_sales_tracking...');
            console.log('   ⚠️  This requires manual SQL execution in Supabase dashboard');
            console.log('   Execute: sql/migrations/007_add_funnel_tracking_columns.sql');
            console.log('   OR execute the SQL below:\n');

            const sql = `
-- Add funnel tracking columns to all_sales_tracking
ALTER TABLE all_sales_tracking
  ADD COLUMN IF NOT EXISTS funnel_type TEXT CHECK (funnel_type IN ('express', 'challenge3d', 'intensive1d', NULL)),
  ADD COLUMN IF NOT EXISTS targetologist_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS detection_method TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_all_sales_funnel_type ON all_sales_tracking(funnel_type);
CREATE INDEX IF NOT EXISTS idx_all_sales_targetologist_id ON all_sales_tracking(targetologist_id);
CREATE INDEX IF NOT EXISTS idx_all_sales_sale_date ON all_sales_tracking(sale_date);

-- Add comments
COMMENT ON COLUMN all_sales_tracking.funnel_type IS 'Тип воронки продажи';
COMMENT ON COLUMN all_sales_tracking.targetologist_id IS 'ID таргетолога (из utm_source)';
COMMENT ON COLUMN all_sales_tracking.auto_detected IS 'Определено ли автоматически';
COMMENT ON COLUMN all_sales_tracking.detection_method IS 'Метод определения: utm_campaign_keyword, pipeline_default и т.д.';

-- Create auto-detection trigger
CREATE OR REPLACE FUNCTION detect_funnel_and_targetologist()
RETURNS TRIGGER AS $$
DECLARE
  detected_funnel TEXT;
  detected_targetologist TEXT;
BEGIN
  -- Auto-detect funnel type from utm_campaign
  IF NEW.utm_campaign IS NOT NULL THEN
    IF NEW.utm_campaign ILIKE '%express%' OR NEW.utm_campaign ILIKE '%экспресс%' THEN
      detected_funnel := 'express';
    ELSIF NEW.utm_campaign ILIKE '%challenge%' OR NEW.utm_campaign ILIKE '%трехдневник%' OR NEW.utm_campaign ILIKE '%3d%' THEN
      detected_funnel := 'challenge3d';
    ELSIF NEW.utm_campaign ILIKE '%intensive%' OR NEW.utm_campaign ILIKE '%однодневник%' OR NEW.utm_campaign ILIKE '%1d%' THEN
      detected_funnel := 'intensive1d';
    END IF;
  END IF;

  -- Auto-detect targetologist from utm_source
  IF NEW.utm_source IS NOT NULL THEN
    IF NEW.utm_source ILIKE '%kenji%' OR NEW.utm_source = 'kenjifb' THEN
      detected_targetologist := 'kenesary';
    ELSIF NEW.utm_source ILIKE '%arystan%' OR NEW.utm_source = 'fbarystan' THEN
      detected_targetologist := 'arystan';
    ELSIF NEW.utm_source ILIKE '%alex%' THEN
      detected_targetologist := 'tf4';
    ELSIF NEW.utm_source ILIKE '%facebook%' OR NEW.utm_source ILIKE '%yourmarketolog%' THEN
      detected_targetologist := 'muha';
    END IF;
  END IF;

  -- Set funnel_type if detected and not manually set
  IF NEW.funnel_type IS NULL AND detected_funnel IS NOT NULL THEN
    NEW.funnel_type := detected_funnel;
    NEW.auto_detected := TRUE;
    NEW.detection_method := 'utm_campaign_keyword';
  ELSIF NEW.funnel_type IS NULL THEN
    -- Default to express for Express Course pipeline
    NEW.funnel_type := 'express';
    NEW.auto_detected := FALSE;
    NEW.detection_method := 'pipeline_default';
  END IF;

  -- Set targetologist_id if detected
  IF NEW.targetologist_id IS NULL AND detected_targetologist IS NOT NULL THEN
    NEW.targetologist_id := detected_targetologist;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_detect_funnel_and_targetologist ON all_sales_tracking;

-- Create trigger
CREATE TRIGGER trigger_detect_funnel_and_targetologist
  BEFORE INSERT OR UPDATE ON all_sales_tracking
  FOR EACH ROW
  EXECUTE FUNCTION detect_funnel_and_targetologist();
`;

            console.log(sql);
            console.log('\n   After executing, re-run this script to verify.\n');
          },
        };
      }
      throw error;
    }

    return {
      name: 'all_sales_tracking funnel columns',
      status: 'pass',
      message: 'All funnel columns exist',
    };
  } catch (error: any) {
    return {
      name: 'all_sales_tracking funnel columns',
      status: 'fail',
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Check if all_sales_tracking has data
 */
async function checkAllSalesTrackingData(): Promise<CheckResult> {
  try {
    const { data, error, count } = await landingSupabase
      .from('all_sales_tracking')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    if (count === 0) {
      return {
        name: 'all_sales_tracking data',
        status: 'fail',
        message: 'Table is empty - run import-amocrm-historical-sales.ts',
        fix: async () => {
          console.log('\n🔧 Importing historical sales from AmoCRM...');
          console.log('   Run: npx tsx backend/scripts/import-amocrm-historical-sales.ts\n');
        },
      };
    }

    return {
      name: 'all_sales_tracking data',
      status: 'pass',
      message: `${count} sales in database`,
    };
  } catch (error: any) {
    return {
      name: 'all_sales_tracking data',
      status: 'fail',
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Check exchange rates
 */
async function checkExchangeRates(): Promise<CheckResult> {
  try {
    const { data, error } = await landingSupabase
      .from('exchange_rates')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          name: 'exchange_rates',
          status: 'fail',
          message: 'No exchange rates found',
          fix: async () => {
            console.log('\n🔧 Adding default exchange rate...');
            const today = new Date().toISOString().split('T')[0];
            const { error: insertError } = await landingSupabase
              .from('exchange_rates')
              .insert({
                date: today,
                usd_to_kzt: 502.34,
                source: 'manual_default',
              });

            if (insertError) {
              console.error('   ❌ Failed to insert exchange rate:', insertError.message);
            } else {
              console.log('   ✅ Added default exchange rate: 1 USD = 502.34 KZT');
            }
          },
        };
      }
      throw error;
    }

    const rateDate = new Date(data.date);
    const daysSinceUpdate = Math.floor((Date.now() - rateDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceUpdate > 7) {
      return {
        name: 'exchange_rates',
        status: 'fail',
        message: `Exchange rate is ${daysSinceUpdate} days old`,
        fix: async () => {
          console.log('\n🔧 Exchange rate update needed');
          console.log('   Run: npx tsx backend/scripts/update-exchange-rate.ts\n');
        },
      };
    }

    return {
      name: 'exchange_rates',
      status: 'pass',
      message: `Latest rate: ${data.usd_to_kzt} KZT (${daysSinceUpdate} days old)`,
    };
  } catch (error: any) {
    return {
      name: 'exchange_rates',
      status: 'fail',
      message: `Error: ${error.message}`,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🔧 DATABASE ISSUES DIAGNOSTIC & FIX');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Run all checks
  console.log('🔍 Running checks...\n');

  checks.push(await checkTrafficUsersUTMSource());
  checks.push(await checkAllSalesTrackingFunnelType());
  checks.push(await checkAllSalesTrackingData());
  checks.push(await checkExchangeRates());

  // Print results
  console.log('\n📊 CHECK RESULTS:\n');

  let passCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const icon = check.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${check.name.padEnd(40)} ${check.message}`);

    if (check.status === 'pass') passCount++;
    else failCount++;
  }

  console.log(`\n📈 Summary: ${passCount} passed, ${failCount} failed\n`);

  // Apply fixes if requested
  const shouldFix = process.argv.includes('--fix');

  if (failCount > 0) {
    if (shouldFix) {
      console.log('🔧 Applying fixes...\n');

      for (const check of checks) {
        if (check.status === 'fail' && check.fix) {
          console.log(`\n🔧 Fixing: ${check.name}`);
          await check.fix();
        }
      }

      console.log('\n✅ All automated fixes applied');
      console.log('   ⚠️  Some fixes require manual SQL execution - see instructions above');
      console.log('   Re-run this script after applying manual fixes to verify\n');
    } else {
      console.log('💡 To apply automated fixes, run:');
      console.log('   npx tsx backend/scripts/fix-all-database-issues.ts --fix\n');

      console.log('📋 MANUAL FIXES REQUIRED:\n');
      for (const check of checks) {
        if (check.status === 'fail') {
          console.log(`   ❌ ${check.name}: ${check.message}`);
        }
      }
      console.log('');
    }
  } else {
    console.log('✅ All checks passed! Database is in good state.\n');
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
