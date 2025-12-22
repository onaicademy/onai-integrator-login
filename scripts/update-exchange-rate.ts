/**
 * Manual Exchange Rate Updater
 * Fetches current USD/KZT rate and updates database
 * Run: ts-node scripts/update-exchange-rate.ts
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../backend/env.env') });

const TRAFFIC_DB_URL = process.env.TRAFFIC_SUPABASE_URL!;
const TRAFFIC_SERVICE_KEY = process.env.TRAFFIC_SERVICE_ROLE_KEY!;

const trafficDb = createClient(TRAFFIC_DB_URL, TRAFFIC_SERVICE_KEY);

async function updateExchangeRate() {
  try {
    console.log('💱 Fetching current USD/KZT rate from Google Finance...\n');
    
    // Fetch rate from multiple sources
    const apis = [
      {
        name: 'exchangerate-api (Google Finance)',
        url: 'https://api.exchangerate-api.com/v4/latest/USD',
        parser: (data: any) => data.rates.KZT
      },
      {
        name: 'exchangerate.host (Google+ECB)',
        url: 'https://api.exchangerate.host/latest?base=USD&symbols=KZT',
        parser: (data: any) => data.rates.KZT
      }
    ];
    
    let rate: number | null = null;
    let source: string = '';
    
    for (const api of apis) {
      try {
        const response = await axios.get(api.url, { timeout: 5000 });
        rate = api.parser(response.data);
        source = api.name;
        console.log(`✅ Rate from ${api.name}: ${rate} KZT`);
        break;
      } catch (error: any) {
        console.warn(`⚠️ ${api.name} failed:`, error.message);
      }
    }
    
    if (!rate) {
      console.error('❌ All APIs failed');
      process.exit(1);
    }
    
    // Get today's date in Almaty timezone
    const almatyDate = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Asia/Almaty'
    });
    
    console.log(`\n📅 Date: ${almatyDate}`);
    console.log(`💵 Rate: 1 USD = ${rate} KZT`);
    console.log(`📡 Source: ${source}\n`);
    
    // Update in database
    const { data, error } = await trafficDb
      .from('exchange_rates')
      .upsert([
        {
          date: almatyDate,
          usd_to_kzt: rate,
          source: source,
          fetched_at: new Date().toISOString()
        }
      ], {
        onConflict: 'date'
      });
    
    if (error) {
      console.error('❌ Database error:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Exchange rate updated in database!');
    console.log('\n🎉 Done!\n');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateExchangeRate();
