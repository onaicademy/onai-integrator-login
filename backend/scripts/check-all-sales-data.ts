/**
 * Comprehensive Sales Data Check for Traffic Dashboard
 * Проверяет все продажи из AmoCRM в Traffic DB за 1-4 января 2026
 */

import { createClient } from '@supabase/supabase-js';

const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const trafficKey = process.env.TRAFFIC_SERVICE_ROLE_KEY || 'sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK';

const client = createClient(trafficUrl, trafficKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      Authorization: `Bearer ${trafficKey}`
    }
  }
});

async function checkAllSalesData() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ПРОВЕРКА ДАННЫХ ПРОДАЖ: 1-4 ЯНВАРЯ 2026');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startDate = '2026-01-01';
  const endDate = '2026-01-04';

  // 1. Challenge3D Sales
  console.log('📘 CHALLENGE 3D SALES:');
  console.log('─────────────────────────────────────────────────────────\n');

  const { data: challenge3dSales, error: c3dError } = await client
    .from('challenge3d_sales')
    .select('*')
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .order('sale_date', { ascending: true });

  if (c3dError) {
    console.error('❌ Challenge3D Error:', c3dError.message);
  } else {
    console.log(`Total Challenge3D sales: ${challenge3dSales?.length || 0}\n`);

    const prepayments = challenge3dSales?.filter(s => s.sale_type === 'Prepayment') || [];
    const fullPayments = challenge3dSales?.filter(s => s.sale_type === 'Full Payment') || [];

    console.log(`Prepayments: ${prepayments.length}`);
    prepayments.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.lead_name} - ${sale.sale_amount} ₸ (${sale.sale_date})`);
      console.log(`     UTM: ${sale.utm_source || 'N/A'} / ${sale.utm_campaign || 'N/A'}`);
    });

    console.log(`\nFull Payments: ${fullPayments.length}`);
    fullPayments.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.lead_name} - ${sale.sale_amount} ₸ (${sale.sale_date})`);
      console.log(`     UTM: ${sale.utm_source || 'N/A'} / ${sale.utm_campaign || 'N/A'}`);
    });

    const totalRevenue = challenge3dSales?.reduce((sum, s) => sum + (s.sale_amount || 0), 0) || 0;
    console.log(`\nTotal Challenge3D Revenue: ${totalRevenue.toLocaleString()} ₸\n`);
  }

  // 2. Journey Stages (Leads)
  console.log('👥 JOURNEY STAGES (LEADS):');
  console.log('─────────────────────────────────────────────────────────\n');

  const { data: journeyStages, error: jsError } = await client
    .from('journey_stages')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')
    .order('created_at', { ascending: true });

  if (jsError) {
    console.error('❌ Journey Stages Error:', jsError.message);
  } else {
    console.log(`Total leads: ${journeyStages?.length || 0}\n`);

    // Group by stage
    const byStage: Record<string, any[]> = {};
    journeyStages?.forEach(stage => {
      if (!byStage[stage.stage_name]) byStage[stage.stage_name] = [];
      byStage[stage.stage_name].push(stage);
    });

    Object.entries(byStage).forEach(([stageName, stages]) => {
      console.log(`  ${stageName}: ${stages.length}`);
    });
    console.log();
  }

  // 3. Check for other sales tables
  console.log('🔍 CHECKING OTHER TABLES:');
  console.log('─────────────────────────────────────────────────────────\n');

  // Try express_course_sales
  const { data: expressSales, error: expError } = await client
    .from('express_course_sales')
    .select('*')
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .limit(10);

  if (expError) {
    console.log('❌ express_course_sales:', expError.message);
  } else {
    console.log(`✅ express_course_sales: ${expressSales?.length || 0} sales`);
    expressSales?.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.lead_name || sale.lead_email} - ${sale.sale_amount} ₸`);
    });
  }

  // Try main_product_sales
  const { data: mainSales, error: mainError } = await client
    .from('main_product_sales')
    .select('*')
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .limit(10);

  if (mainError) {
    console.log('❌ main_product_sales:', mainError.message);
  } else {
    console.log(`✅ main_product_sales: ${mainSales?.length || 0} sales`);
    mainSales?.forEach((sale, i) => {
      console.log(`  ${i + 1}. ${sale.lead_name || sale.lead_email} - ${sale.sale_amount} ₸`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
}

checkAllSalesData().catch(console.error);
