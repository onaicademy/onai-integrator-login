#!/usr/bin/env tsx
/**
 * Update AmoCRM Webhook URL to Production Backend
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

async function updateWebhook() {
  console.log('🔧 UPDATING AMOCRM WEBHOOK URL...\n');
  
  const token = await getProductionToken();
  const webhookId = 46476042; // Express Course webhook ID
  
  const newUrl = 'https://207.154.231.30/api/amocrm/funnel-sale';
  
  console.log(`Webhook ID: ${webhookId}`);
  console.log(`New URL: ${newUrl}\n`);
  
  try {
    const response = await axios.patch(
      `https://onaiagencykz.amocrm.ru/api/v4/webhooks/${webhookId}`,
      {
        destination: newUrl,
        settings: ['status_lead'], // Keep same event settings
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    
    console.log('✅ WEBHOOK UPDATED SUCCESSFULLY!\n');
    console.log('Updated webhook:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Now test sales should sync to database!');
    console.log('   Create a test deal in AmoCRM Express Course pipeline');
    console.log('   Move it to "Успешно реализовано" status');
    console.log('   Check database: npx tsx scripts/check-webhook-activity.ts');
    
  } catch (error: any) {
    console.error('❌ Failed to update webhook:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

updateWebhook();
