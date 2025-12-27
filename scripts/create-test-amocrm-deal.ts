#!/usr/bin/env tsx
/**
 * Create Test Deal in AmoCRM and Track Webhook
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getProductionToken(): Promise<string> {
  const { stdout } = await execAsync(
    `ssh root@207.154.231.30 "grep '^AMOCRM_ACCESS_TOKEN=' /var/www/onai-integrator-login-main/backend/.env | cut -d'=' -f2-"`
  );
  return stdout.trim();
}

async function createTestDeal() {
  console.log('🧪 CREATING TEST DEAL IN AMOCRM...\n');
  
  const token = await getProductionToken();
  
  const EXPRESS_PIPELINE = 10350882;
  const STATUS_SUCCESS = 142; // Успешно реализовано
  
  try {
    // Step 1: Create deal
    console.log('Step 1: Creating deal...');
    const createResponse = await axios.post(
      'https://onaiagencykz.amocrm.ru/api/v4/leads',
      [
        {
          name: `ТЕСТ WEBHOOK ${new Date().toISOString()}`,
          pipeline_id: EXPRESS_PIPELINE,
          price: 5000,
          custom_fields_values: [
            {
              field_code: 'UTM_SOURCE',
              values: [{ value: 'proftest' }],
            },
            {
              field_code: 'UTM_CAMPAIGN',
              values: [{ value: 'webhook_test' }],
            },
          ],
        },
      ],
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    const dealId = createResponse.data._embedded.leads[0].id;
    console.log(`✅ Deal created: ${dealId}\n`);
    
    // Step 2: Wait 2 seconds
    console.log('Step 2: Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Update status to "Успешно реализовано"
    console.log(`Step 3: Moving deal ${dealId} to "Успешно реализовано"...`);
    const updateResponse = await axios.patch(
      `https://onaiagencykz.amocrm.ru/api/v4/leads/${dealId}`,
      {
        status_id: STATUS_SUCCESS,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`✅ Deal ${dealId} moved to status ${STATUS_SUCCESS}\n`);
    
    // Step 4: Wait for webhook
    console.log('Step 4: Waiting 5 seconds for webhook to arrive...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Check database
    console.log('Step 5: Checking database for new sale...\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Run this command to verify:');
    console.log(`npx tsx scripts/check-webhook-activity.ts`);
    console.log(`\nOr check directly for deal_id: ${dealId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

createTestDeal();
