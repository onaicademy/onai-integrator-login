# 🛡️ CRASH PROTECTION INTEGRATION PATCH

## Что нужно добавить в `server-minimal.ts`:

### 1️⃣ Imports (в начале файла, после dotenv)

```typescript
import { crashProtection } from './utils/crashProtection';
import debugRouter from './routes/debug';
import { errorTracking, ErrorSeverity, ErrorCategory } from './services/errorTrackingService';
```

### 2️⃣ После инициализации CORS и helmet:

```typescript
// ================================================
// 🛡️ CRASH PROTECTION & ERROR TRACKING
// ================================================
crashProtection.onShutdown(async () => {
  console.log('🛑 Closing Redis connection...');
  try {
    const { redis } = await import('./config/redis');
    await redis.quit();
    console.log('✅ Redis closed');
  } catch (error) {
    console.error('❌ Error closing Redis:', error);
  }
});

console.log('✅ Crash protection enabled');
```

### 3️⃣ Обернуть роутеры в error tracking:

```typescript
// Landing routes (with crash protection)
app.use(
  '/api/landing',
  crashProtection.wrapMiddleware(async (req, res, next) => {
    const landingRouter = (await import('./routes/landing')).default;
    landingRouter(req, res, next);
  })
);

// Bulk sync routes (with crash protection)
app.use(
  '/api/bulk-sync',
  crashProtection.wrapMiddleware(async (req, res, next) => {
    const bulkSyncRouter = (await import('./routes/bulk-sync')).default;
    bulkSyncRouter(req, res, next);
  })
);

// 🆕 Debug dashboard routes
app.use('/api/debug', debugRouter);
```

### 4️⃣ Улучшить health check endpoint:

```typescript
app.get('/api/health', async (req, res) => {
  try {
    const health = crashProtection.getHealthStatus();
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      queue: queueInitialized ? 'initialized' : 'not_initialized',
      redis: health.isShuttingDown ? 'shutting_down' : 'connected',
      uptime: health.uptime,
      activeRequests: health.activeRequests,
      memory: {
        used: Math.round(health.memory.heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(health.memory.heapTotal / 1024 / 1024) + ' MB',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});
```

### 5️⃣ Обернуть server.listen:

```typescript
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🐛 Debug dashboard: http://localhost:${PORT}/api/debug/health`);
});

// Handle server errors
server.on('error', async (error: any) => {
  console.error('🔥 Server error:', error);
  
  await errorTracking.trackError(
    error,
    ErrorSeverity.CRITICAL,
    ErrorCategory.API,
    {
      metadata: {
        port: PORT,
        type: 'server_error',
      },
    }
  );
  
  process.exit(1);
});
```

## Готово! Теперь применить этот патч на production.

