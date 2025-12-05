/**
 * Tripwire Certificate Controller
 * HTTP Controller для сертификатов
 * ИЗОЛИРОВАННЫЙ для Tripwire DB
 */

import { Request, Response } from 'express';
import { issueCertificate, getUserCertificate, canIssueCertificate } from '../../services/tripwire/tripwireCertificateService';

/**
 * POST /api/tripwire/certificates/issue
 * Выдать сертификат пользователю
 */
export async function issue(req: Request, res: Response): Promise<void> {
  try {
    const { user_id, full_name } = req.body;
    
    if (!user_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required field: user_id'
      });
      return;
    }
    
    console.log('🎓 [Tripwire CertificateController] Выдача сертификата для:', user_id);
    
    const certificate = await issueCertificate(user_id, full_name);
    
    res.json({
      success: true,
      data: certificate,
      message: 'Certificate issued successfully'
    });
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateController] Ошибка issue:', error);
    
    if (error.message.includes('not completed')) {
      res.status(403).json({
        success: false,
        error: 'User has not completed all required modules'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to issue certificate'
      });
    }
  }
}

/**
 * GET /api/tripwire/certificates/my
 * Получить сертификат текущего пользователя
 */
export async function getMyCertificate(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter: user_id'
      });
      return;
    }
    
    console.log('🎓 [Tripwire CertificateController] Запрос сертификата для:', userId);
    
    const certificate = await getUserCertificate(userId);
    
    if (!certificate) {
      res.json({
        success: true,
        data: null,
        message: 'Certificate not issued yet'
      });
      return;
    }
    
    res.json({
      success: true,
      data: certificate
    });
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateController] Ошибка getMyCertificate:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch certificate'
    });
  }
}

/**
 * GET /api/tripwire/certificates/check-eligibility
 * Проверить, может ли пользователь получить сертификат
 */
export async function checkEligibility(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Missing required query parameter: user_id'
      });
      return;
    }
    
    console.log('🎓 [Tripwire CertificateController] Проверка возможности выдачи для:', userId);
    
    const result = await canIssueCertificate(userId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('❌ [Tripwire CertificateController] Ошибка checkEligibility:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check eligibility'
    });
  }
}

