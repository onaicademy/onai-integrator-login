/**
 * 🏗️ PRODUCTION SERVER CONFIGURATION
 * 
 * Centralized configuration for production-ready deployment:
 * - Environment validation
 * - Feature flags
 * - Performance tuning
 * - Security settings
 */

// ═══════════════════════════════════════════════════════════════
// 🎯 ENVIRONMENT
// ═══════════════════════════════════════════════════════════════

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Deployment environment
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_STAGING: process.env.NODE_ENV === 'staging',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
  IS_TEST: process.env.NODE_ENV === 'test',
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ SECURITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const SECURITY_CONFIG = {
  // JWT Settings
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Session settings
  SESSION_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Password hashing
  BCRYPT_ROUNDS: 10,
  
  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS_AUTH: 50,      // Auth endpoints
    MAX_REQUESTS_API: 2000,     // General API
    MAX_REQUESTS_AI: 10,        // AI endpoints (per minute)
  },
  
  // CORS
  ALLOWED_ORIGINS: ENV.IS_PRODUCTION ? [
    'https://onai.academy',
    'https://tripwire.onai.academy',
    'https://www.onai.academy',
  ] : [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
  ],
  
  // Request limits
  MAX_JSON_SIZE: '10mb',
  MAX_URL_ENCODED_SIZE: '1mb',
  MAX_FILE_SIZE: '100mb',
};

// ═══════════════════════════════════════════════════════════════
// ⚡ PERFORMANCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const PERFORMANCE_CONFIG = {
  // Request timeouts (ms)
  TIMEOUTS: {
    DEFAULT: 30000,           // 30 seconds
    HEALTH_CHECK: 5000,       // 5 seconds
    AUTH: 15000,              // 15 seconds
    API: 60000,               // 1 minute
    EXTERNAL_API: 120000,     // 2 minutes
    AI: 180000,               // 3 minutes
    FILE_UPLOAD: 600000,      // 10 minutes
    VIDEO: 3600000,           // 1 hour
  },
  
  // Cache durations (ms)
  CACHE: {
    EXCHANGE_RATE: 3600000,   // 1 hour
    FB_INSIGHTS: 300000,      // 5 minutes
    AMOCRM_DATA: 60000,       // 1 minute
  },
  
  // Connection pool
  DB_POOL: {
    MIN: 2,
    MAX: 10,
  },
  
  // Memory thresholds (percentage)
  MEMORY: {
    WARNING_THRESHOLD: 80,
    CRITICAL_THRESHOLD: 95,
    GC_THRESHOLD: 90,
  },
  
  // Slow request threshold (ms)
  SLOW_REQUEST_THRESHOLD: 3000,
};

// ═══════════════════════════════════════════════════════════════
// 🔌 EXTERNAL SERVICES
// ═══════════════════════════════════════════════════════════════

export const EXTERNAL_SERVICES = {
  // Supabase
  SUPABASE: {
    URL: process.env.SUPABASE_URL || '',
    SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  },
  
  // Facebook Ads
  FACEBOOK: {
    API_VERSION: 'v21.0',
    ACCESS_TOKEN: process.env.FACEBOOK_ADS_TOKEN || '',
    TIMEOUT: 60000,
  },
  
  // AmoCRM
  AMOCRM: {
    DOMAIN: process.env.AMOCRM_DOMAIN || 'onaiagencykz',
    ACCESS_TOKEN: process.env.AMOCRM_ACCESS_TOKEN || '',
    TIMEOUT: 60000,
  },
  
  // OpenAI
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
    DEFAULT_MODEL: 'gpt-4o-mini',
    TIMEOUT: 120000,
  },
  
  // Telegram
  TELEGRAM: {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    TIMEOUT: 30000,
  },
  
  // BunnyCDN
  BUNNY: {
    API_KEY: process.env.BUNNY_API_KEY || '',
    STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE || '',
    TIMEOUT: 300000,
  },
  
  // Resend (Email)
  RESEND: {
    API_KEY: process.env.RESEND_API_KEY || '',
    FROM_EMAIL: 'noreply@onai.academy',
  },
};

// ═══════════════════════════════════════════════════════════════
// 🎚️ FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════

export const FEATURES = {
  // Enable/disable features
  CIRCUIT_BREAKER: true,
  RATE_LIMITING: true,
  REQUEST_TIMEOUT: true,
  INPUT_SANITIZATION: true,
  STRUCTURED_LOGGING: true,
  MEMORY_MONITORING: true,
  SLOW_REQUEST_LOGGING: true,
  
  // Debug features (disable in production)
  DEBUG_LOGGING: ENV.IS_DEVELOPMENT,
  STACK_TRACES: ENV.IS_DEVELOPMENT,
  ENV_DEBUG_ENDPOINT: ENV.IS_DEVELOPMENT,
  
  // Sentry
  SENTRY_ENABLED: ENV.IS_PRODUCTION || ENV.IS_STAGING,
  
  // Schedulers
  SCHEDULERS_ENABLED: ENV.IS_PRODUCTION,
};

// ═══════════════════════════════════════════════════════════════
// 🔍 VALIDATION
// ═══════════════════════════════════════════════════════════════

export function validateProductionConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (ENV.IS_PRODUCTION) {
    // Check critical secrets
    if (SECURITY_CONFIG.JWT_SECRET === 'development-secret-change-in-production') {
      errors.push('JWT_SECRET must be set in production');
    }
    
    if (!EXTERNAL_SERVICES.SUPABASE.URL) {
      errors.push('SUPABASE_URL is required');
    }
    
    if (!EXTERNAL_SERVICES.SUPABASE.SERVICE_KEY) {
      errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    }
    
    if (!EXTERNAL_SERVICES.OPENAI.API_KEY) {
      errors.push('OPENAI_API_KEY is required');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════
// 📊 SERVER STATS
// ═══════════════════════════════════════════════════════════════

export interface ServerStats {
  startTime: Date;
  uptime: number;
  requests: {
    total: number;
    success: number;
    error: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
}

const serverStats: ServerStats = {
  startTime: new Date(),
  uptime: 0,
  requests: {
    total: 0,
    success: 0,
    error: 0,
  },
  memory: {
    heapUsed: 0,
    heapTotal: 0,
    external: 0,
    rss: 0,
  },
};

export function getServerStats(): ServerStats {
  const mem = process.memoryUsage();
  
  return {
    ...serverStats,
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      external: Math.round(mem.external / 1024 / 1024),
      rss: Math.round(mem.rss / 1024 / 1024),
    },
  };
}

export function incrementRequestStats(success: boolean): void {
  serverStats.requests.total++;
  if (success) {
    serverStats.requests.success++;
  } else {
    serverStats.requests.error++;
  }
}

// ═══════════════════════════════════════════════════════════════
// 🖨️ PRINT CONFIG (for debugging)
// ═══════════════════════════════════════════════════════════════

export function printConfig(): void {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏗️ SERVER CONFIGURATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`📌 Environment: ${ENV.NODE_ENV}`);
  console.log(`🌐 Port: ${ENV.PORT}`);
  console.log(`🛡️ Production Mode: ${ENV.IS_PRODUCTION ? 'YES' : 'NO'}`);
  
  console.log('\n🔌 External Services:');
  console.log(`   Supabase: ${EXTERNAL_SERVICES.SUPABASE.URL ? '✅' : '❌'}`);
  console.log(`   Facebook Ads: ${EXTERNAL_SERVICES.FACEBOOK.ACCESS_TOKEN ? '✅' : '❌'}`);
  console.log(`   AmoCRM: ${EXTERNAL_SERVICES.AMOCRM.ACCESS_TOKEN ? '✅' : '❌'}`);
  console.log(`   OpenAI: ${EXTERNAL_SERVICES.OPENAI.API_KEY ? '✅' : '❌'}`);
  console.log(`   Telegram: ${EXTERNAL_SERVICES.TELEGRAM.BOT_TOKEN ? '✅' : '❌'}`);
  console.log(`   Resend: ${EXTERNAL_SERVICES.RESEND.API_KEY ? '✅' : '❌'}`);
  
  console.log('\n🎚️ Features:');
  Object.entries(FEATURES).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? '✅' : '❌'}`);
  });
  
  const validation = validateProductionConfig();
  if (!validation.valid) {
    console.log('\n⚠️ Configuration Warnings:');
    validation.errors.forEach(err => console.log(`   ❌ ${err}`));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

export default {
  ENV,
  SECURITY_CONFIG,
  PERFORMANCE_CONFIG,
  EXTERNAL_SERVICES,
  FEATURES,
  validateProductionConfig,
  getServerStats,
  incrementRequestStats,
  printConfig,
};
