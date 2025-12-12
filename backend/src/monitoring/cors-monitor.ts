/**
 * ✅ CORS Monitoring Middleware
 * 
 * Логирует все CORS rejections для debugging
 * Отправляет alerts в production если слишком много rejections
 * 
 * SAFE: Только логирование, не меняет поведение
 */

import { Request, Response, NextFunction } from 'express';

interface CORSRejectionEvent {
  origin: string;
  method: string;
  path: string;
  timestamp: string;
  userAgent: string;
}

// In-memory storage для CORS rejections (простая версия без Redis)
const corsRejections: CORSRejectionEvent[] = [];
const MAX_REJECTIONS_TO_STORE = 100;

/**
 * Middleware для мониторинга CORS rejections
 */
export function corsMonitoringMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  
  // Перехватываем res.send чтобы проверить CORS errors
  const originalSend = res.send;
  res.send = function(data: any): Response {
    // Если это CORS rejection (обычно middleware выставляет 403)
    if (origin && !res.getHeader('Access-Control-Allow-Origin')) {
      const event: CORSRejectionEvent = {
        origin,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'] || 'unknown',
      };
      
      // Логируем
      console.warn(`🚨 [CORS REJECTED]
  Origin: ${origin}
  Method: ${req.method}
  Path: ${req.path}
  User-Agent: ${event.userAgent}
  Timestamp: ${event.timestamp}
      `);
      
      // Сохраняем в memory (ограничено 100 последних)
      corsRejections.push(event);
      if (corsRejections.length > MAX_REJECTIONS_TO_STORE) {
        corsRejections.shift(); // Удаляем старые
      }
      
      // ✅ TODO: В production отправлять в Slack/Telegram
      if (process.env.NODE_ENV === 'production') {
        // notifySlack({
        //   channel: '#alerts-cors',
        //   text: `🚨 CORS Rejection from ${origin}`,
        //   details: event,
        // });
        console.error(`🚨 [PRODUCTION] CORS rejection logged - manual review needed!`);
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * GET /api/monitoring/cors-rejections
 * Endpoint для просмотра CORS rejections (admin only)
 */
export function getCorsRejections(req: Request, res: Response) {
  const last24h = corsRejections.filter(event => {
    const eventTime = new Date(event.timestamp).getTime();
    const now = Date.now();
    return (now - eventTime) < 24 * 60 * 60 * 1000; // 24 hours
  });
  
  res.json({
    total: last24h.length,
    rejections: last24h,
    summary: {
      uniqueOrigins: [...new Set(last24h.map(e => e.origin))],
      mostBlockedPath: getMostFrequent(last24h.map(e => e.path)),
      mostBlockedOrigin: getMostFrequent(last24h.map(e => e.origin)),
    },
  });
}

/**
 * Helper: Найти самый частый элемент в массиве
 */
function getMostFrequent(arr: string[]): string | null {
  if (arr.length === 0) return null;
  
  const counts = arr.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0][0];
}

export default corsMonitoringMiddleware;
