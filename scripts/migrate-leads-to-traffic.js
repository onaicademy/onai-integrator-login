/**
 * Скрипт миграции данных из Landing DB в Traffic DB
 * Мигрирует таблицы leads и journey_stages
 */

import { createClient } from '@supabase/supabase-js';

// Конфигурация баз данных
const LANDING_DB = {
  url: 'https://xikaiavwqinamgolmtcy.supabase.co',
  key: process.env.SUPABASE_LANDING_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpa2FpYXZ3cWluYW1nb2xtdGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTMyMjEsImV4cCI6MjA4MDQyOTIyMX0.zD4z7d9lmOfoYFKKIPYNTcAAHFb6nvskm8eP4QAAvPQ'
};

const TRAFFIC_DB = {
  url: 'https://oetodaexnjcunklkdlkv.supabase.co',
  key: process.env.SUPABASE_TRAFFIC_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
};

// Создание клиентов
const landingClient = createClient(LANDING_DB.url, LANDING_DB.key);
const trafficClient = createClient(TRAFFIC_DB.url, TRAFFIC_DB.key);

/**
 * Миграция данных из одной таблицы в другую
 */
async function migrateTable(sourceClient, targetClient, tableName, transformFn) {
  console.log(`\n🔄 Миграция таблицы: ${tableName}`);

  // Чтение данных из источника
  const { data: sourceData, error: sourceError } = await sourceClient
    .from(tableName)
    .select('*');

  if (sourceError) {
    console.error(`❌ Ошибка чтения из ${tableName}:`, sourceError);
    return { success: false, error: sourceError };
  }

  console.log(`📥 Найдено записей: ${sourceData?.length || 0}`);

  if (!sourceData || sourceData.length === 0) {
    return { success: true, imported: 0 };
  }

  // Трансформация данных
  const transformedData = sourceData.map(transformFn);

  // Вставка данных в целевую таблицу
  const { error: insertError } = await targetClient
    .from(tableName)
    .insert(transformedData);

  if (insertError) {
    console.error(`❌ Ошибка вставки в ${tableName}:`, insertError);
    return { success: false, error: insertError };
  }

  console.log(`✅ Успешно импортировано: ${transformedData.length} записей`);
  return { success: true, imported: transformedData.length };
}

/**
 * Трансформация данных для таблицы leads
 */
function transformLead(lead) {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    metadata: lead.metadata || {},
    payment_method: lead.payment_method,
    amocrm_lead_id: lead.amocrm_lead_id,
    created_at: lead.created_at,
    updated_at: lead.updated_at || lead.created_at
  };
}

/**
 * Трансформация данных для таблицы journey_stages
 */
function transformJourneyStage(stage) {
  return {
    id: stage.id,
    lead_id: stage.lead_id,
    stage: stage.stage,
    source: stage.source,
    metadata: stage.metadata || {},
    created_at: stage.created_at
  };
}

/**
 * Основная функция миграции
 */
async function main() {
  console.log('🚀 Начало миграции данных из Landing DB в Traffic DB\n');

  // Миграция leads
  const leadsResult = await migrateTable(
    landingClient,
    trafficClient,
    'leads',
    transformLead
  );

  if (!leadsResult.success) {
    console.error('\n❌ Миграция leads не удалась');
    process.exit(1);
  }

  // Миграция journey_stages
  const stagesResult = await migrateTable(
    landingClient,
    trafficClient,
    'journey_stages',
    transformJourneyStage
  );

  if (!stagesResult.success) {
    console.error('\n❌ Миграция journey_stages не удалась');
    process.exit(1);
  }

  console.log('\n✅ Миграция завершена успешно!');
  console.log(`📊 Статистика:`);
  console.log(`   - Leads: ${leadsResult.imported} записей`);
  console.log(`   - Journey Stages: ${stagesResult.imported} записей`);
}

main().catch(console.error);
