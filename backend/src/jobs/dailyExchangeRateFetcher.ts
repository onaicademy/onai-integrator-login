/**
 * Daily Exchange Rate Fetcher
 * Runs at 08:00 Almaty (02:00 UTC)
 * Fetches USD/KZT rate from multiple APIs with fallback
 */

import cron from 'node-cron';
import axios from 'axios';
import { supabase } from '../config/supabase';
import { sendAdminMessage } from '../services/telegramService';

// ENHANCEMENT: Multiple APIs with fallback
async function fetchExchangeRate(): Promise<{ rate: number; source: string }> {
  const apis = [
    {
      name: 'exchangerate-api',
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parser: (data: any) => data.rates.KZT
    },
    {
      name: 'currencyapi',
      url: `https://api.currencyapi.com/v3/latest?apikey=${process.env.CURRENCY_API_KEY}&base_currency=USD`,
      parser: (data: any) => data.data.KZT.value
    }
  ];
  
  for (const api of apis) {
    try {
      const response = await axios.get(api.url, { timeout: 5000 });
      const rate = api.parser(response.data);
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
      
      // Step 3: Store in database
      const { data, error } = await supabase
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
  const { data } = await supabase
    .from('exchange_rates')
    .select('usd_to_kzt')
    .eq('date', date)
    .single();
  
  if (!data) {
    const { data: latestRate } = await supabase
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
