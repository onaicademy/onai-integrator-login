// @ts-nocheck
/**
 * Crash Protection & Recovery System
 * Защита от unexpected crashes и автоматический recovery
 */
import { errorTracking, ErrorSeverity, ErrorCategory } from '../services/errorTrackingService';
import pino from 'pino';

const logger = pino();

export class CrashProtection {
  private isShuttingDown = false;
  private activeRequests = 0;
  private shutdownCallbacks: Array<() => Promise<void>> = [];

  constructor() {
    this.setupProcessHandlers();
  }

  /**
   * Setup global process error handlers
   */
  private setupProcessHandlers(): void {
    // Uncaught exceptions
    process.on('uncaughtException', async (error: Error) => {
      logger.fatal('🔥 UNCAUGHT EXCEPTION:', error);
      
      await errorTracking.trackError(
        error,
        ErrorSeverity.CRITICAL,
        ErrorCategory.UNKNOWN,
        {
          metadata: {
            type: 'uncaughtException',
            stack: error.stack,
          },
        }
      );

      // Give time to log, then exit
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', async (reason: any, promise: Promise<any>) => {
      logger.fatal('🔥 UNHANDLED PROMISE REJECTION:', reason);
      
      await errorTracking.trackError(
        reason instanceof Error ? reason : new Error(String(reason)),
        ErrorSeverity.CRITICAL,
        ErrorCategory.UNKNOWN,
        {
          metadata: {
            type: 'unhandledRejection',
            reason: String(reason),
          },
        }
      );
    });

    // SIGTERM (Graceful shutdown)
    process.on('SIGTERM', async () => {
      logger.info('📡 Received SIGTERM signal. Starting graceful shutdown...');
      await this.gracefulShutdown('SIGTERM');
    });

    // SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('📡 Received SIGINT signal. Starting graceful shutdown...');
      await this.gracefulShutdown('SIGINT');
    });

    // Warning events
    process.on('warning', (warning: Error) => {
      logger.warn('⚠️ Node.js warning:', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      });
    });

    logger.info('✅ Crash protection initialized');
  }

  /**
   * Register callback to run during shutdown
   */
  onShutdown(callback: () => Promise<void>): void {
    this.shutdownCallbacks.push(callback);
  }

  /**
   * Graceful shutdown
   */
  async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`🛑 Graceful shutdown initiated (signal: ${signal})`);

    // 1️⃣ Stop accepting new requests
    logger.info('1️⃣ Stopping new requests...');

    // 2️⃣ Wait for active requests to complete (with timeout)
    logger.info(`2️⃣ Waiting for ${this.activeRequests} active requests to complete...`);
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeRequests > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this.activeRequests > 0) {
      logger.warn(`⚠️ ${this.activeRequests} requests still active after timeout`);
    } else {
      logger.info('✅ All active requests completed');
    }

    // 3️⃣ Run shutdown callbacks (close DB, Redis, etc.)
    logger.info('3️⃣ Running shutdown callbacks...');
    for (const callback of this.shutdownCallbacks) {
      try {
        await callback();
      } catch (error: any) {
        logger.error('Error in shutdown callback:', error);
      }
    }

    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  }

  /**
   * Track active request (call at start of request)
   */
  requestStart(): void {
    this.activeRequests++;
  }

  /**
   * Track request end (call at end of request)
   */
  requestEnd(): void {
    this.activeRequests--;
  }

  /**
   * Check if shutting down
   */
  isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Wrap async middleware with error tracking
   */
  wrapMiddleware(middleware: (req: any, res: any, next: any) => Promise<void>) {
    return async (req: any, res: any, next: any) => {
      if (this.isShuttingDown) {
        return res.status(503).json({ error: 'Server is shutting down' });
      }

      this.requestStart();

      try {
        await middleware(req, res, next);
      } catch (error: any) {
        logger.error('Middleware error:', error);
        
        await errorTracking.trackError(
          error,
          ErrorSeverity.MEDIUM,
          ErrorCategory.API,
          {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
          }
        );

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
          });
        }
      } finally {
        this.requestEnd();
      }
    };
  }

  /**
   * Wrap Express route handler with error tracking
   */
  wrapRoute(handler: (req: any, res: any) => Promise<void>) {
    return async (req: any, res: any) => {
      if (this.isShuttingDown) {
        return res.status(503).json({ error: 'Server is shutting down' });
      }

      this.requestStart();

      try {
        await handler(req, res);
      } catch (error: any) {
        logger.error('Route handler error:', error);
        
        await errorTracking.trackError(
          error,
          ErrorSeverity.MEDIUM,
          ErrorCategory.API,
          {
            endpoint: req.path,
            method: req.method,
            requestBody: req.body,
          }
        );

        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined,
          });
        }
      } finally {
        this.requestEnd();
      }
    };
  }

  /**
   * Health check endpoint helper
   */
  getHealthStatus(): {
    status: string;
    isShuttingDown: boolean;
    activeRequests: number;
    uptime: number;
    memory: NodeJS.MemoryUsage;
  } {
    return {
      status: this.isShuttingDown ? 'shutting_down' : 'healthy',
      isShuttingDown: this.isShuttingDown,
      activeRequests: this.activeRequests,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}

// Export singleton
export const crashProtection = new CrashProtection();
export default crashProtection;

