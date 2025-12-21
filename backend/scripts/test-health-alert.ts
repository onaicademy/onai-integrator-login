#!/usr/bin/env npx tsx
/**
 * 🧪 Test Health Alert - Send test message to Telegram
 * Run: npx tsx scripts/test-health-alert.ts
 */

import '../src/load-env.js';
import axios from 'axios';

// 🤖 Use IAE Agent bot (@analisistonaitrafic_bot) for health alerts
const TELEGRAM_BOT_TOKEN = process.env.IAE_BOT_TOKEN || process.env.TELEGRAM_IAE_BOT_TOKEN || '8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_ALERT_CHAT_ID || process.env.TELEGRAM_IAE_CHAT_ID;

async function sendTestHealthAlert() {
  console.log('\n🧪 Sending test health status to Telegram...\n');
  
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('❌ Missing Telegram credentials:');
    console.error('   TELEGRAM_IAE_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? '✅' : '❌ MISSING');
    console.error('   TELEGRAM_CHAT_ID:', TELEGRAM_CHAT_ID ? '✅' : '❌ MISSING');
    process.exit(1);
  }
  
  // Gather current status
  const now = new Date().toLocaleString('ru-RU', { 
    timeZone: 'Asia/Almaty',
    dateStyle: 'short',
    timeStyle: 'short'
  });
  
  // Check ENV status
  const envStatus = {
    facebook: {
      token: !!process.env.FACEBOOK_ADS_TOKEN,
      appId: !!process.env.FACEBOOK_APP_ID,
      appSecret: !!process.env.FACEBOOK_APP_SECRET,
      adAccount: !!process.env.FACEBOOK_AD_ACCOUNT_ID
    },
    amocrm: {
      accessToken: !!process.env.AMOCRM_ACCESS_TOKEN,
      refreshToken: !!process.env.AMOCRM_REFRESH_TOKEN,
      clientId: !!process.env.AMOCRM_CLIENT_ID,
      clientSecret: !!process.env.AMOCRM_CLIENT_SECRET,
      domain: process.env.AMOCRM_DOMAIN || 'onaiagencykz'
    },
    openai: {
      apiKey: !!process.env.OPENAI_API_KEY
    },
    supabase: {
      url: !!process.env.SUPABASE_URL,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    telegram: {
      iaeBot: !!process.env.TELEGRAM_IAE_BOT_TOKEN,
      iaeChatId: !!process.env.TELEGRAM_IAE_CHAT_ID,
      trafficBot: !!process.env.TELEGRAM_BOT_TOKEN,
      trafficChatId: !!process.env.TELEGRAM_GROUP_CHAT_ID
    }
  };
  
  // Determine overall status
  const fbReady = envStatus.facebook.token && envStatus.facebook.appId && envStatus.facebook.appSecret;
  const amocrmReady = envStatus.amocrm.refreshToken && envStatus.amocrm.clientId && envStatus.amocrm.clientSecret;
  const openaiReady = envStatus.openai.apiKey;
  const supabaseReady = envStatus.supabase.url && envStatus.supabase.serviceKey;
  
  const allHealthy = fbReady && amocrmReady && openaiReady && supabaseReady;
  
  // Build message
  const message = `
🏥 *System Health Report*
📅 ${now} (Almaty)

━━━━━━━━━━━━━━━━━━━━━━━━

📘 *Facebook Ads*
├ Token: ${envStatus.facebook.token ? '✅' : '❌'}
├ App ID: ${envStatus.facebook.appId ? '✅' : '❌'}
├ App Secret: ${envStatus.facebook.appSecret ? '✅' : '❌'}
└ Status: ${fbReady ? '🟢 Ready' : '🔴 Incomplete'}

📗 *AmoCRM*
├ Access Token: ${envStatus.amocrm.accessToken ? '✅' : '⚠️ Will refresh'}
├ Refresh Token: ${envStatus.amocrm.refreshToken ? '✅' : '❌'}
├ Client ID: ${envStatus.amocrm.clientId ? '✅' : '❌'}
├ Domain: ${envStatus.amocrm.domain}
└ Status: ${amocrmReady ? '🟢 Ready' : '🔴 Incomplete'}

🤖 *OpenAI*
├ API Key: ${envStatus.openai.apiKey ? '✅' : '❌'}
└ Status: ${openaiReady ? '🟢 Ready' : '🔴 Missing'}

🗃️ *Supabase*
├ URL: ${envStatus.supabase.url ? '✅' : '❌'}
├ Service Key: ${envStatus.supabase.serviceKey ? '✅' : '❌'}
└ Status: ${supabaseReady ? '🟢 Ready' : '🔴 Incomplete'}

📱 *Telegram Bots*
├ IAE Bot: ${envStatus.telegram.iaeBot ? '✅' : '❌'}
├ IAE Chat: ${envStatus.telegram.iaeChatId ? '✅' : '❌'}
├ Traffic Bot: ${envStatus.telegram.trafficBot ? '✅' : '❌'}
└ Traffic Chat: ${envStatus.telegram.trafficChatId ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━━━━━━

${allHealthy 
  ? '✅ *All systems operational*' 
  : '⚠️ *Some integrations need attention*'}

🔄 Auto-refresh: Every 2 hours
🏥 Health check: Every 30 min
`;

  try {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      },
      { timeout: 10000 }
    );
    
    console.log('✅ Test health alert sent successfully!');
    console.log(`📨 Sent to chat: ${TELEGRAM_CHAT_ID}`);
    
  } catch (error: any) {
    console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
    process.exit(1);
  }
}

sendTestHealthAlert();
