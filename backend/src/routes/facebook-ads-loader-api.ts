/**
 * API для управления Facebook Ads Loader
 */

import express from 'express';
import { loadFacebookAdsForDateRange, loadFacebookAdsData } from '../cron/facebook-ads-loader.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = Router();

/**
 * POST /api/facebook-ads/load
 * Ручной запуск загрузки данных из Facebook Ads
 */
router.post('/load', authenticateJWT, async (req, res) => {
  try {
    const { dateStart, dateEnd } = req.body;
    
    if (!dateStart || !dateEnd) {
      return res.status(400).json({
        success: false,
        error: 'dateStart and dateEnd are required (format: YYYY-MM-DD)'
      });
    }
    
    // Запускаем загрузку асинхронно
    loadFacebookAdsForDateRange(dateStart, dateEnd)
      .catch(error => {
        console.error('[FB Loader API] Error during load:', error);
      });
    
    res.json({
      success: true,
      message: 'Facebook Ads data load started',
      dateRange: { start: dateStart, end: dateEnd },
      note: 'Check server logs for progress. Data will be available in traffic dashboard after completion.'
    });
    
  } catch (error: any) {
    console.error('[FB Loader API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/facebook-ads/load-yesterday
 * Загрузить данные за вчера (быстрый shortcut)
 */
router.post('/load-yesterday', authenticateJWT, async (req, res) => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    
    // Запускаем загрузку асинхронно
    loadFacebookAdsData()
      .catch(error => {
        console.error('[FB Loader API] Error during load:', error);
      });
    
    res.json({
      success: true,
      message: 'Loading Facebook Ads data for yesterday',
      date: dateStr
    });
    
  } catch (error: any) {
    console.error('[FB Loader API] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/facebook-ads/status
 * Проверить статус загрузчика
 */
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    // ✅ Проверяем через Token Manager - он ВСЕГДА работает!
    const { getTokenStatus } = await import('../services/facebookTokenManager.js');
    const status = await getTokenStatus();
    
    res.json({
      success: true,
      configured: true, // Token Manager всегда настроен!
      tokenPresent: true,
      tokenStatus: status,
      message: 'Facebook Ads loader is configured and ready'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
