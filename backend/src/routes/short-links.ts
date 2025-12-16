import express, { Request, Response } from 'express';
import { 
  createShortLink, 
  resolveShortLink, 
  trackShortLinkClick,
  getShortLinkStats,
  getLeadShortLinksStats,
  deactivateShortLink
} from '../services/urlShortener.js';

const router = express.Router();

/**
 * 🔗 POST /api/short-links/create
 * Создать короткую ссылку
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { originalUrl, leadId, campaign, source, expiresInDays } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        success: false,
        error: 'originalUrl is required'
      });
    }

    const shortCode = await createShortLink({
      originalUrl,
      leadId,
      campaign,
      source,
      expiresInDays
    });

    if (!shortCode) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create short link'
      });
    }

    // Возвращаем полную короткую ссылку
    const shortUrl = `https://onai.academy/l/${shortCode}`;

    res.json({
      success: true,
      data: {
        shortCode,
        shortUrl,
        originalUrl
      }
    });
  } catch (error: any) {
    console.error('❌ Error in /create endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🔗 GET /api/short-links/:shortCode
 * Редирект с короткой ссылки на оригинальную (с отслеживанием клика)
 */
router.get('/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    // Получаем оригинальную ссылку
    const originalUrl = await resolveShortLink(shortCode);

    if (!originalUrl) {
      // Если ссылка не найдена или истекла, редиректим на главную
      return res.redirect('https://onai.academy');
    }

    // Получаем IP адрес клиента
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                      req.socket.remoteAddress || 
                      'unknown';

    // Получаем User Agent и Referer
    const userAgent = req.headers['user-agent'];
    const referer = req.headers['referer'] || req.headers['referrer'];

    // Асинхронно отслеживаем клик (не ждем завершения)
    trackShortLinkClick(shortCode, ipAddress, userAgent, referer as string)
      .catch(err => console.error('❌ Error tracking click:', err));

    // Редиректим на оригинальную ссылку
    res.redirect(originalUrl);
  } catch (error: any) {
    console.error('❌ Error in redirect endpoint:', error);
    res.redirect('https://onai.academy');
  }
});

/**
 * 📊 GET /api/short-links/stats/:shortCode
 * Получить статистику по короткой ссылке
 */
router.get('/stats/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    const stats = await getShortLinkStats(shortCode);

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: 'Short link not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error in /stats endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 📊 GET /api/short-links/lead/:leadId
 * Получить все короткие ссылки для лида
 */
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const stats = await getLeadShortLinksStats(leadId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('❌ Error in /lead endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 🔒 DELETE /api/short-links/:shortCode
 * Деактивировать короткую ссылку
 */
router.delete('/:shortCode', async (req: Request, res: Response) => {
  try {
    const { shortCode } = req.params;

    const success = await deactivateShortLink(shortCode);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate short link'
      });
    }

    res.json({
      success: true,
      message: 'Short link deactivated'
    });
  } catch (error: any) {
    console.error('❌ Error in /delete endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;






