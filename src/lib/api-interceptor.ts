/**
 * API Interceptor System
 * Captures all HTTP requests/responses for logging and validation
 */

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { debugSystem } from './debug-system';
import { z } from 'zod';

class APIInterceptor {
  private static instance: APIInterceptor;
  private axiosInstance: AxiosInstance;
  private requestTiming: Map<string, number> = new Map();

  private constructor() {
    this.axiosInstance = axios.create();
    this.setupInterceptors();
  }

  static getInstance(): APIInterceptor {
    if (!APIInterceptor.instance) {
      APIInterceptor.instance = new APIInterceptor();
    }
    return APIInterceptor.instance;
  }

  private setupInterceptors() {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const requestId = this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;
        
        // Store request start time
        this.requestTiming.set(requestId, Date.now());

        // Log request
        debugSystem.logAction({
          level: 'info',
          action: 'API Request',
          target: config.url || 'unknown',
          request: {
            method: config.method?.toUpperCase() || 'GET',
            url: config.url || '',
            payload: config.data,
          },
          metadata: {
            requestId,
            headers: this.sanitizeHeaders(config.headers),
          },
        });

        return config;
      },
      (error: AxiosError) => {
        debugSystem.logAction({
          level: 'error',
          action: 'API Request Error',
          target: 'Request Setup',
          response: {
            status: 0,
            error: error.message,
          },
        });
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        const requestId = response.config.headers['X-Request-ID'] as string;
        const duration = this.calculateDuration(requestId);

        debugSystem.logAction({
          level: 'success',
          action: 'API Response',
          target: response.config.url || 'unknown',
          request: {
            method: response.config.method?.toUpperCase() || 'GET',
            url: response.config.url || '',
          },
          response: {
            status: response.status,
            data: this.sanitizeResponseData(response.data),
          },
          duration,
          metadata: {
            requestId,
          },
        });

        // Clean up timing
        this.requestTiming.delete(requestId);

        return response;
      },
      (error: AxiosError) => {
        const requestId = error.config?.headers?.['X-Request-ID'] as string;
        const duration = requestId ? this.calculateDuration(requestId) : undefined;

        debugSystem.logAction({
          level: 'error',
          action: 'API Error',
          target: error.config?.url || 'unknown',
          request: error.config ? {
            method: error.config.method?.toUpperCase() || 'GET',
            url: error.config.url || '',
          } : undefined,
          response: {
            status: error.response?.status || 0,
            error: error.message,
            data: error.response?.data,
          },
          duration,
          metadata: {
            requestId,
            code: error.code,
          },
        });

        // Clean up timing
        if (requestId) {
          this.requestTiming.delete(requestId);
        }

        return Promise.reject(error);
      }
    );
  }

  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateDuration(requestId: string): number {
    const startTime = this.requestTiming.get(requestId);
    return startTime ? Date.now() - startTime : 0;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    Object.keys(headers).forEach(key => {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = String(headers[key]);
      }
    });

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    // Only include first 100 characters or structure overview
    if (typeof data === 'string') {
      return data.length > 100 ? `${data.substring(0, 100)}...` : data;
    }
    if (Array.isArray(data)) {
      return `Array(${data.length})`;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = typeof data[key];
        return acc;
      }, {} as Record<string, string>);
    }
    return data;
  }

  /**
   * Validate response data against a Zod schema
   */
  validateResponse<T>(schema: z.ZodSchema<T>, data: any, context?: string): T {
    try {
      const validated = schema.parse(data);
      
      debugSystem.logAction({
        level: 'success',
        action: 'Data Validation',
        target: context || 'Schema Validation',
        metadata: {
          schema: schema._def.typeName,
          valid: true,
        },
      });

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        debugSystem.logAction({
          level: 'error',
          action: 'Data Validation Failed',
          target: context || 'Schema Validation',
          response: {
            status: 0,
            error: `Validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          },
          metadata: {
            errors: error.errors,
          },
        });
      }
      throw error;
    }
  }
}

export const apiInterceptor = APIInterceptor.getInstance();
export const trackedAxios = apiInterceptor.getAxiosInstance();
