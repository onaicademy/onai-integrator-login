/**
 * 🔐 Production-Ready ENV Validation
 * 
 * PHILOSOPHY:
 * - Server NEVER crashes due to missing ENV
 * - Missing vars disable only affected features
 * - Clear console logs for operators
 * - Telegram alerts for critical issues
 * 
 * Created: December 2025
 */

import axios from 'axios';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 ENV Variable Definitions by Feature
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface EnvVarDef {
  name: string;
  required: boolean;
  description: string;
  example?: string;
}

interface FeatureConfig {
  name: string;
  enabled: boolean;
  envVars: EnvVarDef[];
  missing: string[];
  status: 'ready' | 'partial' | 'disabled';
}

// ═══════════════════════════════════════════════════════════════
// 🔧 ENV Variable Groups
// ═══════════════════════════════════════════════════════════════

const ENV_GROUPS = {
  // 🌐 Core Server
  server: {
    name: 'Server Core',
    vars: [
      { name: 'NODE_ENV', required: false, description: 'Environment (development/production)', example: 'production' },
      { name: 'PORT', required: false, description: 'Server port', example: '3000' },
      { name: 'FRONTEND_URL', required: false, description: 'Frontend URL for CORS', example: 'https://onai.academy' },
      { name: 'BACKEND_URL', required: false, description: 'Backend URL for callbacks', example: 'https://api.onai.academy' },
      { name: 'API_URL', required: false, description: 'API base URL', example: 'https://api.onai.academy' },
      { name: 'JWT_SECRET', required: true, description: 'JWT signing secret', example: 'your-secret-key' },
      { name: 'JWT_EXPIRES_IN', required: false, description: 'JWT expiration', example: '7d' },
    ]
  },
  
  // 🗃️ Supabase (Main)
  supabaseMain: {
    name: 'Supabase Main',
    vars: [
      { name: 'SUPABASE_URL', required: true, description: 'Main Supabase project URL', example: 'https://xxx.supabase.co' },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', required: true, description: 'Service role key', example: 'eyJhbGciOi...' },
      { name: 'SUPABASE_ANON_KEY', required: false, description: 'Anonymous key', example: 'eyJhbGciOi...' },
      { name: 'SUPABASE_JWT_SECRET', required: false, description: 'JWT secret for custom auth', example: 'super-secret' },
    ]
  },

  // 🗃️ Supabase (Tripwire)
  supabaseTripwire: {
    name: 'Supabase Tripwire',
    vars: [
      { name: 'TRIPWIRE_SUPABASE_URL', required: true, description: 'Tripwire Supabase URL', example: 'https://xxx.supabase.co' },
      { name: 'TRIPWIRE_SUPABASE_SERVICE_KEY', required: false, description: 'Tripwire service key', example: 'eyJhbGciOi...' },
      { name: 'TRIPWIRE_SERVICE_ROLE_KEY', required: true, description: 'Tripwire service role', example: 'eyJhbGciOi...' },
      { name: 'TRIPWIRE_SUPABASE_ANON_KEY', required: false, description: 'Tripwire anon key', example: 'eyJhbGciOi...' },
      { name: 'TRIPWIRE_JWT_SECRET', required: false, description: 'Tripwire JWT secret', example: 'secret' },
    ]
  },

  // 🗃️ Supabase (Traffic Dashboard)
  supabaseTraffic: {
    name: 'Supabase Traffic',
    vars: [
      { name: 'TRAFFIC_SUPABASE_URL', required: true, description: 'Traffic dashboard Supabase URL', example: 'https://xxx.supabase.co' },
      { name: 'TRAFFIC_SERVICE_ROLE_KEY', required: true, description: 'Traffic service role key', example: 'eyJhbGciOi...' },
      { name: 'TRAFFIC_SUPABASE_ANON_KEY', required: false, description: 'Traffic anon key', example: 'eyJhbGciOi...' },
    ]
  },

  // 🗃️ Supabase (Landing)
  supabaseLanding: {
    name: 'Supabase Landing',
    vars: [
      { name: 'LANDING_SUPABASE_URL', required: true, description: 'Landing Supabase URL', example: 'https://xxx.supabase.co' },
      { name: 'LANDING_SUPABASE_SERVICE_KEY', required: true, description: 'Landing service key', example: 'eyJhbGciOi...' },
      { name: 'LANDING_SUPABASE_KEY', required: false, description: 'Landing anon key', example: 'eyJhbGciOi...' },
    ]
  },

  // 📘 Facebook Ads
  facebook: {
    name: 'Facebook Ads',
    vars: [
      { name: 'FACEBOOK_ADS_TOKEN', required: true, description: 'Facebook Ads access token', example: 'EAAx...' },
      { name: 'FACEBOOK_APP_ID', required: true, description: 'Facebook App ID', example: '123456789' },
      { name: 'FACEBOOK_APP_SECRET', required: true, description: 'Facebook App Secret', example: 'abc123...' },
      { name: 'FACEBOOK_AD_ACCOUNT_ID', required: false, description: 'Default ad account ID', example: 'act_123456789' },
      { name: 'FACEBOOK_PERMANENT_TOKEN', required: false, description: 'Permanent page token', example: 'EAAx...' },
      { name: 'FB_ACCESS_TOKEN', required: false, description: 'Legacy FB token', example: 'EAAx...' },
    ]
  },

  // 📗 AmoCRM
  amocrm: {
    name: 'AmoCRM',
    vars: [
      { name: 'AMOCRM_DOMAIN', required: true, description: 'AmoCRM subdomain', example: 'onaiagencykz' },
      { name: 'AMOCRM_ACCESS_TOKEN', required: false, description: 'Access token (auto-refreshed)', example: 'eyJ...' },
      { name: 'AMOCRM_REFRESH_TOKEN', required: true, description: 'Refresh token', example: 'def50200...' },
      { name: 'AMOCRM_CLIENT_ID', required: true, description: 'OAuth Client ID', example: '12345678-abcd-...' },
      { name: 'AMOCRM_CLIENT_SECRET', required: true, description: 'OAuth Client Secret', example: 'secret123...' },
      { name: 'AMOCRM_REDIRECT_URI', required: false, description: 'OAuth redirect URI', example: 'https://...' },
      { name: 'AMOCRM_PIPELINE_ID', required: false, description: 'Default pipeline ID', example: '1234567' },
      { name: 'AMOCRM_STATUS_ID', required: false, description: 'Default status ID', example: '7654321' },
      { name: 'AMOCRM_SUBDOMAIN', required: false, description: 'Legacy subdomain field', example: 'onaiagencykz' },
      { name: 'AMOCRM_INITIAL_STATUS_ID', required: false, description: 'Initial lead status', example: '123' },
      { name: 'AMOCRM_TIMEOUT', required: false, description: 'API timeout (ms)', example: '15000' },
    ]
  },

  // 🤖 OpenAI
  openai: {
    name: 'OpenAI',
    vars: [
      { name: 'OPENAI_API_KEY', required: true, description: 'OpenAI API key', example: 'sk-proj-...' },
      { name: 'OPENAI_ASSISTANT_MENTOR_ID', required: false, description: 'AI Mentor assistant ID', example: 'asst_...' },
      { name: 'OPENAI_ASSISTANT_ANALYST_ID', required: false, description: 'AI Analyst assistant ID', example: 'asst_...' },
      { name: 'OPENAI_ASSISTANT_CURATOR_ID', required: false, description: 'AI Curator assistant ID', example: 'asst_...' },
      { name: 'OPENAI_ASSISTANT_CURATOR_TRIPWIRE_ID', required: false, description: 'Tripwire curator ID', example: 'asst_...' },
    ]
  },

  // 🧠 Groq
  groq: {
    name: 'Groq AI',
    vars: [
      { name: 'GROQ_API_KEY', required: false, description: 'Groq API key for fast inference', example: 'gsk_...' },
    ]
  },

  // 📱 Telegram Bots
  telegram: {
    name: 'Telegram Bots',
    vars: [
      { name: 'TELEGRAM_BOT_TOKEN', required: false, description: 'Traffic bot token', example: '123456:ABC...' },
      { name: 'TELEGRAM_GROUP_CHAT_ID', required: false, description: 'Traffic group chat ID', example: '-100123456789' },
      { name: 'TELEGRAM_IAE_BOT_TOKEN', required: false, description: 'IAE Agent bot token', example: '123456:ABC...' },
      { name: 'TELEGRAM_IAE_CHAT_ID', required: false, description: 'IAE alerts chat ID', example: '-100123456789' },
      { name: 'TELEGRAM_ALERT_CHAT_ID', required: false, description: 'System alerts chat', example: '-100123456789' },
      { name: 'TELEGRAM_LEADS_BOT_TOKEN', required: false, description: 'Leads bot token', example: '123456:ABC...' },
      { name: 'TELEGRAM_LEADS_CHAT_ID', required: false, description: 'Leads chat ID', example: '789638302' },
      { name: 'TELEGRAM_MENTOR_BOT_TOKEN', required: false, description: 'AI Mentor bot token', example: '123456:ABC...' },
      { name: 'TELEGRAM_ADMIN_BOT_TOKEN', required: false, description: 'Admin bot token', example: '123456:ABC...' },
      { name: 'TELEGRAM_ADMIN_CHAT_ID', required: false, description: 'Admin chat ID', example: '-100123456789' },
    ]
  },

  // 📧 Email (Resend)
  email: {
    name: 'Email (Resend)',
    vars: [
      { name: 'RESEND_API_KEY', required: true, description: 'Resend API key', example: 're_...' },
      { name: 'ADMIN_EMAIL', required: false, description: 'Admin email address', example: 'admin@onai.academy' },
      { name: 'TEST_EMAIL', required: false, description: 'Test email for dev', example: 'test@example.com' },
    ]
  },

  // 📞 SMS (Mobizon)
  sms: {
    name: 'SMS (Mobizon)',
    vars: [
      { name: 'MOBIZON_API_KEY', required: false, description: 'Mobizon API key', example: 'kzee4f5d...' },
    ]
  },

  // 🐰 BunnyCDN
  bunny: {
    name: 'BunnyCDN',
    vars: [
      { name: 'BUNNY_API_KEY', required: false, description: 'Bunny API key', example: '12345678-...' },
      { name: 'BUNNY_STREAM_API_KEY', required: true, description: 'Bunny Stream API key', example: '12345678-...' },
      { name: 'BUNNY_STREAM_LIBRARY_ID', required: true, description: 'Stream library ID', example: '123456' },
      { name: 'BUNNY_STREAM_CDN_HOSTNAME', required: true, description: 'Stream CDN hostname', example: 'video.onai.academy' },
      { name: 'BUNNY_STORAGE_ZONE', required: false, description: 'Storage zone name', example: 'onai-videos' },
      { name: 'BUNNY_LIBRARY_ID', required: false, description: 'Legacy library ID', example: '123456' },
    ]
  },

  // 🔴 Redis
  redis: {
    name: 'Redis',
    vars: [
      { name: 'REDIS_URL', required: false, description: 'Redis connection URL', example: 'redis://localhost:6379' },
      { name: 'REDIS_HOST', required: false, description: 'Redis host', example: 'localhost' },
      { name: 'REDIS_PORT', required: false, description: 'Redis port', example: '6379' },
    ]
  },

  // 🛡️ Sentry
  sentry: {
    name: 'Sentry Monitoring',
    vars: [
      { name: 'SENTRY_DSN', required: false, description: 'Sentry DSN', example: 'https://xxx@sentry.io/123' },
      { name: 'SENTRY_ENABLED', required: false, description: 'Enable Sentry', example: 'true' },
    ]
  },

  // 📊 Other Ads
  otherAds: {
    name: 'Other Ads',
    vars: [
      { name: 'GOOGLE_ADS_TOKEN', required: false, description: 'Google Ads token', example: 'ya29...' },
      { name: 'GOOGLE_ADS_DEVELOPER_TOKEN', required: false, description: 'Google Ads dev token', example: 'xxx' },
      { name: 'GOOGLE_OAUTH_TOKEN', required: false, description: 'Google OAuth token', example: 'ya29...' },
      { name: 'TIKTOK_ACCESS_TOKEN', required: false, description: 'TikTok Ads token', example: 'xxx' },
      { name: 'YOUTUBE_API_KEY', required: false, description: 'YouTube API key', example: 'AIza...' },
    ]
  },

  // 💬 WhatsApp
  whatsapp: {
    name: 'WhatsApp',
    vars: [
      { name: 'WHAPI_TOKEN', required: false, description: 'WhAPI token', example: 'xxx' },
      { name: 'WHAPI_API_URL', required: false, description: 'WhAPI base URL', example: 'https://gate.whapi.cloud' },
    ]
  },

  // 🔧 Misc
  misc: {
    name: 'Miscellaneous',
    vars: [
      { name: 'START_WORKER', required: false, description: 'Start queue worker', example: 'true' },
      { name: 'LOG_LEVEL', required: false, description: 'Logging level', example: 'info' },
      { name: 'ENABLE_TELEGRAM_BOT_LOCALLY', required: false, description: 'Enable bot in dev', example: 'false' },
      { name: 'SERVER_NAME', required: false, description: 'Server identifier', example: 'prod-1' },
      { name: 'DASHBOARD_URL', required: false, description: 'Dashboard URL', example: 'https://traffic.onai.academy' },
      { name: 'COURSE_URL', required: false, description: 'Course URL', example: 'https://onai.academy/course' },
      { name: 'PRODUCT_URL', required: false, description: 'Product URL', example: 'https://onai.academy' },
      { name: 'ALERT_WEBHOOK_URL', required: false, description: 'External alerts webhook', example: 'https://...' },
    ]
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔍 Validation Engine
// ═══════════════════════════════════════════════════════════════

interface ValidationResult {
  features: Record<string, FeatureConfig>;
  totalVars: number;
  missingRequired: string[];
  missingOptional: string[];
  allCriticalPresent: boolean;
  warnings: string[];
}

function validateAllEnv(): ValidationResult {
  const result: ValidationResult = {
    features: {},
    totalVars: 0,
    missingRequired: [],
    missingOptional: [],
    allCriticalPresent: true,
    warnings: []
  };

  for (const [key, group] of Object.entries(ENV_GROUPS)) {
    const missing: string[] = [];
    let hasAllRequired = true;
    let hasAnyRequired = false;

    for (const varDef of group.vars) {
      result.totalVars++;
      const value = process.env[varDef.name];
      
      if (!value || value.trim() === '') {
        missing.push(varDef.name);
        
        if (varDef.required) {
          result.missingRequired.push(varDef.name);
          hasAllRequired = false;
        } else {
          result.missingOptional.push(varDef.name);
        }
      } else if (varDef.required) {
        hasAnyRequired = true;
      }
    }

    const status: 'ready' | 'partial' | 'disabled' = 
      hasAllRequired ? 'ready' : 
      hasAnyRequired ? 'partial' : 'disabled';

    result.features[key] = {
      name: group.name,
      enabled: status !== 'disabled',
      envVars: group.vars,
      missing,
      status
    };
  }

  // Check critical integrations
  const criticalFeatures = ['supabaseMain', 'openai'];
  for (const feature of criticalFeatures) {
    if (result.features[feature]?.status === 'disabled') {
      result.allCriticalPresent = false;
      result.warnings.push(`CRITICAL: ${result.features[feature].name} is disabled!`);
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════
// 📊 Config Object (Single Source of Truth)
// ═══════════════════════════════════════════════════════════════

export interface AppConfig {
  // Server
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  backendUrl: string;
  jwtSecret: string;

  // Features enabled
  features: {
    facebook: boolean;
    amocrm: boolean;
    openai: boolean;
    groq: boolean;
    email: boolean;
    sms: boolean;
    bunny: boolean;
    redis: boolean;
    sentry: boolean;
    telegramIae: boolean;
    telegramTraffic: boolean;
    telegramLeads: boolean;
  };

  // Supabase
  supabase: {
    main: { url: string; serviceKey: string } | null;
    tripwire: { url: string; serviceKey: string } | null;
    traffic: { url: string; serviceKey: string } | null;
    landing: { url: string; serviceKey: string } | null;
  };

  // Facebook
  facebook: {
    token: string;
    appId: string;
    appSecret: string;
    adAccountId: string;
  } | null;

  // AmoCRM
  amocrm: {
    domain: string;
    accessToken: string;
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  } | null;

  // OpenAI
  openai: {
    apiKey: string;
    mentorAssistantId: string;
    analystAssistantId: string;
  } | null;

  // Telegram
  telegram: {
    iaeBot: { token: string; chatId: string } | null;
    trafficBot: { token: string; chatId: string } | null;
    leadsBot: { token: string; chatId: string } | null;
  };

  // Email
  email: {
    resendApiKey: string;
  } | null;

  // Bunny
  bunny: {
    streamApiKey: string;
    libraryId: string;
    cdnHostname: string;
  } | null;

  // Redis
  redis: {
    url: string;
  } | null;

  // Sentry
  sentry: {
    dsn: string;
    enabled: boolean;
  } | null;
}

function buildConfig(validation: ValidationResult): AppConfig {
  const env = process.env;
  
  const features = validation.features;

  return {
    nodeEnv: env.NODE_ENV || 'development',
    port: parseInt(env.PORT || '3000', 10),
    frontendUrl: env.FRONTEND_URL || 'http://localhost:5173',
    backendUrl: env.BACKEND_URL || env.API_URL || 'http://localhost:3000',
    jwtSecret: env.JWT_SECRET || 'fallback-dev-secret',

    features: {
      facebook: features.facebook?.status === 'ready',
      amocrm: features.amocrm?.status !== 'disabled',
      openai: features.openai?.status === 'ready',
      groq: !!env.GROQ_API_KEY,
      email: features.email?.status === 'ready',
      sms: !!env.MOBIZON_API_KEY,
      bunny: features.bunny?.status === 'ready',
      redis: !!env.REDIS_URL,
      sentry: !!env.SENTRY_DSN,
      telegramIae: !!(env.TELEGRAM_IAE_BOT_TOKEN && env.TELEGRAM_IAE_CHAT_ID),
      telegramTraffic: !!(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_GROUP_CHAT_ID),
      telegramLeads: !!(env.TELEGRAM_LEADS_BOT_TOKEN && env.TELEGRAM_LEADS_CHAT_ID),
    },

    supabase: {
      main: env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY 
        ? { url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY } : null,
      tripwire: env.TRIPWIRE_SUPABASE_URL && (env.TRIPWIRE_SERVICE_ROLE_KEY || env.TRIPWIRE_SUPABASE_SERVICE_KEY)
        ? { url: env.TRIPWIRE_SUPABASE_URL, serviceKey: env.TRIPWIRE_SERVICE_ROLE_KEY || env.TRIPWIRE_SUPABASE_SERVICE_KEY! } : null,
      traffic: env.TRAFFIC_SUPABASE_URL && env.TRAFFIC_SERVICE_ROLE_KEY
        ? { url: env.TRAFFIC_SUPABASE_URL, serviceKey: env.TRAFFIC_SERVICE_ROLE_KEY } : null,
      landing: env.LANDING_SUPABASE_URL && env.LANDING_SUPABASE_SERVICE_KEY
        ? { url: env.LANDING_SUPABASE_URL, serviceKey: env.LANDING_SUPABASE_SERVICE_KEY } : null,
    },

    facebook: features.facebook?.status === 'ready' ? {
      token: env.FACEBOOK_ADS_TOKEN!,
      appId: env.FACEBOOK_APP_ID!,
      appSecret: env.FACEBOOK_APP_SECRET!,
      adAccountId: env.FACEBOOK_AD_ACCOUNT_ID || '',
    } : null,

    amocrm: features.amocrm?.status !== 'disabled' ? {
      domain: env.AMOCRM_DOMAIN || 'onaiagencykz',
      accessToken: env.AMOCRM_ACCESS_TOKEN || '',
      refreshToken: env.AMOCRM_REFRESH_TOKEN || '',
      clientId: env.AMOCRM_CLIENT_ID || '',
      clientSecret: env.AMOCRM_CLIENT_SECRET || '',
    } : null,

    openai: features.openai?.status === 'ready' ? {
      apiKey: env.OPENAI_API_KEY!,
      mentorAssistantId: env.OPENAI_ASSISTANT_MENTOR_ID || '',
      analystAssistantId: env.OPENAI_ASSISTANT_ANALYST_ID || '',
    } : null,

    telegram: {
      iaeBot: env.TELEGRAM_IAE_BOT_TOKEN && env.TELEGRAM_IAE_CHAT_ID 
        ? { token: env.TELEGRAM_IAE_BOT_TOKEN, chatId: env.TELEGRAM_IAE_CHAT_ID } : null,
      trafficBot: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_GROUP_CHAT_ID
        ? { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_GROUP_CHAT_ID } : null,
      leadsBot: env.TELEGRAM_LEADS_BOT_TOKEN && env.TELEGRAM_LEADS_CHAT_ID
        ? { token: env.TELEGRAM_LEADS_BOT_TOKEN, chatId: env.TELEGRAM_LEADS_CHAT_ID } : null,
    },

    email: features.email?.status === 'ready' ? {
      resendApiKey: env.RESEND_API_KEY!,
    } : null,

    bunny: features.bunny?.status === 'ready' ? {
      streamApiKey: env.BUNNY_STREAM_API_KEY!,
      libraryId: env.BUNNY_STREAM_LIBRARY_ID!,
      cdnHostname: env.BUNNY_STREAM_CDN_HOSTNAME!,
    } : null,

    redis: env.REDIS_URL ? { url: env.REDIS_URL } : null,

    sentry: env.SENTRY_DSN ? {
      dsn: env.SENTRY_DSN,
      enabled: env.SENTRY_ENABLED !== 'false',
    } : null,
  };
}

// ═══════════════════════════════════════════════════════════════
// 📨 Startup Alert
// ═══════════════════════════════════════════════════════════════

async function sendStartupAlert(validation: ValidationResult, config: AppConfig): Promise<void> {
  // Find alert bot credentials - prefer IAE Agent bot (@analisistonaitrafic_bot)
  const botToken = process.env.IAE_BOT_TOKEN || process.env.TELEGRAM_IAE_BOT_TOKEN || '8439289933:AAH5eED6m0HOK1ZEUGRO1MYCF93srAfjEF4';
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID || process.env.TELEGRAM_IAE_CHAT_ID || process.env.TELEGRAM_LEADS_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.log('⚠️ [ENV Alert] No Telegram credentials for startup alert');
    return;
  }

  // Only alert if there are issues
  if (validation.missingRequired.length === 0) {
    return;
  }

  const now = new Date().toLocaleString('ru-RU', { 
    timeZone: 'Asia/Almaty',
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const disabledFeatures = Object.values(validation.features)
    .filter(f => f.status === 'disabled')
    .map(f => f.name);

  const partialFeatures = Object.values(validation.features)
    .filter(f => f.status === 'partial')
    .map(f => f.name);

  const message = `
🚨 *Server Startup - ENV Issues*
📅 ${now} (Almaty)
🖥️ Server: ${process.env.SERVER_NAME || 'unknown'}

━━━━━━━━━━━━━━━━━━━━━━━━

${validation.missingRequired.length > 0 ? `❌ *Missing Required (${validation.missingRequired.length}):*
${validation.missingRequired.slice(0, 10).map(v => `• ${v}`).join('\n')}
${validation.missingRequired.length > 10 ? `... and ${validation.missingRequired.length - 10} more` : ''}

` : ''}${disabledFeatures.length > 0 ? `🔴 *Disabled Features:*
${disabledFeatures.map(f => `• ${f}`).join('\n')}

` : ''}${partialFeatures.length > 0 ? `🟡 *Partial Features:*
${partialFeatures.map(f => `• ${f}`).join('\n')}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Server is running but some features are disabled.
📋 Check .env configuration.
`;

  try {
    await axios.post(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      },
      { timeout: 5000 }
    );
    console.log('📨 [ENV Alert] Startup alert sent to Telegram');
  } catch (error: any) {
    console.error('❌ [ENV Alert] Failed to send:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📋 Console Report
// ═══════════════════════════════════════════════════════════════

function printValidationReport(validation: ValidationResult): void {
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔐 ENVIRONMENT VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  for (const [key, feature] of Object.entries(validation.features)) {
    const icon = feature.status === 'ready' ? '✅' : 
                 feature.status === 'partial' ? '🟡' : '🔴';
    const statusText = feature.status.toUpperCase();
    
    console.log(`${icon} ${feature.name}: ${statusText}`);
    
    if (feature.missing.length > 0 && feature.missing.length <= 5) {
      feature.missing.forEach(v => console.log(`   └ Missing: ${v}`));
    } else if (feature.missing.length > 5) {
      console.log(`   └ Missing: ${feature.missing.length} variables`);
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────────────────────');
  console.log(`📊 Summary:`);
  console.log(`   Total vars scanned: ${validation.totalVars}`);
  console.log(`   Missing required: ${validation.missingRequired.length}`);
  console.log(`   Missing optional: ${validation.missingOptional.length}`);
  console.log('');

  if (validation.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    validation.warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }

  if (validation.allCriticalPresent) {
    console.log('✅ All critical integrations are configured');
  } else {
    console.log('⚠️  Some critical integrations are missing - running in degraded mode');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
}

// ═══════════════════════════════════════════════════════════════
// 🚀 Main Export
// ═══════════════════════════════════════════════════════════════

let cachedConfig: AppConfig | null = null;
let cachedValidation: ValidationResult | null = null;

export function initializeConfig(): { config: AppConfig; validation: ValidationResult } {
  if (cachedConfig && cachedValidation) {
    return { config: cachedConfig, validation: cachedValidation };
  }

  const validation = validateAllEnv();
  const config = buildConfig(validation);

  printValidationReport(validation);

  // Send startup alert (async, don't await)
  sendStartupAlert(validation, config).catch(() => {});

  cachedConfig = config;
  cachedValidation = validation;

  return { config, validation };
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    const { config } = initializeConfig();
    return config;
  }
  return cachedConfig;
}

export function getValidation(): ValidationResult {
  if (!cachedValidation) {
    const { validation } = initializeConfig();
    return validation;
  }
  return cachedValidation;
}

export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
  return getConfig().features[feature] ?? false;
}

// Helper to get feature status for runtime checks
export function getFeatureStatus(feature: string): 'ready' | 'partial' | 'disabled' {
  const validation = getValidation();
  return validation.features[feature]?.status || 'disabled';
}

// Export env groups for .env.example generation
export { ENV_GROUPS };

console.log('✅ [ENV Validated] Module loaded');
