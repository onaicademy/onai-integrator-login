import { Router, Request, Response } from 'express';
import { trafficAdminSupabase } from '../config/supabase-traffic.js';
import { sendToAllChats } from '../services/telegramBot';
import { getExchangeRateForDate } from '../jobs/dailyExchangeRateFetcher.js';

const router = Router();

// 🎯 Маппинг UTM кампаний на таргетологов
const TARGETOLOGIST_MAPPING: Record<string, string[]> = {
  'Kenesary': ['tripwire', 'nutcab'],
  'Arystan': ['arystan'],
  'Muha': ['on ai', 'onai', 'запуск'],
  'Traf4': ['alex', 'traf4', 'proftest'],
};

/**
 * Определить таргетолога по UTM меткам
 */
function determineTargetologist(utmCampaign: string | null, utmSource: string | null): string {
  if (!utmCampaign && !utmSource) {
    return 'Unknown';
  }

  const campaignLower = (utmCampaign || '').toLowerCase();
  const sourceLower = (utmSource || '').toLowerCase();

  for (const [targetologist, patterns] of Object.entries(TARGETOLOGIST_MAPPING)) {
    for (const pattern of patterns) {
      if (campaignLower.includes(pattern.toLowerCase()) || sourceLower.includes(pattern.toLowerCase())) {
        return targetologist;
      }
    }
  }

  return 'Unknown';
}

/**
 * Получить эмодзи для таргетолога
 */
function getTargetologistEmoji(targetologist: string): string {
  const emojis: Record<string, string> = {
    'Kenesary': '👑',
    'Arystan': '🦁',
    'Muha': '🚀',
    'Traf4': '⚡',
    'Unknown': '❓',
  };
  return emojis[targetologist] || '🎯';
}

/**
 * Форматировать сумму в тенге
 */
function formatTenge(amount: number): string {
  return new Intl.NumberFormat('ru-KZ', {
    style: 'currency',
    currency: 'KZT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('KZT', '₸').trim();
}

/**
 * POST /api/amocrm/sales-webhook
 * Webhook для получения уведомлений об оплатах из AmoCRM
 * РАСШИРЕННАЯ ВЕРСИЯ - сохраняет в обе таблицы (sales_notifications + all_sales_tracking)
 */
router.post('/sales-webhook', async (req: Request, res: Response) => {
  try {
    console.log('📥 AmoCRM Sales Webhook получен:', JSON.stringify(req.body, null, 2));

    const { 
      lead_id, 
      lead_name, 
      contact_name, 
      contact_phone, 
      contact_email,
      sale_amount, 
      product_name, 
      pipeline_id, 
      status_id, 
      responsible_user_id,
      responsible_user_name,
      currency,
      referrer,
      landing_page,
      device_type,
      browser,
      os,
      country,
      city
    } = req.body;

    // Извлечь UTM метки из custom fields или query params
    const utmSource = req.body.utm_source || null;
    const utmMedium = req.body.utm_medium || null;
    const utmCampaign = req.body.utm_campaign || null;
    const utmContent = req.body.utm_content || null;
    const utmTerm = req.body.utm_term || null;
    const utmId = req.body.utm_id || null;

    if (!lead_id || !sale_amount) {
      console.error('❌ Недостаточно данных в webhook:', req.body);
      return res.status(400).json({ error: 'lead_id and sale_amount are required' });
    }

    // Определить таргетолога
    const targetologist = determineTargetologist(utmCampaign, utmSource);
    console.log(`🎯 Таргетолог определен: ${targetologist} (utm_campaign: ${utmCampaign}, utm_source: ${utmSource})`);

    // Get today's date in Almaty timezone
    const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Almaty' });

    // Сохранить в all_sales_tracking (основная таблица Traffic DB)
    const { data: savedAllSales, error: allSalesError } = await trafficAdminSupabase
      .from('all_sales_tracking')
      .insert({
        lead_id,
        lead_name: lead_name || null,
        contact_name: contact_name || null,
        contact_phone: contact_phone || null,
        contact_email: contact_email || null,
        sale_amount: parseFloat(sale_amount),
        product_name: product_name || null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        pipeline_id: pipeline_id || null,
        status_id: status_id || null,
        targetologist,
        sale_date: todayDate,
      })
      .select()
      .single();

    if (allSalesError) {
      console.error('❌ Ошибка сохранения в all_sales_tracking:', allSalesError);
    } else {
      console.log('✅ Продажа сохранена в all_sales_tracking:', savedAllSales.id);
    }

    const saleId = savedAllSales?.id;

    // Отправить уведомление в Telegram
    try {
      const emoji = getTargetologistEmoji(targetologist);
      const amount = formatTenge(parseFloat(sale_amount));

      const message = `
🎉 *НОВАЯ ПРОДАЖА!*

${emoji} *Таргетолог:* ${targetologist}
👤 *Клиент:* ${contact_name || 'Без имени'}
💰 *Сумма:* ${amount}
📦 *Продукт:* ${product_name || 'Tripwire'}
🏷️ *Кампания:* ${utmCampaign || 'N/A'}

*${targetologist}, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ!* 🔥
`.trim();

      await sendToAllChats(message);
      console.log('✅ Telegram уведомление отправлено');

    } catch (telegramError: any) {
      console.error('❌ Ошибка отправки в Telegram:', telegramError.message);
    }

    res.json({ 
      success: true, 
      sale_id: saleId,
      targetologist,
      saved_to: {
        all_sales_tracking: !!savedAllSales
      }
    });

  } catch (error: any) {
    console.error('❌ Ошибка обработки webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/amocrm/sales-history?targetologist=Kenesary&start=2024-12-01&end=2024-12-31
 * Получить историю продаж по таргетологу и периоду
 */
router.get('/sales-history', async (req: Request, res: Response) => {
  try {
    const { targetologist, start, end } = req.query;

    let query = trafficAdminSupabase
      .from('sales_notifications')
      .select('*')
      .order('sale_date', { ascending: false });

    if (targetologist) {
      query = query.eq('targetologist', targetologist);
    }

    if (start) {
      query = query.gte('sale_date', start);
    }

    if (end) {
      query = query.lte('sale_date', end);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('❌ Ошибка получения истории:', error);
      return res.status(500).json({ error: error.message });
    }

    // Суммарная статистика
    const totalSales = data.length;
    const totalRevenue = data.reduce((sum, sale) => sum + parseFloat(sale.sale_amount as any), 0);
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;

    res.json({
      success: true,
      stats: {
        total_sales: totalSales,
        total_revenue: totalRevenue,
        avg_sale: avgSale,
      },
      sales: data,
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения истории:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/amocrm/sales-stats?start=2024-12-01&end=2024-12-31
 * Статистика по таргетологам за период
 */
router.get('/sales-stats', async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;

    let query = trafficAdminSupabase
      .from('sales_notifications')
      .select('targetologist, sale_amount, sale_date');

    if (start) {
      query = query.gte('sale_date', start);
    }

    if (end) {
      query = query.lte('sale_date', end);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return res.status(500).json({ error: error.message });
    }

    // Группировка по таргетологам
    const statsByTargetologist: Record<string, {
      targetologist: string;
      sales_count: number;
      total_revenue: number;
      avg_sale: number;
      emoji: string;
    }> = {};

    data.forEach((sale: any) => {
      const targetologist = sale.targetologist;
      
      if (!statsByTargetologist[targetologist]) {
        statsByTargetologist[targetologist] = {
          targetologist,
          sales_count: 0,
          total_revenue: 0,
          avg_sale: 0,
          emoji: getTargetologistEmoji(targetologist),
        };
      }

      statsByTargetologist[targetologist].sales_count++;
      statsByTargetologist[targetologist].total_revenue += parseFloat(sale.sale_amount);
    });

    // Рассчитать средний чек
    Object.values(statsByTargetologist).forEach(stat => {
      stat.avg_sale = stat.sales_count > 0 ? stat.total_revenue / stat.sales_count : 0;
    });

    // Сортировка по количеству продаж
    const sortedStats = Object.values(statsByTargetologist).sort((a, b) => b.sales_count - a.sales_count);

    res.json({
      success: true,
      period: { start, end },
      stats: sortedStats,
    });

  } catch (error: any) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/amocrm/test-sale-notification
 * Тестовая отправка уведомления о продаже
 */
router.post('/test-sale-notification', async (req: Request, res: Response) => {
  try {
    const { targetologist = 'Kenesary', contact_name = 'Иван Тестовый', sale_amount = 5000, product_name = 'Tripwire' } = req.body;

    const emoji = getTargetologistEmoji(targetologist);
    const amount = formatTenge(parseFloat(sale_amount));

    const message = `
🎉 *НОВАЯ ПРОДАЖА!* (ТЕСТ)

${emoji} *Таргетолог:* ${targetologist}
👤 *Клиент:* ${contact_name}
💰 *Сумма:* ${amount}
📦 *Продукт:* ${product_name}

*${targetologist}, ПОЗДРАВЛЯЕМ! ПО ВАМ СДЕЛАЛИ ПРОДАЖУ!* 🔥

_Это тестовое уведомление_
`.trim();

    await sendToAllChats(message);
    console.log('✅ Тестовое уведомление отправлено');

    res.json({ success: true, message: 'Test notification sent' });

  } catch (error: any) {
    console.error('❌ Ошибка отправки тестового уведомления:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
