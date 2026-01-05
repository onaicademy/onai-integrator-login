const { createClient } = require('@supabase/supabase-js');

const trafficUrl = 'https://oetodaexnjcunklkdlkv.supabase.co';
const trafficKey = 'sb_secret_h7VM2nxmyNWtw9158fCDLA_t6by7McK';

const client = createClient(trafficUrl, trafficKey);

async function getSalesData() {
  console.log('📊 ВОРОНКА ПРОДАЖ: 1-4 ЯНВАРЯ 2026\n');
  console.log('═'.repeat(80));

  // Express Course Sales
  const { data: expressSales, error: expressError } = await client
    .from('express_course_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04')
    .order('sale_date', { ascending: true });

  if (expressError) {
    console.error('❌ Express sales error:', expressError.message);
  } else {
    console.log(`\n📦 EXPRESS COURSE (5,000 ₸):`);
    console.log(`   Продаж: ${expressSales?.length || 0}`);
    console.log(`   Доход: ${(expressSales?.length || 0) * 5000} ₸`);
    if (expressSales && expressSales.length > 0) {
      console.log('\n   Детали:');
      expressSales.forEach((sale, i) => {
        console.log(`   ${i+1}. ${sale.customer_name || 'N/A'} - ${sale.amount} ₸ (${sale.sale_date})`);
        console.log(`      UTM: ${sale.utm_source || 'N/A'} / ${sale.utm_campaign || 'N/A'}`);
      });
    }
  }

  // Challenge3D Sales
  const { data: challenge3dSales, error: challenge3dError } = await client
    .from('challenge3d_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04')
    .order('sale_date', { ascending: true });

  if (challenge3dError) {
    console.error('❌ Challenge3D sales error:', challenge3dError.message);
  } else {
    const prepayments = challenge3dSales?.filter(s => s.prepaid) || [];
    const fullPayments = challenge3dSales?.filter(s => !s.prepaid) || [];
    console.log(`\n📘 CHALLENGE 3D:`);
    console.log(`   Предоплаты: ${prepayments.length} (59,000 ₸ каждая)`);
    console.log(`   Полные оплаты: ${fullPayments.length} (240,000 ₸ каждая)`);
    console.log(`   Доход: ${prepayments.length * 59000 + fullPayments.length * 240000} ₸`);
    if (challenge3dSales && challenge3dSales.length > 0) {
      console.log('\n   Детали:');
      challenge3dSales.forEach((sale, i) => {
        console.log(`   ${i+1}. ${sale.customer_name || 'N/A'} - ${sale.amount} ₸ (${sale.prepaid ? 'Предоплата' : 'Полная'}) (${sale.sale_date})`);
        console.log(`      UTM: ${sale.utm_source || 'N/A'} / ${sale.utm_campaign || 'N/A'}`);
      });
    }
  }

  // Main Product Sales (Flagman)
  const { data: mainSales, error: mainError } = await client
    .from('main_product_sales')
    .select('*')
    .gte('sale_date', '2026-01-01')
    .lte('sale_date', '2026-01-04')
    .order('sale_date', { ascending: true });

  if (mainError) {
    console.error('❌ Main product sales error:', mainError.message);
  } else {
    console.log(`\n🎯 FLAGMAN (490,000 ₸):`);
    console.log(`   Продаж: ${mainSales?.length || 0}`);
    console.log(`   Доход: ${(mainSales?.length || 0) * 490000} ₸`);
    if (mainSales && mainSales.length > 0) {
      console.log('\n   Детали:');
      mainSales.forEach((sale, i) => {
        console.log(`   ${i+1}. ${sale.customer_name || 'N/A'} - ${sale.amount} ₸ (${sale.sale_date})`);
        console.log(`      UTM: ${sale.utm_source || 'N/A'} / ${sale.utm_campaign || 'N/A'}`);
      });
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 ИТОГО:');
  const totalExpress = (expressSales?.length || 0) * 5000;
  const totalChallenge = (challenge3dSales?.filter(s => s.prepaid).length || 0) * 59000 +
                         (challenge3dSales?.filter(s => !s.prepaid).length || 0) * 240000;
  const totalMain = (mainSales?.length || 0) * 490000;
  const total = totalExpress + totalChallenge + totalMain;

  console.log(`   Express: ${totalExpress} ₸`);
  console.log(`   Challenge3D: ${totalChallenge} ₸`);
  console.log(`   Flagman: ${totalMain} ₸`);
  console.log(`   \n   ОБЩИЙ ДОХОД: ${total} ₸ (${(total / 475).toFixed(2)} USD)`);
}

getSalesData().catch(console.error);
