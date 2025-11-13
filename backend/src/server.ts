import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';

import usersRouter from './routes/users';
import diagnosticsRouter from './routes/diagnostics';
import openaiRouter from './routes/openai';
import telegramRouter from './routes/telegram';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware безопасности
app.use(helmet());

// CORS конфигурация
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Body parser
app.use(express.json());

// Логирование запросов (опционально)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/openai', openaiRouter);
app.use('/api/telegram', telegramRouter);

// 404 обработка
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (ДОЛЖЕН быть последний!)
app.use(errorHandler);

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Backend API запущен на http://localhost:${PORT}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app;

