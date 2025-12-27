#!/usr/bin/env tsx
/**
 * Check AmoCRM Webhooks Configuration
 */

import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getProductionToken(): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `ssh root@207.154.231.30 "grep '^AMOCRM_ACCESS_TOKEN=' /var/www/onai-integrator-login-main/backend/.env | cut -d'=' -f2-"`
    );
    return stdout.trim();
  } catch (error: any) {
    console.error('❌ Failed to fetch token from production:', error.message);
    process.exit(1);
  }
}

async function checkWebhooks() {
  console.log('🔍 CHECKING AMOCRM WEBHOOKS...\n');
  
  const token = await getProductionToken();
  console.log(`✅ Token fetched (length: ${token.length} chars)\n`);
  
  try {
    const response = await axios.get('https://onaiagencykz.amocrm.ru/api/v4/webhooks', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    const webhooks = response.data._embedded?.webhooks || [];
    
    console.log(`📊 Found ${webhooks.length} webhooks:\n`);
    
    if (webhooks.length === 0) {
      console.log('⚠️  NO WEBHOOKS CONFIGURED!');
      console.log('   This explains why test sales are not syncing.\n');
      return;
    }
    
    webhooks.forEach((wh: any, index: number) => {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`WEBHOOK #${index + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`ID:          ${wh.id}`);
      console.log(`Destination: ${wh.destination}`);
      console.log(`Disabled:    ${wh.disabled ? '❌ YES' : '✅ NO'}`);
      
      if (wh.settings && wh.settings.length > 0) {
        console.log(`\nEvent Settings (${wh.settings.length} rules):`);
        wh.settings.forEach((setting: any) => {
          console.log(`  - ${setting}`);
        });
      }
      
      // Check if this webhook is for our backend
      const isOurBackend = wh.destination.includes('207.154.231.30') || 
                          wh.destination.includes('onai-integrator-login');
      
      if (isOurBackend) {
        console.log('\n✅ THIS WEBHOOK POINTS TO OUR BACKEND!');
      } else {
        console.log('\n⚠️  This webhook points to a different server');
      }
      
      // Check if disabled
      if (wh.disabled) {
        console.log('❌ WARNING: This webhook is DISABLED!');
      }
    });
    
    console.log('\n\n📋 EXPECTED WEBHOOK URLS:');
    console.log('   Express Course (5K): https://207.154.231.30/api/amocrm/funnel-sale');
    console.log('   Flagman (490K):      https://207.154.231.30/webhook/amocrm/traffic');
    
  } catch (error: any) {
    console.error('❌ Failed to fetch webhooks:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkWebhooks();
