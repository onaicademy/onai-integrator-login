/**
 * Скрипт миграции данных из Landing DB в Traffic Dashboard DB через service_role
 * Использует service_role ключ для обхода RLS ограничений
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация баз данных
const LANDING_DB = {
  url: 'https://xikaiavwqinamgolmtcy.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ'
};

// Service Role ключ для Traffic DB (для обхода RLS)
const TRAFFIC_DB = {
  url: 'https://oetodaexnjcunklkdlkv.supabase.co',
  key: process.env.SUPABASE_TRAFFIC_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
};

// Создание клиентов
const landingClient = createClient(LANDING_DB.url, LANDING_DB.key);
const trafficClient = createClient(TRAFFIC_DB.url, TRAFFIC_DB.key);

/**
 * Миграция данных из одной таблицы в другую
 */
async function migrateTable(sourceClient, targetClient, sourceTable, targetTable, transformFn, filterFn = null) {
  console.log(`\n🔄 Миграция таблицы: ${sourceTable} → ${targetTable}`);

  // Чтение данных из источника
  const { data: sourceData, error: sourceError } = await sourceClient
    .from(sourceTable)
    .select('*');

  if (sourceError) {
    console.error(`❌ Ошибка чтения из ${sourceTable}:`, sourceError);
    return { success: false, error: sourceError };
  }

  console.log(`📥 Найдено записей: ${sourceData?.length || 0}`);

  if (!sourceData || sourceData.length === 0) {
    return { success: true, imported: 0 };
  }

  // Фильтрация данных (если нужна)
  let filteredData = sourceData;
  if (filterFn) {
    filteredData = sourceData.filter(filterFn);
    console.log(`🔍 После фильтрации: ${filteredData.length} записей`);
  }

  // Трансформация данных
  const transformedData = filteredData.map(transformFn);

  // Вставка данных в целевую таблицу
  const { error: insertError } = await targetClient
    .from(targetTable)
    .insert(transformedData);

  if (insertError) {
    console.error(`❌ Ошибка вставки в ${targetTable}:`, insertError);
    return { success: false, error: insertError };
  }

  console.log(`✅ Успешно импортировано: ${transformedData.length} записей`);
  return { success: true, imported: transformedData.length };
}

/**
 * Трансформация данных для таблицы traffic_stats → traffic_sales_stats
 */
function transformTrafficStat(stat) {
  return {
    id: stat.id,
    date: stat.date,
    period_type: 'daily',
    team_name: stat.team,
    team_id: null, // Will be mapped later
    utm_source: stat.campaign_id === 'team_total' ? null : stat.campaign_id,
    utm_medium: 'cpc',
    total_sales: (stat.express_sales || 0) + (stat.main_sales || 0),
    total_revenue: stat.revenue_total_usd || 0,
    average_order_value: 0,
    flagman_sales: stat.main_sales || 0,
    flagman_revenue: stat.revenue_main_usd || 0,
    express_sales: stat.express_sales || 0,
    express_revenue: stat.revenue_express_usd || 0,
    leads_count: stat.registrations || 0,
    conversion_rate: 0,
    fb_spend: stat.spend_usd || 0,
    fb_impressions: stat.impressions || 0,
    fb_clicks: stat.clicks || 0,
    fb_ctr: stat.ctr || 0,
    fb_cpc: stat.cpc_usd || 0,
    fb_cpm: stat.cpm_usd || 0,
    roi: stat.roi_percent || 0,
    roas: 0,
    cpa: 0,
    created_at: stat.created_at,
    updated_at: stat.updated_at,
    is_historical: false,
    historical_synced_at: null,
    sync_type: 'realtime'
  };
}

/**
 * Трансформация данных для таблицы express_course_sales → traffic_sales
 */
function transformExpressSale(sale) {
  return {
    id: sale.id,
    deal_id: sale.deal_id,
    contact_id: sale.customer_id,
    amount: sale.amount,
    currency: sale.currency,
    utm_source: sale.utm_source,
    utm_campaign: sale.utm_campaign,
    utm_medium: sale.utm_medium,
    utm_content: sale.utm_content,
    utm_term: sale.utm_term,
    customer_name: sale.customer_name,
    phone: sale.phone,
    email: sale.email,
    product_name: 'Express Course',
    payment_method: 'card',
    lead_id: null,
    sale_date: sale.sale_date,
    created_at: sale.created_at,
    updated_at: sale.updated_at
  };
}

/**
 * Трансформация данных для таблицы main_product_sales → traffic_sales
 */
function transformMainSale(sale) {
  return {
    id: sale.id,
    deal_id: sale.deal_id,
    contact_id: sale.customer_id,
    amount: sale.amount,
    currency: sale.currency,
    utm_source: sale.utm_source,
    utm_campaign: sale.utm_campaign,
    utm_medium: sale.utm_medium,
    utm_content: sale.utm_content,
    utm_term: sale.utm_term,
    customer_name: sale.customer_name,
    phone: sale.phone,
    email: sale.email,
    product_name: 'Integrator Flagman',
    payment_method: 'card',
    lead_id: null,
    sale_date: sale.sale_date,
    created_at: sale.created_at,
    updated_at: sale.updated_at
  };
}

/**
 * Трансформация данных для таблицы challenge3d_sales
 */
function transformChallenge3DSale(sale) {
  return {
    id: sale.id,
    deal_id: sale.deal_id,
    contact_id: sale.customer_id,
    amount: sale.amount,
    currency: sale.currency,
    prepaid: sale.prepaid,
    utm_source: sale.utm_source,
    utm_campaign: sale.utm_campaign,
    utm_medium: sale.utm_medium,
    utm_content: sale.utm_content,
    utm_term: sale.utm_term,
    original_utm_source: sale.original_utm_source,
    original_utm_campaign: sale.original_utm_campaign,
    original_utm_medium: sale.original_utm_medium,
    original_utm_content: sale.original_utm_content,
    original_utm_term: sale.original_utm_term,
    customer_name: sale.customer_name,
    phone: sale.phone,
    email: sale.email,
    product_name: 'Challenge 3D',
    payment_method: 'card',
    lead_id: null,
    prepayment_deal_id: null,
    sale_date: sale.sale_date,
    created_at: sale.created_at,
    updated_at: sale.updated_at
  };
}

/**
 * Основная функция миграции
 */
async function main() {
  console.log('🚀 Начало миграции данных из Landing DB в Traffic Dashboard DB (с service_role)\n');

  const results = [];

  // 3. Миграция traffic_stats → traffic_sales_stats
  const statsResult = await migrateTable(
    landingClient,
    trafficClient,
    'traffic_stats',
    'traffic_sales_stats',
    transformTrafficStat
  );
  results.push({ table: 'traffic_stats → traffic_sales_stats', ...statsResult });

  if (!statsResult.success) {
    console.error('\n❌ Миграция traffic_sales_stats не удалась');
    process.exit(1);
  }

  // 4. Миграция express_course_sales → traffic_sales
  const expressResult = await migrateTable(
    landingClient,
    trafficClient,
    'express_course_sales',
    'traffic_sales',
    transformExpressSale
  );
  results.push({ table: 'express_course_sales → traffic_sales', ...expressResult });

  if (!expressResult.success) {
    console.error('\n❌ Миграция express_course_sales не удалась');
    process.exit(1);
  }

  // 5. Миграция main_product_sales → traffic_sales
  const mainResult = await migrateTable(
    landingClient,
    trafficClient,
    'main_product_sales',
    'traffic_sales',
    transformMainSale
  );
  results.push({ table: 'main_product_sales → traffic_sales', ...mainResult });

  if (!mainResult.success) {
    console.error('\n❌ Миграция main_product_sales не удалась');
    process.exit(1);
  }

  // 6. Миграция challenge3d_sales
  const challenge3DResult = await migrateTable(
    landingClient,
    trafficClient,
    'challenge3d_sales',
    'challenge3d_sales',
    transformChallenge3DSale
  );
  results.push({ table: 'challenge3d_sales', ...challenge3DResult });

  if (!challenge3DResult.success) {
    console.error('\n❌ Миграция challenge3d_sales не удалась');
    process.exit(1);
  }

  console.log('\n✅ Миграция завершена успешно!');
  console.log(`\n📊 Статистика миграции:`);
  results.forEach(r => {
    console.log(`   - ${r.table}: ${r.imported} записей`);
  });

  const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
  console.log(`\n📈 Всего импортировано: ${totalImported} записей`);
}

main().catch(console.error);
