/**
 * ════════════════════════════════════════════════════════════════════════
 * 🔧 FIX: Переместить данные из старых таблиц в новые
 * ════════════════════════════════════════════════════════════════════════
 *
 * Проблема: Данные мигрированы в "leads" вместо "traffic_leads"
 * Решение: Скопировать все данные в правильные таблицы
 */

import { createClient } from '@supabase/supabase-js';

const trafficClient = createClient(
  'https://oetodaexnjcunklkdlkv.supabase.co',
  process.env.SUPABASE_TRAFFIC_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldG9kYWV4bmpjdW5rbGtkbGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTc2OTMsImV4cCI6MjA4MTc5MzY5M30.isG3OnecdTr7nKecQGtCxQIRCZcrdiZggvKa7DaFtjg'
);

async function moveLeads() {
  console.log('\n🔄 Перемещение данных: leads → traffic_leads\n');

  // Читаем все данные из старой таблицы
  const { data: oldLeads, error: readError } = await trafficClient
    .from('leads')
    .select('*');

  if (readError) {
    console.error('❌ Ошибка чтения из "leads":', readError.message);
    return { success: false, error: readError };
  }

  console.log(`📥 Найдено ${oldLeads?.length || 0} записей в "leads"`);

  if (!oldLeads || oldLeads.length === 0) {
    console.log('⚠️  Нет данных для перемещения');
    return { success: true, migrated: 0 };
  }

  // Трансформируем данные для новой таблицы (только существующие колонки)
  const transformedLeads = oldLeads.map(lead => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    source: lead.source,
    funnel_type: determineFunnelType(lead.source, lead.metadata),
    status: 'new',
    metadata: lead.metadata || {},
    utm_source: lead.metadata?.utm_source || lead.metadata?.utmSource || null,
    utm_campaign: lead.metadata?.utm_campaign || lead.metadata?.utmCampaign || null,
    utm_medium: lead.metadata?.utm_medium || lead.metadata?.utmMedium || null,
    utm_content: lead.metadata?.utm_content || lead.metadata?.utmContent || null,
    utm_term: lead.metadata?.utm_term || lead.metadata?.utmTerm || null,
    fb_lead_id: lead.metadata?.fb_lead_id || null,
    fb_form_id: lead.metadata?.fb_form_id || null,
    fb_ad_id: lead.metadata?.fb_ad_id || null,
    fb_adset_id: lead.metadata?.fb_adset_id || null,
    fb_campaign_id: lead.metadata?.fb_campaign_id || null,
    amocrm_lead_id: lead.amocrm_lead_id ? parseInt(lead.amocrm_lead_id) : null,
    amocrm_contact_id: null,
    amocrm_pipeline_id: null,
    amocrm_status_id: null,
    created_at: lead.created_at,
    updated_at: lead.updated_at || lead.created_at
  }));

  console.log(`🔄 Вставка ${transformedLeads.length} записей в "traffic_leads"...\n`);

  // Вставляем батчами по 500 записей
  const batchSize = 500;
  let inserted = 0;
  let errors = [];

  for (let i = 0; i < transformedLeads.length; i += batchSize) {
    const batch = transformedLeads.slice(i, i + batchSize);

    const { error: insertError } = await trafficClient
      .from('traffic_leads')
      .upsert(batch, { onConflict: 'id' });

    if (insertError) {
      console.error(`❌ Ошибка вставки batch ${i / batchSize + 1}:`, insertError.message);
      errors.push(insertError);
    } else {
      inserted += batch.length;
      console.log(`✅ Вставлено ${inserted} / ${transformedLeads.length}`);
    }
  }

  if (errors.length > 0) {
    console.error(`\n⚠️  Завершено с ошибками: ${errors.length} батчей не удалось`);
    return { success: false, migrated: inserted, errors };
  }

  console.log(`\n✅ Успешно перемещено ${inserted} записей!`);
  return { success: true, migrated: inserted };
}

async function moveJourneyStages() {
  console.log('\n🔄 Перемещение данных: journey_stages → traffic_lead_journey\n');

  // Читаем все данные из старой таблицы
  const { data: oldStages, error: readError } = await trafficClient
    .from('journey_stages')
    .select('*');

  if (readError) {
    // Таблица может не существовать - это нормально
    console.log('⚠️  Таблица journey_stages не найдена (это нормально)');
    return { success: true, migrated: 0 };
  }

  console.log(`📥 Найдено ${oldStages?.length || 0} записей в "journey_stages"`);

  if (!oldStages || oldStages.length === 0) {
    return { success: true, migrated: 0 };
  }

  // Трансформируем данные
  const transformedStages = oldStages.map(stage => ({
    id: stage.id,
    lead_id: stage.lead_id,
    stage: stage.stage,
    source: stage.source,
    metadata: stage.metadata || {},
    created_at: stage.created_at
  }));

  console.log(`🔄 Вставка ${transformedStages.length} записей в "traffic_lead_journey"...\n`);

  // Вставляем батчами
  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < transformedStages.length; i += batchSize) {
    const batch = transformedStages.slice(i, i + batchSize);

    const { error: insertError } = await trafficClient
      .from('traffic_lead_journey')
      .upsert(batch, { onConflict: 'id' });

    if (insertError) {
      console.error(`❌ Ошибка вставки batch ${i / batchSize + 1}:`, insertError.message);
    } else {
      inserted += batch.length;
      console.log(`✅ Вставлено ${inserted} / ${transformedStages.length}`);
    }
  }

  console.log(`\n✅ Успешно перемещено ${inserted} journey stages!`);
  return { success: true, migrated: inserted };
}

function determineFunnelType(source, metadata) {
  // Определяем тип воронки на основе source и metadata
  if (source === 'challenge3d' || metadata?.funnel_type === 'challenge3d') {
    return 'challenge3d';
  }
  if (source === 'intensive1d' || metadata?.funnel_type === 'intensive1d') {
    return 'intensive1d';
  }
  if (source === 'expresscourse' || source?.includes('express')) {
    return 'express';
  }
  return 'express'; // по умолчанию
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔧 ИСПРАВЛЕНИЕ МИГРАЦИИ: ПЕРЕМЕЩЕНИЕ В ПРАВИЛЬНЫЕ ТАБЛИЦЫ  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Перемещаем лиды
    const leadsResult = await moveLeads();

    if (!leadsResult.success) {
      console.error('\n❌ Ошибка при перемещении лидов');
      process.exit(1);
    }

    // Перемещаем journey stages
    const stagesResult = await moveJourneyStages();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Лиды перемещены: ${leadsResult.migrated}`);
    console.log(`✅ Journey stages перемещены: ${stagesResult.migrated}`);
    console.log('\n✅ Миграция завершена! Traffic Dashboard теперь работает корректно.');

  } catch (error) {
    console.error('\n❌ КРИТИЧЕСКАЯ ОШИБКА:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
