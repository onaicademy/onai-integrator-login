/**
 * Environment Variables Validation
 * 
 * Validate that all required environment variables are set on server startup
 * 
 * WHY: Prevents cryptic errors later if env vars missing
 * SAFE: Only checks, doesn't modify
 */

const requiredVars = [
  // Supabase Main
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  
  // Supabase Tripwire
  'TRIPWIRE_SUPABASE_URL',
  'TRIPWIRE_SERVICE_ROLE_KEY',
  'TRIPWIRE_JWT_SECRET',
  
  // AI Services
  'OPENAI_API_KEY',
  
  // Telegram Bots (хотя бы один должен быть)
  // 'TELEGRAM_BOT_TOKEN_MENTOR',
  
  // AmoCRM (optional for dev, but log warning)
  // 'AMOCRM_CLIENT_ID',
];

const optionalButRecommended = [
  'GROQ_API_KEY',
  'TELEGRAM_BOT_TOKEN_MENTOR',
  'TELEGRAM_BOT_TOKEN_CURATOR',
  'TELEGRAM_BOT_TOKEN_ANALYST',
  'AMOCRM_CLIENT_ID',
  'AMOCRM_CLIENT_SECRET',
  'AMOCRM_LONG_LIVED_ACCESS_TOKEN',
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_STREAM_API_KEY',
  'RESEND_API_KEY',
];

export function validateEnvironment() {
  console.log('\n🔍 ===== ENVIRONMENT VARIABLES VALIDATION =====\n');
  
  // Check required vars
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing REQUIRED environment variables:');
    missing.forEach(v => console.error(`  - ${v}`));
    console.error('\n💡 Hint: Check that backend/env.env file exists and contains all keys\n');
    process.exit(1);
  }
  
  console.log('✅ All REQUIRED environment variables are set');
  
  // Check optional vars (just warnings)
  const missingOptional = optionalButRecommended.filter(v => !process.env[v]);
  
  if (missingOptional.length > 0) {
    console.warn('\n⚠️  Missing OPTIONAL environment variables (non-critical):');
    missingOptional.forEach(v => console.warn(`  - ${v}`));
    console.warn('   → Some features may not work without these\n');
  }
  
  // Show what's configured
  console.log('\n📋 Configured services:');
  console.log(`  ✅ Supabase Main: ${process.env.SUPABASE_URL ? 'YES' : 'NO'}`);
  console.log(`  ✅ Supabase Tripwire: ${process.env.TRIPWIRE_SUPABASE_URL ? 'YES' : 'NO'}`);
  console.log(`  ✅ OpenAI: ${process.env.OPENAI_API_KEY ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.GROQ_API_KEY ? '✅' : '⚠️ '} Groq: ${process.env.GROQ_API_KEY ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.TELEGRAM_BOT_TOKEN_MENTOR ? '✅' : '⚠️ '} Telegram: ${process.env.TELEGRAM_BOT_TOKEN_MENTOR ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.AMOCRM_CLIENT_ID ? '✅' : '⚠️ '} AmoCRM: ${process.env.AMOCRM_CLIENT_ID ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.BUNNY_STREAM_API_KEY ? '✅' : '⚠️ '} Bunny CDN: ${process.env.BUNNY_STREAM_API_KEY ? 'YES' : 'NO'}`);
  console.log(`  ${process.env.RESEND_API_KEY ? '✅' : '⚠️ '} Email (Resend): ${process.env.RESEND_API_KEY ? 'YES' : 'NO'}`);
  
  console.log('\n✅ Environment validation complete!\n');
}
