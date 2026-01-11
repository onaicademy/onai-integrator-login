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

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// ✅ STEP 1: Add Critical Admin Routes
console.log('📦 [STEP 1] Importing admin routes...');
import usersRouter from './routes/users';
import studentsRouter from './routes/students';
import transcriptionsRouter from './routes/admin/transcriptions';
import openaiStatusRouter from './routes/admin/openai-status';
console.log('✅ [STEP 1] Admin routes imported successfully');

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
