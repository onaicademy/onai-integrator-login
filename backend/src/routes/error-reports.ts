/**
 * Error Reports API
 * Handles error reports from frontend ErrorBoundary
 * Sends to Telegram analytics bot: @analisistonaitrafic_bot
 *
 * DEDUPLICATION: Same error = one message (30 min window)
 * Prevents spam of 100k identical messages
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = Router();

// Telegram bot token for @analisistonaitrafic_bot
const ANALYTICS_BOT_TOKEN = process.env.TELEGRAM_ANALYTICS_BOT_TOKEN;
const ANALYTICS_CHAT_ID = process.env.TELEGRAM_ANALYTICS_CHAT_ID;

if (!ANALYTICS_BOT_TOKEN || !ANALYTICS_CHAT_ID) {
  console.error('TELEGRAM_ANALYTICS_BOT_TOKEN or TELEGRAM_ANALYTICS_CHAT_ID not configured!');
  console.error('Error reports will NOT be sent to Telegram');
}

// ═══════════════════════════════════════════════════════════════
// DEDUPLICATION SYSTEM - Prevents spam of identical errors
// ═══════════════════════════════════════════════════════════════

interface ErrorCacheEntry {
  hash: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  lastSentToTelegram: number;
  errorName: string;
  platform: string;
}

// Cache of recent errors (hash -> entry)
const errorCache = new Map<string, ErrorCacheEntry>();

// Dedup window: 2 hours (cleanup old entries)
const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000;

// Minimum interval between Telegram messages for same error: 30 minutes
const MIN_TELEGRAM_INTERVAL_MS = 30 * 60 * 1000;

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  const cutoff = now - DEDUP_WINDOW_MS;
  let cleaned = 0;

  for (const [hash, entry] of errorCache.entries()) {
    if (entry.lastSeen < cutoff) {
      errorCache.delete(hash);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[Error Reports] Cleaned ${cleaned} old error hashes`);
  }
}, 60 * 60 * 1000);

interface ErrorReport {
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo?: {
    componentStack?: string;
  };
  userInfo: {
    email?: string;
    userId?: string;
    page: string;
    userAgent: string;
    timestamp: string;
  };
  debugLogs?: string[];
  environment: {
    platform: 'Tripwire' | 'Traffic' | 'Landing';
    url: string;
    viewport: string;
  };
}

/**
 * Generate hash for error deduplication
 * Removes timestamps and dynamic data for accurate matching
 */
function generateErrorHash(report: ErrorReport): string {
  // Key components for deduplication
  const key = [
    report.error?.name || '',
    report.error?.message || '',
    report.environment?.platform || '',
    report.userInfo?.page || '',
    // Include first 100 chars of stack (without line numbers)
    (report.error?.stack || '').substring(0, 100).replace(/:\d+:\d+/g, ''),
  ].join('|');

  return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
}

/**
 * Check if error should be sent to Telegram
 * Returns: { shouldSend, reason, count }
 */
function shouldSendToTelegram(hash: string, report: ErrorReport): { shouldSend: boolean; reason: string; count: number } {
  const now = Date.now();
  const entry = errorCache.get(hash);

  if (!entry) {
    // New error - always send
    errorCache.set(hash, {
      hash,
      count: 1,
      firstSeen: now,
      lastSeen: now,
      lastSentToTelegram: now,
      errorName: report.error?.name || 'Unknown',
      platform: report.environment?.platform || 'Unknown',
    });
    return { shouldSend: true, reason: 'new_error', count: 1 };
  }

  // Update existing entry
  entry.count++;
  entry.lastSeen = now;

  // Check if enough time passed since last Telegram message
  const timeSinceLastSend = now - entry.lastSentToTelegram;

  if (timeSinceLastSend >= MIN_TELEGRAM_INTERVAL_MS) {
    entry.lastSentToTelegram = now;
    return { shouldSend: true, reason: 'interval_passed', count: entry.count };
  }

  // Throttled
  const remainingMin = Math.round((MIN_TELEGRAM_INTERVAL_MS - timeSinceLastSend) / 60000);
  return {
    shouldSend: false,
    reason: `throttled_${remainingMin}min_remaining`,
    count: entry.count
  };
}

/**
 * POST /api/error-reports/submit
 * Submit error report from frontend
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const report: ErrorReport = req.body;

    // Validate report structure
    if (!report || !report.error || !report.userInfo || !report.environment) {
      console.error('[Error Report] Invalid report structure:', JSON.stringify(req.body).substring(0, 200));
      return res.status(400).json({
        success: false,
        error: 'Invalid report structure'
      });
    }

    // Generate dedup hash
    const hash = generateErrorHash(report);
    const { shouldSend, reason, count } = shouldSendToTelegram(hash, report);

    console.log(`[Error Report] ${report.error?.name || 'Unknown'} from ${report.environment?.platform} | hash=${hash.substring(0,8)} | count=${count} | ${shouldSend ? 'SENDING' : reason}`);

    // Send to Telegram only if not deduplicated
    if (ANALYTICS_BOT_TOKEN && ANALYTICS_CHAT_ID && shouldSend) {
      try {
        // Add occurrence count to message if this is a repeated error
        const message = formatErrorReport(report, count);
        await sendToTelegram(message);
        console.log('[Error Report] Sent to Telegram analytics group');
      } catch (telegramError: any) {
        console.error('[Error Report] Telegram send failed:', telegramError.message);
      }
    } else if (!shouldSend) {
      console.log(`[Error Report] Deduplicated (${reason}), count=${count}`);
    }

    res.json({
      success: true,
      message: 'Received',
      deduplicated: !shouldSend,
      occurrences: count
    });

  } catch (error: any) {
    console.error('[Error Report] Failed to process:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send report'
    });
  }
});

/**
 * GET /api/error-reports/stats
 * Get deduplication statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = {
    uniqueErrors: errorCache.size,
    errors: Array.from(errorCache.values()).map(e => ({
      hash: e.hash.substring(0, 8),
      name: e.errorName,
      platform: e.platform,
      count: e.count,
      firstSeen: new Date(e.firstSeen).toISOString(),
      lastSeen: new Date(e.lastSeen).toISOString(),
    }))
  };

  res.json({ success: true, data: stats });
});

/**
 * POST /api/error-reports/test
 * Send test error report
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const testReport: ErrorReport = {
      error: {
        name: 'TestError',
        message: 'This is a test error report from Error Reporting System',
        stack: 'TestError: This is a test error report\\n    at testFunction (test.ts:10:15)\\n    at App.tsx:50:20'
      },
      errorInfo: {
        componentStack: '\\n    at TestComponent\\n    at App\\n    at ErrorBoundary'
      },
      userInfo: {
        email: 'test@onai.academy',
        userId: 'test-user-123',
        page: '/test-page',
        userAgent: req.headers['user-agent'] as string || 'Test User Agent',
        timestamp: new Date().toISOString()
      },
      debugLogs: [
        '[DEBUG] Application started',
        '[DEBUG] User logged in',
        '[ERROR] Test error occurred',
        '[DEBUG] ErrorBoundary caught error'
      ],
      environment: {
        platform: 'Tripwire',
        url: 'http://localhost:8080/test',
        viewport: '1920x1080'
      }
    };

    const message = formatErrorReport(testReport, 1);

    if (ANALYTICS_BOT_TOKEN && ANALYTICS_CHAT_ID) {
      await sendToTelegram(message);
      console.log('[Test Report] Sent to Telegram');
      res.json({
        success: true,
        message: 'Test report sent',
        telegram: {
          botToken: ANALYTICS_BOT_TOKEN ? `${ANALYTICS_BOT_TOKEN.substring(0, 10)}...` : 'not set',
          chatId: ANALYTICS_CHAT_ID
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Telegram bot not configured',
        telegram: {
          botToken: ANALYTICS_BOT_TOKEN ? 'set' : 'NOT SET',
          chatId: ANALYTICS_CHAT_ID || 'NOT SET'
        }
      });
    }

  } catch (error: any) {
    console.error('[Test Report] Failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Format error report for Telegram
 */
function formatErrorReport(report: ErrorReport, occurrenceCount: number = 1): string {
  const { error, userInfo, errorInfo, debugLogs, environment } = report;

  // Helper to escape Markdown special chars
  const escapeMarkdown = (text: string): string => {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  };

  let message = `🚨 *ERROR REPORT* 🚨\n\n`;

  // Show occurrence count if repeated
  if (occurrenceCount > 1) {
    message = `🚨 *ERROR REPORT* (x${occurrenceCount}) 🚨\n\n`;
  }

  // Platform
  message += `📦 *Platform:* ${environment?.platform || 'Unknown'}\n`;
  message += `🌐 *URL:* ${escapeMarkdown(environment?.url || 'N/A')}\n`;
  message += `📄 *Page:* ${escapeMarkdown(userInfo?.page || 'N/A')}\n\n`;

  // User info
  if (userInfo?.email) {
    message += `👤 *User:* ${escapeMarkdown(userInfo.email)}\n`;
  }
  if (userInfo?.userId) {
    message += `🆔 *User ID:* ${userInfo.userId}\n`;
  }
  message += `🕐 *Time:* ${new Date(userInfo?.timestamp || Date.now()).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n`;

  // Error details
  message += `❌ *Error:* ${escapeMarkdown(error?.name || 'Unknown')}\n`;
  message += `💬 *Message:* ${escapeMarkdown(error?.message || 'N/A')}\n\n`;

  // Stack trace (first 3 lines)
  if (error.stack) {
    const stackLines = error.stack.split('\\n').slice(0, 3);
    message += `📚 *Stack Trace:*\n\`\`\`\n${stackLines.join('\\n')}\n\`\`\`\n\n`;
  }

  // Component stack
  if (errorInfo?.componentStack) {
    const componentLines = errorInfo.componentStack.split('\\n').filter(l => l.trim()).slice(0, 3);
    message += `⚛️ *Component Stack:*\n\`\`\`\n${componentLines.join('\\n')}\n\`\`\`\n\n`;
  }

  // Debug logs (last 5)
  if (debugLogs && debugLogs.length > 0) {
    const recentLogs = debugLogs.slice(-5);
    message += `🔍 *Debug Logs \\(last 5\\):*\n`;
    recentLogs.forEach(log => {
      message += `  • ${log}\n`;
    });
    message += `\n`;
  }

  // Environment
  message += `🖥️ *Environment:*\n`;
  message += `  • Viewport: ${environment.viewport}\n`;
  message += `  • User Agent: ${userInfo.userAgent.substring(0, 50)}...\n\n`;

  message += `⚡ *Status:* REQUIRES IMMEDIATE FIX`;

  return message;
}

/**
 * Send message to Telegram
 */
async function sendToTelegram(message: string): Promise<void> {
  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${ANALYTICS_BOT_TOKEN}/sendMessage`,
      {
        chat_id: ANALYTICS_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      },
      { timeout: 10000 }
    );

    if (response.data.ok) {
      console.log('Telegram message sent successfully');
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error('Failed to send Telegram message:', error.message);
    throw error;
  }
}

export default router;
