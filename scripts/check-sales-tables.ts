import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '/Users/miso/onai-integrator-login/.env' });
config({ path: '/Users/miso/onai-integrator-login/backend/env.env' });

const supabase = createClient(
  process.env.LANDING_SUPABASE_URL as string,
  process.env.LANDING_SUPABASE_SERVICE_KEY as string
);

async function main() {
  console.log('🔍 Checking Express Course Sales table...\n');

  const { count: expressCount, error: expErr } = await supabase
    .from('express_course_sales')
    .select('*', { count: 'exact', head: true });

  if (expErr) {
    console.log(`express_course_sales: ❌ ${expErr.message}`);
  } else {
    console.log(`express_course_sales: ✅ ${expressCount} records\n`);
  }

  console.log('🔍 Checking Main Product Sales table...\n');

  const { count: mainCount, error: mainErr } = await supabase
    .from('main_product_sales')
    .select('*', { count: 'exact', head: true });

  if (mainErr) {
    console.log(`main_product_sales: ❌ ${mainErr.message}`);
  } else {
    console.log(`main_product_sales: ✅ ${mainCount} records\n`);
  }

  console.log('🔍 Checking Traffic Stats table...\n');

  const { count: trafficCount, error: trafficErr } = await supabase
    .from('traffic_stats')
    .select('*', { count: 'exact', head: true });

  if (trafficErr) {
    console.log(`traffic_stats: ❌ ${trafficErr.message}`);
  } else {
    console.log(`traffic_stats: ✅ ${trafficCount} records\n`);
  }

  // Check if traffic_stats has sales columns
  const { data: sample, error: sampleErr } = await supabase
    .from('traffic_stats')
    .select('stat_date, express_sales, main_sales, revenue_express_usd, revenue_main_usd')
    .limit(5);

  if (sampleErr) {
    console.log(`Sample error: ${sampleErr.message}`);
  } else {
    console.log('Sample traffic_stats data:');
    console.table(sample);
  }
}

main();
