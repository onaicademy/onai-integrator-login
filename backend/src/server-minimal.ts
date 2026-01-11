// ✅ EMERGENCY MINIMAL SERVER - для диагностики утечки памяти
import './load-env.js';
import { validateEnvironment } from './config/env.js';
validateEnvironment();
import { validateSupabaseEnv } from './config/validate-env.js';
validateSupabaseEnv();

console.log('✅ [MINIMAL] Env validated');

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares - CORS for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://onai.academy',
  'https://www.onai.academy',
  'https://traffic.onai.academy',
  'https://expresscourse.onai.academy'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Allow for now during migration
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));

// ✅ STEP 1: Add Critical Admin Routes
console.log('📦 [STEP 1] Importing admin routes...');
import usersRouter from './routes/users';
import studentsRouter from './routes/students';
import transcriptionsRouter from './routes/admin/transcriptions';
import openaiStatusRouter from './routes/admin/openai-status';
console.log('✅ [STEP 1] Admin routes imported');

// ✅ STEP 2: Add Course/Module/Lesson routes for Integrator 3.0
console.log('📦 [STEP 2] Importing course routes...');
import coursesRouter from './routes/courses';
import modulesRouter from './routes/modules';
import lessonsRouter from './routes/lessons';
import progressRouter from './routes/progress';
console.log('✅ [STEP 2] Course routes imported');

// ✅ STEP 3: Add Missing Admin Routes from logs
console.log('📦 [STEP 3] Importing missing admin routes...');
import tokensRouter from './routes/tokens';
import configRouter from './routes/config';
import adminTripwireStudentsRouter from './routes/admin-tripwire-students';
import debugRouter from './routes/debug';
import systemHealthRouter from './routes/system-health';
import videoRouter from './routes/video';
console.log('✅ [STEP 3] Missing admin routes imported');

// CRITICAL ROUTES
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check received');
  res.json({
    status: 'ok',
    message: 'Minimal backend running',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage()
  });
});

app.get('/api/amocrm/stats', (req, res) => {
  console.log('📊 AmoCRM stats requested');
  res.json({
    status: 'idle',
    queueLength: 0,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    requestsThisSecond: 0,
    maxRequestsPerSecond: 5,
    eta: 0
  });
});

// Admin routes
app.use('/api/users', usersRouter);
app.use('/api/students', studentsRouter);
app.use('/api/admin/transcriptions', transcriptionsRouter);
app.use('/api/admin/openai-status', openaiStatusRouter);
console.log('✅ Admin routes registered');

// Course/Module/Lesson routes
app.use('/api/courses', coursesRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/lessons', lessonsRouter);
app.use('/api/progress', progressRouter);
console.log('✅ Course routes registered');

// Missing admin routes
app.use('/api/tokens', tokensRouter);
app.use('/api/config', configRouter);
app.use('/api/admin/tripwire-students', adminTripwireStudentsRouter);
app.use('/api/debug', debugRouter);
app.use('/api/admin/system', systemHealthRouter);
app.use('/api/video', videoRouter);
console.log('✅ Missing admin routes registered');

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║ 🚨 MINIMAL Backend на http://localhost:${PORT}      ║
║                                                    ║
║ Server ready for HTTP requests                     ║
╚════════════════════════════════════════════════════╝
  `);
  console.log('✅ [MINIMAL] HTTP Server started successfully!');
  console.log('Memory usage:', process.memoryUsage());
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 [MINIMAL] SIGTERM received, shutting down...');
  server.close(() => {
    console.log('✅ [MINIMAL] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 [MINIMAL] SIGINT received, shutting down...');
  server.close(() => {
    console.log('✅ [MINIMAL] Server closed');
    process.exit(0);
  });
});
