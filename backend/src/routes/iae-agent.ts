import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { runIAEAgent } from '../services/iaeAgentService.js';
import { sendIAEReport } from '../services/iaeAgentBot.js';

const router = Router();

// Supabase Tripwire client
const tripwireSupabase = createClient(
  process.env.TRIPWIRE_SUPABASE_URL || 'https://pjmvxecykysfrzppdcto.supabase.co',
  process.env.TRIPWIRE_SUPABASE_SERVICE_KEY || process.env.TRIPWIRE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqbXZ4ZWN5a3lzZnJ6cHBkY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzY4NTIsImV4cCI6MjA1MDIxMjg1Mn0.vD7PxK0WYyT-xeD9cJQMcb1tCL5hpBqQzLf3VgWyk'
);

/**
 * POST /api/iae-agent/trigger
 * Ручная проверка из dashboard (кнопка Синхронизация)
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    console.log('🔘 [IAE API] Manual trigger requested');
    
    const sendToTelegram = req.body.sendToTelegram !== false; // Default true
    
    const result = await runIAEAgent('manual', 'current');
    
    // Опционально отправить в Telegram
    let telegramSent = 0;
    if (sendToTelegram) {
      telegramSent = await sendIAEReport(result.telegramReport, result.reportData.id);
    }
    
    res.json({
      success: true,
      status: result.validation.healthy ? 'success' : 'warning',
      healthScore: result.aiAnalysis.healthScore,
      issues: result.validation.issues,
      anomalies: result.validation.anomalies,
      recommendations: result.aiAnalysis.recommendations,
      risks: result.aiAnalysis.risks,
      metrics: result.metrics,
      report: result.telegramReport,
      reportId: result.reportData.id,
      telegramSent
    });
    
    console.log(`✅ [IAE API] Manual trigger complete. Health: ${result.aiAnalysis.healthScore}/100`);
  } catch (error: any) {
    console.error('❌ [IAE API] Trigger error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run IAE Agent',
      message: error.message
    });
  }
});

/**
 * GET /api/iae-agent/reports
 * История отчетов
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const reportType = req.query.type as string;
    
    let query = tripwireSupabase
      .from('iae_agent_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (reportType) {
      query = query.eq('report_type', reportType);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({
      success: true,
      reports: data || [],
      count: data?.length || 0
    });
    
  } catch (error: any) {
    console.error('❌ [IAE API] Reports fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      message: error.message
    });
  }
});

/**
 * GET /api/iae-agent/health
 * Последний health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const { data, error } = await tripwireSupabase
      .from('iae_agent_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    
    res.json({
      success: true,
      health: data || null,
      status: data ? (data.status === 'healthy' ? 'ok' : 'warning') : 'unknown'
    });
    
  } catch (error: any) {
    console.error('❌ [IAE API] Health fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health status',
      message: error.message
    });
  }
});

/**
 * GET /api/iae-agent/report/:id
 * Получить конкретный отчет по ID
 */
router.get('/report/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await tripwireSupabase
      .from('iae_agent_reports')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      report: data
    });
    
  } catch (error: any) {
    console.error('❌ [IAE API] Report fetch error:', error);
    res.status(404).json({
      success: false,
      error: 'Report not found',
      message: error.message
    });
  }
});

/**
 * GET /api/iae-agent/stats
 * Статистика отчетов
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await tripwireSupabase
      .from('iae_agent_reports')
      .select('report_date, report_type, status, overall_health_score, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Calculate stats
    const totalReports = data?.length || 0;
    const healthyReports = data?.filter(r => r.status === 'healthy').length || 0;
    const warningReports = data?.filter(r => r.status === 'warning').length || 0;
    const criticalReports = data?.filter(r => r.status === 'critical').length || 0;
    
    const avgHealthScore = data && data.length > 0
      ? Math.round(data.reduce((sum, r) => sum + (r.overall_health_score || 0), 0) / data.length)
      : 0;
    
    res.json({
      success: true,
      stats: {
        period: `Last ${days} days`,
        totalReports,
        healthyReports,
        warningReports,
        criticalReports,
        avgHealthScore,
        healthPercentage: totalReports > 0 ? Math.round((healthyReports / totalReports) * 100) : 0
      },
      reports: data || []
    });
    
  } catch (error: any) {
    console.error('❌ [IAE API] Stats fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

/**
 * DELETE /api/iae-agent/report/:id
 * Удалить отчет (admin only)
 */
router.delete('/report/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { error } = await tripwireSupabase
      .from('iae_agent_reports')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Report deleted'
    });
    
  } catch (error: any) {
    console.error('❌ [IAE API] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete report',
      message: error.message
    });
  }
});

export default router;
