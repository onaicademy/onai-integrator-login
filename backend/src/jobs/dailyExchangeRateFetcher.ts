/**
 * Daily Exchange Rate Fetcher
 * Runs at 08:00 Almaty (02:00 UTC)
 * Fetches USD/KZT rate from multiple APIs with fallback
 */

import cron from 'node-cron';
import axios from 'axios';
import { trafficAdminSupabase } from '../config/supabase-traffic';
import { sendAdminMessage } from '../services/telegramService';

/**
 * Fetch USD/KZT exchange rate from multiple sources
 * Priority: Google Finance-based APIs → Central Bank data → Fallback
 */
async function fetchExchangeRate(): Promise<{ rate: number; source: string }> {
  const apis = [
    // 1. ExchangeRate-API (uses Google Finance + ECB + Fed data)
    {
      name: 'exchangerate-api (Google Finance)',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parser: (data: any) => data.rates.KZT
    },
    // 2. ExchangeRate.host (aggregates Google Finance + Central Banks)
    {
      name: 'exchangerate.host (Google+ECB)',
      url: 'https://api.exchangerate.host/latest?base=USD&symbols=KZT',
      parser: (data: any) => data.rates.KZT
    },
    // 3. Fixer.io (ECB + Google Finance data) - free tier
    {
      name: 'fixer.io',
      url: `https://api.fixer.io/latest?base=USD&symbols=KZT&access_key=${process.env.FIXER_API_KEY}`,
      parser: (data: any) => data.rates.KZT,
      requiresKey: true
    },
    // 4. Alpha Vantage (official financial data)
    {
      name: 'alphavantage',
      url: `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=KZT&apikey=${process.env.ALPHA_VANTAGE_KEY}`,
      parser: (data: any) => parseFloat(data['Realtime Currency Exchange Rate']['5. Exchange Rate']),
      requiresKey: true
    }
  ];
  
  for (const api of apis) {
    // Skip if API requires key and key is not set
    if (api.requiresKey && !process.env.FIXER_API_KEY && !process.env.ALPHA_VANTAGE_KEY) {
      console.log(`⏭️  Skipping ${api.name} (no API key)`);
      continue;
    }
    
    try {
      const response = await axios.get(api.url, { 
        timeout: 8000,
        headers: { 'User-Agent': 'OnAI-Traffic-Dashboard/1.0' }
      });
      const rate = api.parser(response.data);
      
      // Validate rate (KZT should be between 400-600)
      if (rate < 400 || rate > 600) {
        console.warn(`⚠️ ${api.name} returned suspicious rate: ${rate} KZT`);
        continue;
      }
      
      console.log(`✅ Rate from ${api.name}: ${rate} KZT`);
      return { rate, source: api.name };
    } catch (error: any) {
      console.warn(`⚠️ ${api.name} failed:`, error.message);
    }
  }
  
  // Last resort: use yesterday's rate
  console.warn('⚠️ All APIs failed, using yesterday rate as fallback');
  const yesterday = getYesterdayDate();
  const fallbackRate = await getExchangeRateForDate(yesterday);
  return { rate: fallbackRate, source: 'yesterday-fallback' };
}

// Run at 08:00 Almaty (02:00 UTC)
export function startExchangeRateFetcher() {
  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('[08:00 Almaty] Fetching USD/KZT exchange rate...');
      
      // Step 1: Fetch current rate with fallback
      const { rate: usdToKzt, source } = await fetchExchangeRate();
      
      // Step 2: Get current date in Almaty timezone
      const almatyDate = new Date().toLocaleDateString('en-CA', { 
        timeZone: 'Asia/Almaty' 
      });
      
      // Step 3: Store in Traffic database
      const { data, error} = await trafficAdminSupabase
        .from('exchange_rates')
        .upsert([
          {
            date: almatyDate,
            usd_to_kzt: usdToKzt,
            source: source,
            fetched_at: new Date().toISOString()
          }
        ], {
          onConflict: 'date'
        });
      
      if (error) throw error;
      
      console.log(`✅ Exchange rate updated: 1 USD = ${usdToKzt} KZT (${almatyDate})`);
      
      // Step 4: Notify admin via Telegram
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await sendAdminMessage(
          process.env.TELEGRAM_ADMIN_CHAT_ID,
          `💱 Курс обновлен | ${almatyDate}\n1 USD = ${usdToKzt.toFixed(2)} KZT\nИсточник: ${source}`,
          'Markdown'
        );
      }
      
    } catch (error: any) {
      console.error('❌ Exchange rate fetch failed:', error);
      
      // Alert admin
      if (process.env.TELEGRAM_ADMIN_CHAT_ID) {
        await sendAdminMessage(
          process.env.TELEGRAM_ADMIN_CHAT_ID,
          `❌ Ошибка обновления курса: ${error.message}`,
          'Markdown'
        );
      }
    }
  });
  
  console.log('✅ Exchange rate fetcher scheduled (08:00 Almaty / 02:00 UTC)');
}

// Helper: Get exchange rate for specific date
export async function getExchangeRateForDate(date: string): Promise<number> {
  const { data } = await trafficAdminSupabase
    .from('exchange_rates')
    .select('usd_to_kzt')
    .eq('date', date)
    .single();
  
  if (!data) {
    const { data: latestRate } = await trafficAdminSupabase
      .from('exchange_rates')
      .select('usd_to_kzt')
      .order('date', { ascending: false })
      .limit(1)
      .single();
    
    console.warn(`No rate for ${date}, using latest: ${latestRate?.usd_to_kzt}`);
    return latestRate?.usd_to_kzt || 475.0;
  }
  
  return data.usd_to_kzt;
}

function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });
}
