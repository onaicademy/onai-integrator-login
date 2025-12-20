import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Correlation ID Middleware
 * Добавляет уникальный ID к каждому запросу для трекинга через всю систему
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get from header or generate new
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  
  // Attach to request
  req.correlationId = correlationId;
  
  // Return in response headers
  res.setHeader('X-Correlation-Id', correlationId);
  
  next();
};

/**
 * Request Logger Middleware
 * Логирует все HTTP запросы с correlation ID
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  logger.info('HTTP Request Started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }, req.correlationId);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    const message = res.statusCode >= 400 ? 'HTTP Request Failed' : 'HTTP Request Completed';
    
    if (logLevel === 'error') {
      logger.error(message, undefined, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        ip: req.ip
      }, req.correlationId);
    } else {
      logger.info(message, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration
      }, req.correlationId);
    }
  });
  
  next();
};

/**
 * Structured Logger
 * Все логи в JSON формате с correlation ID
 */
export const logger = {
  /**
   * Info level logging
   */
  info: (message: string, meta?: any, correlationId?: string) => {
    const logEntry = {
      level: 'info',
      message,
      correlationId: correlationId || 'no-correlation-id',
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    console.log(JSON.stringify(logEntry));
  },
  
  /**
   * Error level logging
   */
  error: (message: string, error?: Error, meta?: any, correlationId?: string) => {
    const logEntry = {
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      correlationId: correlationId || 'no-correlation-id',
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    console.error(JSON.stringify(logEntry));
  },
  
  /**
   * Warning level logging
   */
  warn: (message: string, meta?: any, correlationId?: string) => {
    const logEntry = {
      level: 'warn',
      message,
      correlationId: correlationId || 'no-correlation-id',
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    console.warn(JSON.stringify(logEntry));
  },
  
  /**
   * Debug level logging (only in development)
   */
  debug: (message: string, meta?: any, correlationId?: string) => {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = {
        level: 'debug',
        message,
        correlationId: correlationId || 'no-correlation-id',
        timestamp: new Date().toISOString(),
        ...meta
      };
      
      console.debug(JSON.stringify(logEntry));
    }
  }
};

/**
 * Enhanced Error Class with Correlation ID
 */
export class CorrelatedError extends Error {
  correlationId?: string;
  statusCode?: number;
  context?: any;

  constructor(message: string, statusCode = 500, correlationId?: string, context?: any) {
    super(message);
    this.name = 'CorrelatedError';
    this.correlationId = correlationId;
    this.statusCode = statusCode;
    this.context = context;
    
    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
