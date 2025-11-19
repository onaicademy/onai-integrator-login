import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Явно загружаем .env файл из директории backend
// __dirname = backend/src, поэтому идем на уровень выше к backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

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
import videosRouter from './routes/videos';
import materialsRouter from './routes/materials';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware безопасности
app.use(helmet());

// CORS конфигурация
// Поддержка и localhost (для разработки) и production (https://onai.academy)
const allowedOrigins = [
  'https://onai.academy',
  'http://localhost:8080',
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean); // Убираем undefined значения

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Проверяем разрешённые origins
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // В production используем https://onai.academy, в dev - localhost
      const defaultOrigin = process.env.NODE_ENV === 'production' 
        ? 'https://onai.academy' 
        : 'http://localhost:8080';
      callback(null, defaultOrigin);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// ✅ КРИТИЧНО: MULTER ROUTES ДО express.json()
// ============================================
console.log('🔥 Registering Multer routes BEFORE express.json()');
app.use('/api/videos', videosRouter);
app.use('/api/materials', materialsRouter);

// ✅ Explicit OPTIONS handler для file upload routes
app.options('/api/videos/upload/:lessonId', cors());
app.options('/api/materials/upload', cors());

// ============================================
// ✅ express.json() ПОСЛЕ Multer routes
// ✅ КРИТИЧНО: Conditional type filter - игнорирует multipart/form-data
// ============================================
app.use(express.json({
  type: (req) => {
    const contentType = req.headers['content-type'] || '';
    // Пропускаем multipart - оставляем для Multer
    return !contentType.includes('multipart/form-data');
  }
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

// 404 обработка
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

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
const server = app.listen(PORT, () => {
  console.log(`🚀 Backend API запущен на http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log('🛡️ Обработчики критических ошибок активированы');
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

