// scripts/get-amocrm-ids.ts
// Run: npx tsx scripts/get-amocrm-ids.ts

import 'dotenv/config';

const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN;
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const PIPELINE_ID = 10350882;

interface AmoCRMStage {
  id: number;
  name: string;
  color: string;
  sort: number;
}

interface AmoCRMField {
  id: number;
  name: string;
  code?: string;
  type: string;
}

async function getAmoCRMConfig() {
  if (!AMOCRM_DOMAIN || !AMOCRM_ACCESS_TOKEN) {
    console.error('❌ Error: AMOCRM_DOMAIN or AMOCRM_ACCESS_TOKEN not found in .env');
    console.error('\nPlease add to .env.local:');
    console.error('AMOCRM_DOMAIN=your_domain');
    console.error('AMOCRM_ACCESS_TOKEN=your_token');
    process.exit(1);
  }

  console.log('🚀 Fetching AmoCRM configuration...\n');

  try {
    // 1. Get Pipeline Stages
    console.log('📊 Fetching pipeline stages...');
    const stagesResponse = await fetch(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/pipelines/${PIPELINE_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!stagesResponse.ok) {
      throw new Error(`Failed to fetch stages: ${stagesResponse.status} ${stagesResponse.statusText}`);
    }

    const stagesData: any = await stagesResponse.json();
    const stages: AmoCRMStage[] = stagesData._embedded?.statuses || [];

    console.log('\n✅ PIPELINE STAGES:');
    console.log('━'.repeat(70));
    stages.forEach((stage) => {
      console.log(`${stage.name.padEnd(40)} → ID: ${stage.id}`);
    });

    // 2. Get Custom Fields
    console.log('\n📊 Fetching custom fields...');
    const fieldsResponse = await fetch(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/leads/custom_fields`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!fieldsResponse.ok) {
      throw new Error(`Failed to fetch fields: ${fieldsResponse.status} ${fieldsResponse.statusText}`);
    }

    const fieldsData: any = await fieldsResponse.json();
    const allFields: AmoCRMField[] = fieldsData._embedded?.custom_fields || [];

    // Filter relevant fields
    const relevantFields = allFields.filter((f) =>
      f.name.toLowerCase().includes('utm') ||
      f.name.toLowerCase().includes('facebook') ||
      f.name.toLowerCase().includes('профтест') ||
      f.name.toLowerCase().includes('оплата') ||
      f.name.toLowerCase().includes('fbclid') ||
      f.name.toLowerCase().includes('click')
    );

    console.log('\n✅ RELEVANT CUSTOM FIELDS:');
    console.log('━'.repeat(70));
    relevantFields.forEach((field) => {
      console.log(`${field.name.padEnd(40)} → ID: ${field.id}`);
    });

    // 3. Generate config file content
    console.log('\n\n📋 READY-TO-USE CONFIG CODE:');
    console.log('='.repeat(70));
    console.log('Copy this into config/amocrm-config.ts:\n');

    const stagesConfig = stages
      .map((s) => {
        const key = s.name
          .toUpperCase()
          .replace(/[^A-ZА-ЯЁ0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        return `    ${key}: ${s.id}, // ${s.name}`;
      })
      .join('\n');

    const fieldsConfig = relevantFields
      .map((f) => {
        const key = f.name
          .toUpperCase()
          .replace(/[^A-ZА-ЯЁ0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        return `    ${key}: ${f.id}, // ${f.name}`;
      })
      .join('\n');

    console.log(`export const AMOCRM_CONFIG = {
  PIPELINE_ID: ${PIPELINE_ID},

  STAGES: {
${stagesConfig}
  },

  CUSTOM_FIELDS: {
${fieldsConfig}
  },
};

// Helper function to get stage ID by payment method
export function getStageByPaymentMethod(method: 'kaspi' | 'card' | 'manager'): number {
  // TODO: Map payment methods to actual stage IDs from STAGES above
  // Example:
  // switch (method) {
  //   case 'kaspi': return AMOCRM_CONFIG.STAGES.КАСИЙ_ОПЛАТА;
  //   case 'card': return AMOCRM_CONFIG.STAGES.ПРОДАМУС;
  //   case 'manager': return AMOCRM_CONFIG.STAGES.ЧАТ_С_МЕНЕДЖЕРОМ;
  //   default: return AMOCRM_CONFIG.STAGES.НОВАЯ_ЗАЯВКА;
  // }
  return 0; // Replace with actual logic
}
`);
    console.log('='.repeat(70));

    // 4. Save to file (optional)
    console.log('\n💾 Config code generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Copy the config code above');
    console.log('2. Create file: config/amocrm-config.ts');
    console.log('3. Paste the config code');
    console.log('4. Update getStageByPaymentMethod() with correct stage mappings');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('1. Check AMOCRM_ACCESS_TOKEN is valid');
    console.error('2. Verify pipeline ID 10350882 exists');
    console.error('3. Ensure you have API access permissions');
    process.exit(1);
  }
}

getAmoCRMConfig();

