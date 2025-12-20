#!/usr/bin/env npx ts-node
/**
 * 🔍 GET AMOCRM PIPELINE STAGES
 * 
 * Скрипт для получения ID этапа "Успешно реализовано" из воронки AmoCRM
 * Pipeline ID: 10418746 (expresscourse)
 * 
 * Использование:
 *   cd backend && npx ts-node scripts/get-amocrm-pipeline-stages.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../env.env') });

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;

// The pipeline ID from the URL: https://onaiagencykz.amocrm.ru/settings/pipeline/leads/10418746
const TARGET_PIPELINE_ID = 10418746;

interface AmoCRMPipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_unsorted_on: boolean;
  is_archive: boolean;
  account_id: number;
  _embedded: {
    statuses: Array<{
      id: number;
      name: string;
      sort: number;
      is_editable: boolean;
      pipeline_id: number;
      color: string;
      type: number;
      account_id: number;
    }>;
  };
}

async function getAmoCRMPipelineStages() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🔍 ПОЛУЧЕНИЕ ЭТАПОВ ВОРОНКИ AMOCRM');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (!AMOCRM_ACCESS_TOKEN) {
    console.error('❌ AMOCRM_ACCESS_TOKEN не найден в env.env');
    process.exit(1);
  }

  console.log(`🌐 Домен: ${AMOCRM_DOMAIN}.amocrm.ru`);
  console.log(`🔑 Токен: ${AMOCRM_ACCESS_TOKEN.substring(0, 50)}...`);
  console.log(`📊 Целевой Pipeline ID: ${TARGET_PIPELINE_ID}`);
  console.log('');

  try {
    // 1️⃣ Get all pipelines
    console.log('1️⃣ Получаем все воронки...\n');
    
    const pipelinesResponse = await fetch(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/pipelines`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!pipelinesResponse.ok) {
      const errorText = await pipelinesResponse.text();
      console.error(`❌ Ошибка API: ${pipelinesResponse.status}`);
      console.error(errorText);
      process.exit(1);
    }

    const pipelinesData = await pipelinesResponse.json() as any;
    const pipelines: AmoCRMPipeline[] = pipelinesData._embedded?.pipelines || [];

    console.log(`📋 Найдено воронок: ${pipelines.length}\n`);

    // 2️⃣ Find target pipeline
    console.log('2️⃣ Ищем целевую воронку...\n');

    let targetPipeline: AmoCRMPipeline | undefined;
    
    for (const pipeline of pipelines) {
      const isTarget = pipeline.id === TARGET_PIPELINE_ID;
      const marker = isTarget ? '➡️ ' : '   ';
      console.log(`${marker}[${pipeline.id}] ${pipeline.name}${pipeline.is_main ? ' (главная)' : ''}`);
      
      if (isTarget) {
        targetPipeline = pipeline;
      }
    }

    console.log('');

    if (!targetPipeline) {
      console.error(`❌ Воронка с ID ${TARGET_PIPELINE_ID} не найдена!`);
      console.log('\n💡 Доступные воронки:');
      pipelines.forEach(p => console.log(`   [${p.id}] ${p.name}`));
      process.exit(1);
    }

    // 3️⃣ Show pipeline stages
    console.log('3️⃣ Этапы воронки:\n');
    console.log(`📊 ВОРОНКА: ${targetPipeline.name} (ID: ${targetPipeline.id})`);
    console.log('─────────────────────────────────────────────────────');

    const stages = targetPipeline._embedded?.statuses || [];
    let successStageId: number | null = null;

    stages.sort((a, b) => a.sort - b.sort);

    for (const stage of stages) {
      const isSuccess = stage.name.toLowerCase().includes('успешно') || 
                        stage.name.toLowerCase().includes('реализова') ||
                        stage.type === 142;
      const isClosed = stage.name.toLowerCase().includes('закрыто') ||
                       stage.type === 143;
      
      let icon = '📌';
      if (isSuccess) {
        icon = '✅';
        successStageId = stage.id;
      } else if (isClosed) {
        icon = '❌';
      }

      console.log(`${icon} [${stage.id}] ${stage.name} (sort: ${stage.sort}, type: ${stage.type})`);
    }

    console.log('─────────────────────────────────────────────────────\n');

    // 4️⃣ Summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 РЕЗУЛЬТАТ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (successStageId) {
      console.log(`✅ ID этапа "Успешно реализовано": ${successStageId}`);
      console.log('');
      console.log('📝 ОБНОВИ ЭТО В ФАЙЛЕ:');
      console.log('   backend/src/integrations/amocrm-webhook.ts');
      console.log('');
      console.log(`   const SUCCESS_STATUS_ID = ${successStageId};`);
    } else {
      console.log('⚠️  Этап "Успешно реализовано" не найден автоматически.');
      console.log('   Выбери вручную из списка выше и обнови SUCCESS_STATUS_ID');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 5️⃣ Also output amocrm-config.ts compatible format
    console.log('📋 КОНФИГУРАЦИЯ ДЛЯ amocrm-config.ts:\n');
    console.log('```typescript');
    console.log('export const AMOCRM_EXPRESSCOURSE_CONFIG = {');
    console.log(`  PIPELINE_ID: ${targetPipeline.id},`);
    console.log('');
    console.log('  STAGES: {');
    stages.forEach((stage, index) => {
      const varName = stage.name
        .toUpperCase()
        .replace(/[^\wа-яА-ЯёЁ]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      const comma = index < stages.length - 1 ? ',' : '';
      console.log(`    ${varName}: ${stage.id}${comma} // ${stage.name}`);
    });
    console.log('  },');
    console.log('};');
    console.log('```\n');

  } catch (error: any) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

getAmoCRMPipelineStages();
