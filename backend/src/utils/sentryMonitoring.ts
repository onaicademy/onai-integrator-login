/**
 * 🛡️ SENTRY MONITORING UTILITIES - Backend Tripwire Specific
 * 
 * Специализированный мониторинг для backend процессов Tripwire:
 * - AI генерация контента (Groq/OpenAI)
 * - Email/SMS отправка (Resend/Twilio)
 * - Database операции (Supabase)
 * - File processing (видео, PDF)
 * - External API calls (AmoCRM, Facebook)
 */

import { 
  Sentry, 
  trackLongOperation, 
  trackDatabaseQuery, 
  trackPotentialInfiniteLoop 
} from '../config/sentry.js';

/**
 * 🎯 Monitor AI Content Generation (OpenAI/Groq)
 */
export const monitorAIGeneration = async <T>(
  provider: 'openai' | 'groq',
  operation: string,
  context: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `ai.${provider}.${operation}`,
    op: 'ai.generation',
    tags: {
      provider,
      operation,
    },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'ai',
      message: `${provider} ${operation}`,
      level: 'info',
      data: context,
    });

    const result = await fn();
    const duration = Date.now() - startTime;

    // AI > 30 секунд - возможно зависание
    if (duration > 30000) {
      Sentry.captureMessage(`Very slow AI generation: ${provider} ${operation}`, {
        level: 'error',
        tags: {
          type: 'slow_ai',
          provider,
          operation,
        },
        extra: {
          duration_ms: duration,
          context,
        },
      });
    }

    trackLongOperation(`ai_${provider}_${operation}`, duration, context);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        type: 'ai_error',
        provider,
        operation,
      },
      extra: {
        duration_ms: duration,
        context,
        error_message: error?.message,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Email Sending (Resend)
 */
export const monitorEmailSending = async <T>(
  emailType: string,
  recipient: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `email.send.${emailType}`,
    op: 'email.send',
    tags: {
      email_type: emailType,
    },
  });

  // Mask email for privacy
  const maskedEmail = recipient.replace(/(.{2}).*@/, '$1***@');

  try {
    Sentry.addBreadcrumb({
      category: 'email',
      message: `Sending ${emailType} to ${maskedEmail}`,
      level: 'info',
    });

    const result = await fn();
    const duration = Date.now() - startTime;

    // Email > 10 секунд - проблема с Resend API
    if (duration > 10000) {
      Sentry.captureMessage(`Slow email sending: ${emailType}`, {
        level: 'warning',
        tags: {
          type: 'slow_email',
          email_type: emailType,
        },
        extra: {
          duration_ms: duration,
          recipient: maskedEmail,
        },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        type: 'email_error',
        email_type: emailType,
      },
      extra: {
        duration_ms: duration,
        recipient: maskedEmail,
        error_message: error?.message,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor SMS Sending
 */
export const monitorSMSSending = async <T>(
  smsType: string,
  phone: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `sms.send.${smsType}`,
    op: 'sms.send',
    tags: {
      sms_type: smsType,
    },
  });

  // Mask phone for privacy
  const maskedPhone = phone.replace(/(\d{2})\d+(\d{2})/, '$1***$2');

  try {
    Sentry.addBreadcrumb({
      category: 'sms',
      message: `Sending ${smsType} to ${maskedPhone}`,
      level: 'info',
    });

    const result = await fn();
    const duration = Date.now() - startTime;

    trackLongOperation(`sms_${smsType}`, duration);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        type: 'sms_error',
        sms_type: smsType,
      },
      extra: {
        duration_ms: duration,
        phone: maskedPhone,
        error_message: error?.message,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Database Operations (Supabase)
 */
export const monitorDBOperation = async <T>(
  operation: 'select' | 'insert' | 'update' | 'delete',
  table: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `db.${operation}.${table}`,
    op: 'db.query',
    tags: {
      operation,
      table,
    },
  });

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    trackDatabaseQuery(`${operation.toUpperCase()} FROM ${table}`, duration);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    trackDatabaseQuery(`${operation.toUpperCase()} FROM ${table}`, duration, error);

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor File Processing (Video, PDF, etc)
 */
export const monitorFileProcessing = async <T>(
  fileType: string,
  fileName: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `file.${operation}.${fileType}`,
    op: 'file.process',
    tags: {
      file_type: fileType,
      operation,
    },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'file',
      message: `Processing ${fileType}: ${fileName}`,
      level: 'info',
      data: {
        file_type: fileType,
        file_name: fileName,
        operation,
      },
    });

    const result = await fn();
    const duration = Date.now() - startTime;

    // File processing > 60 секунд - очень долго
    if (duration > 60000) {
      Sentry.captureMessage(`Very slow file processing: ${fileType}`, {
        level: 'error',
        tags: {
          type: 'slow_file_processing',
          file_type: fileType,
          operation,
        },
        extra: {
          duration_ms: duration,
          file_name: fileName,
        },
      });
    }

    trackLongOperation(`file_${operation}_${fileType}`, duration);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        type: 'file_processing_error',
        file_type: fileType,
        operation,
      },
      extra: {
        duration_ms: duration,
        file_name: fileName,
        error_message: error?.message,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor External API Calls (AmoCRM, Facebook, etc)
 */
export const monitorExternalAPI = async <T>(
  apiName: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `external.${apiName}.${endpoint}`,
    op: 'http.client',
    tags: {
      api_name: apiName,
      endpoint,
    },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'external_api',
      message: `${apiName}: ${endpoint}`,
      level: 'info',
    });

    const result = await fn();
    const duration = Date.now() - startTime;

    // External API > 10 секунд - проблема с внешним сервисом
    if (duration > 10000) {
      Sentry.captureMessage(`Slow external API: ${apiName}`, {
        level: 'warning',
        tags: {
          type: 'slow_external_api',
          api_name: apiName,
          endpoint,
        },
        extra: {
          duration_ms: duration,
        },
      });
    }

    trackLongOperation(`external_${apiName}_${endpoint}`, duration);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    Sentry.captureException(error, {
      tags: {
        type: 'external_api_error',
        api_name: apiName,
        endpoint,
      },
      extra: {
        duration_ms: duration,
        error_message: error?.message,
        status_code: error?.response?.status,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🔄 Detect Infinite Loops
 */
export const detectInfiniteLoop = (
  operationName: string,
  iterations: number,
  context?: Record<string, any>
) => {
  trackPotentialInfiniteLoop(operationName, iterations, context);
};

/**
 * 🎯 Monitor Memory Usage
 */
export const checkMemoryUsage = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (usagePercent > 90) {
    Sentry.captureMessage('Critical memory usage', {
      level: 'error',
      tags: {
        type: 'high_memory',
        usage_percent: `${Math.round(usagePercent)}%`,
      },
      extra: {
        heap_used_mb: heapUsedMB,
        heap_total_mb: heapTotalMB,
        usage_percent: usagePercent,
        rss_mb: Math.round(usage.rss / 1024 / 1024),
      },
    });
  }

  return { heapUsedMB, heapTotalMB, usagePercent };
};

export { Sentry };
