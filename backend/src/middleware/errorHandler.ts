import { Request, Response, NextFunction } from 'express';

// 🔥 Custom Error Types
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends Error {
  constructor(message: string, public service: string, public originalError?: any) {
    super(message);
    this.name = 'ExternalServiceError';
  }
}

// 🔥 Error Handler
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // 🔥 Log error
  console.error('❌ [Error Handler] Error occurred:', {
    name: err.name,
    message: err.message,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    stack: err.stack,
  });

  // 🔥 Handle specific error types
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
      details: err.details,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof UnauthorizedError) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof ForbiddenError) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      error: 'Not found',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof ConflictError) {
    return res.status(409).json({
      error: 'Conflict',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof RateLimitError) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  if (err instanceof ExternalServiceError) {
    console.error(`❌ [External Service] ${err.service} error:`, err.originalError);
    return res.status(502).json({
      error: 'External service error',
      message: err.message,
      service: err.service,
      timestamp: new Date().toISOString(),
    });
  }

  // 🔥 Handle Axios errors (external API errors)
  if (err.name === 'AxiosError') {
    const axiosError = err as any;
    const status = axiosError.response?.status || 500;
    const message = axiosError.response?.data?.message || axiosError.message || 'External API error';
    
    console.error('❌ [Axios Error]', {
      status,
      message,
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      data: axiosError.response?.data,
    });

    return res.status(status).json({
      error: 'External API error',
      message,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // 🔥 Handle Supabase errors
  if (err.name === 'PostgresError' || err.message.includes('Supabase')) {
    console.error('❌ [Database Error]', err.message);
    return res.status(500).json({
      error: 'Database error',
      message: 'An error occurred while accessing the database',
      timestamp: new Date().toISOString(),
    });
  }

  // 🔥 Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided token is invalid',
      timestamp: new Date().toISOString(),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      message: 'The provided token has expired',
      timestamp: new Date().toISOString(),
    });
  }

  // 🔥 Handle Circuit Breaker errors
  if (err.message.includes('Circuit breaker is OPEN')) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }

  // 🔥 Handle generic errors
  console.error('❌ [Unhandled Error]', err);
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    timestamp: new Date().toISOString(),
  });
}

// 🔥 Async error handler (for async functions)
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 🔥 Not found handler (404)
export function notFoundHandler(req: Request, res: Response) {
  console.warn(`⚠️ [404] Path not found: ${req.method} ${req.path}`);
  return res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
}
