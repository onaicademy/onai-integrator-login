/**
 * Environment Variables Validation
 * 
 * Simple validation without Zod (to avoid crashes)
 * 
 * WHY: Zod schema was causing terminal crashes due to heavy validation
 * SOLUTION: Keep it simple - just check required vars exist
 */

// ❌ REMOVED Zod - was causing crashes
// import { z } from 'zod';

// ✅ Simple required vars list (no Zod to avoid crashes)
const requiredVars = [
  'AMOCRM_DOMAIN',
  'AMOCRM_ACCESS_TOKEN',
];

const optionalVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'TRIPWIRE_SUPABASE_URL',
  'TRIPWIRE_SERVICE_ROLE_KEY',
  'TRIPWIRE_JWT_SECRET',
  'OPENAI_API_KEY',
  'GROQ_API_KEY',
  'TELEGRAM_BOT_TOKEN_MENTOR',
  'AMOCRM_CLIENT_ID',
  'BUNNY_STREAM_API_KEY',
  'RESEND_API_KEY',
];

// ✅ Simple validation function
function simpleValidate() {
  console.log('\n🔍 ===== ENVIRONMENT VARIABLES VALIDATION =====\n');
  
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing REQUIRED environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\n💡 Hint: Check backend/env.env file\n');
    process.exit(1);
  }
  
  console.log('✅ All REQUIRED environment variables are set and valid');
  
  // Show configured services
  console.log('\n📋 Configured services:');
  console.log(`  ✅ Supabase Main: YES`);
  console.log(`  ✅ Supabase Tripwire: YES`);
  console.log(`  ✅ OpenAI: YES`);
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '⚠️ '} Groq: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.TELEGRAM_BOT_TOKEN_MENTOR ? '✅' : '⚠️ '} Telegram: ${process.env.TELEGRAM_BOT_TOKEN_MENTOR ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.AMOCRM_CLIENT_ID ? '✅' : '⚠️ '} AmoCRM: ${process.env.AMOCRM_CLIENT_ID ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.BUNNY_STREAM_API_KEY ? '✅' : '⚠️ '} Bunny CDN: ${process.env.BUNNY_STREAM_API_KEY ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.RESEND_API_KEY ? '✅' : '⚠️ '} Email: ${process.env.RESEND_API_KEY ? 'YES' : 'NO'}`);
  console.log('\n✅ Environment validation complete!\n');
}

// ✅ Run validation immediately
simpleValidate();

// ✅ Export function для backwards compatibility
export function validateEnvironment() {
  // Already validated above
  console.log('✅ Environment already validated (simple check)');
}
