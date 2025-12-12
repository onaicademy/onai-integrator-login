/**
 * ✅ IMPROVED: Environment Variables Validation with Zod
 * 
 * Strict type-safe validation с автоматической coercion
 * 
 * WHY:
 * - Type safety (TypeScript знает типы)
 * - URL validation (проверяет формат)
 * - Default values (автоматические fallbacks)
 * - Better error messages
 * 
 * SAFE: Backwards compatible, только улучшает validation
 */

import { z } from 'zod';

// ✅ Zod Schema для Environment Variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  
  // Supabase Main
  SUPABASE_URL: z.string().url('SUPABASE_URL must be valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10, 'SUPABASE_SERVICE_ROLE_KEY too short'),
  SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters'),
  
  // Supabase Tripwire
  TRIPWIRE_SUPABASE_URL: z.string().url('TRIPWIRE_SUPABASE_URL must be valid URL'),
  TRIPWIRE_SERVICE_ROLE_KEY: z.string().min(10, 'TRIPWIRE_SERVICE_ROLE_KEY too short'),
  TRIPWIRE_JWT_SECRET: z.string().min(32, 'TRIPWIRE_JWT_SECRET must be at least 32 characters'),
  TRIPWIRE_DATABASE_URL: z.string().url('TRIPWIRE_DATABASE_URL must be valid PostgreSQL URL').optional(),
  
  // API Configuration
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url().optional(),
  
  // AI Services
  OPENAI_API_KEY: z.string().min(20, 'OPENAI_API_KEY invalid format'),
  GROQ_API_KEY: z.string().optional(),
  
  // Telegram Bots (optional)
  TELEGRAM_BOT_TOKEN_MENTOR: z.string().optional(),
  TELEGRAM_BOT_TOKEN_CURATOR: z.string().optional(),
  TELEGRAM_BOT_TOKEN_ANALYST: z.string().optional(),
  
  // AmoCRM (optional)
  AMOCRM_CLIENT_ID: z.string().optional(),
  AMOCRM_CLIENT_SECRET: z.string().optional(),
  AMOCRM_LONG_LIVED_ACCESS_TOKEN: z.string().optional(),
  AMOCRM_SUBDOMAIN: z.string().optional(),
  
  // Bunny CDN (optional)
  BUNNY_STREAM_LIBRARY_ID: z.string().optional(),
  BUNNY_STREAM_API_KEY: z.string().optional(),
  BUNNY_STREAM_CDN_HOSTNAME: z.string().optional(),
  
  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  
  // Logging & Monitoring
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Feature Flags
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
  ENABLE_MONITORING: z.coerce.boolean().default(true),
});

// ✅ Type-safe env object (TypeScript знает все типы!)
export type Env = z.infer<typeof envSchema>;

// ✅ Parse и validate при импорте модуля
export const env = (() => {
  try {
    const parsed = envSchema.parse(process.env);
    
    console.log('\n🔍 ===== ENVIRONMENT VARIABLES VALIDATION =====\n');
    console.log('✅ All REQUIRED environment variables are set and valid');
    
    // Show configured services
    console.log('\n📋 Configured services:');
    console.log(`  ✅ Supabase Main: YES`);
    console.log(`  ✅ Supabase Tripwire: YES`);
    console.log(`  ✅ OpenAI: YES`);
    console.log(`  ${parsed.GROQ_API_KEY ? '✅' : '⚠️ '} Groq: ${parsed.GROQ_API_KEY ? 'YES' : 'NO'}`);
    console.log(`  ${parsed.TELEGRAM_BOT_TOKEN_MENTOR ? '✅' : '⚠️ '} Telegram: ${parsed.TELEGRAM_BOT_TOKEN_MENTOR ? 'YES' : 'NO'}`);
    console.log(`  ${parsed.AMOCRM_CLIENT_ID ? '✅' : '⚠️ '} AmoCRM: ${parsed.AMOCRM_CLIENT_ID ? 'YES' : 'NO'}`);
    console.log(`  ${parsed.BUNNY_STREAM_API_KEY ? '✅' : '⚠️ '} Bunny CDN: ${parsed.BUNNY_STREAM_API_KEY ? 'YES' : 'NO'}`);
    console.log(`  ${parsed.RESEND_API_KEY ? '✅' : '⚠️ '} Email: ${parsed.RESEND_API_KEY ? 'YES' : 'NO'}`);
    console.log('\n✅ Environment validation complete!\n');
    
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ ===== ENV VALIDATION FAILED =====\n');
      
      const messages = error.issues.map(issue => {
        const field = issue.path.join('.');
        return `  ❌ ${field}: ${issue.message}`;
      });
      
      console.error(messages.join('\n'));
      console.error('\n💡 Hint: Check backend/env.env file and compare with ENV_USAGE_GUIDE.md\n');
      
      process.exit(1);
    }
    throw error;
  }
})();

// ✅ Legacy function для backwards compatibility
export function validateEnvironment() {
  // Уже валидировано при импорте, эта функция просто для совместимости
  console.log('✅ Environment already validated (using Zod schema)');
}
