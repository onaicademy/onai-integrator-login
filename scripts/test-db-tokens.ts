#!/usr/bin/env npx tsx
/**
 * 🧪 TEST DATABASE TOKENS
 * 
 * Reads tokens from integration_tokens table and tests them
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const LANDING_URL = process.env.LANDING_SUPABASE_URL!;
const LANDING_KEY = process.env.LANDING_SUPABASE_SERVICE_KEY!;

async function testTokensFromDB() {
  console.log('\n🔬 TESTING TOKENS FROM DATABASE\n' + '='.repeat(50));

  const landing = createClient(LANDING_URL, LANDING_KEY);

  // Fetch tokens from DB
  const { data: tokens, error } = await landing
    .from('integration_tokens')
    .select('service_name, access_token')
    .in('service_name', ['facebook', 'amocrm']);

  if (error) {
    console.error('❌ Failed to fetch tokens from DB:', error.message);
    return;
  }

  const fbToken = tokens?.find(t => t.service_name === 'facebook')?.access_token;
  const amocrmToken = tokens?.find(t => t.service_name === 'amocrm')?.access_token;

  // Test Facebook
  console.log('\n📘 Testing Facebook Token from DB...');
  try {
    const fbRes = await axios.get('https://graph.facebook.com/v21.0/me', {
      params: { access_token: fbToken, fields: 'id,name' },
      timeout: 10000
    });
    console.log('✅ Facebook ACTIVE:', fbRes.data.name);
  } catch (err: any) {
    console.log('❌ Facebook FAILED:', err.response?.data?.error?.message || err.message);
  }

  // Test AmoCRM
  console.log('\n🔷 Testing AmoCRM Token from DB...');
  try {
    const amocrmRes = await axios.get('https://onaiagencykz.amocrm.ru/api/v4/account', {
      headers: { 'Authorization': `Bearer ${amocrmToken}` },
      timeout: 10000
    });
    console.log('✅ AmoCRM ACTIVE:', amocrmRes.data.name);
  } catch (err: any) {
    console.log('❌ AmoCRM FAILED:', err.response?.statusText || err.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');
}

testTokensFromDB();
