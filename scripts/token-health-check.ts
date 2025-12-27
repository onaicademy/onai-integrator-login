#!/usr/bin/env npx tsx
/**
 * 🏥 TOKEN HEALTH CHECK SCRIPT
 * 
 * Verifies all external service tokens and database connections:
 * 1. Facebook Ads API - Check token validity and permissions
 * 2. AmoCRM API - Check token validity, attempt refresh if expired
 * 3. Database - Verify connections to Tripwire DB and Landing DB
 * 
 * Usage:
 *   npx tsx scripts/token-health-check.ts
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const AMOCRM_DOMAIN = process.env.AMOCRM_DOMAIN || 'onaiagencykz';
const AMOCRM_ACCESS_TOKEN = process.env.AMOCRM_ACCESS_TOKEN;
const AMOCRM_REFRESH_TOKEN = process.env.AMOCRM_REFRESH_TOKEN;
const AMOCRM_CLIENT_ID = process.env.AMOCRM_CLIENT_ID;
const AMOCRM_CLIENT_SECRET = process.env.AMOCRM_CLIENT_SECRET;

const TRIPWIRE_SUPABASE_URL = process.env.TRIPWIRE_SUPABASE_URL || process.env.VITE_TRIPWIRE_SUPABASE_URL;
const TRIPWIRE_SERVICE_KEY = process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || process.env.TRIPWIRE_SERVICE_KEY;

const LANDING_SUPABASE_URL = process.env.LANDING_SUPABASE_URL || process.env.VITE_LANDING_SUPABASE_URL;
const LANDING_SERVICE_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY || process.env.LANDING_SERVICE_KEY;

interface ServiceStatus {
  name: string;
  status: '✅ ACTIVE' | '❌ EXPIRED' | '⚠️ WARNING' | '🔄 REFRESHED';
  message: string;
  details?: any;
}

async function checkFacebookToken(): Promise<ServiceStatus> {
  console.log('\n📘 Checking Facebook Access Token...');
  
  if (!FB_ACCESS_TOKEN) {
    return {
      name: 'Facebook Ads API',
      status: '❌ EXPIRED',
      message: 'FB_ACCESS_TOKEN not found in environment variables',
    };
  }

  try {
    // Check token validity and permissions
    const response = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: {
        access_token: FB_ACCESS_TOKEN,
        fields: 'id,name',
      },
      timeout: 10000,
    });

    // Check permissions
    const permResponse = await axios.get('https://graph.facebook.com/v21.0/me/permissions', {
      params: {
        access_token: FB_ACCESS_TOKEN,
      },
      timeout: 10000,
    });

    const permissions = permResponse.data.data || [];
    const hasAdsRead = permissions.some((p: any) => 
      p.permission === 'ads_read' && p.status === 'granted'
    );

    if (!hasAdsRead) {
      return {
        name: 'Facebook Ads API',
        status: '⚠️ WARNING',
        message: 'Token is valid but missing ads_read permission',
        details: {
          user: response.data.name,
          permissions: permissions.filter((p: any) => p.status === 'granted').map((p: any) => p.permission),
        },
      };
    }

    return {
      name: 'Facebook Ads API',
      status: '✅ ACTIVE',
      message: 'Token is valid with ads_read permission',
      details: {
        user: response.data.name,
        userId: response.data.id,
      },
    };
  } catch (error: any) {
    return {
      name: 'Facebook Ads API',
      status: '❌ EXPIRED',
      message: error.response?.data?.error?.message || error.message,
    };
  }
}

async function checkAmoCRMToken(): Promise<ServiceStatus> {
  console.log('\n🔷 Checking AmoCRM Access Token...');
  
  if (!AMOCRM_ACCESS_TOKEN) {
    return {
      name: 'AmoCRM API',
      status: '❌ EXPIRED',
      message: 'AMOCRM_ACCESS_TOKEN not found in environment variables',
    };
  }

  try {
    // Try to access AmoCRM API
    const response = await axios.get(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/api/v4/account`,
      {
        headers: {
          'Authorization': `Bearer ${AMOCRM_ACCESS_TOKEN}`,
        },
        timeout: 30000,
      }
    );

    return {
      name: 'AmoCRM API',
      status: '✅ ACTIVE',
      message: 'Token is valid',
      details: {
        account: response.data.name,
        subdomain: response.data.subdomain,
      },
    };
  } catch (error: any) {
    const status = error.response?.status;
    
    if (status === 401 && AMOCRM_REFRESH_TOKEN) {
      console.log('   Token expired, attempting refresh...');
      return await refreshAmoCRMToken();
    }

    return {
      name: 'AmoCRM API',
      status: '❌ EXPIRED',
      message: `Token validation failed: ${error.response?.statusText || error.message}`,
    };
  }
}

async function refreshAmoCRMToken(): Promise<ServiceStatus> {
  if (!AMOCRM_CLIENT_ID || !AMOCRM_CLIENT_SECRET || !AMOCRM_REFRESH_TOKEN) {
    return {
      name: 'AmoCRM API',
      status: '❌ EXPIRED',
      message: 'Missing OAuth credentials for token refresh (CLIENT_ID, CLIENT_SECRET, or REFRESH_TOKEN)',
    };
  }

  try {
    const response = await axios.post(
      `https://${AMOCRM_DOMAIN}.amocrm.ru/oauth2/access_token`,
      {
        client_id: AMOCRM_CLIENT_ID,
        client_secret: AMOCRM_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: AMOCRM_REFRESH_TOKEN,
        redirect_uri: process.env.AMOCRM_REDIRECT_URI || 'https://api.onai.academy/webhook/amocrm/auth',
      },
      {
        timeout: 30000,
      }
    );

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token;

    return {
      name: 'AmoCRM API',
      status: '🔄 REFRESHED',
      message: 'Token successfully refreshed! Update your .env file with new tokens:',
      details: {
        newAccessToken: newAccessToken.substring(0, 50) + '...',
        newRefreshToken: newRefreshToken.substring(0, 50) + '...',
        expiresIn: response.data.expires_in,
        fullTokens: {
          AMOCRM_ACCESS_TOKEN: newAccessToken,
          AMOCRM_REFRESH_TOKEN: newRefreshToken,
        },
      },
    };
  } catch (error: any) {
    return {
      name: 'AmoCRM API',
      status: '❌ EXPIRED',
      message: `Token refresh failed: ${error.response?.data?.hint || error.message}`,
    };
  }
}

async function checkDatabase(
  name: string,
  url: string | undefined,
  key: string | undefined
): Promise<ServiceStatus> {
  console.log(`\n🗄️  Checking ${name} connection...`);
  
  if (!url || !key) {
    return {
      name,
      status: '❌ EXPIRED',
      message: 'Database credentials not found in environment variables',
    };
  }

  try {
    const supabase = createClient(url, key);
    
    // Simple query to verify connection
    const { data, error } = await supabase
      .from('traffic_users')
      .select('count')
      .limit(1);

    if (error) {
      return {
        name,
        status: '❌ EXPIRED',
        message: `Connection failed: ${error.message}`,
      };
    }

    return {
      name,
      status: '✅ ACTIVE',
      message: 'Database connection successful',
    };
  } catch (error: any) {
    return {
      name,
      status: '❌ EXPIRED',
      message: `Connection error: ${error.message}`,
    };
  }
}

async function main() {
  console.log('🏥 TOKEN HEALTH CHECK - Traffic Dashboard');
  console.log('═══════════════════════════════════════════════════════\n');

  const results: ServiceStatus[] = [];

  // Check Facebook
  results.push(await checkFacebookToken());

  // Check AmoCRM
  results.push(await checkAmoCRMToken());

  // Check Databases
  results.push(await checkDatabase('Tripwire DB', TRIPWIRE_SUPABASE_URL, TRIPWIRE_SERVICE_KEY));
  results.push(await checkDatabase('Landing DB', LANDING_SUPABASE_URL, LANDING_SERVICE_KEY));

  // Print Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 HEALTH CHECK SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');

  results.forEach((result) => {
    console.log(`${result.status} ${result.name}`);
    console.log(`   ${result.message}`);
    
    if (result.details) {
      console.log('   Details:');
      Object.entries(result.details).forEach(([key, value]) => {
        if (key !== 'fullTokens') {
          console.log(`     ${key}: ${value}`);
        }
      });
    }
    console.log('');
  });

  // Special handling for refreshed AmoCRM token
  const amoCRMResult = results.find(r => r.name === 'AmoCRM API');
  if (amoCRMResult?.status === '🔄 REFRESHED' && amoCRMResult.details?.fullTokens) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔑 NEW AMOCRM TOKENS - UPDATE YOUR .ENV FILE:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`AMOCRM_ACCESS_TOKEN=${amoCRMResult.details.fullTokens.AMOCRM_ACCESS_TOKEN}`);
    console.log(`AMOCRM_REFRESH_TOKEN=${amoCRMResult.details.fullTokens.AMOCRM_REFRESH_TOKEN}`);
    console.log('\n');
  }

  // Exit code
  const allActive = results.every(r => r.status === '✅ ACTIVE' || r.status === '🔄 REFRESHED');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log(allActive ? '✅ ALL SYSTEMS OPERATIONAL' : '⚠️ SOME SYSTEMS NEED ATTENTION');
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(allActive ? 0 : 1);
}

main();
