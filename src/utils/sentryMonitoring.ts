/**
 * 🛡️ SENTRY MONITORING UTILITIES - Tripwire Specific
 * 
 * Специализированный мониторинг для процессов Tripwire:
 * - Загрузка уроков
 * - AI генерация контента
 * - Обработка оплаты
 * - Отправка email/SMS
 * - Работа с видео
 */

import { Sentry, trackLongOperation, trackAPIError } from '@/config/sentry';

/**
 * 🎯 Monitor Tripwire Lesson Loading
 */
export const monitorLessonLoading = async <T>(
  lessonId: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.lesson.load',
    op: 'lesson.load',
    tags: { lesson_id: lessonId },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.lesson',
      message: `Loading lesson ${lessonId}`,
      level: 'info',
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    trackLongOperation('lesson_loading', startTime);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: 'lesson_load_error',
        lesson_id: lessonId,
      },
      extra: {
        duration_ms: duration,
        lesson_id: lessonId,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor AI Content Generation
 */
export const monitorAIGeneration = async <T>(
  operationType: string,
  context: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `tripwire.ai.${operationType}`,
    op: 'ai.generation',
    tags: { 
      operation_type: operationType,
      ...context,
    },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.ai',
      message: `AI Generation: ${operationType}`,
      level: 'info',
      data: context,
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // AI генерация > 10 секунд - это долго
    if (duration > 10000) {
      Sentry.captureMessage(`Slow AI generation: ${operationType}`, {
        level: 'warning',
        tags: {
          type: 'slow_ai_generation',
          operation: operationType,
        },
        extra: {
          duration_ms: duration,
          context,
        },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: 'ai_generation_error',
        operation: operationType,
      },
      extra: {
        duration_ms: duration,
        context,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Payment Processing
 */
export const monitorPaymentProcessing = async <T>(
  paymentData: Record<string, any>,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.payment.process',
    op: 'payment.process',
    tags: { 
      payment_method: paymentData.method,
      amount: paymentData.amount,
    },
  });

  // НЕ логируем sensitive данные (номера карт, CVV)
  const safePaymentData = {
    method: paymentData.method,
    amount: paymentData.amount,
    currency: paymentData.currency,
  };

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.payment',
      message: 'Processing payment',
      level: 'info',
      data: safePaymentData,
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    trackLongOperation('payment_processing', startTime);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: 'payment_error',
        payment_method: paymentData.method,
      },
      extra: {
        duration_ms: duration,
        safe_payment_data: safePaymentData,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Video Loading
 */
export const monitorVideoLoading = async <T>(
  videoId: string,
  videoUrl: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: 'tripwire.video.load',
    op: 'video.load',
    tags: { video_id: videoId },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.video',
      message: `Loading video ${videoId}`,
      level: 'info',
      data: { video_id: videoId, video_url: videoUrl },
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // Видео загружается > 15 секунд - проблема с CDN
    if (duration > 15000) {
      Sentry.captureMessage('Slow video loading', {
        level: 'warning',
        tags: {
          type: 'slow_video_load',
          video_id: videoId,
        },
        extra: {
          duration_ms: duration,
          video_url: videoUrl,
        },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: 'video_load_error',
        video_id: videoId,
      },
      extra: {
        duration_ms: duration,
        video_url: videoUrl,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor API Requests
 */
export const monitorAPIRequest = async <T>(
  endpoint: string,
  method: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `api.${method}.${endpoint}`,
    op: 'http.request',
    tags: { 
      endpoint,
      method,
    },
  });

  try {
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${method} ${endpoint}`,
      level: 'info',
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    trackLongOperation(`api_${endpoint}`, startTime);

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    trackAPIError(endpoint, error, {
      method,
      duration_ms: duration,
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Email/SMS Sending
 */
export const monitorMessageSending = async <T>(
  messageType: 'email' | 'sms',
  recipient: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `tripwire.${messageType}.send`,
    op: 'message.send',
    tags: { 
      message_type: messageType,
    },
  });

  // Маскируем recipient для приватности
  const maskedRecipient = messageType === 'email' 
    ? recipient.replace(/(.{2}).*@/, '$1***@')
    : recipient.replace(/(\d{2})\d+(\d{2})/, '$1***$2');

  try {
    Sentry.addBreadcrumb({
      category: 'tripwire.messaging',
      message: `Sending ${messageType} to ${maskedRecipient}`,
      level: 'info',
      data: { 
        message_type: messageType,
        recipient: maskedRecipient,
      },
    });

    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // Отправка > 5 секунд - проблема с API
    if (duration > 5000) {
      Sentry.captureMessage(`Slow ${messageType} sending`, {
        level: 'warning',
        tags: {
          type: `slow_${messageType}_send`,
        },
        extra: {
          duration_ms: duration,
          recipient: maskedRecipient,
        },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: `${messageType}_send_error`,
      },
      extra: {
        duration_ms: duration,
        recipient: maskedRecipient,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🎯 Monitor Database Operations
 */
export const monitorDatabaseOperation = async <T>(
  operationType: string,
  tableName: string,
  operation: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: `db.${operationType}.${tableName}`,
    op: 'db.query',
    tags: { 
      operation_type: operationType,
      table: tableName,
    },
  });

  try {
    const result = await operation();
    
    const duration = Date.now() - startTime;
    
    // DB query > 2 секунд - это медленно
    if (duration > 2000) {
      Sentry.captureMessage('Slow database query', {
        level: 'warning',
        tags: {
          type: 'slow_query',
          operation: operationType,
          table: tableName,
        },
        extra: {
          duration_ms: duration,
        },
      });
    }

    transaction.setStatus('ok');
    transaction.finish();

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        type: 'database_error',
        operation: operationType,
        table: tableName,
      },
      extra: {
        duration_ms: duration,
      },
    });

    transaction.setStatus('unknown_error');
    transaction.finish();

    throw error;
  }
};

/**
 * 🔄 Detect potential infinite loops
 */
export const detectInfiniteLoop = (
  operationName: string,
  iterations: number,
  maxIterations: number = 1000
) => {
  if (iterations > maxIterations) {
    Sentry.captureMessage(`Potential infinite loop detected: ${operationName}`, {
      level: 'error',
      tags: {
        type: 'infinite_loop',
        operation: operationName,
      },
      extra: {
        iterations,
        max_iterations: maxIterations,
        timestamp: new Date().toISOString(),
      },
    });
  }
};
