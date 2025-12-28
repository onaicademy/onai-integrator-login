/**
 * Интеграционные Диагностики API
 * 
 * Endpoint: POST /api/admin/integrations/diagnostics
 * Purpose: Запускает полную диагностику всех интеграций лидов
 */

import { Router, Request, Response } from 'express';
import IntegrationsDiagnostics from '../services/integrations-diagnostics';

const router = Router();

/**
 * POST /api/admin/integrations/diagnostics
 * 
 * Запускает полную диагностику всех интеграций
 */
router.post('/diagnostics', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Starting integrations diagnostics...');
    
    const diagnostics = new IntegrationsDiagnostics();
    const result = await diagnostics.runFullDiagnostics();
    
    console.log('✅ Diagnostics completed');
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('❌ Diagnostics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to run diagnostics',
    });
  }
});

/**
 * GET /api/admin/integrations/diagnostics
 * 
 * Health check для диагностики
 */
router.get('/diagnostics', async (req: Request, res: Response) => {
  return res.json({
    success: true,
    status: 'healthy',
    service: 'integrations-diagnostics',
    timestamp: new Date().toISOString()
  });
});

export default router;
