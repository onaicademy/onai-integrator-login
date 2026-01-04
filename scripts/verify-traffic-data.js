/**
 * Проверка данных в Traffic DB (используя те же креденшалы что и скрипт миграции)
 */

import { createClient } from '@supabase/supabase-js';

// Те же креденшалы что в migrate-leads-to-traffic.js
const TRAFFIC_DB = {
  url: 'https://oetodaexnjcunklkdlkv.supabase.co',
  key: process.env.SUPABASE_TRAFFIC_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
};

const trafficClient = createClient(TRAFFIC_DB.url, TRAFFIC_DB.key);

async function checkTrafficData() {
  console.log('\n🔍 Проверка данных в Traffic DB...\n');
  console.log(`URL: ${TRAFFIC_DB.url}`);
  console.log(`Key: ${TRAFFIC_DB.key.substring(0, 20)}...\n`);

  // Проверка traffic_leads
  const { data: leads, error: leadsError, count: leadsCount } = await trafficClient
    .from('traffic_leads')
    .select('*', { count: 'exact', head: false })
    .limit(10);

  if (leadsError) {
    console.error('❌ Ошибка traffic_leads:', leadsError.message);
  } else {
    console.log(`✅ traffic_leads: ${leadsCount} лидов`);

    // Подсчет по source
    const { count: challenge3dCount } = await trafficClient
      .from('traffic_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'challenge3d');

    const { count: expressCount } = await trafficClient
      .from('traffic_leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'expresscourse');

    console.log(`   - challenge3d: ${challenge3dCount || 0}`);
    console.log(`   - expresscourse: ${expressCount || 0}`);
    console.log(`   - other: ${(leadsCount || 0) - (challenge3dCount || 0) - (expressCount || 0)}`);

    if (leads && leads.length > 0) {
      console.log('\n   Последние 10 лидов:');
      leads.forEach((lead, i) => {
        console.log(`   ${i+1}. ${lead.name || 'N/A'} | ${lead.phone || 'N/A'} | ${lead.source} | ${lead.funnel_type || 'N/A'} | ${lead.created_at}`);
      });
    }
  }

  // Проверка traffic_sales
  const { count: salesCount } = await trafficClient
    .from('traffic_sales')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ traffic_sales (Express): ${salesCount || 0} продаж`);

  // Проверка challenge3d_sales
  const { count: challenge3dSalesCount } = await trafficClient
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true });

  const { count: prepaidCount } = await trafficClient
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true })
    .eq('prepaid', true);

  const { count: fullPaymentCount } = await trafficClient
    .from('challenge3d_sales')
    .select('*', { count: 'exact', head: true })
    .eq('prepaid', false);

  console.log(`✅ challenge3d_sales: ${challenge3dSalesCount || 0} продаж`);
  console.log(`   - Предоплаты: ${prepaidCount || 0}`);
  console.log(`   - Полные оплаты: ${fullPaymentCount || 0}`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 ИТОГ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Всего лидов в Traffic DB: ${leadsCount || 0}`);
  console.log(`Всего продаж Express: ${salesCount || 0}`);
  console.log(`Всего продаж Challenge3D: ${challenge3dSalesCount || 0}`);

  if (leadsCount && leadsCount > 0) {
    console.log('\n✅ Данные успешно мигрированы!');
  } else {
    console.log('\n⚠️  ВНИМАНИЕ: Данные отсутствуют! Требуется миграция.');
  }
}

checkTrafficData().catch(console.error);
