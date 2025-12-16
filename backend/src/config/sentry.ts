/**
 * ============================================
 * SENTRY MONITORING - DISABLED
 * ============================================
 * Sentry is currently disabled (no SENTRY_DSN configured)
 * All functions are no-op stubs to prevent build errors
 */

import type { Express, Request, Response, NextFunction } from "express";

// No-op initialization
export const initSentry = (app: Express): void => {
  console.log('⚠️ SENTRY_DSN not configured - error monitoring disabled');
};

// No-op request handler
export const sentryRequestHandler = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

// No-op tracing handler
export const sentryTracingHandler = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

// No-op error handler
export const sentryErrorHandler = () => {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    next(err);
  };
};

// No-op performance tracking
export const trackAPIPerformance = (routeName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

// No-op helpers
export const trackLongOperation = (operationName: string, durationMs: number, context?: Record<string, any>) => {};
export const trackDatabaseQuery = (query: string, durationMs: number, error?: any) => {};
export const trackPotentialInfiniteLoop = (operation: string, iterations: number, context?: Record<string, any>) => {};
export const trackMemoryUsage = () => {};

// Export empty Sentry object for compatibility
export const Sentry = {
  captureException: (err: any) => {},
  captureMessage: (msg: string, options?: any) => {},
  addBreadcrumb: (breadcrumb: any) => {}
};

export default {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  trackAPIPerformance
};

