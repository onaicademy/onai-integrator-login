// ✅ ВАЖНО: Загружаем env переменные ПЕРВЫМ делом!
import './load-env.js';

// ✅ Validate environment variables IMMEDIATELY after loading
import { validateEnvironment } from './config/env.js';
validateEnvironment();

// ✅ Validate Supabase environment variables
import { validateSupabaseEnv } from './config/validate-env.js';
validateSupabaseEnv();

// 🛡️ SENTRY: Initialize BEFORE creating Express app
import { initSentry, sentryErrorHandler, trackAPIPerformance } from './config/sentry.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';

// ✅ Get current directory (CommonJS already has __dirname)

// ═══════════════════════════════════════════════════════════════
// 🔍 ДИАГНОСТИКА .ENV VARIABLES
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 ДИАГНОСТИКА .ENV VARIABLES');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📂 Current directory:', process.cwd());
console.log('📂 __dirname:', __dirname);
console.log('\n');

// OpenAI
const openaiKey = process.env.OPENAI_API_KEY;
console.log('🔑 OPENAI_API_KEY:');
console.log('   - Exists:', !!openaiKey);
console.log('   - Length:', openaiKey?.length || 0);
// Security: API key fragment logging removed
console.log('\n');


// Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log('🗃️ SUPABASE:');
console.log('   - SUPABASE_URL:', supabaseUrl || 'EMPTY');
console.log('   - SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseKey);
console.log('   - SUPABASE_SERVICE_ROLE_KEY length:', supabaseKey?.length || 0);
console.log('\n');

// Resend
const resendKey = process.env.RESEND_API_KEY;
console.log('📧 RESEND (Email Service):');
console.log('   - RESEND_API_KEY exists:', !!resendKey);
console.log('   - RESEND_API_KEY length:', resendKey?.length || 0);
// Security: API key fragment logging removed
if (!resendKey || resendKey.length < 20) {
  console.error('   ⚠️  WARNING: RESEND_API_KEY не загружен! Отправка писем НЕ БУДЕТ работать!');
}
console.log('\n');

console.log('═══════════════════════════════════════════════════════════════\n');

// Проверка критичных переменных
if (!openaiKey || openaiKey.length < 50) {
  console.error('❌ КРИТИЧНАЯ ОШИБКА: OPENAI_API_KEY не загружен или неправильный!');
  console.error('❌ Backend не сможет работать с OpenAI API!');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ КРИТИЧНАЯ ОШИБКА: Supabase credentials не загружены!');
  console.error('❌ Backend не сможет подключиться к БД!');
}

import usersRouter from './routes/users';
import diagnosticsRouter from './routes/diagnostics';
import openaiRouter from './routes/openai';
import telegramRouter from './routes/telegram';
import telegramLeadsRouter from './routes/telegram-leads'; // 🤖 Telegram Leads Bot (код активации 2134)
import amoCRMStatsRouter from './routes/amocrm-stats.js'; // 📊 AmoCRM Rate Limiter Stats
import supabaseRouter from './routes/supabase';
import studentsRouter from './routes/students';
import tokensRouter from './routes/tokens';
import filesRouter from './routes/files';
import onboardingRouter from './routes/onboarding';
import fileCleanupRouter from './routes/fileCleanup';
import analyticsRouter from './routes/analytics';
import goalsRouter from './routes/goals';
import missionsRouter from './routes/missions';
import coursesRouter from './routes/courses';
import modulesRouter from './routes/modules';
import lessonsRouter from './routes/lessons';
import videosRouter from './routes/videos'; // ✅ Videos API (NEW - для получения видео по lesson_id)
import materialsRouter from './routes/materials';
import tripwireRouter from './routes/tripwire';
import tripwireLessonsRouter from './routes/tripwire-lessons';
import tripwireHomeworkRouter from './routes/tripwire-homework'; // ✅ Homework Submissions
import tripwireManagerRouter from './routes/tripwire-manager'; // ✅ Sales Manager Dashboard
import tripwireAdminRouter from './routes/tripwire/admin'; // ✅ Tripwire Admin Dashboard
import tripwireTranscriptionsOldRouter from './routes/tripwire/transcriptions'; // ✅ Tripwire Transcriptions (OLD - admin only)
import tripwireTranscriptionsRouter from './routes/tripwire/transcriptions'; // ✅ NEW Tripwire Transcriptions API
import tripwireProfileRouter from './routes/tripwire/profile'; // ✅ Tripwire Profile (Isolated DB)
import tripwireAnalyticsRouter from './routes/tripwire/analytics'; // ✅ Tripwire Analytics (Isolated DB)
import tripwireMassBroadcastRouter from './routes/tripwire/mass-broadcast'; // ✅ Mass Broadcast (EMAIL + SMS)
import tripwireMaterialsRouter from './routes/tripwire/materials'; // ✅ Tripwire Materials (Phase 2)
import tripwireCertificatesRouter from './routes/tripwire/certificates'; // ✅ Tripwire Certificates (Phase 2)
import tripwireAiRouter from './routes/tripwire/ai'; // ✅ Tripwire AI Curator (Phase 2)
import tripwireOnboardingRouter from './routes/tripwire/onboarding'; // ✅ Tripwire Onboarding System
import tripwireDebugRouter from './routes/tripwire/debug'; // 🚔 Tripwire Debug Panel (Operation Logging)
import tripwireSystemRouter from './routes/tripwire/system'; // 🚀 Tripwire System Health & Queue Management
import debugRouter from './routes/debug'; // 🔍 DEBUG: Environment variables check
import videoUploadRouter from './routes/videoUpload';
import streamUploadRouter from './routes/streamUpload'; // ✅ Bunny Stream (NEW)
import progressRouter from './routes/progress'; // ✅ Video Progress Tracking for AI Mentor
import videoRouter from './routes/video'; // ✅ Video Quality & Transcription API
import transcriptionsRouter from './routes/admin/transcriptions'; // ✅ Admin Transcriptions Management
import openaiStatusRouter from './routes/admin/openai-status'; // 🤖 OpenAI Rate Limiter & Pool Status
import aiLessonGeneratorRouter from './routes/ai-lesson-generator'; // ✅ AI Description & Tips Generator
import aiMentorRouter from './routes/ai-mentor'; // ✅ AI Mentor Scheduler & Analytics
import landingRouter from './routes/landing'; // ✅ Landing Page Leads (New DB + AmoCRM)
import landingSyncRouter from './routes/landing-sync-amocrm'; // ✅ Landing AmoCRM Sync (Admin)
import amocrmLocksAdminRouter from './routes/amocrm-locks-admin'; // 🔒 AmoCRM Locks Management (Admin)
import leadTrackingRouter from './routes/lead-tracking'; // ✅ Lead Tracking Dashboard (Email/SMS Status)
import unifiedTrackingRouter from './routes/unified-tracking'; // 🎯 Unified Tracking (Email + SMS + UTM)
import facebookConversionRouter from './routes/facebook-conversion'; // ✅ Facebook Conversion API
import aiAnalyticsRouter from './routes/ai-analytics'; // ✅ AI Analytics Reports
import apiHealthRouter from './routes/api-health'; // 🏥 API Health Check & Token Management
import configRouter from './routes/config'; // ⚙️ Runtime public config
import telegramConnectionRouter from './routes/telegram-connection'; // ✅ Telegram Connection Management
import webhooksRouter from './routes/webhooks'; // ✅ BunnyCDN & External Webhooks
import adminResetPasswordRouter from './routes/admin-reset-password'; // 🔑 TEMPORARY: Admin Password Reset
import testIaeReportRouter from './routes/test-iae-report'; // 🧪 TEST: IAE & Traffic Bot Reports
import shortLinksRouter from './routes/short-links'; // 🔗 URL Shortener for SMS Links
import trafficStatsRouter from './routes/traffic-stats'; // 📊 Traffic Command Stats (AmoCRM sales)
import trafficReportsRouter from './routes/traffic-reports'; // 📊 Traffic Reports (Суп history & ROI analysis)
import funnelAnalyticsRouter from './routes/funnel-analytics'; // 📊 Funnel Analytics (Cross-device tracking: ProfTest → Express → Purchase)
import amocrmSalesWebhookRouter from './routes/amocrm-sales-webhook'; // 🎉 AmoCRM Sales Webhook (real-time продажи)
import facebookAdsRouter from './routes/facebook-ads'; // 📊 Facebook Ads API Integration
import facebookAdsLoaderRouter from './routes/facebook-ads-loader-api.js'; // 📥 Facebook Ads Data Loader
import iaeAgentRouter from './routes/iae-agent.js'; // 🤖 IAE Agent (Intelligence Analytics Engine)
import tokenManagerRouter from './routes/token-manager.js'; // 🔑 Token Auto-Refresh Manager
import telegramTestRouter from './routes/telegram-test'; // 🤖 Telegram Bot Testing
import trafficAuthRouter, { authenticateToken } from './routes/traffic-auth.js'; // 🚀 Traffic Dashboard Auth
import trafficPlansRouter from './routes/traffic-plans.js'; // 📊 Traffic Weekly Plans
import trafficAdminRouter from './routes/traffic-admin.js'; // ⚙️ Traffic Admin Panel
import attributionManagerRouter from './routes/attribution-manager.js'; // 🎯 Attribution Manager (Safety Net)
import trafficSecurityRouter from './routes/traffic-security.js'; // 🔒 Traffic Security & Sessions Tracking
import utmAnalyticsRouter from './routes/utm-analytics.js'; // 📊 UTM Analytics (All Sales Sources)
import trafficOnboardingRouter from './routes/traffic-onboarding.js'; // 🎓 Traffic Onboarding Tour
import trafficConstructorRouter from './routes/traffic-team-constructor.js'; // 🏗️ Team Constructor (Admin)
import trafficDetailedAnalyticsRouter from './routes/traffic-detailed-analytics.js'; // 📊 Detailed Analytics (Campaigns/AdSets/Ads)
import trafficSettingsRouter from './routes/traffic-settings.js'; // ⚙️ Targetologist Settings
import trafficFacebookApiRouter from './routes/traffic-facebook-api.js'; // 📘 NEW: Facebook Ads API (with caching)
import targetologistAssignmentRouter from './routes/targetologist-assignment.js'; // 🎯 Targetologist Assignment (manual + auto)
import trafficFunnelApiRouter from './routes/traffic-funnel-api.js'; // 📊 Sales Funnel Visualization
import trafficDashboardRouter from './routes/traffic-dashboard.js'; // 📊 Traffic Dashboard API (Sales Aggregation + UTM Attribution)
import trafficForceSyncRouter from './routes/traffic-force-sync.js'; // 🔄 Force Sync API
import trafficAggregationRouter from './routes/traffic-aggregation.js'; // 📊 Metrics Aggregation (server-initiated)
import amocrmFunnelWebhookRouter from './routes/amocrm-funnel-webhook.js'; // 📚 AmoCRM → Express Course Webhook
import amocrmMainProductWebhookRouter from './routes/amocrm-main-product-webhook.js'; // 🏆 AmoCRM → Main Product Webhook
import amocrmChallenge3dWebhookRouter from './routes/amocrm-challenge3d-webhook.js'; // 📚 AmoCRM → Challenge 3D Sales Webhook
import amocrmChallenge3dLeadsWebhookRouter from './routes/amocrm-challenge3d-leads-webhook.js'; // 📋 AmoCRM → Challenge 3D ALL Leads Webhook
import amocrmChallenge3dPrepaymentWebhookRouter from './routes/amocrm-challenge3d-prepayment-webhook.js'; // 💳 AmoCRM → Challenge 3D Prepayments Webhook
import errorReportsRouter from './routes/error-reports.js'; // 🚨 Error Reports → Telegram
import trafficMainProductsRouter from './routes/traffic-main-products.js'; // 🚀 Main Products Sales (AmoCRM)
import referralRouter from './routes/referral.js'; // 🎯 Referral System (UTM tracking & commissions)
import apiIntegrationsRouter from './routes/api-integrations'; // 📊 API Integrations Status (Frontend)
import integrationsDiagnosticsRouter from './routes/integrations-diagnostics'; // 🔍 Integrations Diagnostics
import integrationMonitoringRouter from './routes/integration-monitoring'; // 📊 Integration Monitoring (Logs & Analytics)
import amoCRMWebhookRouter from './integrations/amocrm-webhook.js'; // 🔔 AmoCRM Referral Webhooks (DEPRECATED - use unified)
import unifiedAmoCRMWebhookRouter from './integrations/unified-amocrm-webhook.js'; // 🎯 UNIFIED AmoCRM Webhooks (Referral + Traffic)
import trafficWebhookRouter from './integrations/traffic-webhook.js'; // 🎯 DEDICATED Traffic Dashboard Webhook
import adminWebhookLogsRouter from './routes/admin-webhook-logs.js'; // 🔍 Admin Webhook Logs Viewer
import systemHealthRouter from './routes/system-health'; // 🚀 System Health & Queue Management
import monitoringRouter from './routes/monitoring'; // 🏥 Bot Health Monitoring System
import { errorHandler } from './middleware/errorHandler';
import operationLogger from './middleware/operationLogger'; // 🚔 Operation Logger Middleware
import { userActivityErrorLogger } from './middleware/userActivityMiddleware'; // 📝 User Activity Error Logger
import { startReminderScheduler } from './services/reminderScheduler';
import { startAIMentorScheduler } from './services/aiMentorScheduler';
import { startNotificationScheduler } from './services/notificationScheduler.js';
import { recoverPendingNotifications } from './services/scheduledNotifications.js';
import { startAIAnalyticsScheduler } from './services/aiAnalyticsScheduler';
import { startRecommendationsScheduler } from './services/recommendationsScheduler.js';

// ⭐ Import isolated services
import { initAmoCRMRedis, getAmoCRMRedisStatus, closeAmoCRMRedis } from './config/redis-amocrm';
import { initTelegramService, getTelegramStatus, closeTelegramService } from './config/telegram-service';

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ SENTRY: Initialize monitoring
initSentry(app);

// ✅ Rate Limiting (защита от DDoS и brute-force)
import {
  aiLimiter,
  apiLimiter,
  authLimiter,
  trafficFacebookLimiter
} from './middleware/rate-limit';

// ✅ Enhanced Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'https://onai.b-cdn.net'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://*.supabase.co', 'https://bunny.com'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      // ✅ FIXED: Разрешаем BunnyCDN для видео
      mediaSrc: [
        "'self'",
        'https://video.onai.academy',    // BunnyCDN main domain
        'https://*.cdn.bunny.com',       // BunnyCDN fallback
        'https://onai.b-cdn.net',        // BunnyCDN CDN
        'blob:',                         // WebRTC и media обработка
        'data:',                         // Embedded video
      ],
      // ✅ FIXED: Разрешаем iframes для видео (если используются)
      frameSrc: [
        "'self'",
        'https://video.onai.academy',
        'https://*.bunny.com',
      ],
      childSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// ✅ Additional security headers
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By'); // Не показываем что используем Express
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ✅ IMPROVED: Flexible CORS configuration по NODE_ENV
app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    
    // ✅ PRODUCTION: Строгий whitelist
    if (process.env.NODE_ENV === 'production') {
      const allowedProd = [
        'https://onai.academy',
        'https://expresscourse.onai.academy',
        'https://traffic.onai.academy',
        'https://referral.onai.academy', // 🎯 Referral System
      ];
      if (allowedProd.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`⚠️ CORS blocked in production: ${origin}`);
      return callback(null, false);
    }
    
    // ✅ STAGING: Vercel/Netlify preview deployments
    if (process.env.NODE_ENV === 'staging') {
      const stagingPatterns = [
        /https:\/\/(.*\.)?vercel\.app$/,
        /https:\/\/(.*\.)?netlify\.app$/,
        /https:\/\/(.*\.)?onai\.academy$/,
      ];
      if (stagingPatterns.some(pattern => pattern.test(origin))) {
        return callback(null, true);
      }
      console.warn(`⚠️ CORS blocked in staging: ${origin}`);
      return callback(null, false); // ✅ Don't throw Error
    }
    
    // ✅ DEVELOPMENT: Любой localhost на любом порту (максимально гибко)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // ✅ PRODUCTION: Whitelist разрешенных доменов
    const allowedOrigins = [
      'https://onai.academy',
      'https://www.onai.academy',
      'https://expresscourse.onai.academy',
      'https://traffic.onai.academy',
      'https://referral.onai.academy', // 🎯 Referral System
      'https://onai-integrator-login.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ CORS blocked: ${origin}`);
    callback(null, false); // ✅ Don't throw Error - just reject
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Retry-Attempt', // ✅ Для smart retries
    'baggage', // ✅ Sentry tracing header
    'sentry-trace', // ✅ Sentry tracing header
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Retry-After', // ✅ Для rate limiting
    'X-Total-Count',
  ],
  maxAge: 600
}));

// ✅ CORS Monitoring (логирует все rejections)
import corsMonitoringMiddleware from './monitoring/cors-monitor';
app.use(corsMonitoringMiddleware);

// 🔍 Correlation ID Middleware (must be before routes)
import { correlationIdMiddleware, requestLogger } from './middleware/correlationId.js';
app.use(correlationIdMiddleware);
app.use(requestLogger);

// 🚔 Operation Logger - "The Policeman" (tracks ALL operations)
app.use(operationLogger);
app.use(userActivityErrorLogger); // 📝 Log API errors to user_activity_logs

// ✅ Apply Rate Limiting to API routes
// ВАЖНО: Применяется ПЕРЕД регистрацией конкретных routes
app.use('/api/auth/', authLimiter);  // 50 req/15min для auth
app.use('/api/tripwire/', apiLimiter); // 2000 req/15min для tripwire (adaptive)
app.use('/api/admin/', apiLimiter);    // 2000 req/15min для admin (adaptive)
app.use('/api/traffic-facebook/', trafficFacebookLimiter); // FB cache API limiter (60/2min)
// AI endpoints получат строгий лимит в своих роутах (10 req/min)

// Увеличиваем timeout для массовой загрузки видео
app.use((req, res, next) => {
  // МАКСИМАЛЬНЫЙ timeout 60 минут для /api/stream/upload
  if (req.path.includes('/stream/upload')) {
    req.setTimeout(3600000); // 60 минут
    res.setTimeout(3600000);
  }
  next();
});

// Логирование запросов + Sentry performance tracking
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 🛡️ SENTRY: Track API performance
app.use(trackAPIPerformance);

// Health check endpoints (both /health and /api/health)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'onAI Backend API'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'onAI Backend API'
  });
});

// ════════════════════════════════════════════════════════════════════════
// 🚨 КРИТИЧНО: ROUTES ДО express.json() - чтобы избежать parse errors
// ════════════════════════════════════════════════════════════════════════
console.log('🔥 Registering special routes BEFORE express.json()');

// ✅ Health check route (первым, без body parsing)
import healthRouter from './routes/health.js';
app.use('/api/health', healthRouter); // 🏥 Health checks
app.use('/api', configRouter); // ⚙️ Runtime config (public)
app.use('/api/amocrm', amoCRMStatsRouter); // 📊 AmoCRM Rate Limiter Stats

// ✅ File upload routes (Multer)
app.use('/api/materials', materialsRouter);
app.use('/api/stream', streamUploadRouter); // ✅ Bunny Stream Upload (NEW!)

// ✅ Explicit OPTIONS handler для file upload routes
// ❌ app.options('/api/videos/upload/:lessonId', cors()); - УДАЛЕНО
app.options('/api/materials/upload', cors());
app.options('/api/stream/upload', cors());

// ════════════════════════════════════════════════════════════════════════
// 🔔 КРИТИЧНО: WEBHOOK ROUTES ПЕРЕД express.json()
// ════════════════════════════════════════════════════════════════════════
// amoCRM отправляет webhooks в application/x-www-form-urlencoded формате
// Если они пройдут через express.json(), будет ошибка парсинга → 400 → retry loop!
console.log('🔔 Registering webhook routes BEFORE express.json()');

// Добавляем кастомный body parser для webhooks (только для этих путей)
app.use('/api/amocrm/funnel-sale', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/funnel-sale', express.json({ limit: '10mb' })); // На всякий случай поддержка JSON
app.use('/api/amocrm/expresscourse', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/expresscourse', express.json({ limit: '10mb' })); // На всякий случай поддержка JSON
app.use('/api/amocrm/challenge3d-sale', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/challenge3d-sale', express.json({ limit: '10mb' })); // На всякий случай поддержка JSON
app.use('/api/amocrm/challenge3d-lead', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/challenge3d-lead', express.json({ limit: '10mb' })); // Challenge3D ALL Leads
app.use('/api/amocrm/challenge3d-prepayment', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/amocrm/challenge3d-prepayment', express.json({ limit: '10mb' })); // Challenge3D Prepayments
app.use('/webhook/amocrm', express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/webhook/amocrm', express.json({ limit: '10mb' }));

// Регистрируем webhook routes
app.use('/api/amocrm', amocrmFunnelWebhookRouter); // 📚 AmoCRM → Express Course Webhook (OLD - для обратной совместимости)
// NOTE: amocrmFunnelWebhookRouter already handles Express Course webhooks
app.use('/api/amocrm', amocrmChallenge3dWebhookRouter); // 📚 AmoCRM → Challenge 3D Sales Webhook
app.use('/api/amocrm', amocrmChallenge3dLeadsWebhookRouter); // 📋 AmoCRM → Challenge 3D ALL Leads Webhook
app.use('/api/amocrm', amocrmChallenge3dPrepaymentWebhookRouter); // 💳 AmoCRM → Challenge 3D Prepayments Webhook
app.use('/webhook/amocrm', amocrmMainProductWebhookRouter); // 🏆 AmoCRM → Main Product Webhook (490K KZT)
app.use('/webhook/amocrm', trafficWebhookRouter); // 🎯 Traffic Dashboard Webhook (legacy)
app.use('/webhook/amocrm', amoCRMWebhookRouter); // 🔔 Referral System Webhook

console.log('✅ Webhook routes registered (before express.json)');
console.log('   📚 Express Course (OLD): POST /api/amocrm/funnel-sale');
console.log('   📚 Express Course (NEW): POST /api/amocrm/expresscourse');
console.log('   📚 Challenge 3D (3х дневник): POST /api/amocrm/challenge3d-sale');
console.log('   🏆 Main Product: POST /webhook/amocrm/traffic');

// ════════════════════════════════════════════════════════════════════════
// ✅ express.json() ПОСЛЕ Webhook и Multer routes
// ✅ КРИТИЧНО: Conditional type filter - игнорирует multipart/form-data
// ════════════════════════════════════════════════════════════════════════
app.use(express.json({
  limit: '100mb', // МАКСИМАЛЬНЫЙ лимит для массовой загрузки
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    // Пропускаем multipart - оставляем для Multer
    return !contentType.includes('multipart/form-data');
  }
}));

app.use(express.urlencoded({ 
  limit: '100mb',
  extended: true 
}));

// Debug endpoint для проверки environment variables
app.get('/api/debug/env', (req, res) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const openaiKey = process.env.OPENAI_API_KEY || '';
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: serviceKey ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY_FIRST_10: serviceKey.substring(0, 10),
    SUPABASE_SERVICE_ROLE_KEY_LAST_10: serviceKey.substring(serviceKey.length - 10),
    SUPABASE_SERVICE_ROLE_KEY_LENGTH: serviceKey.length,
    OPENAI_API_KEY: openaiKey ? 'SET' : 'NOT SET',
    OPENAI_API_KEY_FIRST_20: openaiKey ? openaiKey.substring(0, 20) : 'EMPTY',
    OPENAI_API_KEY_LAST_10: openaiKey ? openaiKey.substring(openaiKey.length - 10) : 'EMPTY',
    OPENAI_API_KEY_LENGTH: openaiKey.length,
    FRONTEND_URL: process.env.FRONTEND_URL || 'NOT SET',
  });
});

// ============================================
// ✅ Остальные routes ПОСЛЕ express.json()
// ============================================
app.use('/api/users', usersRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/telegram-leads', telegramLeadsRouter); // 🤖 Telegram Leads Bot (активация группы кодом 2134)
app.use('/api/debug', debugRouter); // 🔍 DEBUG: Check env variables
app.use('/api/test', testIaeReportRouter); // 🧪 TEST: IAE & Traffic Bot Reports
app.use('/api/tripwire', tripwireRouter);
app.use('/api/tripwire', tripwireLessonsRouter); // Tripwire lessons endpoints
app.use('/api/tripwire', tripwireHomeworkRouter); // ✅ Homework submissions
app.use('/api/admin/tripwire', tripwireManagerRouter); // ✅ Sales Manager Dashboard (admin & sales roles only)
app.use('/api/tripwire/admin', tripwireAdminRouter); // ✅ Tripwire Admin Dashboard (admin only)
app.use('/api/tripwire/admin/mass-broadcast', tripwireMassBroadcastRouter); // ✅ Mass Broadcast (EMAIL + SMS)
app.use('/api/tripwire/admin/transcriptions', tripwireTranscriptionsOldRouter); // ✅ Tripwire Transcriptions (Admin)
app.use('/api/admin/integrations/diagnostics', integrationsDiagnosticsRouter); // 🔍 Integrations Diagnostics
app.use('/api/admin/integrations/monitoring', integrationMonitoringRouter); // 📊 Integration Monitoring (Logs & Analytics)
app.use('/api/tripwire/transcriptions', tripwireTranscriptionsRouter); // ✅ NEW: Public transcriptions API
app.use('/api/tripwire/users', tripwireProfileRouter); // ✅ Tripwire Profile (Isolated DB)
app.use('/api/tripwire/analytics', tripwireAnalyticsRouter); // ✅ Tripwire Analytics (ISOLATED DB)
app.use('/api/tripwire', tripwireMaterialsRouter); // ✅ Tripwire Materials (Phase 2)
app.use('/api/tripwire/certificates', tripwireCertificatesRouter); // ✅ Tripwire Certificates (Phase 2)
app.use('/api/tripwire/ai', tripwireAiRouter); // ✅ Tripwire AI Curator (Phase 2)
app.use('/api/tripwire/onboarding', tripwireOnboardingRouter); // ✅ Tripwire Onboarding System
app.use('/api/tripwire/debug', tripwireDebugRouter); // 🚔 Tripwire Debug Panel (Operation Logging)
app.use('/api/tripwire/system', tripwireSystemRouter); // 🚀 Tripwire System Health & Queue Management
app.use('/api/supabase', supabaseRouter);
app.use('/api/students', studentsRouter);
app.use('/api/tokens', tokensRouter);
app.use('/api/files', filesRouter);
app.use('/api/onboarding', onboardingRouter);
app.use('/api/admin/cleanup', fileCleanupRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/missions', missionsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/videos', videosRouter); // ✅ Videos API (для получения видео по lesson_id)
app.use('/api', videoUploadRouter); // 🐰 BunnyCDN Video Upload
app.use('/api/progress', progressRouter); // 📊 Video Progress Tracking
app.use('/api', videoRouter); // 🎬 Video Quality & Transcription API
app.use('/api/admin/transcriptions', transcriptionsRouter); // 🎙️ Admin Transcriptions Management
app.use('/api/admin/openai-status', openaiStatusRouter); // 🤖 OpenAI Rate Limiter & Pool Status
app.use('/api/ai', aiLessonGeneratorRouter); // 🤖 AI Lesson Description & Tips Generator
app.use('/api/ai-mentor', aiMentorRouter); // 🤖 AI Mentor Scheduler & Analytics
app.use('/api/ai-analytics', aiAnalyticsRouter); // 📊 AI Analytics Reports
app.use('/api/telegram-connection', telegramConnectionRouter); // 📱 Telegram Connection Management
app.use('/api/webhooks', webhooksRouter); // 🔗 BunnyCDN & External Webhooks (для video transcoding events)
app.use('/api/admin', adminResetPasswordRouter); // 🔑 TEMPORARY: Admin Password Reset
app.use('/api/landing', landingRouter); // 🎯 Landing Page Leads (New DB + AmoCRM)
app.use('/api/admin/landing', landingSyncRouter); // 🔄 Landing AmoCRM Sync (Admin Only)
app.use('/api/admin', amocrmLocksAdminRouter); // 🔒 AmoCRM Locks Management (Admin Only)
app.use('/api/lead-tracking', leadTrackingRouter); // 📊 Lead Tracking Dashboard (Email/SMS)
app.use('/api/unified-tracking', unifiedTrackingRouter); // 🎯 Unified Tracking (Email + SMS + UTM)
app.use('/api', facebookConversionRouter); // 📊 Facebook Conversion API
app.use('/api/short-links', shortLinksRouter); // 🔗 URL Shortener for SMS Links (создание и статистика)
app.use('/l', shortLinksRouter); // 🔗 Short link redirect handler (прямой редирект без /api)
app.use('/api/traffic', trafficStatsRouter); // 📊 Traffic Command Stats (AmoCRM sales - public)
app.use('/api/traffic/reports', trafficReportsRouter); // 📊 Traffic Reports History (сохранение и анализ окупаемости)
app.use('/api/traffic/funnel-analytics', funnelAnalyticsRouter); // 📊 Funnel Analytics (Cross-device tracking: ProfTest → Express → Purchase)
app.use('/api/amocrm', amocrmSalesWebhookRouter); // 🎉 AmoCRM Sales Webhook (real-time уведомления о продажах)
app.use('/api/iae-agent', iaeAgentRouter); // 🤖 IAE Agent (Intelligence Analytics Engine - система проверки аналитики)
app.use('/api/tokens', tokenManagerRouter); // 🔑 Token Auto-Refresh Manager (FB Ads + AmoCRM)
app.use('/api/facebook-ads', facebookAdsRouter); // 📊 Facebook Ads API Integration (ROAS, recommendations)
app.use('/api/facebook-ads-loader', facebookAdsLoaderRouter); // 📥 Facebook Ads Data Loader (manual trigger)
app.use('/api/telegram', telegramTestRouter); // 🤖 Telegram Bot Testing (мануальная отправка отчетов)
app.use('/api/traffic-auth', trafficAuthRouter); // 🚀 Traffic Dashboard Auth (JWT + bcrypt)
app.use('/api/traffic-plans', trafficPlansRouter); // 📊 Traffic Weekly Plans (Groq AI)
app.use('/api/traffic-admin', trafficAdminRouter); // ⚙️ Traffic Admin Panel (settings, users)
app.use('/api/attribution', attributionManagerRouter); // 🎯 Attribution Manager (Safety Net)
app.use('/api/traffic-security', trafficSecurityRouter); // 🔒 Traffic Security & Sessions Tracking
app.use('/api/utm-analytics', utmAnalyticsRouter); // 📊 UTM Analytics (All Sales Sources)
app.use('/api/traffic-onboarding', trafficOnboardingRouter); // 🎓 Traffic Onboarding Tour
app.use('/api/traffic-constructor', authenticateToken, trafficConstructorRouter); // 🏗️ Team Constructor (Admin)
app.use('/api/traffic-detailed-analytics', trafficDetailedAnalyticsRouter); // 📊 Detailed Analytics
app.use('/api/traffic-settings', trafficSettingsRouter); // ⚙️ Targetologist Settings
app.use('/api/traffic-facebook', trafficFacebookApiRouter); // 📘 NEW: Facebook Ads API (with caching)
app.use('/api/health', apiHealthRouter); // 🏥 API Health Check & Token Management
app.use('/api/targetologist-assignment', targetologistAssignmentRouter); // 🎯 Targetologist Assignment
app.use('/api/traffic-dashboard', trafficDashboardRouter); // 📊 Traffic Dashboard API (Sales Aggregation + UTM Attribution)
app.use('/api/traffic-dashboard', trafficFunnelApiRouter); // 📊 Sales Funnel Visualization
app.use('/api/traffic-dashboard', trafficForceSyncRouter); // 🔄 Force Sync & Status
app.use('/api/traffic-aggregation', trafficAggregationRouter); // 📊 Metrics Aggregation (server-initiated)
// ✅ MOVED BEFORE express.json(): app.use('/api/amocrm', amocrmFunnelWebhookRouter);
app.use('/api/error-reports', errorReportsRouter); // 🚨 Error Reports → Telegram @analisistonaitrafic_bot
app.use('/api/traffic', trafficMainProductsRouter); // 🚀 Main Products Sales (AmoCRM)
app.use('/api/referral', referralRouter); // 🎯 Referral System (UTM tracking & commissions)
app.use('/api/integrations', apiIntegrationsRouter); // 📊 API Integrations Status (Frontend)
app.use('/api/admin/system', systemHealthRouter); // 🚀 System Health & Queue Management (Admin only)
app.use('/api/admin/debug', debugRouter); // 🚔 Debug Panel (Operation Logging - Admin only)
app.use('/api/monitoring', monitoringRouter); // 🏥 Bot Health Monitoring System
// ✅ MOVED BEFORE express.json(): app.use('/webhook/amocrm', trafficWebhookRouter);
// ✅ MOVED BEFORE express.json(): app.use('/webhook/amocrm', amoCRMWebhookRouter);
app.use('/api/admin', adminWebhookLogsRouter); // 🔍 Admin Webhook Logs Viewer
app.use('/api/admin', integrationsDiagnosticsRouter); // 🔍 Integrations Diagnostics
// app.use('/webhook', unifiedAmoCRMWebhookRouter); // 🎯 UNIFIED (not used - separate endpoints instead)

// 404 обработка
import { notFoundHandler, errorHandler as enhancedErrorHandler } from './middleware/errorHandler';
app.use(notFoundHandler);

// 🛡️ SENTRY: Error handler (перед custom error handler)
app.use(sentryErrorHandler());

// Error handler (ДОЛЖЕН быть последний!)
app.use(enhancedErrorHandler);

// ═══════════════════════════════════════════════════════════════
// 🛡️ ОБРАБОТКА КРИТИЧЕСКИХ ОШИБОК - ПРЕДОТВРАЩЕНИЕ ПАДЕНИЯ
// ═══════════════════════════════════════════════════════════════

// Обработка необработанных исключений
process.on('uncaughtException', (error: Error) => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА: uncaughtException');
  console.error('💥 Тип:', error.constructor.name);
  console.error('💥 Сообщение:', error.message);
  console.error('💥 Стек:', error.stack);
  console.error('💥 Backend продолжит работу, но ошибка была залогирована');
  // НЕ выходим из процесса - продолжаем работу
});

// Обработка необработанных Promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('💥 КРИТИЧЕСКАЯ ОШИБКА: unhandledRejection');
  console.error('💥 Причина:', reason);
  console.error('💥 Promise:', promise);
  if (reason instanceof Error) {
    console.error('💥 Сообщение:', reason.message);
    console.error('💥 Стек:', reason.stack);
  }
  console.error('💥 Backend продолжит работу, но ошибка была залогирована');
  // НЕ выходим из процесса - продолжаем работу
});

// Обработка SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершение работы...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

// ⭐ CRITICAL: Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`🛑 Received ${signal}, shutting down gracefully...`);
  try {
    // Close Tripwire Worker
    try {
      const { default: tripwireWorker } = await import('./workers/tripwire-worker');
      await tripwireWorker.close();
      console.log('✅ Tripwire Worker closed');
    } catch (err) {
      console.warn('⚠️ Tripwire Worker not running or already closed');
    }
    
    await closeTelegramService();
    await closeAmoCRMRedis();
    console.log('✅ All services closed');
  } catch (err: any) {
    console.error('❌ Shutdown error:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ================================================
// ⭐ START SERVER (NON-BLOCKING!)
// ================================================
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║ 🚀 Backend API запущен на http://localhost:${PORT} ║
║                                                    ║
║ Server ready for HTTP requests                     ║
║ Initializing services in background...             ║
╚════════════════════════════════════════════════════╝
  `);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('🛡️ Обработчики критических ошибок активированы');
  
  // ⭐ CRITICAL: DON'T AWAIT HERE!
  // These run in BACKGROUND without blocking HTTP
  (async () => {
    try {
      console.log('📦 Initializing services in background...');

      // 1. Initialize AmoCRM Redis (for BullMQ)
      await initAmoCRMRedis();

      // 1.1 Initialize Redis for Facebook API caching (optional - uses memory fallback if unavailable)
      try {
        const { initRedis } = await import('./config/redis.js');
        await initRedis();
        console.log('✅ Redis cache initialized (Facebook API caching)');
      } catch (error: any) {
        console.warn('⚠️ Redis cache initialization failed, using memory fallback:', error.message);
      }

      // 2. Initialize Telegram (independent from Redis)
      // ⚠️ ВРЕМЕННО ОТКЛЮЧЕНО ДЛЯ ОТЛАДКИ 409
      // await initTelegramService();

      // 2.1 🤖 Initialize Traffic Telegram Bot
      try {
        const { initTelegramBot } = await import('./services/telegramBot.js');
        const { initScheduler } = await import('./services/telegramScheduler.js');
        
        initTelegramBot();
        initScheduler();
        
        console.log('✅ Traffic Telegram Bot и расписание инициализированы');
      } catch (error) {
        console.error('❌ Ошибка инициализации Traffic Telegram Bot:', error);
      }

      // 3. Recover notifications (background task)
      await recoverPendingNotifications();

      // 4. Start schedulers (background)
      startNotificationScheduler();
      startReminderScheduler();
      startAIMentorScheduler();
      startAIAnalyticsScheduler();
      startRecommendationsScheduler(); // 🤖 AI Recommendations (daily at 00:10)

      // 🚀 5. Start Tripwire Worker (Queue Processing)
      if (process.env.START_WORKER !== 'false') {
        try {
          console.log('🔄 Starting Tripwire Queue Worker...');
          await import('./workers/tripwire-worker');
          console.log('✅ Tripwire Queue Worker started');
        } catch (error) {
          console.error('❌ Failed to start Tripwire Worker:', error);
          // Non-critical - system will fallback to sync mode
        }
      } else {
        console.log('⚠️ Tripwire Worker disabled (START_WORKER=false)');
      }

      // 7. Start Token Auto-Refresh (Facebook + AmoCRM)
      try {
        const { startTokenAutoRefresh } = await import('./services/tokenAutoRefresh.js');
        await startTokenAutoRefresh(); // Every 2 hours check
        console.log('✅ Token auto-refresh (FB + AmoCRM) initialized');
      } catch (error) {
        console.error('❌ Ошибка инициализации Token auto-refresh:', error);
      }

            // 7.5. Start Facebook Ads Loader Cron (загрузка из FB API → Traffic DB)
            if (process.env.NODE_ENV === 'production') {
              try {
                const { facebookAdsLoaderJob } = await import('./cron/facebook-ads-loader.js');
                facebookAdsLoaderJob.start();
                console.log('✅ Facebook Ads loader cron started (every 6h: FB API → Traffic DB)');
              } catch (error: any) {
                console.error('❌ Failed to start Facebook Ads loader:', error.message);
              }
            }
            
            // 7.6. Start Facebook Ads Sync Cron (синхронизация Traffic DB → Landing DB)
            if (process.env.NODE_ENV === 'production') {
              try {
                const { facebookAdsSyncJob } = await import('./cron/facebook-ads-sync.js');
                facebookAdsSyncJob.start();
                console.log('✅ Facebook Ads sync cron started (hourly sync Traffic DB → Landing DB)');
              } catch (error: any) {
                console.error('❌ Failed to start Facebook Ads sync:', error.message);
              }
            }

      // 8. Start IAE Agent schedulers and bot
      try {
        const { initIAEBot } = await import('./services/iaeAgentBot.js');
        const { startIAESchedulers } = await import('./services/iaeAgentScheduler.js');

        initIAEBot(); // Initialize bot handlers
        startIAESchedulers(); // Start cron jobs

        console.log('✅ IAE Agent bot and schedulers initialized');
      } catch (error) {
        console.error('❌ Ошибка инициализации IAE Agent:', error);
      }

      // 9. Start Traffic Dashboard schedulers (Weekly Plans)
      try {
        const { startTrafficSchedulers } = await import('./jobs/weeklyPlanGenerator.js');
        startTrafficSchedulers(); // Weekly plan generation (Mondays 00:01 Almaty)
        console.log('✅ Traffic Dashboard schedulers initialized');
      } catch (error) {
        console.error('❌ Ошибка инициализации Traffic schedulers:', error);
      }

      // 10. Start Currency Exchange & Traffic Reports (NEW)
      try {
        const { startExchangeRateFetcher } = await import('./jobs/dailyExchangeRateFetcher');
        const { startDailyTrafficReport } = await import('./jobs/dailyTrafficReport');
        const { startWeeklyTrafficReport } = await import('./jobs/weeklyTrafficReport');
        const { startDailyDebugReportJob } = await import('./jobs/dailyDebugReport');
        const { startDailyTrafficStatsSync } = await import('./jobs/dailyTrafficStatsSync');

        startExchangeRateFetcher();     // 08:00 Almaty (02:00 UTC)
        startDailyTrafficReport();      // 08:05 Almaty (02:05 UTC)
        startWeeklyTrafficReport();     // Monday 08:10 Almaty (02:10 UTC)
        startDailyDebugReportJob();     // 23:00 Almaty (17:00 UTC) - Daily Debug Report via GROQ
        startDailyTrafficStatsSync();   // 08:15 Almaty (02:15 UTC)

        console.log('✅ Currency & Traffic Reports schedulers initialized');
        console.log('   - Exchange Rate Fetcher: 08:00 Almaty (02:00 UTC)');
        console.log('   - Daily Traffic Report: 08:05 Almaty (02:05 UTC)');
        console.log('   - Weekly Traffic Report: Monday 08:10 Almaty (02:10 UTC)');
        console.log('   - Daily Debug Report: 23:00 Almaty (17:00 UTC) - GROQ AI Summary');
        console.log('   - Daily Traffic Stats Sync: 08:15 Almaty (02:15 UTC)');
      } catch (error) {
        console.error('❌ Failed to initialize Currency/Traffic Reports:', error);
      }

      // 11. Start Bot Health Monitor (NEW)
      try {
        const { startHealthMonitorScheduler } = await import('./services/botHealthMonitor.js');
        startHealthMonitorScheduler(); // Hourly health checks
        console.log('✅ Bot Health Monitor initialized (hourly checks)');
      } catch (error) {
        console.error('❌ Failed to initialize Bot Health Monitor:', error);
      }

      // 12. Start Metrics Aggregation Scheduler (Traffic Dashboard)
      if (process.env.NODE_ENV === 'production') {
        try {
          const { startAggregationScheduler } = await import('./services/metricsAggregationService.js');
          startAggregationScheduler(); // Every 10 minutes
          console.log('✅ Metrics Aggregation Scheduler initialized (every 10 min)');
        } catch (error) {
          console.error('❌ Failed to initialize Metrics Aggregation:', error);
        }
      }

      console.log('✅ All background services initialized');

    } catch (err: any) {
      console.error('❌ Service initialization error:', err.message);
      // Don't crash - continue running
    }
  })(); // ⭐ IIFE - runs in background, doesn't block
});


// 🛡️ UNCAUGHT EXCEPTION - НЕ ДОЛЖНО КРАШИТЬ СЕРВЕР!
process.on('uncaughtException', (error: Error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('Stack:', error.stack);
  
  // Логируем в Sentry если доступен
  try {
    // Sentry.captureException(error);
  } catch (e) {
    console.error('Failed to report to Sentry:', e);
  }
  
  // ⚠️ НЕ КРАШИМ! Продолжаем работу
  console.log('⚠️ Сервер продолжает работу несмотря на ошибку');
});

// 🛡️ UNHANDLED REJECTION - НЕ ДОЛЖНО КРАШИТЬ СЕРВЕР!
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('🚨 UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
  
  // Логируем в Sentry
  try {
    // Sentry.captureException(reason);
  } catch (e) {
    console.error('Failed to report to Sentry:', e);
  }
  
  // ⚠️ НЕ КРАШИМ! Продолжаем работу
  console.log('⚠️ Сервер продолжает работу несмотря на rejected promise');
});

// 🛡️ PM2 READY SIGNAL
if (process.send) {
  process.send('ready');
  console.log('✅ PM2 ready signal отправлен');
}

// ═══════════════════════════════════════════════════════════════
// 🔄 CACHE CLEANUP (Funnel metrics every 5 minutes)
// ═══════════════════════════════════════════════════════════════
import { clearCache } from './services/cache-service.js';

setInterval(() => {
  clearCache('funnel:');
  console.log('🔄 Funnel cache cleared');
}, 5 * 60 * 1000); // каждые 5 минут

console.log('✅ Cache cleanup scheduled (every 5 minutes)');

// ═══════════════════════════════════════════════════════════════
// 📊 TRAFFIC DASHBOARD SYNC JOBS
// ═══════════════════════════════════════════════════════════════
import { startAllTrafficSyncJobs } from './cron/traffic-sync-jobs.js';

try {
  startAllTrafficSyncJobs();
  console.log('✅ Traffic Dashboard sync jobs started');
  console.log('   - Facebook Ads Sync: Every hour at :05');
  console.log('   - Metrics Aggregation: Every 10 minutes');
} catch (error: any) {
  console.error('❌ Failed to start Traffic sync jobs:', error.message);
  console.error('⚠️  Traffic Dashboard auto-sync disabled. Use manual sync instead.');
}

export default app;
