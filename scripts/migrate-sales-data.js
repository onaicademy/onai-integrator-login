/**
 * ════════════════════════════════════════════════════════════════════════
 * 💰 МИГРАЦИЯ ДАННЫХ О ПРОДАЖАХ
 * ════════════════════════════════════════════════════════════════════════
 *
 * Источник: Landing DB (xikaiavwqinamgolmtcy)
 * Цель: Traffic DB (oetodaexnjcunklkdlkv)
 *
 * Мигрируем:
 * - express_course_sales → traffic_sales
 * - challenge3d_sales → challenge3d_sales
 */

import { createClient } from '@supabase/supabase-js';

const LANDING_DB = {
  url: 'https://xikaiavwqinamgolmtcy.supabase.co',
  key: process.env.SUPABASE_LANDING_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ'
};

const TRAFFIC_DB = {
  url: 'https://oetodaexnjcunklkdlkv.supabase.co',
  key: process.env.SUPABASE_TRAFFIC_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
};

const landingClient = createClient(LANDING_DB.url, LANDING_DB.key);
const trafficClient = createClient(TRAFFIC_DB.url, TRAFFIC_DB.key);

async function migrateExpressSales() {
  console.log('\n💰 Миграция Express Course Sales...\n');

  // Читаем данные из Landing DB
  const { data: sales, error } = await landingClient
    .from('express_course_sales')
    .select('*');

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  Таблица express_course_sales не существует в Landing DB');
      return { success: true, migrated: 0 };
    }
    console.error('❌ Ошибка чтения:', error.message);
    return { success: false, error };
  }

  if (!sales || sales.length === 0) {
    console.log('⚠️  Нет данных для миграции');
    return { success: true, migrated: 0 };
  }

  console.log(`📥 Найдено ${sales.length} продаж Express`);

  // Трансформируем данные для Traffic DB схемы
  const transformedSales = sales.map(sale => ({
    id: sale.id,
    deal_id: sale.deal_id,
    contact_id: sale.contact_id || sale.customer_id,
    amount: sale.amount,
    currency: sale.currency || 'KZT',
    utm_source: sale.utm_source,
    utm_campaign: sale.utm_campaign,
    utm_medium: sale.utm_medium,
    utm_content: sale.utm_content,
    utm_term: sale.utm_term,
    customer_name: sale.customer_name,
    phone: sale.phone,
    email: sale.email,
    product_name: sale.product_name || 'Express Course',
    payment_method: sale.payment_method,
    lead_id: sale.lead_id,
    sale_date: sale.sale_date,
    created_at: sale.created_at,
    updated_at: sale.updated_at || sale.created_at
  }));

  // Вставляем в Traffic DB
  const { error: insertError } = await trafficClient
    .from('traffic_sales')
    .upsert(transformedSales, { onConflict: 'deal_id' });

  if (insertError) {
    console.error('❌ Ошибка вставки:', insertError.message);
    return { success: false, error: insertError };
  }

  console.log(`✅ Успешно мигрировано ${sales.length} продаж Express`);
  return { success: true, migrated: sales.length };
}

async function migrateChallenge3DSales() {
  console.log('\n🎯 Миграция Challenge3D Sales...\n');

  // Читаем данные из Landing DB
  const { data: sales, error } = await landingClient
    .from('challenge3d_sales')
    .select('*');

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('⚠️  Таблица challenge3d_sales не существует в Landing DB');
      return { success: true, migrated: 0 };
    }
    console.error('❌ Ошибка чтения:', error.message);
    return { success: false, error };
  }

  if (!sales || sales.length === 0) {
    console.log('⚠️  Нет данных для миграции');
    return { success: true, migrated: 0 };
  }

  console.log(`📥 Найдено ${sales.length} продаж Challenge3D`);

  // Подсчет предоплат и полных оплат
  const prepayments = sales.filter(s => s.prepaid === true).length;
  const fullPayments = sales.filter(s => s.prepaid === false).length;

  console.log(`   - Предоплаты: ${prepayments}`);
  console.log(`   - Полные оплаты: ${fullPayments}`);

  // Трансформируем данные для Traffic DB схемы
  const transformedSales = sales.map(sale => ({
    id: sale.id,
    deal_id: sale.deal_id,
    contact_id: sale.contact_id || sale.customer_id,
    amount: sale.amount,
    currency: sale.currency || 'KZT',
    prepaid: sale.prepaid || false,
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
    product_name: sale.product_name || 'Challenge 3D',
    payment_method: sale.payment_method,
    lead_id: sale.lead_id,
    prepayment_deal_id: sale.prepayment_deal_id || sale.related_deal_id,
    sale_date: sale.sale_date,
    created_at: sale.created_at,
    updated_at: sale.updated_at || sale.created_at
  }));

  // Вставляем в Traffic DB
  const { error: insertError } = await trafficClient
    .from('challenge3d_sales')
    .upsert(transformedSales, { onConflict: 'deal_id' });

  if (insertError) {
    console.error('❌ Ошибка вставки:', insertError.message);
    return { success: false, error: insertError };
  }

  console.log(`✅ Успешно мигрировано ${sales.length} продаж Challenge3D`);
  return { success: true, migrated: sales.length };
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       💰 МИГРАЦИЯ ДАННЫХ О ПРОДАЖАХ                        ║');
  console.log('║  Landing DB → Traffic DB                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Миграция Express Sales
    const expressResult = await migrateExpressSales();

    if (!expressResult.success) {
      console.error('\n❌ Ошибка миграции Express Sales');
      process.exit(1);
    }

    // Миграция Challenge3D Sales
    const challenge3dResult = await migrateChallenge3DSales();

    if (!challenge3dResult.success) {
      console.error('\n❌ Ошибка миграции Challenge3D Sales');
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Express Sales мигрировано: ${expressResult.migrated}`);
    console.log(`✅ Challenge3D Sales мигрировано: ${challenge3dResult.migrated}`);
    console.log('\n✅ Миграция продаж завершена успешно!');

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    process.exit(1);
  }
}

main();
