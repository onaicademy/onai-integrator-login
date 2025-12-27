import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '/Users/miso/onai-integrator-login/.env' });
config({ path: '/Users/miso/onai-integrator-login/backend/env.env' });

const supabase = createClient(
  process.env.LANDING_SUPABASE_URL!,
  process.env.LANDING_SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('📊 CHECKING RECENT SALES ACTIVITY\n');

  // Last 5 Express sales
  const { data: recentExpress } = await supabase
    .from('express_course_sales')
    .select('deal_id, customer_name, amount, sale_date, webhook_received_at')
    .order('sale_date', { ascending: false })
    .limit(5);

  console.log('Last 5 Express Course Sales (by sale_date):');
  console.table(recentExpress);

  // Last 5 Flagman sales
  const { data: recentFlagman } = await supabase
    .from('main_product_sales')
    .select('deal_id, customer_name, amount, sale_date, webhook_received_at')
    .order('sale_date', { ascending: false })
    .limit(5);

  console.log('\nLast 5 Flagman Sales (by sale_date):');
  console.table(recentFlagman);

  // Check if webhook_received_at column exists and has data
  const { data: withWebhook, error } = await supabase
    .from('express_course_sales')
    .select('webhook_received_at, customer_name')
    .not('webhook_received_at', 'is', null)
    .order('webhook_received_at', { ascending: false })
    .limit(3);

  console.log('\n📡 Webhook Status:');
  if (error) {
    console.log(`❌ Error checking webhooks: ${error.message}`);
    console.log('   Column webhook_received_at may not exist');
  } else if (withWebhook && withWebhook.length > 0) {
    console.log('✅ webhook_received_at field HAS data - webhooks ARE working!');
    console.log(`   Latest webhook sales:`);
    console.table(withWebhook);
  } else {
    console.log('⚠️ webhook_received_at field is EMPTY');
    console.log('   All data was imported via script, NOT from webhooks');
  }
}

main();
