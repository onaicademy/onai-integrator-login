// ✅ ВАЖНО: Загружаем env переменные ПЕРВЫМ делом!
import './load-env.js';

// ✅ Validate environment variables IMMEDIATELY after loading
import { validateEnvironment } from './config/env.js';
validateEnvironment();

// 🛡️ SENTRY: Initialize BEFORE creating Express app
import { initSentry, sentryErrorHandler, trackAPIPerformance } from './config/sentry.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as path from 'path';

// ✅ CommonJS compatibility: __dirname is available in CommonJS
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

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
console.log('   - First 20 chars:', openaiKey?.substring(0, 20) || 'EMPTY');
console.log('   - Last 10 chars:', openaiKey?.substring(openaiKey.length - 10) || 'EMPTY');
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
console.log('   - First 10 chars:', resendKey?.substring(0, 10) || 'EMPTY');
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
import tripwireManagerRouter from './routes/tripwire-manager'; // ✅ Sales Manager Dashboard
import tripwireAdminRouter from './routes/tripwire/admin'; // ✅ Tripwire Admin Dashboard
import tripwireTranscriptionsOldRouter from './routes/tripwire/transcriptions'; // ✅ Tripwire Transcriptions (OLD - admin only)
import tripwireTranscriptionsRouter from './routes/tripwire/transcriptions'; // ✅ NEW Tripwire Transcriptions API
import tripwireProfileRouter from './routes/tripwire/profile'; // ✅ Tripwire Profile (Isolated DB)
import tripwireAnalyticsRouter from './routes/tripwire/analytics'; // ✅ Tripwire Analytics (Isolated DB)
import tripwireMaterialsRouter from './routes/tripwire/materials'; // ✅ Tripwire Materials (Phase 2)
import tripwireCertificatesRouter from './routes/tripwire/certificates'; // ✅ Tripwire Certificates (Phase 2)
import tripwireAiRouter from './routes/tripwire/ai'; // ✅ Tripwire AI Curator (Phase 2)
import debugRouter from './routes/debug'; // 🔍 DEBUG: Environment variables check
import videoUploadRouter from './routes/videoUpload';
import streamUploadRouter from './routes/streamUpload'; // ✅ Bunny Stream (NEW)
import progressRouter from './routes/progress'; // ✅ Video Progress Tracking for AI Mentor
import videoRouter from './routes/video'; // ✅ Video Quality & Transcription API
import transcriptionsRouter from './routes/admin/transcriptions'; // ✅ Admin Transcriptions Management
import aiLessonGeneratorRouter from './routes/ai-lesson-generator'; // ✅ AI Description & Tips Generator
import aiMentorRouter from './routes/ai-mentor'; // ✅ AI Mentor Scheduler & Analytics
import landingRouter from './routes/landing'; // ✅ Landing Page Leads (New DB + AmoCRM)
import leadTrackingRouter from './routes/lead-tracking'; // ✅ Lead Tracking Dashboard (Email/SMS Status)
import unifiedTrackingRouter from './routes/unified-tracking'; // 🎯 Unified Tracking (Email + SMS + UTM)
import facebookConversionRouter from './routes/facebook-conversion'; // ✅ Facebook Conversion API
import aiAnalyticsRouter from './routes/ai-analytics'; // ✅ AI Analytics Reports
import telegramConnectionRouter from './routes/telegram-connection'; // ✅ Telegram Connection Management
import webhooksRouter from './routes/webhooks'; // ✅ BunnyCDN & External Webhooks
import adminResetPasswordRouter from './routes/admin-reset-password'; // 🔑 TEMPORARY: Admin Password Reset
import shortLinksRouter from './routes/short-links'; // 🔗 URL Shortener for SMS Links
import { errorHandler } from './middleware/errorHandler';
import { startReminderScheduler } from './services/reminderScheduler';
import { startAIMentorScheduler } from './services/aiMentorScheduler';
import { startNotificationScheduler } from './services/notificationScheduler.js';
import { recoverPendingNotifications } from './services/scheduledNotifications.js';
import { startAIAnalyticsScheduler } from './services/aiAnalyticsScheduler';

const app = express();
const PORT = process.env.PORT || 3000;

// 🛡️ SENTRY: Initialize monitoring
initSentry(app);

// ✅ Rate Limiting (защита от DDoS и brute-force)
import { 
  aiLimiter, 
  apiLimiter, 
  authLimiter 
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
        'https://www.onai.academy',
        'https://tripwire.onai.academy',
      ];
      if (allowedProd.includes(origin)) {
        console.log(`✅ CORS allowed in production: ${origin}`);
        return callback(null, true);
      }
      console.warn(`⚠️ CORS blocked in production: ${origin}`);
      return callback(new Error('CORS not allowed'), false);
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
      return callback(new Error('CORS not allowed'), false);
    }
    
    // ✅ DEVELOPMENT: Любой localhost на любом порту (максимально гибко)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // ✅ PRODUCTION: Whitelist разрешенных доменов
    const allowedOrigins = [
      'https://onai.academy',
      'https://www.onai.academy',
      'https://onai-integrator-login.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`⚠️ CORS blocked: ${origin}`);
    callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'X-Retry-Attempt', // ✅ Для smart retries
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

// ✅ Apply Rate Limiting to API routes
// ВАЖНО: Применяется ПЕРЕД регистрацией конкретных routes
app.use('/api/auth/', authLimiter);  // 50 req/15min для auth
app.use('/api/tripwire/', apiLimiter); // 100 req/15min для tripwire
app.use('/api/admin/', apiLimiter);    // 100 req/15min для admin
// AI endpoints получат строгий лимит в своих роутах (10 req/min)

// Увеличиваем timeout для массовой загрузки видео
app.use((req, res, next) => {
  // МАКСИМАЛЬНЫЙ timeout 2 ЧАСА для /api/stream/upload (для видео до 6GB)
  if (req.path.includes('/stream/upload')) {
    req.setTimeout(7200000); // 120 минут = 2 часа
    res.setTimeout(7200000);
    console.log('⏱️ Timeout set to 2 hours for video upload');
  }
  next;
});

// Логирование запросов + Sentry performance tracking
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// 🛡️ SENTRY: Track API performance
app.use(trackAPIPerformance);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ✅ КРИТИЧНО: MULTER ROUTES ДО express.json()
// ============================================
console.log('🔥 Registering Multer routes BEFORE express.json()');
app.use('/api/materials', materialsRouter);
app.use('/api/stream', streamUploadRouter); // ✅ Bunny Stream Upload (NEW!)

// ✅ Explicit OPTIONS handler для file upload routes
// ❌ app.options('/api/videos/upload/:lessonId', cors()); - УДАЛЕНО
app.options('/api/materials/upload', cors());
app.options('/api/stream/upload', cors());

// ============================================
// ✅ express.json() ПОСЛЕ Multer routes
// ✅ КРИТИЧНО: Conditional type filter - игнорирует multipart/form-data
// ============================================
app.use(express.json({
  limit: '8gb', // ✅ УВЕЛИЧЕНО: для видео до 6GB
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    // Пропускаем multipart - оставляем для Multer
    return !contentType.includes('multipart/form-data');
  }
}));

app.use(express.urlencoded({ 
  limit: '8gb', // ✅ УВЕЛИЧЕНО: для видео до 6GB
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
app.use('/api/debug', debugRouter); // 🔍 DEBUG: Check env variables
app.use('/api/tripwire', tripwireRouter);
app.use('/api/tripwire', tripwireLessonsRouter); // Tripwire lessons endpoints
app.use('/api/admin/tripwire', tripwireManagerRouter); // ✅ Sales Manager Dashboard (admin & sales roles only)
app.use('/api/tripwire/admin', tripwireAdminRouter); // ✅ Tripwire Admin Dashboard (admin only)
app.use('/api/tripwire/admin/transcriptions', tripwireTranscriptionsOldRouter); // ✅ Tripwire Transcriptions (Admin)
app.use('/api/tripwire/transcriptions', tripwireTranscriptionsRouter); // ✅ NEW: Public transcriptions API
app.use('/api/tripwire/users', tripwireProfileRouter); // ✅ Tripwire Profile (Isolated DB)
app.use('/api/tripwire/analytics', tripwireAnalyticsRouter); // ✅ Tripwire Analytics (ISOLATED DB)
app.use('/api/tripwire', tripwireMaterialsRouter); // ✅ Tripwire Materials (Phase 2)
app.use('/api/tripwire/certificates', tripwireCertificatesRouter); // ✅ Tripwire Certificates (Phase 2)
app.use('/api/tripwire/ai', tripwireAiRouter); // ✅ Tripwire AI Curator (Phase 2)
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
app.use('/api/ai', aiLessonGeneratorRouter); // 🤖 AI Lesson Description & Tips Generator
app.use('/api/ai-mentor', aiMentorRouter); // 🤖 AI Mentor Scheduler & Analytics
app.use('/api/ai-analytics', aiAnalyticsRouter); // 📊 AI Analytics Reports
app.use('/api/telegram-connection', telegramConnectionRouter); // 📱 Telegram Connection Management
app.use('/api/webhooks', webhooksRouter); // 🔗 BunnyCDN & External Webhooks (для video transcoding events)
app.use('/api/admin', adminResetPasswordRouter); // 🔑 TEMPORARY: Admin Password Reset
app.use('/api/landing', landingRouter); // 🎯 Landing Page Leads (New DB + AmoCRM)
app.use('/api/lead-tracking', leadTrackingRouter); // 📊 Lead Tracking Dashboard (Email/SMS)
app.use('/api/unified-tracking', unifiedTrackingRouter); // 🎯 Unified Tracking (Email + SMS + UTM)
app.use('/api', facebookConversionRouter); // 📊 Facebook Conversion API
app.use('/api/short-links', shortLinksRouter); // 🔗 URL Shortener for SMS Links (создание и статистика)
app.use('/l', shortLinksRouter); // 🔗 Short link redirect handler (прямой редирект без /api)

// 404 обработка
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 🛡️ SENTRY: Error handler (перед custom error handler)
app.use(sentryErrorHandler());

// Error handler (ДОЛЖЕН быть последний!)
app.use(errorHandler);

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

// Запуск сервера
const server = app.listen(PORT, async () => {
  console.log(`🚀 Backend API запущен на http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('🛡️ Обработчики критических ошибок активированы');
  
  // 🔥 RECOVER PENDING SMS/EMAIL NOTIFICATIONS FROM DB
  await recoverPendingNotifications();
  
  // Start notification scheduler (проверяет просроченные notifications каждую минуту)
  startNotificationScheduler();
  
  // Start reminder scheduler
  startReminderScheduler();
  
  // Start AI Mentor scheduler (ежедневные отчеты в 9:00)
  startAIMentorScheduler();
  
  // Start AI Analytics scheduler (ежедневные отчеты в 9:00)
  startAIAnalyticsScheduler();
});

// Graceful shutdown для сервера (SIGTERM)
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, закрытие сервера...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

export default app;

