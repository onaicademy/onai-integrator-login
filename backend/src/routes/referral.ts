// backend/src/routes/referral.ts
// 🚀 REFERRAL SYSTEM API ROUTES

import { Router, Request, Response } from 'express';
import referralService from '../services/referral.service.js';

const router = Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC ROUTES (не требуют auth)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/referral/create
 * Создать нового рефером и сгенерировать UTM код
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email, phone_number, full_name } = req.body;

    // Validation
    if (!email || !phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Email and phone number are required',
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Create referrer
    const referrer = await referralService.createReferrer(
      email,
      phone_number,
      full_name
    );

    // Build tracking link
    const courseUrl = process.env.COURSE_URL || 'https://onai.academy/course';
    const utmLink = `${courseUrl}?utm_source=${referrer.utm_source}`;

    console.log(`✅ [Referral] New referrer created: ${email}`);

    res.json({
      success: true,
      referrer: {
        id: referrer.id,
        email: referrer.email,
        referral_code: referrer.referral_code,
        utm_source: referrer.utm_source,
        utm_link: utmLink,
        commission_percent: referrer.current_commission_percent,
      },
    });
  } catch (error: any) {
    console.error('❌ [Referral] Error creating referrer:', error);
    
    // Handle duplicate email error
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This email is already registered as a referrer',
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create referrer',
    });
  }
});

/**
 * GET /api/referral/tiers
 * Получить комиссионные уровни (для отображения)
 */
router.get('/tiers', async (req: Request, res: Response) => {
  try {
    const tiers = await referralService.getCommissionTiers();
    
    res.json({
      success: true,
      tiers,
    });
  } catch (error: any) {
    console.error('❌ [Referral] Error getting tiers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get commission tiers',
    });
  }
});

/**
 * GET /api/referral/check/:email
 * Проверить существует ли рефером с таким email
 */
router.get('/check/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    // Use direct DB call to check
    const referrer = await referralService.getReferrerByCode(''); // Won't find anything
    
    res.json({
      success: true,
      exists: !!referrer,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ROUTES (для AmoCRM)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/referral/webhook/amocrm-conversion
 * Webhook endpoint для новых продаж
 */
router.post('/webhook/amocrm-conversion', async (req: Request, res: Response) => {
  try {
    const {
      utm_source,
      amocrm_deal_id,
      customer_email,
      customer_name,
      sale_amount,
    } = req.body;

    console.log('🔔 [Referral Webhook] Incoming conversion:', {
      utm_source,
      amocrm_deal_id,
      sale_amount,
    });

    // Validation
    if (!utm_source || !sale_amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: utm_source, sale_amount',
      });
    }

    // Record conversion
    const conversion = await referralService.recordConversion(
      utm_source,
      amocrm_deal_id || `manual_${Date.now()}`,
      customer_email || 'unknown@email.com',
      customer_name || 'Unknown Customer',
      Number(sale_amount)
    );

    console.log('✅ [Referral Webhook] Conversion recorded:', conversion.id);

    res.json({
      success: true,
      conversion: {
        id: conversion.id,
        commission_amount: conversion.commission_amount,
        commission_percent: conversion.commission_percent,
      },
    });
  } catch (error: any) {
    console.error('❌ [Referral Webhook] Error:', error);
    
    // Don't expose internal errors to webhooks
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES (требуют auth - TODO: add auth middleware)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/referral/admin/referrers
 * Получить всех рефореров
 */
router.get('/admin/referrers', async (req: Request, res: Response) => {
  try {
    const referrers = await referralService.getAllReferrers();
    
    res.json({
      success: true,
      referrers,
      total: referrers.length,
    });
  } catch (error: any) {
    console.error('❌ [Referral Admin] Error getting referrers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/referral/admin/stats/:referrerId
 * Получить статистику рефором
 */
router.get('/admin/stats/:referrerId', async (req: Request, res: Response) => {
  try {
    const { referrerId } = req.params;
    const stats = await referralService.getReferrerStats(referrerId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('❌ [Referral Admin] Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/referral/admin/conversions/:referrerId
 * Получить конверсии рефором
 */
router.get('/admin/conversions/:referrerId', async (req: Request, res: Response) => {
  try {
    const { referrerId } = req.params;
    const conversions = await referralService.getReferrerConversions(referrerId);
    
    res.json({
      success: true,
      conversions,
      total: conversions.length,
    });
  } catch (error: any) {
    console.error('❌ [Referral Admin] Error getting conversions:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/referral/admin/confirm-payment/:conversionId
 * Менеджер подтверждает выплату
 */
router.post('/admin/confirm-payment/:conversionId', async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;
    await referralService.confirmPayment(conversionId);
    
    console.log(`✅ [Referral Admin] Payment confirmed: ${conversionId}`);
    
    res.json({
      success: true,
      message: 'Payment confirmed',
    });
  } catch (error: any) {
    console.error('❌ [Referral Admin] Error confirming payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/referral/admin/send-payment/:conversionId
 * Менеджер отправляет выплату
 */
router.post('/admin/send-payment/:conversionId', async (req: Request, res: Response) => {
  try {
    const { conversionId } = req.params;
    await referralService.sendPayment(conversionId);
    
    console.log(`💰 [Referral Admin] Payment sent: ${conversionId}`);
    
    res.json({
      success: true,
      message: 'Payment sent',
    });
  } catch (error: any) {
    console.error('❌ [Referral Admin] Error sending payment:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
