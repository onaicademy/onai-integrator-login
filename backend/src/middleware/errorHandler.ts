// @ts-nocheck
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { logger, CorrelatedError } from './correlationId.js';

/**
 * Enhanced Error Handler Middleware
 * Обрабатывает все ошибки с correlation ID и structured logging
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error | CorrelatedError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Get correlation ID from request or error
  const correlationId = req.correlationId || 
    ('correlationId' in err ? (err as CorrelatedError).correlationId : undefined) ||
    'unknown';

  // Determine status code
  const statusCode = 'statusCode' in err ? 
    (err as CorrelatedError).statusCode : 500;

  // Get context if available
  const context = 'context' in err ? 
    (err as CorrelatedError).context : undefined;

  // Log error with full context
  logger.error('Request Error', err, {
    url: req.url,
    method: req.method,
    statusCode,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    context
  }, correlationId);

  // Don't leak stack traces in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Send error response
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      correlationId,
      timestamp: new Date().toISOString(),
      ...(isDevelopment && { 
        stack: err.stack,
        context 
      })
    }
  });
};

/**
 * Not Found Handler
 * Обрабатывает 404 ошибки
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CorrelatedError(
    `Route not found: ${req.method} ${req.url}`,
    404,
    req.correlationId
  );
  
  next(error);
};

/**
 * Async Error Wrapper
 * Оборачивает async route handlers для автоматической обработки ошибок
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error Response Helper
 * Создаёт стандартизированные error responses
 */
export const createErrorResponse = (
  message: string,
  statusCode = 500,
  correlationId?: string,
  details?: any
) => {
  return {
    error: {
      message,
      statusCode,
      correlationId: correlationId || 'unknown',
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  };
};
