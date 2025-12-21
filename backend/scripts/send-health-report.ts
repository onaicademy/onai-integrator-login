#!/usr/bin/env npx tsx
/**
 * 🏥 Send System Health Report to @analisistonaitrafic_bot
 * 
 * Usage: 
 *   npx tsx scripts/send-health-report.ts <chat_id>
 *   npx tsx scripts/send-health-report.ts 789638302
 */

import '../src/load-env.js';
import axios from 'axios';

// 🤖 IAE Agent bot (@analisistonaitrafic_bot)
const IAE_BOT_TOKEN = '8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4';

async function sendHealthReport(chatId: string | number) {
  console.log(`\n🏥 Sending health report to chat ${chatId}...\n`);
  
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
    },
    amocrm: {
      refreshToken: !!process.env.AMOCRM_REFRESH_TOKEN,
      clientId: !!process.env.AMOCRM_CLIENT_ID,
      clientSecret: !!process.env.AMOCRM_CLIENT_SECRET,
      domain: process.env.AMOCRM_DOMAIN || 'onaiagencykz'
    },
    openai: {
      apiKey: !!process.env.OPENAI_API_KEY
    },
    supabase: {
      main: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      tripwire: !!(process.env.TRIPWIRE_SUPABASE_URL && process.env.TRIPWIRE_SERVICE_ROLE_KEY),
      traffic: !!(process.env.TRAFFIC_SUPABASE_URL && process.env.TRAFFIC_SERVICE_ROLE_KEY),
      landing: !!(process.env.LANDING_SUPABASE_URL && process.env.LANDING_SUPABASE_SERVICE_KEY),
    },
    bunny: !!(process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_STREAM_LIBRARY_ID),
    email: !!process.env.RESEND_API_KEY,
    sms: !!process.env.MOBIZON_API_KEY,
    sentry: !!process.env.SENTRY_DSN,
  };
  
  // Calculate health
  const fbReady = envStatus.facebook.token && envStatus.facebook.appId && envStatus.facebook.appSecret;
  const amocrmReady = envStatus.amocrm.refreshToken && envStatus.amocrm.clientId && envStatus.amocrm.clientSecret;
  const openaiReady = envStatus.openai.apiKey;
  const supabaseReady = envStatus.supabase.main;
  const allHealthy = fbReady && amocrmReady && openaiReady && supabaseReady;
  
  const message = `
🏥 *System Health Report*
📅 ${now} (Almaty)
🤖 Bot: analisistonaitrafic

━━━━━━━━━━━━━━━━━━━━━━━━

📘 *Facebook Ads*
  Token: ${envStatus.facebook.token ? '✅' : '❌'}
  App ID: ${envStatus.facebook.appId ? '✅' : '❌'}
  App Secret: ${envStatus.facebook.appSecret ? '✅' : '❌'}
  Status: ${fbReady ? '🟢 Ready' : '🔴 Incomplete'}

📗 *AmoCRM*
  Refresh Token: ${envStatus.amocrm.refreshToken ? '✅' : '❌'}
  Client ID: ${envStatus.amocrm.clientId ? '✅' : '❌'}
  Client Secret: ${envStatus.amocrm.clientSecret ? '✅' : '❌'}
  Domain: ${envStatus.amocrm.domain}
  Status: ${amocrmReady ? '🟢 Ready' : '🟡 Partial'}

🤖 *OpenAI*
  API Key: ${envStatus.openai.apiKey ? '✅' : '❌'}
  Status: ${openaiReady ? '🟢 Ready' : '🔴 Missing'}

🗃️ *Supabase*
  Main: ${envStatus.supabase.main ? '✅' : '❌'}
  Tripwire: ${envStatus.supabase.tripwire ? '✅' : '❌'}
  Traffic: ${envStatus.supabase.traffic ? '✅' : '❌'}
  Landing: ${envStatus.supabase.landing ? '✅' : '❌'}

🔧 *Other Services*
  BunnyCDN: ${envStatus.bunny ? '✅' : '❌'}
  Email: ${envStatus.email ? '✅' : '❌'}
  SMS: ${envStatus.sms ? '✅' : '⚠️'}
  Sentry: ${envStatus.sentry ? '✅' : '⚠️'}

━━━━━━━━━━━━━━━━━━━━━━━━

${allHealthy 
  ? '✅ *All systems operational*' 
  : '⚠️ *Some integrations need attention*'}

🔄 Token auto-refresh: Every 2h
🏥 Health check: Every 30min
📊 Reports: 10:00 and 16:00 daily
`;

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${IAE_BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      },
      { timeout: 10000 }
    );
    
    console.log('✅ Health report sent successfully!');
    console.log(`📨 Sent to chat: ${chatId}`);
    console.log(`🤖 Via bot: @analisistonaitrafic_bot`);
    
  } catch (error: any) {
    console.error('❌ Failed to send:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Get chat_id from command line
const chatId = process.argv[2];

if (!chatId) {
  console.log(`
Usage: npx tsx scripts/send-health-report.ts <chat_id>

Examples:
  npx tsx scripts/send-health-report.ts 789638302
  npx tsx scripts/send-health-report.ts -100123456789

To find your chat_id:
1. Send /start to @analisistonaitrafic_bot
2. Or provide your existing chat_id
`);
  process.exit(1);
}

sendHealthReport(chatId);
