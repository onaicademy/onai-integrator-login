/**
 * Error Reports API
 * Handles error reports from frontend ErrorBoundary
 * Sends to Telegram analytics bot: @analisistonaitrafic_bot
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

// Telegram bot token for @analisistonaitrafic_bot  
// Fallback to Leads bot if analytics bot token is invalid
const ANALYTICS_BOT_TOKEN = process.env.TELEGRAM_ANALYTICS_BOT_TOKEN || process.env.TELEGRAM_LEADS_BOT_TOKEN || process.env.TELEGRAM_MENTOR_BOT_TOKEN;
const ANALYTICS_CHAT_ID = process.env.TELEGRAM_ANALYTICS_CHAT_ID || process.env.TELEGRAM_LEADS_CHAT_ID;

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
 * POST /api/error-reports/submit
 * Submit error report from frontend
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const report: ErrorReport = req.body;
    
    console.log('📨 [Error Report] Received:', {
      error: report.error.name,
      user: report.userInfo.email || 'anonymous',
      platform: report.environment.platform
    });
    
    // Format message for Telegram
    const message = formatErrorReport(report);
    
    // Send to Telegram
    if (ANALYTICS_BOT_TOKEN && ANALYTICS_CHAT_ID) {
      await sendToTelegram(message);
      console.log('✅ [Error Report] Sent to Telegram analytics group');
    } else {
      console.warn('⚠️ [Error Report] Telegram not configured, logging only');
    }
    
    res.json({ 
      success: true, 
      message: 'Отчет отправлен! Спасибо за помощь 🙏' 
    });
    
  } catch (error: any) {
    console.error('❌ [Error Report] Failed to process:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send report' 
    });
  }
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
        userAgent: req.headers['user-agent'] || 'Test User Agent',
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
    
    const message = formatErrorReport(testReport);
    
    if (ANALYTICS_BOT_TOKEN && ANALYTICS_CHAT_ID) {
      await sendToTelegram(message);
      console.log('✅ [Test Report] Sent to Telegram');
      res.json({ 
        success: true, 
        message: 'Тестовый отчет отправлен в Telegram! Проверь группу аналитики.',
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
    console.error('❌ [Test Report] Failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Format error report for Telegram
 */
function formatErrorReport(report: ErrorReport): string {
  const { error, userInfo, errorInfo, debugLogs, environment } = report;
  
  let message = `🚨 *ERROR REPORT* 🚨\n\n`;
  
  // Platform
  message += `📦 *Platform:* ${environment.platform}\n`;
  message += `🌐 *URL:* \`${environment.url}\`\n`;
  message += `📄 *Page:* ${userInfo.page}\n\n`;
  
  // User info
  if (userInfo.email) {
    message += `👤 *User:* ${userInfo.email}\n`;
  }
  if (userInfo.userId) {
    message += `🆔 *User ID:* \`${userInfo.userId}\`\n`;
  }
  message += `🕐 *Time:* ${new Date(userInfo.timestamp).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty' })}\n\n`;
  
  // Error details
  message += `❌ *Error:* \`${error.name}\`\n`;
  message += `💬 *Message:* ${error.message}\n\n`;
  
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
    message += `🔍 *Debug Logs (last 5):*\n`;
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
      console.log('✅ Telegram message sent successfully');
    } else {
      throw new Error(`Telegram API error: ${JSON.stringify(response.data)}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to send Telegram message:', error.message);
    throw error;
  }
}

export default router;
