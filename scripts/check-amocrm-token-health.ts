#!/usr/bin/env tsx
/**
 * 🔍 AmoCRM Token Health Checker
 * 
 * Purpose: Verify that the long-term JWT token is still valid
 * This token expires in 2028 and doesn't need refresh
 * 
 * Run Schedule: Daily via cron (just for monitoring)
 */

import axios from 'axios';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Load environment variables
config({ path: join(ROOT_DIR, 'backend', '.env') });
config({ path: join(ROOT_DIR, '.env') });

const AMOCRM_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';

async function checkTokenHealth(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 AmoCRM Token Health Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⏰ Checked at: ${new Date().toISOString()}\n`);

  if (!AMOCRM_TOKEN) {
    console.error('❌ AMOCRM_ACCESS_TOKEN not found in environment');
    process.exit(1);
  }

  console.log(`🔑 Token length: ${AMOCRM_TOKEN.length} characters`);
  console.log(`📍 Domain: ${AMOCRM_DOMAIN}.amocrm.ru\n`);

  try {
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/account`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const accountData = response.data;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TOKEN IS VALID');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Account: ${accountData.name}`);
    console.log(`   Account ID: ${accountData.id}`);
    console.log(`   Subdomain: ${accountData.subdomain}`);
    console.log(`   Country: ${accountData.country}`);
    console.log(`   Currency: ${accountData.currency}`);
    console.log('\n💡 Long-term JWT token expires in 2028');
    console.log('   No refresh required!\n');
    
    process.exit(0);
    
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ TOKEN IS INVALID OR EXPIRED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (axios.isAxiosError(error)) {
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Error: ${error.response?.data?.title || error.message}`);
      
      if (error.response?.status === 401) {
        console.error('\n🚨 CRITICAL: Token is no longer valid!');
        console.error('   Action required: Generate new long-term JWT token');
        console.error('   1. Go to AmoCRM Integrations');
        console.error('   2. Get new long-term token');
        console.error('   3. Update AMOCRM_ACCESS_TOKEN in .env');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

checkTokenHealth();
