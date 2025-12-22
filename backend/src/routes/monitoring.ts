/**
 * 🏥 MONITORING API ENDPOINTS
 * 
 * Provides REST API for:
 * - Health status checks
 * - E2E testing
 * - Report delivery tracking
 * - Manual trigger for tests
 */

import { Router, Request, Response } from 'express';
import { botHealthMonitor, startHealthMonitorScheduler } from '../services/botHealthMonitor';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// HEALTH STATUS ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/health
 * Returns current health status (cached)
 */
router.get('/health', (req: Request, res: Response) => {
  try {
    const status = botHealthMonitor.getHealthStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitoring/health/check
 * Triggers a fresh health check
 */
router.post('/health/check', async (req: Request, res: Response) => {
  try {
    console.log('🏥 [API] Manual health check triggered');
    const status = await botHealthMonitor.runFullHealthCheck();
    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// E2E TESTING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/monitoring/e2e/:bot
 * Run E2E test for specific bot (traffic, iae, debugger)
 */
router.post('/e2e/:bot', async (req: Request, res: Response) => {
  try {
    const { bot } = req.params;
    
    if (!['traffic', 'iae', 'debugger'].includes(bot)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bot name. Use: traffic, iae, or debugger',
      });
    }
    
    console.log(`🧪 [API] E2E test triggered for bot: ${bot}`);
    const result = await botHealthMonitor.runE2ETest(bot as 'traffic' | 'iae' | 'debugger');
    
    res.json({
      success: result.success,
      bot,
      steps: result.steps,
      summary: result.success ? 'All tests passed' : 'Some tests failed',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitoring/e2e/:bot/send-test
 * Send a test message via specific bot
 */
router.post('/e2e/:bot/send-test', async (req: Request, res: Response) => {
  try {
    const { bot } = req.params;
    const { chatId } = req.body;
    
    if (!['traffic', 'iae', 'debugger'].includes(bot)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bot name. Use: traffic, iae, or debugger',
      });
    }
    
    console.log(`📨 [API] Test message requested for bot: ${bot}`);
    const success = await botHealthMonitor.sendTestMessage(
      bot as 'traffic' | 'iae' | 'debugger',
      chatId
    );
    
    res.json({
      success,
      message: success ? 'Test message sent successfully' : 'Failed to send test message',
      bot,
      chatId: chatId || 'default admin chat',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitoring/e2e/full
 * Run full E2E test on all bots
 */
router.post('/e2e/full', async (req: Request, res: Response) => {
  try {
    console.log('🧪 [API] Full E2E test triggered');
    
    const [trafficResult, iaeResult, debuggerResult] = await Promise.all([
      botHealthMonitor.runE2ETest('traffic'),
      botHealthMonitor.runE2ETest('iae'),
      botHealthMonitor.runE2ETest('debugger'),
    ]);
    
    const allPassed = trafficResult.success && iaeResult.success && debuggerResult.success;
    
    res.json({
      success: allPassed,
      summary: allPassed ? '✅ All bots passed E2E tests' : '❌ Some bots failed E2E tests',
      results: {
        traffic: {
          success: trafficResult.success,
          steps: trafficResult.steps,
        },
        iae: {
          success: iaeResult.success,
          steps: iaeResult.steps,
        },
        debugger: {
          success: debuggerResult.success,
          steps: debuggerResult.steps,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORT TRACKING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/reports
 * Get status of all scheduled reports
 */
router.get('/reports', (req: Request, res: Response) => {
  try {
    const reports = botHealthMonitor.getReportStatuses();
    
    const summary = {
      total: reports.length,
      delivered: reports.filter(r => r.status === 'delivered').length,
      failed: reports.filter(r => r.status === 'failed').length,
      pending: reports.filter(r => r.status === 'pending' || r.status === 'never_run').length,
    };
    
    res.json({
      success: true,
      summary,
      reports,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/monitoring/reports/:reportName/record
 * Record a report delivery (called by schedulers)
 */
router.post('/reports/:reportName/record', (req: Request, res: Response) => {
  try {
    const { reportName } = req.params;
    const { success, errorMessage } = req.body;
    
    botHealthMonitor.recordReportDelivery(reportName, success, errorMessage);
    
    res.json({
      success: true,
      message: `Report "${reportName}" recorded as ${success ? 'delivered' : 'failed'}`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD SUMMARY
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/monitoring/dashboard
 * Comprehensive dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const health = botHealthMonitor.getHealthStatus();
    const reports = botHealthMonitor.getReportStatuses();
    
    // Calculate uptime and statistics
    const serviceStats = {
      total: health.services.length,
      healthy: health.services.filter(s => s.status === 'ok').length,
      warnings: health.services.filter(s => s.status === 'warning').length,
      errors: health.services.filter(s => s.status === 'error').length,
    };
    
    const reportStats = {
      total: reports.length,
      delivered: reports.filter(r => r.status === 'delivered').length,
      failed: reports.filter(r => r.status === 'failed').length,
      neverRun: reports.filter(r => r.status === 'never_run').length,
    };
    
    // Find problematic items
    const issues: string[] = [];
    health.services.filter(s => s.status === 'error').forEach(s => {
      issues.push(`❌ ${s.name}: ${s.message}`);
    });
    reports.filter(r => r.consecutiveFailures >= 2).forEach(r => {
      issues.push(`⚠️ ${r.name}: ${r.consecutiveFailures} consecutive failures`);
    });
    
    res.json({
      success: true,
      overallStatus: health.overall,
      lastCheck: health.timestamp,
      services: serviceStats,
      reports: reportStats,
      issues: issues.length > 0 ? issues : ['✅ No issues detected'],
      details: {
        services: health.services,
        reports,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
export { startHealthMonitorScheduler };
