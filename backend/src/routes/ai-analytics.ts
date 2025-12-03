/**
 * AI ANALYTICS ROUTES
 * Роуты для управления AI-аналитикой и ручного запуска отчетов
 */

import { Router, Request, Response } from 'express';
import { triggerManualAnalyticsReport } from '../services/aiAnalyticsScheduler';
import { authMiddleware } from '../middleware/auth';
import { adminSupabase } from '../config/supabase';

const router = Router();

/**
 * POST /api/ai-analytics/trigger/daily
 * Ручной запуск ежедневного отчета AI-аналитики (для тестирования)
 */
router.post('/trigger/daily', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('🧪 [AI Analytics API] Manual trigger: daily report');

    // Проверяем, что пользователь - админ
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Доступ запрещен. Требуется роль admin.',
      });
    }

    // Запускаем генерацию отчета асинхронно (не блокируем ответ)
    triggerManualAnalyticsReport().catch(err => {
      console.error('❌ [AI Analytics API] Error in manual daily report:', err);
    });

    res.json({
      success: true,
      message: 'Генерация ежедневного отчета AI-аналитики запущена в фоне',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [AI Analytics API] Error triggering daily report:', error);
    res.status(500).json({
      error: 'Ошибка запуска ежедневного отчета',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-analytics/status
 * Получить статус AI-аналитики
 */
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const analystAssistantId = process.env.OPENAI_ASSISTANT_ANALYST_ID || '';
    const isAIConfigured = !!analystAssistantId;
    const isTelegramConfigured = !!process.env.TELEGRAM_ADMIN_BOT_TOKEN && !!process.env.TELEGRAM_ADMIN_CHAT_ID;

    res.json({
      success: true,
      status: isTelegramConfigured ? (isAIConfigured ? 'full' : 'basic') : 'telegram_not_configured',
      ai_analysis_enabled: isAIConfigured,
      telegram_notifications: isTelegramConfigured,
      assistant_id: isAIConfigured ? analystAssistantId : null,
      schedule: {
        daily_report: '9:00 AM каждый день Almaty time (3:00 AM UTC)',
      },
    });
  } catch (error: any) {
    console.error('❌ [AI Analytics API] Error getting status:', error);
    res.status(500).json({
      error: 'Ошибка получения статуса AI-аналитики',
      details: error.message,
    });
  }
});

/**
 * GET /api/ai-analytics/reports
 * Получить последние отчеты AI-аналитики
 */
router.get('/reports', authMiddleware, async (req: Request, res: Response) => {
  try {
    console.log('📊 [AI Analytics API] Fetching reports');

    // Проверяем, что пользователь - админ
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Доступ запрещен. Требуется роль admin.',
      });
    }

    const limit = parseInt(req.query.limit as string) || 10;
    const reportType = req.query.type as string || undefined;

    let query = adminSupabase
      .from('ai_analytics_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    const { data: reports, error } = await query;

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      reports: reports || [],
      total: reports?.length || 0,
    });
  } catch (error: any) {
    console.error('❌ [AI Analytics API] Error fetching reports:', error);
    res.status(500).json({
      error: 'Ошибка получения отчетов',
      details: error.message,
    });
  }
});

export default router;

